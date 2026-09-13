import { CheckCircle2, Clock3, DatabaseZap, TriangleAlert } from 'lucide-react'
import { getZiImportWorkspace } from '@/lib/uji-publik-zi/data'
import { DeleteZiImportButton } from './DeleteImportButton'
import { ZiImportForm } from './ImportForm'

export default async function ZiImportPage() {
  const data = await getZiImportWorkspace()

  return (
    <div className="space-y-5">
      {!data.ready && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Database belum siap.</strong> Jalankan <code>supabase/migration_uji_publik_zi.sql</code> terlebih dahulu.
        </div>
      )}
      <ZiImportForm />
      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="p-5">
          <h2 className="font-bold text-slate-900">Riwayat impor dan analisis</h2>
          <p className="mt-1 text-sm text-slate-500">Analisis dasar tersedia segera; worker Python memperkaya hasil dengan model lokal.</p>
        </div>
        {data.batches.length ? (
          <div className="divide-y divide-slate-100">
            {data.batches.map((batch) => (
              <article key={String(batch.id)} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusIcon status={String(batch.status)} />
                    <b className="text-slate-900">{String(batch.nama_file)}</b>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{String(batch.source_sheet)} · {formatDate(batch.created_at)}</p>
                  {batch.catatan ? <p className="mt-2 max-w-3xl text-xs text-amber-800">{String(batch.catatan)}</p> : null}
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
                  <Badge>{String(batch.status).replaceAll('_', ' ')}</Badge>
                  <Badge>{Number(batch.baris_valid)} valid</Badge>
                  <Badge tone="rose">{Number(batch.baris_perlu_perbaikan)} dilewati</Badge>
                  {data.canDelete ? <DeleteZiImportButton batchId={String(batch.id)} fileName={String(batch.nama_file)} /> : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="border-t border-slate-100 p-8 text-center text-sm text-slate-500">Belum ada riwayat impor.</p>
        )}
      </section>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  if (status === 'gagal') return <TriangleAlert className="h-4 w-4 text-rose-600" />
  if (status === 'selesai') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />
  if (status === 'menunggu_analisis') return <DatabaseZap className="h-4 w-4 text-cyan-600" />
  return <Clock3 className="h-4 w-4 text-amber-600" />
}

function Badge({ children, tone = 'slate' }: { children: React.ReactNode; tone?: 'slate' | 'rose' }) {
  return <span className={`rounded-full px-2.5 py-1 font-semibold ${tone === 'rose' ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>{children}</span>
}

function formatDate(value: unknown) {
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? String(value) : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
