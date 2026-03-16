import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db;

export function getDb() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'import.db');
    db = new Database(dbPath);
    initSchema();
  }
  return db;
}

function initSchema() {
  const db = getDbInternal();
  db.exec(`
    CREATE TABLE IF NOT EXISTS import_batch (
      id TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      total_rows INTEGER DEFAULT 0,
      processed_rows INTEGER DEFAULT 0,
      success_count INTEGER DEFAULT 0,
      error_count INTEGER DEFAULT 0,
      warning_count INTEGER DEFAULT 0,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS invoice (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      supplier_gstin TEXT,
      invoice_number TEXT,
      invoice_date TEXT,
      taxable_amount TEXT,
      igst_amount TEXT,
      cgst_amount TEXT,
      sgst_amount TEXT,
      place_of_supply TEXT
    );

    CREATE TABLE IF NOT EXISTS import_error (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      batch_id TEXT NOT NULL,
      row_number INTEGER NOT NULL,
      field TEXT NOT NULL,
      code TEXT NOT NULL,
      value TEXT
    );
  `);

  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
  }
}

function getDbInternal() {
  if (!db) {
    const dbPath = path.join(process.cwd(), 'import.db');
    db = new Database(dbPath);
  }
  return db;
}

