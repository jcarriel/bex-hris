import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DataTableProps<T> {
  columns: ColumnDef<T>[]
  data: T[]
  loading?: boolean
  pagination?: boolean
}

export function DataTable<T>({ columns, data, loading, pagination = false }: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(pagination ? { getPaginationRowModel: getPaginationRowModel() } : {}),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="border-b border-[var(--border)]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    className="text-left py-3 px-4 text-xs font-medium text-[var(--text-2)] uppercase tracking-wide"
                  >
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-[var(--text-3)]">
                    <Loader2 size={24} className="animate-spin" />
                    <span className="text-sm">Cargando...</span>
                  </div>
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-16 text-[var(--text-3)] text-sm">
                  No hay datos disponibles
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    'border-b border-[var(--border)] transition-colors',
                    'hover:bg-[var(--bg-hover)]',
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="py-3 px-4 text-[var(--text-1)]">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && (
        <div className="flex items-center justify-between mt-4 text-sm text-[var(--text-2)]">
          <span>
            Página {table.getState().pagination.pageIndex + 1} de {table.getPageCount()}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className={cn(
                'p-1.5 rounded-md border border-[var(--border)] transition-colors',
                'hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className={cn(
                'p-1.5 rounded-md border border-[var(--border)] transition-colors',
                'hover:bg-[var(--bg-hover)] disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
