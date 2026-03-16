import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import { errorsCsvUrl } from '../api/importApi'

export function JobsDashboard({ jobs, columns, onRefresh, onViewJob }) {
  const table = useReactTable({
    data: jobs,
    columns,
    getCoreRowModel: getCoreRowModel()
  })

  return (
    <div className="preview-section">
      <div className="dashboard-header">
        <h2>Imports dashboard</h2>
        <button type="button" onClick={onRefresh}>
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

