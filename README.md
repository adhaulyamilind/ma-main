# GST Data Import

Full-stack GST Purchase Invoice Data Import (MastersIndia builder assignment).

## Run locally

- **Backend:** `cd backend && npm install && npm run dev` (runs on port 3001)
- **Frontend:** `cd frontend && npm install && npm run dev` (Vite proxy forwards `/api` to backend)

## Tech

- Frontend: React (Vite), JS
- Backend: Node, Express
- CSV/Excel parsing, validation for GSTIN, invoice, tax fields

## API

- `POST /api/import/upload` — upload file, returns job_id + preview
- `GET /api/import/:jobId/status` — job status
- `GET /api/import/:jobId/result` — summary + errors
- `GET /api/import/:jobId/errors.csv` — download error report
