import express from 'express';
import multer from 'multer';
import {
  buildErrorsCsv,
  createImportJob,
  getJob,
  getJobResult,
  getJobStatus,
  listJobs,
  getAnalytics
} from '../services/importService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.get('/template.csv', (req, res) => {
  const header = 'supplier_gstin,invoice_number,invoice_date,taxable_amount,igst_amount,cgst_amount,sgst_amount,place_of_supply\n';
  const sample = [
    '27AABCU9603R1ZX,INV-2024-001,15-10-2024,10000.00,1800.00,0.00,0.00,27',
    '29AABCU9603R1ZX,INV-2024-002,15-10-2024,5000.00,0.00,450.00,450.00,29',
    'INVALID_GSTIN,INV-2024-003,15-10-2024,8000.00,1440.00,0.00,0.00,27'
  ].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="gst-import-template.csv"');
  res.send(header + sample + '\n');
});

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  try {
    const taxPeriod = req.body?.tax_period || null;
    const { job, preview } = createImportJob(
      req.file.buffer,
      req.file.mimetype,
      req.file.originalname,
      taxPeriod
    );
    res.json({
      job_id: job.id,
      preview_rows: preview,
      summary: { total_rows: job.totalRows, valid: job.successCount, errors: job.errorCount }
    });
  } catch (err) {
    if (err.code === 'NO_ROWS') {
      return res.status(400).json({ error: err.message });
    }
    // eslint-disable-next-line no-console
    console.error('Import upload failed', err);
    return res.status(500).json({ error: 'Unexpected error while processing file' });
  }
});

router.get('/', (req, res) => {
  res.json({ jobs: listJobs() });
});

router.get('/analytics/summary', (req, res) => {
  res.json(getAnalytics());
});

router.get('/:jobId/status', (req, res) => {
  const status = getJobStatus(req.params.jobId);
  if (!status) return res.status(404).json({ error: 'Job not found' });
  res.json(status);
});

router.get('/:jobId/result', (req, res) => {
  const result = getJobResult(req.params.jobId);
  if (!result) return res.status(404).json({ error: 'Job not found' });
  res.json(result);
});

router.get('/:jobId/errors.csv', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="errors_${req.params.jobId}.csv"`);
  res.send(buildErrorsCsv(job));
});

export default router;
