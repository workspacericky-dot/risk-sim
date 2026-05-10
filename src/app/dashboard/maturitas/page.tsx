import { createClient } from '@/utils/supabase/server'
import { TrendingUp, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react'
import { deleteMaturitas } from './actions'

export const dynamic = 'force-dynamic'

export default async function MaturitasPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const page = Math.max(1, parseInt(p?.page || '1'))
  const pageSize = 10

  const { data: konteksList } = await supabase
    .from('penetapan_konteks')
    .select('id, tahun_penerapan, unit:unit_kerja_id(nama_unit)')
    .order('tahun_penerapan', { ascending: false })

  const { data: maturitasList } = await supabase
    .from('maturitas_penilaian')
    .select('id, konteks_id, total_skor, level_maturitas, label_maturitas')

  const maturitasMap: Record<string, any> = {}
  for (const m of maturitasList ?? []) {
    maturitasMap[m.konteks_id] = m
  }

  const total = (konteksList ?? []).length
  const totalPages = Math.ceil(total / pageSize)
  const pagedList = (konteksList ?? []).slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <TrendingUp className="w-6 h-6 text-slate-600" />
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-serif">Maturitas Manajemen Risiko</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Pilih konteks satuan kerja untuk menilai tingkat maturitas MR</p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50">
          <h3 className="font-serif font-semibold text-slate-800">Daftar Konteks Satuan Kerja</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Klik <strong>Buat</strong> untuk memulai penilaian baru, atau <strong>Sunting</strong> untuk mengubah penilaian yang sudah ada
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {pagedList.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-400">
              Belum ada konteks. Mulai dari menu Mulai.
            </p>
          ) : (
            pagedList.map((k: any) => {
              const maturitas = maturitasMap[k.id]
              return (
                <div
                  key={k.id}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/50 transition-colors"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{k.unit?.nama_unit || '–'}</p>
                    <p className="text-xs text-slate-400">Tahun {k.tahun_penerapan}</p>
                    {maturitas && (
                      <p className="text-[10px] text-teal-700 font-medium mt-0.5">
                        Skor: {maturitas.total_skor} · Level {maturitas.level_maturitas}{maturitas.label_maturitas ? ` — ${maturitas.label_maturitas}` : ''}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {maturitas ? (
                      <>
                        <a
                          href={`/dashboard/maturitas/penilaian?konteks=${k.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                          Sunting
                        </a>
                        <form
                          action={async () => {
                            'use server'
                            await deleteMaturitas(maturitas.id)
                          }}
                        >
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                            Hapus
                          </button>
                        </form>
                      </>
                    ) : (
                      <a
                        href={`/dashboard/maturitas/penilaian?konteks=${k.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-semibold transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Buat
                      </a>
                    )}
                    <ChevronRight className="w-4 h-4 text-slate-300 ml-1" />
                  </div>
                </div>
              )
            })
          )}
        </div>

        {totalPages > 1 && (
          <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} · {total} konteks</p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={`?page=${page - 1}`}
                  className="px-3 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  ← Sebelumnya
                </a>
              )}
              {page < totalPages && (
                <a
                  href={`?page=${page + 1}`}
                  className="px-3 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                >
                  Selanjutnya →
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
