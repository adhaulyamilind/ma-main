import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts'
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
  const [jobs, setJobs] = useState([])
  const [activeTab, setActiveTab] = useState('upload')
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
      fetchJobs()
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

  const fetchJobs = async () => {
    try {
      const res = await fetch(`${API}/import`)
      if (!res.ok) return
      const data = await res.json()
      setJobs(data.jobs || [])
    } catch (_) {}
  }

  const viewJob = (id) => {
    setJobId(id)
    setResult(null)
    setErrorPage(0)
    fetchResult(id)
    setActiveTab('upload')
  }

  const jobsTableColumns = useMemo(
    () => [
      { header: 'Job ID', accessorKey: 'job_id' },
      { header: 'File', accessorKey: 'file_name' },
      { header: 'Uploaded at', accessorKey: 'uploaded_at' },
      { header: 'Status', accessorKey: 'status' },
      {
        header: 'Imported',
        accessorKey: 'imported'
      },
      {
        header: 'Warnings',
        accessorKey: 'warnings'
      },
      {
        header: 'Errors',
        accessorKey: 'errors'
      }
    ],
    []
  )

  const table = useReactTable({
    data: jobs,
    columns: jobsTableColumns,
    getCoreRowModel: getCoreRowModel()
  })

  const statusSummary = useMemo(() => {
    const counts = {}
    let totalImported = 0
    let totalErrors = 0
    let totalWarnings = 0
    jobs.forEach((j) => {
      counts[j.status] = (counts[j.status] || 0) + 1
      totalImported += j.imported || 0
      totalErrors += j.errors || 0
      totalWarnings += j.warnings || 0
    })
    const statusData = Object.entries(counts).map(([status, value]) => ({ status, value }))
    const byJobErrors = jobs.map((j) => ({
      job: j.job_id.slice(0, 6),
      errors: j.errors || 0,
      warnings: j.warnings || 0,
      imported: j.imported || 0
    }))
    return {
      statusData,
      byJobErrors,
      totals: { imported: totalImported, errors: totalErrors, warnings: totalWarnings }
    }
  }, [jobs])

  const columns = ['supplier_gstin', 'invoice_number', 'invoice_date', 'taxable_amount', 'igst_amount', 'cgst_amount', 'sgst_amount', 'place_of_supply']

  return (
    <div className="app">
      <h1>GST Purchase Invoice Import</h1>
      <p className="sub">Upload CSV or Excel file, and review past imports.</p>

      <div className="tabs">
        <button
          type="button"
          className={activeTab === 'upload' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('upload')}
        >
          Upload
        </button>
        <button
          type="button"
          className={activeTab === 'dashboard' ? 'tab active' : 'tab'}
          onClick={() => {
            setActiveTab('dashboard')
            fetchJobs()
          }}
        >
          Imports dashboard
        </button>
        <button
          type="button"
          className={activeTab === 'analytics' ? 'tab active' : 'tab'}
          onClick={() => {
            setActiveTab('analytics')
            fetchJobs()
          }}
        >
          Analytics
        </button>
      </div>

      {activeTab === 'upload' && (
        <>
          <div className="upload-section">
            <input type="file" accept=".csv,.xlsx" onChange={onFileChange} />
            <button onClick={upload} disabled={!file || loading}>
              {loading ? 'Importing...' : 'Upload & Import'}
            </button>
          </div>
          {!file && (
            <p className="empty-hint">Select a CSV or Excel file to get started.</p>
          )}
        </>
      )}

      {error && <div className="error-box">{error}</div>}

      {activeTab === 'upload' && preview.length > 0 && (
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

      {activeTab === 'upload' && result && (
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

      {activeTab === 'dashboard' && (
        <div className="preview-section">
          <div className="dashboard-header">
            <h2>Imports dashboard</h2>
            <button type="button" onClick={fetchJobs}>
              Refresh
            </button>
          </div>
          <div className="table-wrap">
            <table className="tan-table">
              <thead>
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((header) => (
                      <th key={header.id}>
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                    <th>Actions</th>
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id}>
                        {cell.column.id === 'uploaded_at'
                          ? new Date(cell.getValue()).toLocaleString()
                          : flexRender(cell.column.columnDef.cell ?? cell.column.columnDef.header, cell.getContext())}
                      </td>
                    ))}
                    <td>
                      <button type="button" onClick={() => viewJob(row.original.job_id)}>
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          window.open(`${API}/import/${row.original.job_id}/errors.csv`, '_blank')
                        }
                      >
                        Errors CSV
                      </button>
                    </td>
                  </tr>
                ))}
                {table.getRowModel().rows.length === 0 && (
                  <tr>
                    <td colSpan={jobsTableColumns.length + 1}>No imports yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics">
          <div className="summary-row">
            <div className="metric-card primary">
              <div className="metric-label">Imported invoices</div>
              <div className="metric-value">{statusSummary.totals.imported}</div>
            </div>
            <div className="metric-card warn">
              <div className="metric-label">Warnings</div>
              <div className="metric-value">{statusSummary.totals.warnings}</div>
            </div>
            <div className="metric-card err">
              <div className="metric-label">Errors</div>
              <div className="metric-value">{statusSummary.totals.errors}</div>
            </div>
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Jobs by status</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={statusSummary.statusData}
                    dataKey="value"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label
                  >
                    {statusSummary.statusData.map((entry, index) => {
                      const colors = ['#4ade80', '#60a5fa', '#f97373', '#fbbf24']
                      return <Cell key={entry.status} fill={colors[index % colors.length]} />
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-card">
              <h3>Errors / warnings per job</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusSummary.byJobErrors}>
                  <XAxis dataKey="job" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="imported" stackId="a" fill="#22c55e" />
                  <Bar dataKey="warnings" stackId="a" fill="#fbbf24" />
                  <Bar dataKey="errors" stackId="a" fill="#f97373" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
