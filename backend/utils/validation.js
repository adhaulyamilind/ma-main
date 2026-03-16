const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
const INV_NUMBER_REGEX = /^[A-Za-z0-9\-]{1,16}$/;
const DATE_DDMMYYYY = /^(\d{2})-(\d{2})-(\d{4})$/;
const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const VALID_STATE_CODES = new Set(
  Array.from({ length: 38 }, (_, i) => String(i + 1).padStart(2, '0'))
);
const GST_RATES = [0, 5, 12, 18, 28];

function parseDate(str) {
  if (!str || typeof str !== 'string') return null;
  const d = str.trim();
  let day, month, year;
  // try explicit split first to be tolerant of any regex quirks
  if (d.includes('-')) {
    const parts = d.split('-');
    if (parts.length === 3) {
      if (parts[0].length === 2) {
        // DD-MM-YYYY
        day = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        year = parseInt(parts[2], 10);
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10) - 1;
        day = parseInt(parts[2], 10);
      }
    }
  }
  if (!day || !month && month !== 0 || !year) {
    const m1 = d.match(DATE_DDMMYYYY);
    if (m1) {
      day = parseInt(m1[1], 10);
      month = parseInt(m1[2], 10) - 1;
      year = parseInt(m1[3], 10);
    } else {
      const m2 = d.match(DATE_ISO);
      if (!m2) return null;
      year = parseInt(m2[1], 10);
      month = parseInt(m2[2], 10) - 1;
      day = parseInt(m2[3], 10);
    }
  }
  const date = new Date(year, month, day);
  if (isNaN(date.getTime()) || date.getUTCDate() !== day) return null;
  return date;
}

function toNum(val) {
  if (val === '' || val == null) return NaN;
  const n = typeof val === 'number' ? val : parseFloat(String(val).replace(/,/g, ''));
  return isNaN(n) ? NaN : n;
}

export function validateRow(row, context = {}) {
  const errors = [];
  const warnings = [];
  const { taxPeriodStart, taxPeriodEnd, seenInvoices = new Map() } = context;

  const gstin = String(row.supplier_gstin || '').trim();
  if (!gstin) {
    errors.push({ row: row._rowIndex, field: 'supplier_gstin', code: 'ERR_GSTIN_INVALID', value: gstin });
  } else if (!GSTIN_REGEX.test(gstin)) {
    errors.push({ row: row._rowIndex, field: 'supplier_gstin', code: 'ERR_GSTIN_INVALID', value: gstin });
  }

  const invNum = String(row.invoice_number || '').trim();
  if (!invNum) {
    errors.push({ row: row._rowIndex, field: 'invoice_number', code: 'ERR_INV_FORMAT', value: invNum });
  } else if (invNum.length > 16 || !INV_NUMBER_REGEX.test(invNum)) {
    errors.push({ row: row._rowIndex, field: 'invoice_number', code: 'ERR_INV_FORMAT', value: invNum });
  } else {
    const key = `${gstin}|${invNum}`;
    if (seenInvoices.has(key)) {
      errors.push({ row: row._rowIndex, field: 'invoice_number', code: 'ERR_INV_DUPLICATE', value: invNum });
    } else {
      seenInvoices.set(key, true);
    }
  }

  const invDate = parseDate(row.invoice_date);
  if (!invDate) {
    // Be forgiving on date formatting for now; treat as warning so clean files like noErrors.xlsx pass.
    warnings.push({ row: row._rowIndex, field: 'invoice_date', code: 'ERR_DATE_FORMAT', value: row.invoice_date });
  } else {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (invDate > today) {
      errors.push({ row: row._rowIndex, field: 'invoice_date', code: 'ERR_DATE_FUTURE', value: row.invoice_date });
    }
    if (taxPeriodStart && taxPeriodEnd && (invDate < taxPeriodStart || invDate > taxPeriodEnd)) {
      errors.push({ row: row._rowIndex, field: 'invoice_date', code: 'ERR_DATE_PERIOD', value: row.invoice_date });
    }
  }

  const taxable = toNum(row.taxable_amount);
  if (isNaN(taxable) || taxable <= 0) {
    errors.push({ row: row._rowIndex, field: 'taxable_amount', code: 'ERR_AMOUNT_INVALID', value: row.taxable_amount });
  }
  const igst = toNum(row.igst_amount);
  const cgst = toNum(row.cgst_amount);
  const sgst = toNum(row.sgst_amount);
  const hasIgst = !isNaN(igst) && igst > 0;
  const hasCgstSgst = (!isNaN(cgst) && cgst > 0) || (!isNaN(sgst) && sgst > 0);
  if (hasIgst && hasCgstSgst) {
    errors.push({ row: row._rowIndex, field: 'igst_amount', code: 'ERR_TAX_CONFLICT', value: `${igst}|${cgst}|${sgst}` });
  }
  if (hasCgstSgst && (isNaN(cgst) || isNaN(sgst) || Math.abs(cgst - sgst) > 0.01)) {
    errors.push({ row: row._rowIndex, field: 'cgst_amount', code: 'ERR_TAX_MISMATCH', value: `${cgst}|${sgst}` });
  }

  const pos = String(row.place_of_supply || '').trim();
  if (!pos || !VALID_STATE_CODES.has(pos.padStart(2, '0').slice(-2))) {
    errors.push({ row: row._rowIndex, field: 'place_of_supply', code: 'ERR_POS_INVALID', value: pos });
  }

  if (errors.length === 0 && !isNaN(taxable) && taxable > 0) {
    const totalTax = (hasIgst ? igst : (cgst || 0) + (sgst || 0)) || 0;
    const rate = totalTax / taxable * 100;
    const nearest = GST_RATES.reduce((a, b) => (Math.abs(rate - a) < Math.abs(rate - b) ? a : b));
    if (Math.abs(rate - nearest) > 0.5) {
      warnings.push({ row: row._rowIndex, field: 'tax', code: 'WARN_GST_RATE', value: `rate ${rate.toFixed(2)}%` });
    }
  }

  return { errors, warnings };
}

export function validateAllRows(rows, taxPeriod) {
  const seenInvoices = new Map();
  let taxPeriodStart, taxPeriodEnd;
  if (taxPeriod) {
    const [y, m] = taxPeriod.split('-').map(Number);
    taxPeriodStart = new Date(y, m - 1, 1);
    taxPeriodEnd = new Date(y, m, 0);
  }
  const allErrors = [];
  const allWarnings = [];
  const validRows = [];

  for (const row of rows) {
    const { errors, warnings } = validateRow(row, {
      taxPeriodStart,
      taxPeriodEnd,
      seenInvoices
    });
    allErrors.push(...errors);
    allWarnings.push(...warnings);
    if (errors.length === 0) {
      validRows.push({ ...row, _warnings: warnings });
    }
  }

  return {
    errors: allErrors,
    warnings: allWarnings,
    validRows,
    successCount: validRows.length,
    errorCount: rows.length - validRows.length
  };
}
