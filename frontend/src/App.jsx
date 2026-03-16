import { useMemo, useState } from 'react'
import './App.css'
import { ERROR_PAGE_SIZE } from './constants'
import { uploadInvoiceFile, fetchJobsApi, fetchJobResult, errorsCsvUrl, fetchAnalyticsSummary } from './api/importApi'
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
      const data = await uploadInvoiceFile(file)
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
        <header className="page-header">
          <h1>GST Purchase Invoice Import</h1>
          <p className="sub">
            Upload purchase invoices, see row-wise validation, and download error reports for corrections.
          </p>
          <ul className="feature-list">
            <li>Step 1: Upload a CSV or Excel file in the expected format.</li>
            <li>Step 2: Review the preview and import summary.</li>
            <li>Step 3: Download the Errors CSV to fix issues in your source system.</li>
          </ul>
        </header>

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

        {activeTab === 'upload' && (
          <UploadTab
            file={file}
            onFileChange={onFileChange}
            loading={loading}
            preview={preview}
            error={error}
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
        <AnalyticsTab summary={analytics || { ...statusSummary, trend: [], errorReasons: [], supplierQuality: [], posMix: [], rateBuckets: [] }} />
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
