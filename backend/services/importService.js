import fs from 'fs';
import path from 'path';
import { parseFile } from '../utils/parser.js';
import { getDb } from '../db.js';

const db = getDb();

export function createImportJob(fileBuffer, mimeType, originalName, taxPeriod) {
  const jobId = `job_${Date.now()}`;
  const uploadsDir = path.join(process.cwd(), 'uploads');
  const ext = mimeType.includes('spreadsheet') || originalName.endsWith('.xlsx') ? '.xlsx' : '.csv';
  const filePath = path.join(uploadsDir, `${jobId}${ext}`);
  fs.writeFileSync(filePath, fileBuffer);

  // build small preview only
  const { rows } = parseFile(fileBuffer, mimeType, originalName);
  const preview = rows.slice(0, 10);

  db.prepare(
    `INSERT INTO import_batch (
      id,file_path,original_name,status,created_at,updated_at,
      total_rows,processed_rows,success_count,error_count,warning_count
    ) VALUES (?,?,?, 'queued', datetime('now'), datetime('now'),0,0,0,0,0)`
  ).run(jobId, filePath, originalName);

  return { jobId, preview };
}

export function listJobs() {
  const rows = db
    .prepare(
      `SELECT id, file_path, status, created_at, updated_at,
              original_name, total_rows, processed_rows, success_count, error_count, warning_count
         FROM import_batch
        ORDER BY created_at DESC`
    )
    .all();
  return rows.map((r) => ({
    job_id: r.id,
    file_name: r.original_name || path.basename(r.file_path),
    uploaded_at: r.created_at,
    status: r.status,
    total_rows: r.total_rows,
    imported: r.success_count,
    warnings: r.warning_count || 0,
    errors: r.error_count
  }));
}

export function getJob(jobId) {
  return db
    .prepare(
      `SELECT * FROM import_batch WHERE id = ?`
    )
    .get(jobId);
}

export function getJobStatus(jobId) {
  const r = getJob(jobId);
  if (!r) return null;
  return {
    job_id: r.id,
    status: r.status,
    processed_rows: r.processed_rows,
    total_rows: r.total_rows
  };
}

export function getJobResult(jobId) {
  const batch = getJob(jobId);
  if (!batch) return null;
  const errors = db
    .prepare(
      `SELECT row_number as row, field, code, value
         FROM import_error
        WHERE batch_id = ?
        ORDER BY row_number`
    )
    .all(jobId);
  const warnings = []; // could be derived similarly if we persist them
  return {
    job_id: batch.id,
    status: batch.status,
    total_rows: batch.total_rows,
    success_count: batch.success_count,
    error_count: batch.error_count,
    warning_count: batch.warning_count || 0,
    errors,
    warnings
  };
}

