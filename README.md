# GST Data Import

A full-stack GST Purchase Invoice Data Import tool for AP teams. Upload CSV or Excel files, validate against GST rules, and get row-level error reports plus analytics.

![GST Invoice Upload](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-f77268ae-f73e-4c6d-896e-e97d53e105d9.png>)
![Upload progress and preview](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-cfd8f1e8-42d0-4652-8e28-9aae90401e33.png>)
![Upload history](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-2c3541ce-18f3-4be7-9521-3c52e72352b7.png>)
![Analytics dashboard](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-ac7b8be1-4aee-485d-99e3-d7c1890d131f.png>)
![Worker status and polling](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-a45b33ed-1633-48cf-9108-01f750c6dd71.png>)
![Import summary and error details](</Users/somyadhaulya/.cursor/projects/Users-somyadhaulya-Documents-ma-main/assets/image-5584cbba-adb2-42e4-9b27-99064baf3076.png>)

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
| Database | SQLite |
| File     | Multer, PapaParse (CSV), xlsx (Excel) |

---

## API

REST API for upload, job status, result summary, paginated errors, and error CSV download.

| Method | Endpoint                                 | Description                                |
|--------|------------------------------------------|--------------------------------------------|
| POST   | `/api/import/upload`                     | Upload a CSV/Excel file                    |
| GET    | `/api/import`                            | List import jobs                           |
| GET    | `/api/import/:jobId/status`              | Get status of a specific import job        |
| GET    | `/api/import/:jobId/result`              | Get summary result of a specific job       |
| GET    | `/api/import/:jobId/errors`              | Get paginated errors for a specific job    |
| GET    | `/api/import/:jobId/errors.csv`          | Download errors as CSV for a specific job  |
| GET    | `/api/import/analytics/summary`          | Get analytics summary                      |
| GET    | `/api/import/template.csv`               | Download import template as CSV            |

