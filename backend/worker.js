import fs from 'fs';
import path from 'path';
import { getDb } from './db.js';
import { parseFile } from './utils/parser.js';
import { validateRow } from './utils/validation.js';

const db = getDb();

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processNextJob() {
  const batch = db
    .prepare(
      `SELECT * FROM import_batch
       WHERE status IN ('queued','processing')
       ORDER BY created_at
       LIMIT 1`
    )
    .get();

  if (!batch) {
    await sleep(2000);
    return;
  }

  db.prepare(
    `UPDATE import_batch
       SET status='processing', updated_at=datetime('now')
     WHERE id = ?`
  ).run(batch.id);

  try {
    const fileBuf = fs.readFileSync(batch.file_path);
    const ext = path.extname(batch.file_path).toLowerCase();
    const mime =
      ext === '.xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'text/csv';
    const { rows } = parseFile(fileBuf, mime, path.basename(batch.file_path));

    const total = rows.length;
    let processed = 0;
    let success = 0;
    let errorCount = 0;
    let warningCount = 0;

    const insertInvoice = db.prepare(
      `INSERT INTO invoice (
        batch_id,row_number,supplier_gstin,invoice_number,invoice_date,
        taxable_amount,igst_amount,cgst_amount,sgst_amount,place_of_supply
      ) VALUES (?,?,?,?,?,?,?,?,?,?)`
    );
    const insertError = db.prepare(
      `INSERT INTO import_error (batch_id,row_number,field,code,value)
       VALUES (?,?,?,?,?)`
    );

    for (const row of rows) {
      processed += 1;
      const { errors, warnings } = validateRow(row);
      insertInvoice.run(
        batch.id,
        row._rowIndex,
        row.supplier_gstin,
        row.invoice_number,
        row.invoice_date,
        row.taxable_amount,
        row.igst_amount,
        row.cgst_amount,
        row.sgst_amount,
        row.place_of_supply
      );
      if (errors.length) {
        errorCount += 1;
        for (const e of errors) {
          insertError.run(batch.id, e.row, e.field, e.code, e.value);
        }
      } else {
        success += 1;
        // Only count warnings on rows that were imported (no errors)
        if (warnings.length) {
          warningCount += warnings.length;
        }
      }

      if (processed % 200 === 0) {
        db.prepare(
          `UPDATE import_batch
             SET total_rows = ?, processed_rows = ?,
                 success_count = ?, error_count = ?, warning_count = ?,
                 updated_at = datetime('now')
           WHERE id = ?`
        ).run(total, processed, success, errorCount, warningCount, batch.id);
      }
    }

    db.prepare(
      `UPDATE import_batch
         SET status='done',
             total_rows = ?, processed_rows = ?,
             success_count = ?, error_count = ?, warning_count = ?,
             updated_at = datetime('now')
       WHERE id = ?`
    ).run(total, processed, success, errorCount, warningCount, batch.id);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Worker failed for batch', batch.id, err);
    db.prepare(
      `UPDATE import_batch
         SET status='failed',
             error_message = ?,
             updated_at = datetime('now')
       WHERE id = ?`
    ).run(err.message, batch.id);
  }
}

async function run() {
  // eslint-disable-next-line no-console
  console.log('Worker started');
  // eslint-disable-next-line no-constant-condition
  while (true) {
    await processNextJob();
  }
}

run();

