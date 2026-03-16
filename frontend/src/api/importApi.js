import { API_BASE } from '../constants'

export async function uploadInvoiceFile(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${API_BASE}/import/upload`, {
    method: 'POST',
    body: form
  })
  if (!res.ok) {
    let message = res.statusText
    try {
      const data = await res.json()
      if (data && data.error) message = data.error
    } catch (_) {}
    const err = new Error(message)
    err.status = res.status
    throw err
  }
  return res.json()
}

export async function fetchJobsApi() {
  const res = await fetch(`${API_BASE}/import`)
  if (!res.ok) return { jobs: [] }
  return res.json()
}

export async function fetchJobResult(jobId) {
  const res = await fetch(`${API_BASE}/import/${jobId}/result`)
  if (!res.ok) {
    const err = new Error('Failed to fetch job result')
    err.status = res.status
    throw err
  }
  return res.json()
}

export function errorsCsvUrl(jobId) {
  return `${API_BASE}/import/${jobId}/errors.csv`
}

export async function fetchAnalyticsSummary() {
  const res = await fetch(`${API_BASE}/import/analytics/summary`)
  if (!res.ok) {
    return {
      totals: { imported: 0, errors: 0, warnings: 0 },
      statusData: [],
      byJobErrors: [],
      trend: [],
      errorReasons: [],
      supplierQuality: [],
      posMix: [],
      rateBuckets: []
    }
  }
  return res.json()
}

