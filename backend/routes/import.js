import express from 'express';
import multer from 'multer';
import {
  buildErrorsCsv,
  createImportJob,
  getJob,
  getJobResult,
  getJobStatus,
  listJobs
} from '../services/importService.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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
