import { INVOICE_COLUMNS } from '../constants'

export function UploadTab({
  file,
  onFileChange,
  loading,
  preview,
  error,
  result,
  errorPage,
  onUpload,
  onErrorPageChange,
  onDownloadErrors,
  onRefreshResult
}) {
  return (
    <>
      <div className="upload-section">
        <div className="upload-field">
          <label htmlFor="import-file" className="field-label">
            Select import file
          </label>
          <input
            id="import-file"
            type="file"
            accept=".csv,.xlsx"
            onChange={onFileChange}
          />
          <p className="field-help">
            Accepted formats: CSV or Excel (.xlsx) with the required GST columns.
          </p>
        </div>
        <button type="button" onClick={onUpload} disabled={!file || loading}>
          {loading ? 'Importing...' : 'Upload & Import'}
        </button>
      </div>
      {!file && (
        <p className="empty-hint">Select a CSV or Excel file to get started.</p>
      )}

      {error && (
        <div className="error-box" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {preview.length > 0 && (
        <div className="preview-section">
          <h2>Preview (first 10 rows)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {INVOICE_COLUMNS.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>{row._rowIndex}</td>
                    {INVOICE_COLUMNS.map((col) => (
                      <td key={col}>{row[col] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {result && (
        <div className="result-section">
          <h2>Import Summary</h2>
          <div className="summary-cards">
            <div className="card">Total: {result.total_rows}</div>
            <div className="card success">Success: {result.success_count}</div>
            <div className="card err">Errors: {result.error_count}</div>
            {result.warning_count > 0 && (
              <div className="card warn">Warnings: {result.warning_count}</div>
            )}
          </div>
          {result.errors?.length > 0 && (
            <>
              <h3>Error details</h3>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Row</th>
                      <th>Field</th>
                      <th>Code</th>
                      <th>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.errors
                      .slice(errorPage.start, errorPage.end)
                      .map((e, i) => (
                        <tr key={i}>
                          <td>{e.row}</td>
                          <td>{e.field}</td>
                          <td>{e.code}</td>
                          <td>{e.value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              <div className="pagination">
                <button
                  type="button"
                  disabled={errorPage.index === 0}
                  onClick={() => onErrorPageChange(errorPage.index - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {errorPage.index + 1} of {errorPage.total || 1}
                </span>
                <button
                  type="button"
                  disabled={errorPage.index >= (errorPage.total || 1) - 1}
                  onClick={() => onErrorPageChange(errorPage.index + 1)}
                >
                  Next
                </button>
              </div>
              <button onClick={onDownloadErrors}>Download error report (CSV)</button>
            </>
          )}
          <button className="secondary" onClick={onRefreshResult}>Refresh result</button>
        </div>
      )}
    </>
  )
}

