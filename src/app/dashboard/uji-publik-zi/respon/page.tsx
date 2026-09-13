import { LockKeyhole } from 'lucide-react'
import { getZiResponseDetails } from '@/lib/uji-publik-zi/data'
import { ZiResponsePagination } from './PaginationControls'

type ResponseSearchParams = Promise<{
  page?: string | string[]
  pageSize?: string | string[]
}>

export default async function ZiResponsePage({ searchParams }: { searchParams: ResponseSearchParams }) {
  const query = await searchParams
  const page = positiveInteger(firstValue(query.page), 1)
  const requestedPageSize = positiveInteger(firstValue(query.pageSize), 10)
  const pageSize = [5, 10, 50, 100].includes(requestedPageSize) ? requestedPageSize : 10
  const data = await getZiResponseDetails({ page, pageSize })

  if (!data.ready) {
    return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950">Database belum siap atau detail respons belum dapat dibaca.</div>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <strong>Data identitas terbatas</strong>
          <p className="mt-1">Nama hanya ditampilkan untuk kebutuhan evaluasi APIP. Jangan salin identitas ke laporan agregat.</p>
        </div>
      </div>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-bold text-slate-900">Detail respons terbaru</h2>
          <p className="mt-1 text-sm text-slate-500">Respons diurutkan dari yang terbaru, lengkap dengan hasil analisis dan penanda reviu.</p>
        </div>
        {data.rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Responden</th>
                  <th className="px-4 py-3">Demografi</th>
                  <th className="px-4 py-3">Unit kerja</th>
                  <th className="px-4 py-3">Rating</th>
                  <th className="px-4 py-3">Pendapat</th>
                  <th className="px-4 py-3">Tag</th>
                  <th className="px-4 py-3">Analisis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rows.map((row) => {
                  const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis
                  return (
                    <tr key={String(row.id)} className={analysis?.mismatch ? 'bg-rose-50/40' : ''}>
                      <td className="px-4 py-4 font-semibold text-slate-800">{String(row.respondent_name)}</td>
                      <td className="px-4 py-4 text-slate-600">
                        {String(row.age_group)} · {String(row.gender)}<br />
                        <span className="text-xs">{String(row.occupation)}</span>
                      </td>
                      <td className="max-w-xs px-4 py-4 text-slate-700">{String(row.unit_nama_raw)}</td>
                      <td className="whitespace-nowrap px-4 py-4 font-bold text-amber-700">{String(row.star_rating)} ★</td>
                      <td className="max-w-md px-4 py-4 text-slate-700">{String(row.opinion)}</td>
                      <td className="max-w-xs px-4 py-4 text-xs text-slate-600">{[...(row.source_tags ?? []), ...(analysis?.ai_tags ?? [])].filter(Boolean).join(' · ') || '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold ${sentimentStyle(analysis?.sentiment_label)}`}>
                          {analysis?.sentiment_label || 'menunggu'}
                        </span>
                        {analysis?.mismatch ? <p className="mt-2 text-xs font-semibold text-rose-700">Perlu reviu</p> : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="border-t border-slate-100 p-8 text-center text-sm text-slate-500">Belum ada respons.</p>
        )}
        {data.total > 0 ? (
          <ZiResponsePagination page={data.page} pageSize={data.pageSize} total={data.total} totalPages={data.totalPages} />
        ) : null}
      </section>
    </div>
  )
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function positiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function sentimentStyle(value: string | null | undefined) {
  if (value === 'negatif') return 'bg-rose-100 text-rose-800'
  if (value === 'positif') return 'bg-emerald-100 text-emerald-800'
  return 'bg-slate-100 text-slate-700'
}
