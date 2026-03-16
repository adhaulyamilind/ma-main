import { useMemo, useRef, useState } from 'react'
import './App.css'
import { ERROR_PAGE_SIZE } from './constants'
import { uploadInvoiceFile, fetchJobsApi, fetchJobResult, errorsCsvUrl, fetchAnalyticsSummary, fetchJobStatus } from './api/importApi'
import { Tabs } from './components/Tabs'
import { UploadTab } from './components/UploadTab'
import { JobsDashboard } from './components/JobsDashboard'
import { AnalyticsTab } from './components/AnalyticsTab'

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
  const [analytics, setAnalytics] = useState(null)
  const [jobStatus, setJobStatus] = useState(null)
  const statusPollRef = useRef(null)

  const onFileChange = (e) => {
    const f = e.target.files?.[0]
    setFile(f)
    setPreview([])
    setResult(null)
    setError(null)
    setJobId(null)
    setErrorPage(0)
    setJobStatus(null)
  }

  const upload = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await uploadInvoiceFile(file)
      setJobId(data.job_id)
      setPreview(data.preview_rows || [])
      setResult(null)
      startStatusPolling(data.job_id)
      fetchJobs()
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const fetchResult = async (id) => {
    try {
      const data = await fetchJobResult(id)
      setResult(data)
    } catch (_) {}
  }

  const loadResult = () => {
    if (jobId) fetchResult(jobId)
  }

  const downloadErrors = () => {
    if (!jobId) return
    window.open(errorsCsvUrl(jobId), '_blank')
  }

  const fetchJobs = async () => {
    try {
      const data = await fetchJobsApi()
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

  const stopStatusPolling = () => {
    if (statusPollRef.current) {
      clearInterval(statusPollRef.current)
      statusPollRef.current = null
    }
  }

  const pollStatusOnce = async (id) => {
    try {
      const data = await fetchJobStatus(id)
      setJobStatus(data)
      if (data.status === 'done' || data.status === 'failed') {
        stopStatusPolling()
        fetchResult(id)
        fetchJobs()
      }
    } catch (_) {
      // ignore transient status errors
    }
  }

  const startStatusPolling = (id) => {
    setJobStatus({ job_id: id, status: 'queued', processed_rows: 0, total_rows: 0 })
    stopStatusPolling()
    pollStatusOnce(id)
    const timer = setInterval(() => pollStatusOnce(id), 2000)
    statusPollRef.current = timer
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
      <div className="app-inner" aria-label="GST purchase invoice import dashboard">
        <header className="top-nav">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true" />
            <div>
              <div className="brand-name">GST Reconciliation Tool</div>
            </div>
          </div>
          <Tabs
            active={activeTab}
            onChange={(tab) => {
              setActiveTab(tab)
              if (tab === 'dashboard') fetchJobs()
              if (tab === 'analytics') {
                fetchJobs()
                fetchAnalyticsSummary().then(setAnalytics).catch(() => {})
              }
            }}
          />
          <button className="avatar-pill" type="button" aria-label="User profile menu">
            <span className="avatar-circle" aria-hidden="true">
              MA
            </span>
            <span className="avatar-name">Milind</span>
          </button>
        </header>

        <section className="page-header">
          
          {activeTab === 'upload' && (
            <>
              <h1>GST Invoice Upload</h1>
              <p className="sub">
                Upload purchase invoices once, let the tool handle row‑level validation, and keep finance teams in sync.
              </p>
              <ul className="feature-list">
                <li>Upload CSV or Excel in the recommended GST template.</li>
                <li>Track each import in real time with clear progress and statuses.</li>
                <li>Export error CSVs that you can share with vendors or internal owners.</li>
              </ul>
            </>
          )}
          {activeTab === 'dashboard' && (
            <>
              <h1>GST Invoice Details</h1>
              <p className="sub">
                Review the full history of imports, drill into individual jobs, and quickly spot files that need attention.
              </p>
              <ul className="feature-list">
                <li>Search by Job ID or file name to locate a past upload in seconds.</li>
                <li>Filter by pending, failed, or warning‑heavy jobs to prioritise follow‑ups.</li>
                <li>Download the original file or its error CSV for audit and correction workflows.</li>
              </ul>
            </>
          )}
        </section>

        {activeTab === 'upload' && (
          <UploadTab
            file={file}
            onFileChange={onFileChange}
            loading={loading}
            preview={preview}
            error={error}
            jobStatus={jobStatus}
            result={result}
            errorPage={{
              index: errorPage,
              start: errorPage * ERROR_PAGE_SIZE,
              end: (errorPage + 1) * ERROR_PAGE_SIZE,
              total: result?.errors ? Math.ceil(result.errors.length / ERROR_PAGE_SIZE) : 0
            }}
            onUpload={upload}
            onErrorPageChange={setErrorPage}
            onDownloadErrors={downloadErrors}
            onRefreshResult={loadResult}
          />
        )}

        {activeTab === 'dashboard' && (
          <JobsDashboard
            jobs={jobs}
            columns={jobsTableColumns}
            onRefresh={fetchJobs}
            onViewJob={viewJob}
          />
        )}

        {activeTab === 'analytics' && (
        <AnalyticsTab summary={analytics || { ...statusSummary, jobStatusTotals: null, trend: [], errorReasons: [], supplierQuality: [], posMix: [], rateBuckets: [] }} />
        )}
      </div>

      <a
        className="floating-template-link"
        href="/api/import/template.csv"
        target="_blank"
        rel="noreferrer"
      >
        Download sample CSV
      </a>
    </div>
  )
}
