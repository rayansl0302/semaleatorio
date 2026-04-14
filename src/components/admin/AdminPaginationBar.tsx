type AdminPaginationBarProps = {
  page: number
  pageCount: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
}

export function AdminPaginationBar({
  page,
  pageCount,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
}: AdminPaginationBarProps) {
  if (totalItems === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, totalItems)
  const pc = Math.max(1, pageCount)

  return (
    <div className="flex flex-col gap-3 border-t border-border bg-bg/50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-slate-500">
        {from}–{to} de {totalItems}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span>Por página</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value))
              onPageChange(1)
            }}
            className="rounded-lg border border-border bg-bg px-2 py-1.5 text-sm text-white"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </label>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Anterior
        </button>
        <span className="text-xs tabular-nums text-slate-400">
          Página {page} / {pc}
        </span>
        <button
          type="button"
          disabled={page >= pc}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-border px-3 py-1.5 text-xs text-slate-300 hover:bg-white/5 disabled:opacity-40"
        >
          Seguinte
        </button>
      </div>
    </div>
  )
}
