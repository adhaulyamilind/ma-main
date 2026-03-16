import express from 'express';
import multer from 'multer';
import { parseFile } from '../utils/parser.js';
import { validateAllRows } from '../utils/validation.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const jobs = new Map();

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const jobId = `job_${Date.now()}`;
  const taxPeriod = req.body?.tax_period || null;
  const { rows } = parseFile(req.file.buffer, req.file.mimetype, req.file.originalname);
  if (!rows || rows.length === 0) {
    return res.status(400).json({ error: 'No valid rows in file' });
  }
  const { errors, warnings, validRows, successCount, errorCount } = validateAllRows(rows, taxPeriod);
  const preview = rows.slice(0, 10);
  jobs.set(jobId, {
    id: jobId,
    fileName: req.file.originalname,
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
  });
  res.json({
    job_id: jobId,
    preview_rows: preview,
    summary: { total_rows: rows.length, valid: successCount, errors: errorCount }
  });
});

router.get('/', (req, res) => {
  const list = Array.from(jobs.values())
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
  res.json({ jobs: list });
});

router.get('/:jobId/status', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    job_id: req.params.jobId,
    status: job.status,
    processed_rows: job.successCount + job.errorCount,
    total_rows: job.totalRows
  });
});

router.get('/:jobId/result', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    job_id: req.params.jobId,
    status: job.status,
    total_rows: job.totalRows,
    success_count: job.successCount,
    error_count: job.errorCount,
    warning_count: job.warningCount || 0,
    errors: job.errors,
    warnings: job.warnings || []
  });
});

function buildErrorsCsv(job) {
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
    const codes = rowErrs.map((e) => e.code).join('; ');
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

router.get('/:jobId/errors.csv', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="errors_${req.params.jobId}.csv"`);
  res.send(buildErrorsCsv(job));
});

export default router;
