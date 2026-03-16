import { Bar, BarChart, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from 'recharts'

const STATUS_COLORS = ['#4ade80', '#60a5fa', '#f97373', '#fbbf24']

export function AnalyticsTab({ summary }) {
  return (
    <div className="analytics">
      <div className="summary-row">
        <div className="metric-card primary">
          <div className="metric-label">Imported invoices</div>
          <div className="metric-value">{summary.totals.imported}</div>
        </div>
        <div className="metric-card warn">
          <div className="metric-label">Warnings</div>
          <div className="metric-value">{summary.totals.warnings}</div>
        </div>
        <div className="metric-card err">
          <div className="metric-label">Errors</div>
          <div className="metric-value">{summary.totals.errors}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Import quality over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={summary.trend}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="imported" stroke="#22c55e" />
              <Line type="monotone" dataKey="errors" stroke="#f97373" />
            </LineChart>
          </ResponsiveContainer>
        </div>

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
          <h3>Errors / warnings per job</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={summary.byJobErrors}>
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

