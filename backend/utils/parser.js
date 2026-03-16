import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const EXPECTED_HEADERS = [
  'supplier_gstin',
  'invoice_number',
  'invoice_date',
  'taxable_amount',
  'igst_amount',
  'cgst_amount',
  'sgst_amount',
  'place_of_supply'
];

function normalizeKey(k) {
  return String(k).toLowerCase().trim().replace(/\s+/g, '_');
}

function normalizeHeaders(row) {
  const keyMap = {};
  for (const k of Object.keys(row)) keyMap[normalizeKey(k)] = row[k];
  const normalized = {};
  for (const h of EXPECTED_HEADERS) {
    const val = keyMap[normalizeKey(h)] ?? row[h] ?? '';
    normalized[h] = typeof val === 'string' ? String(val).trim() : String(val);
  }
  return normalized;
}

function parseCsv(buffer) {
  const str = buffer.toString('utf-8');
  const parsed = Papa.parse(str, { header: true, skipEmptyLines: true });
  return parsed.data || [];
}

function parseXlsx(buffer) {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

export function parseFile(buffer, mimeType = '', filename = '') {
  const isExcel =
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    /\.xlsx$/i.test(filename || '');
  const rawRows = isExcel ? parseXlsx(buffer) : parseCsv(buffer);
  if (!rawRows.length) {
    return { rows: [] };
  }
  const rows = rawRows.map((row, i) => ({
    _rowIndex: i + 2,
    ...normalizeHeaders(row)
  }));
  return { rows };
}
