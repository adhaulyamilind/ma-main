/**
 * Generates test-files/dummy100k.csv
 * - 100,000 total rows
 * - 24,000 rows with errors (multiple types, no ERR_GSTIN_INVALID)
 * - No warning cases
 */
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'test-files', 'dummy100k.csv');
const TOTAL_ROWS = 100_000;
const ERROR_ROWS = 24_000;

const HEADER = 'supplier_gstin,invoice_number,invoice_date,taxable_amount,igst_amount,cgst_amount,sgst_amount,place_of_supply\n';

const VALID_GSTIN = '27AABCU9603R1ZX';
const VALID_DATE = '18-10-2024';
const VALID_POS = '27';

function row(arr) {
  return arr.map((v) => (typeof v === 'number' ? String(v) : v)).join(',') + '\n';
}

const ERROR_GENERATORS = [
  (r) => ['INV-LONG' + String(r).padStart(9, '0'), VALID_DATE, 1000, 180, 0, 0, VALID_POS],
  (r) => ['INV-F' + String(r).padStart(5, '0'), '18-10-2030', 1000, 180, 0, 0, VALID_POS],
  (r) => ['INV-A' + String(r).padStart(5, '0'), VALID_DATE, 0, 0, 0, 0, VALID_POS],
  (r) => ['INV-C' + String(r).padStart(5, '0'), VALID_DATE, 1000, 180, 50, 50, VALID_POS],
  (r) => ['INV-M' + String(r).padStart(5, '0'), VALID_DATE, 1000, 0, 50, 60, VALID_POS],
  (r) => ['INV-P' + String(r).padStart(5, '0'), VALID_DATE, 1000, 180, 0, 0, '99'],
];

const stream = fs.createWriteStream(OUT, { encoding: 'utf8' });
stream.write(HEADER);

const validCount = TOTAL_ROWS - ERROR_ROWS;
let validInvIndex = 0;

for (let r = 1; r <= TOTAL_ROWS; r++) {
  let line;
  if (r <= validCount) {
    const inv = 'INV-' + String(validInvIndex++).padStart(6, '0');
    line = row([VALID_GSTIN, inv, VALID_DATE, 1000, 180, 0, 0, VALID_POS]);
  } else {
    const errIndex = r - validCount - 1;
    const gen = ERROR_GENERATORS[errIndex % ERROR_GENERATORS.length];
    const parts = gen(r);
    line = row([VALID_GSTIN, ...parts]);
  }
  stream.write(line);
  if (r % 10000 === 0) process.stdout.write('\rWritten ' + r + '/' + TOTAL_ROWS);
}

stream.end(() => {
  console.log('\nDone. ' + OUT);
});
