export function HelpPage({ onBack }) {
  return (
    <div className="help-page">
      <div className="help-header">
        <h1>Help — GST Import Tool</h1>
        <p className="sub">A short guide for non-technical users</p>
        <button type="button" className="help-back" onClick={onBack}>
          ← Back to dashboard
        </button>
      </div>

      <section className="help-section">
        <ol className="help-steps">
          <li><strong>Upload a file</strong> — Use the first tab (Upload). Choose a CSV or Excel (.xlsx) file that contains your purchase invoice data in the required format.</li>
          <li><strong>Check the preview</strong> — After selecting a file, you’ll see the first 10 rows. This helps you confirm the file is correct before importing.</li>
          <li><strong>Start the import</strong> — Click “Upload & Import”. You’ll see a progress indicator while the file is processed.</li>
          <li><strong>Review the summary</strong> — When done, you’ll see total rows, how many were successful, how many had errors, and how many had warnings.</li>
          <li><strong>Fix errors</strong> — If there are errors, use the “Error CSV” download to get a report. Fix the issues in your source file or system and upload again if needed.</li>
        </ol>
      </section>

      <section className="help-section">
        <h2>Error Code Message</h2>
        <p className="help-intro">When a row fails validation, you’ll see a code in the Error details table. Use this table to fix the data.</p>
        <div className="table-wrap">
          <table className="help-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>ERR_GSTIN_INVALID</td><td>Supplier GSTIN is missing or doesn’t match the correct format (15 characters, e.g. 27AABCU9603R1ZX). Check the GSTIN in your file.</td></tr>
              <tr><td>ERR_INV_FORMAT</td><td>Invoice number is missing, longer than 16 characters, or contains invalid characters. Use only letters, numbers, and hyphens, and keep it within 16 characters.</td></tr>
              <tr><td>ERR_INV_DUPLICATE</td><td>The same invoice number appears more than once for the same supplier in the file. Remove or correct the duplicate.</td></tr>
              <tr><td>ERR_DATE_FORMAT</td><td>Invoice date is in an unexpected format. Use DD-MM-YYYY (e.g. 18-10-2024) or YYYY-MM-DD. This may be shown as a warning in some cases.</td></tr>
              <tr><td>ERR_DATE_FUTURE</td><td>Invoice date is in the future. Use a date that is today or in the past.</td></tr>
              <tr><td>ERR_DATE_PERIOD</td><td>Invoice date falls outside the selected tax period. Ensure the date is within the correct month/quarter for your return.</td></tr>
              <tr><td>ERR_AMOUNT_INVALID</td><td>Taxable amount is missing, zero, or not a valid number. It must be a positive number (e.g. 1000.00).</td></tr>
              <tr><td>ERR_TAX_CONFLICT</td><td>Both IGST and CGST/SGST are filled for the same row. For inter-state supply use only IGST; for intra-state use only CGST and SGST (and they must be equal).</td></tr>
              <tr><td>ERR_TAX_MISMATCH</td><td>CGST and SGST are not equal, or one is missing when the other is present. For intra-state supply, CGST and SGST must be the same amount.</td></tr>
              <tr><td>ERR_POS_INVALID</td><td>Place of supply is missing or not a valid state code. Use a 2-digit code from 01 to 38 (e.g. 27 for Maharashtra).</td></tr>
              <tr><td>WARN_GST_RATE</td><td>Warning only: the tax amount doesn’t match a standard GST rate (0%, 5%, 12%, 18%, 28%) applied to the taxable amount. The row can still be imported; review if the rate is correct.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="help-section">
        <h2>Terminology</h2>
        <div className="table-wrap">
          <table className="help-table">
            <thead>
              <tr>
                <th>Term</th>
                <th>Meaning</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>GSTIN</td><td>Goods and Services Tax Identification Number — a 15-character number that identifies a business for GST. The first 2 digits are the state code.</td></tr>
              <tr><td>IGST</td><td>Integrated GST — charged on inter-state (between states) supplies. Only IGST should be non-zero for such invoices.</td></tr>
              <tr><td>CGST & SGST</td><td>Central GST and State GST — charged on intra-state (within the same state) supplies. Both must be equal and cannot be used together with IGST on the same row.</td></tr>
              <tr><td>Place of supply</td><td>Determines whether a transaction is intra-state or inter-state. It drives whether IGST or CGST+SGST applies.</td></tr>
              <tr><td>Tax period</td><td>GST returns are filed monthly or quarterly. Invoices must fall within the correct period for ITC (input tax credit) eligibility.</td></tr>
              <tr><td>GSTR-2B</td><td>An auto-populated statement on the GST portal showing inward supplies. Imported data is reconciled against this to claim ITC.</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="help-section">
        <h2>Expected file format</h2>
        <p>Your CSV or Excel file must have these column headers:</p>
        <code className="help-code">supplier_gstin, invoice_number, invoice_date, taxable_amount, igst_amount, cgst_amount, sgst_amount, place_of_supply</code>
        <p>Use the “Download sample CSV” link at the bottom of the page to get a template with example rows.</p>
      </section>
    </div>
  )
}
