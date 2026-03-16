import { useState } from 'react'
import './App.css'

const API = '/api'

export default function App() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState([])
  const [jobId, setJobId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const [errorPage, setErrorPage] = useState(0)
  const ERROR_PAGE_SIZE = 10

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    setFile(f)
    setPreview([])
    setResult(null)
    setError(null)
    setJobId(null)
    setErrorPage(0)
  }

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch(`${API}/import/upload`, {
        method: 'POST',
        body: form
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || res.statusText)
      }
      const data = await res.json()
      setJobId(data.job_id)
      setPreview(data.preview_rows || [])
      setResult(null)
      fetchResult(data.job_id)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const fetchResult = async (id) => {
    try {
      const res = await fetch(`${API}/import/${id}/result`)
      if (res.ok) {
        const data = await res.json()
        setResult(data)
      }
    } catch (_) {}
  }

  const loadResult = () => {
    if (jobId) fetchResult(jobId)
  }

  const downloadErrors = () => {
    if (!jobId) return
    window.open(`${API}/import/${jobId}/errors.csv`, '_blank')
  }

  const columns = ['supplier_gstin', 'invoice_number', 'invoice_date', 'taxable_amount', 'igst_amount', 'cgst_amount', 'sgst_amount', 'place_of_supply']

  return (
    <div className="app">
      <h1>GST Purchase Invoice Import</h1>
      <p className="sub">Upload CSV or Excel file to import purchase invoices.</p>

      <div className="upload-section">
        <input type="file" accept=".csv,.xlsx" onChange={onFileChange} />
        <button onClick={upload} disabled={!file || loading}>
          {loading ? 'Importing...' : 'Upload & Import'}
        </button>
      </div>
      {!file && (
        <p className="empty-hint">Select a CSV or Excel file to get started.</p>
      )}

      {error && <div className="error-box">{error}</div>}

      {preview.length > 0 && (
        <div className="preview-section">
          <h2>Preview (first 10 rows)</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  {columns.map((c) => <th key={c}>{c}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i}>
                    <td>{row._rowIndex}</td>
                    {columns.map((col) => (
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
                      .slice(errorPage * ERROR_PAGE_SIZE, (errorPage + 1) * ERROR_PAGE_SIZE)
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
                  disabled={errorPage === 0}
                  onClick={() => setErrorPage((p) => p - 1)}
                >
                  Prev
                </button>
                <span>
                  Page {errorPage + 1} of {Math.ceil(result.errors.length / ERROR_PAGE_SIZE) || 1}
                </span>
                <button
                  type="button"
                  disabled={errorPage >= Math.ceil(result.errors.length / ERROR_PAGE_SIZE) - 1}
                  onClick={() => setErrorPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
              <button onClick={downloadErrors}>Download error report (CSV)</button>
            </>
          )}
          <button className="secondary" onClick={loadResult}>Refresh result</button>
        </div>
      )}
    </div>
  )
}
