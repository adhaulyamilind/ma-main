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

