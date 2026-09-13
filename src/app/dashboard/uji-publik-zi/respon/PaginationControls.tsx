'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { usePathname, useRouter } from 'next/navigation'

const pageSizes = [5, 10, 50, 100] as const

export function ZiResponsePagination({
  page,
  pageSize,
  total,
  totalPages,
}: {
  page: number
  pageSize: number
  total: number
  totalPages: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(page * pageSize, total)

  function navigate(nextPage: number, nextPageSize = pageSize) {
    const params = new URLSearchParams()
    params.set('page', String(nextPage))
    params.set('pageSize', String(nextPageSize))
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <p className="text-xs text-slate-500">
          Menampilkan <b className="text-slate-800">{start}–{end}</b> dari <b className="text-slate-800">{total}</b> respons
        </p>
        <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">
          Baris per halaman
          <select
            value={pageSize}
            onChange={(event) => navigate(1, Number(event.target.value))}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
      </div>
      <nav aria-label="Paginasi detail respons" className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-xs text-slate-500">Halaman <b className="text-slate-800">{page}</b> dari <b className="text-slate-800">{totalPages}</b></span>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => navigate(page - 1)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />Sebelumnya
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => navigate(page + 1)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Berikutnya<ChevronRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}
