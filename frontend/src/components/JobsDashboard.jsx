import { useState, useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { errorsCsvUrl } from '../api/importApi'

export function JobsDashboard({ jobs, columns, onRefresh, onViewJob }) {
  const [query, setQuery] = useState('')
  const filteredJobs = useMemo(() => {
    if (!query) return jobs
    const q = query.toLowerCase().trim()
    return jobs.filter(
      (j) =>
        j.job_id.toLowerCase().includes(q) ||
        (j.file_name && j.file_name.toLowerCase().includes(q))
    )
  }, [jobs, query])

  const table = useReactTable({
    data: filteredJobs,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className="preview-section">
      <div className="dashboard-header">
        <div>
          <h2>Previous uploads</h2>
          <p className="sub small">
            Search by Job ID or file name to quickly inspect a past run.
          </p>
        </div>
        <div className="dashboard-controls">
          <input
            type="search"
            placeholder="Search by Job ID or file name"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search uploads by Job ID or file name"
          />
          <button type="button" onClick={onRefresh}>
            Refresh
          </button>
        </div>
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
                      : flexRender(
                          cell.column.columnDef.cell ?? cell.column.columnDef.header,
                          cell.getContext()
                        )}
                  </td>
                ))}
                <td>
                  <button type="button" onClick={() => onViewJob(row.original.job_id)}>
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(errorsCsvUrl(row.original.job_id), '_blank')}
                  >
                    Errors CSV
                  </button>
                </td>
              </tr>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1}>No imports yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

