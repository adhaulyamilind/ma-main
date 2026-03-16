# GST Data Import

A full-stack GST Purchase Invoice Data Import tool for AP teams. Upload CSV or Excel files, validate against GST rules, and get row-level error reports plus analytics.

---

## Quick start

**One-time setup (from repo root):**

```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

**Start everything (FE + BE + worker):**

```bash
npm start
```

- Frontend: http://localhost:5173 (Vite)
- Backend API: http://localhost:3001

**Start only frontend:**

```bash
cd frontend && npm run dev
```

**Start only backend:**

```bash
cd backend && npm run dev
```

**Run the import worker (processes queued jobs):**

```bash
cd backend && npm run worker
```

For a full run you need both the API server and the worker; `npm start` at the root starts all three.

---

## Tech stack

| Layer    | Stack |
|----------|--------|
| Frontend | React (Vite), JavaScript, TanStack Table, Recharts |
| Backend  | Node.js, Express |
| Database | SQLite (better-sqlite3) |
| File     | Multer, PapaParse (CSV), xlsx (Excel) |

---

## API

REST API for upload, job status, result summary, paginated errors, and error CSV download. Endpoints: `POST /api/import/upload`, `GET /api/import`, `GET /api/import/:jobId/status`, `GET /api/import/:jobId/result`, `GET /api/import/:jobId/errors`, `GET /api/import/:jobId/errors.csv`, `GET /api/import/analytics/summary`, `GET /api/import/template.csv`.
