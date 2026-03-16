import express from 'express';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// in-memory store for demo (replace with DB later)
const jobs = new Map();

router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  const jobId = `job_${Date.now()}`;
  jobs.set(jobId, {
    status: 'pending',
    totalRows: 0,
    successCount: 0,
    errorCount: 0,
    errors: [],
    preview: []
  });
  // TODO: parse file and validate, then update job
  const job = jobs.get(jobId);
  job.status = 'done';
  job.preview = [];
  res.json({ job_id: jobId, preview_rows: [], summary: { total_rows: 0 } });
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
    errors: job.errors
  });
});

router.get('/:jobId/errors.csv', (req, res) => {
  const job = jobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="errors_${req.params.jobId}.csv"`);
  res.send('row,field,code,value\n'); // stub
});

export default router;
