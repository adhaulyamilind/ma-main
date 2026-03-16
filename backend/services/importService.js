import { parseFile } from '../utils/parser.js';
import { validateAllRows } from '../utils/validation.js';

const jobs = new Map();

export function createImportJob(fileBuffer, mimeType, originalName, taxPeriod) {
  const { rows } = parseFile(fileBuffer, mimeType, originalName);
  if (!rows || rows.length === 0) {
    const error = new Error('No valid rows in file');
    error.code = 'NO_ROWS';
    throw error;
  }
  const jobId = `job_${Date.now()}`;
  const { errors, warnings, validRows, successCount, errorCount } = validateAllRows(rows, taxPeriod);
  const preview = rows.slice(0, 10);
  const job = {
    id: jobId,
    fileName: originalName,
    uploadedAt: new Date().toISOString(),
    status: 'done',
    totalRows: rows.length,
    successCount,
    errorCount,
    warningCount: warnings.length,
    errors,
    warnings,
    preview,
    allRows: rows,
    validRows
  };
  jobs.set(jobId, job);
  return { job, preview };
}

export function listJobs() {
  return Array.from(jobs.values())
    .sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1))
    .map((job) => ({
      job_id: job.id,
      file_name: job.fileName,
      uploaded_at: job.uploadedAt,
      status: job.status,
      total_rows: job.totalRows,
      imported: job.successCount,
      warnings: job.warningCount || 0,
      errors: job.errorCount
    }));
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function getJobStatus(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  return {
    job_id: job.id,
    status: job.status,
    processed_rows: job.successCount + job.errorCount,
    total_rows: job.totalRows
  };
}

export function getJobResult(jobId) {
  const job = jobs.get(jobId);
  if (!job) return null;
  return {
    job_id: job.id,
    status: job.status,
    total_rows: job.totalRows,
    success_count: job.successCount,
    error_count: job.errorCount,
    warning_count: job.warningCount || 0,
    errors: job.errors,
    warnings: job.warnings || []
  };
}

export function getAnalytics() {
  const allJobs = Array.from(jobs.values());
  const totals = { imported: 0, errors: 0, warnings: 0 };
  const statusCounts = {};
  const trend = new Map(); // date (YYYY-MM-DD) -> { date, imported, errors }
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
    totals.imported += job.successCount || 0;
    totals.errors += job.errorCount || 0;
    totals.warnings += job.warningCount || 0;

    statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;

    const d = job.uploadedAt?.slice(0, 10) || 'unknown';
    if (!trend.has(d)) trend.set(d, { date: d, imported: 0, errors: 0 });
    const t = trend.get(d);
    t.imported += job.successCount || 0;
    t.errors += job.errorCount || 0;

    for (const e of job.errors || []) {
      errorReasons.set(e.code, (errorReasons.get(e.code) || 0) + 1);
    }

    const errorRowsByJob = new Map();
    for (const e of job.errors || []) {
      if (!errorRowsByJob.has(e.row)) errorRowsByJob.set(e.row, []);
      errorRowsByJob.get(e.row).push(e);
    }

    for (const row of job.allRows || []) {
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
    errors: job.errorCount || 0,
    warnings: job.warningCount || 0,
    imported: job.successCount || 0
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

  const trendData = Array.from(trend.values()).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return {
    totals,
    statusData,
    byJobErrors,
    trend: trendData,
    errorReasons: errorReasonsData,
    supplierQuality: supplierQualityData,
    posMix: posMixData,
    rateBuckets: rateBucketsData
  };
}

export function buildErrorsCsv(job) {
  const header = 'row,field,code,value,supplier_gstin,invoice_number,invoice_date,taxable_amount,igst_amount,cgst_amount,sgst_amount,place_of_supply\n';
  const errorRows = new Set(job.errors.map((e) => e.row));
  const rowMap = new Map();
  for (const r of job.allRows || []) {
    rowMap.set(r._rowIndex, r);
  }
  const lines = [];
  for (const rowNum of errorRows) {
    const row = rowMap.get(rowNum);
    const rowErrs = job.errors.filter((e) => e.row === rowNum);
    const vals = row
      ? [row.supplier_gstin, row.invoice_number, row.invoice_date, row.taxable_amount, row.igst_amount, row.cgst_amount, row.sgst_amount, row.place_of_supply]
      : ['', '', '', '', '', '', '', ''];
    const esc = (v) => (v == null ? '' : `"${String(v).replace(/"/g, '""')}"`);
    const rest = vals.map(esc).join(',');
    for (const e of rowErrs) {
      lines.push([e.row, e.field, e.code, esc(e.value), rest].join(','));
    }
  }
  return header + lines.join('\n');
}

