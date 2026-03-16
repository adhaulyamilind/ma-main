import { useMemo, useState } from 'react'
import { Bar, BarChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'

const STATUS_COLORS = ['#4ade80', '#60a5fa', '#f97373', '#fbbf24']

export function AnalyticsTab({ summary }) {
  const [range, setRange] = useState('1d')

  const filteredTrend = useMemo(() => {
    if (!summary.trend || summary.trend.length === 0) return []
    const now = new Date()
    let windowMs
    if (range === '10m') windowMs = 10 * 60 * 1000
    else if (range === '1h') windowMs = 60 * 60 * 1000
    else if (range === '1d') windowMs = 24 * 60 * 60 * 1000
    else if (range === '1mo') windowMs = 30 * 24 * 60 * 60 * 1000
    else windowMs = null

    if (!windowMs) return summary.trend

    return summary.trend.filter((point) => {
      const ts = point.date ? new Date(point.date).getTime() : NaN
      if (Number.isNaN(ts)) return false
      return now.getTime() - ts <= windowMs
    })
  }, [summary.trend, range])

  return (
    <div className="analytics">
      <div className="summary-row">
        <div className="metric-card primary">
          <div className="metric-label">Imported invoices</div>
          <div className="metric-value metric-value--imported">{summary.totals.imported}</div>
        </div>
        <div className="metric-card warn">
          <div className="metric-label">Warnings</div>
          <div className="metric-value metric-value--warnings">{summary.totals.warnings}</div>
        </div>
        <div className="metric-card err">
          <div className="metric-label">Errors</div>
          <div className="metric-value metric-value--errors">{summary.totals.errors}</div>
        </div>
        {summary.jobStatusTotals && (
          <>
            <div className="metric-card">
              <div className="metric-label">Jobs pending</div>
              <div className="metric-value">{summary.jobStatusTotals.pending}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Jobs done</div>
              <div className="metric-value">{summary.jobStatusTotals.done}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Jobs failed</div>
              <div className="metric-value">{summary.jobStatusTotals.failed}</div>
            </div>
          </>
        )}
      </div>

      <div className="chart-card chart-card-wide">
        <div className="chart-header">
          <h3>Import quality over time</h3>
          <div className="chart-range-tabs" aria-label="Time range for import quality chart">
            <button
              type="button"
              className={range === '10m' ? 'range-pill active' : 'range-pill'}
              onClick={() => setRange('10m')}
            >
              10 min
            </button>
            <button
              type="button"
              className={range === '1h' ? 'range-pill active' : 'range-pill'}
              onClick={() => setRange('1h')}
            >
              1 hr
            </button>
            <button
              type="button"
              className={range === '1d' ? 'range-pill active' : 'range-pill'}
              onClick={() => setRange('1d')}
            >
              1 day
            </button>
            <button
              type="button"
              className={range === '1mo' ? 'range-pill active' : 'range-pill'}
              onClick={() => setRange('1mo')}
            >
              1 month
            </button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={filteredTrend}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="imported" stroke="#22c55e" dot />
              <Line type="monotone" dataKey="errors" stroke="#f97373" dot />
            </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Jobs by status</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={summary.statusData}
                dataKey="value"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {summary.statusData.map((entry, index) => (
                  <Cell key={entry.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Top error reasons</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.errorReasons} layout="vertical" margin={{ left: 60 }}>
              <XAxis type="number" />
              <YAxis dataKey="code" type="category" />
              <Tooltip />
              <Bar dataKey="count" fill="#f97373" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Supplier wise quality</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.supplierQuality}>
              <XAxis dataKey="supplier" tickFormatter={(v) => (v || '').slice(0, 6)} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="imported" stackId="a" fill="#22c55e" />
              <Bar dataKey="errors" stackId="a" fill="#f97373" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Place of supply mix</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.posMix}>
              <XAxis dataKey="pos" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#60a5fa" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Effective GST rate distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.rateBuckets}>
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#a855f7" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