export function getAnalytics() {
  const allJobs = db
    .prepare(
      `SELECT * FROM import_batch
       ORDER BY created_at DESC`
    )
    .all();
  const totals = { imported: 0, errors: 0, warnings: 0 };
  const statusCounts = {};
  const trend = []; // one point per job with created_at timestamp
  const errorReasons = new Map(); // code -> count
  const supplierQuality = new Map(); // supplier_gstin -> { supplier, imported, warnings, errors }
  const posMix = new Map(); // place_of_supply -> count
  const rateBuckets = new Map(); // rate label -> count

  function bucketRate(row) {
    const taxable = Number(row.taxable_amount || 0) || 0;
    const igst = Number(row.igst_amount || 0) || 0;
    const cgst = Number(row.cgst_amount || 0) || 0;
    const sgst = Number(row.sgst_amount || 0) || 0;
    if (!taxable || taxable <= 0) return 'unknown';
    const totalTax = igst || cgst + sgst;
    const rate = (totalTax / taxable) * 100;
    const rounded = Math.round(rate);
    if ([0, 5, 12, 18, 28].includes(rounded)) return `${rounded}%`;
    return 'other';
  }

  for (const job of allJobs) {
    // import_batch columns are snake_case; map them into our totals
    const imported = job.success_count || 0;
    const errors = job.error_count || 0;
    const warnings = job.warning_count || 0;

    totals.imported += imported;
    totals.errors += errors;
    totals.warnings += warnings;

    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;

    trend.push({
      date: job.created_at,
      imported,
      errors
    });

    const jobErrors = db
      .prepare(
        `SELECT row_number as row, field, code, value
           FROM import_error
          WHERE batch_id = ?`
      )
      .all(job.id);

    for (const e of jobErrors) {
      errorReasons.set(e.code, (errorReasons.get(e.code) || 0) + 1);
    }

    const errorRowsByJob = new Map();
    for (const e of jobErrors) {
      if (!errorRowsByJob.has(e.row)) errorRowsByJob.set(e.row, []);
      errorRowsByJob.get(e.row).push(e);
    }

    const rows = db
      .prepare(
        `SELECT
           row_number as _rowIndex,
           supplier_gstin,
           invoice_number,
           invoice_date,
           taxable_amount,
           igst_amount,
           cgst_amount,
           sgst_amount,
           place_of_supply
         FROM invoice
        WHERE batch_id = ?`
      )
      .all(job.id);

    for (const row of rows) {
      const supplier = row.supplier_gstin || 'UNKNOWN';
      if (!supplierQuality.has(supplier)) {
        supplierQuality.set(supplier, {
          supplier,
          imported: 0,
          warnings: 0,
          errors: 0
        });
      }
      const sq = supplierQuality.get(supplier);
      const rowErrors = errorRowsByJob.get(row._rowIndex) || [];
      if (rowErrors.length > 0) {
        sq.errors += 1;
      } else {
        sq.imported += 1;
      }

      const pos = String(row.place_of_supply || 'UNKNOWN');
      posMix.set(pos, (posMix.get(pos) || 0) + 1);

      const bucket = bucketRate(row);
      rateBuckets.set(bucket, (rateBuckets.get(bucket) || 0) + 1);
    }
  }

  const statusData = Object.entries(statusCounts).map(([status, value]) => ({
    status,
    value
  }));

  const byJobErrors = allJobs.map((job) => ({
    job: job.id.slice(0, 6),
    errors: job.error_count || 0,
    warnings: job.warning_count || 0,
    imported: job.success_count || 0
  }));

  const errorReasonsData = Array.from(errorReasons.entries())
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const supplierQualityData = Array.from(supplierQuality.values())
    .sort((a, b) => b.errors - a.errors)
    .slice(0, 10);

  const posMixData = Array.from(posMix.entries())
    .map(([pos, count]) => ({ pos, count }))
    .sort((a, b) => b.count - a.count);

  const rateBucketsData = Array.from(rateBuckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => {
      const order = ['0%', '5%', '12%', '18%', '28%', 'other', 'unknown'];
      return order.indexOf(a.bucket) - order.indexOf(b.bucket);
    });

  const trendData = trend.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  const jobStatusTotals = {
    total: allJobs.length,
    pending: (statusCounts.queued || 0) + (statusCounts.processing || 0),
    done: statusCounts.done || 0,
    failed: statusCounts.failed || 0
  };

  return {
    totals,
    statusData,
    jobStatusTotals,
    byJobErrors,
    trend: trendData,
    errorReasons: errorReasonsData,
    supplierQuality: supplierQualityData,
    posMix: posMixData,
    rateBuckets: rateBucketsData
  };
}

export function buildErrorsCsv(batch) {
  const header =
    'row,field,code,value,supplier_gstin,invoice_number,invoice_date,taxable_amount,igst_amount,cgst_amount,sgst_amount,place_of_supply\n';

  const errors = db
    .prepare(
      `SELECT row_number as row, field, code, value
         FROM import_error
        WHERE batch_id = ?
        ORDER BY row_number`
    )
    .all(batch.id);

  if (!errors.length) {
    return header; // header-only CSV when there are no errors
  }

  const invoices = db
    .prepare(
      `SELECT
         row_number,
         supplier_gstin,
         invoice_number,
         invoice_date,
         taxable_amount,
         igst_amount,
         cgst_amount,
         sgst_amount,
         place_of_supply
       FROM invoice
      WHERE batch_id = ?`
    )
    .all(batch.id);

  const rowMap = new Map();
  for (const r of invoices) {
    rowMap.set(r.row_number, r);
  }

  const lines = [];
  for (const e of errors) {
    const row = rowMap.get(e.row);
    const vals = row
      ? [
          row.supplier_gstin,
          row.invoice_number,
          row.invoice_date,
          row.taxable_amount,
          row.igst_amount,
          row.cgst_amount,
          row.sgst_amount,
          row.place_of_supply
        ]
      : ['', '', '', '', '', '', '', ''];
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    const rest = vals.map(esc).join(',');
    lines.push([e.row, e.field, e.code, esc(e.value), rest].join(','));
  }

  return header + lines.join('\n');
}

