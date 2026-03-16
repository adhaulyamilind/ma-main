import Papa from 'papaparse';

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

export function parseFile(buffer, mimeType) {
  const str = buffer.toString('utf-8');
  const parsed = Papa.parse(str, { header: true, skipEmptyLines: true });
  if (!parsed.data || !parsed.data.length) {
    return { rows: [], errors: [{ message: 'No data rows found' }] };
  }
  const rows = parsed.data.map((row, i) => ({
    _rowIndex: i + 2,
    ...normalizeHeaders(row)
  }));
  return { rows };
}
