import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ShieldCheck, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import EvaluasiPengendalianTable from './EvaluasiPengendalianTable'

export const dynamic = 'force-dynamic'

export default async function EvaluasiPengendalianPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string; page?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  // ── No konteks: show picker ──────────────────────────────────────────────
  if (!konteksId) {
    const page = Math.max(1, parseInt(p?.page || '1'))
    const pageSize = 10

    const { data: konteksList } = await supabase
      .from('penetapan_konteks')
      .select('id, tahun_penerapan, unit:unit_kerja_id(nama_unit)')
      .order('tahun_penerapan', { ascending: false })

    const total = (konteksList ?? []).length
    const totalPages = Math.ceil(total / pageSize)
    const pagedList = (konteksList ?? []).slice((page - 1) * pageSize, page * pageSize)

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-6 h-6 text-slate-600" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-serif">Evaluasi Pengendalian Utama</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pilih konteks satuan kerja terlebih dahulu</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50">
            <h3 className="font-serif font-semibold text-slate-800">Daftar Konteks Tersedia</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Klik untuk membuka Evaluasi Pengendalian Utama satker tersebut</p>
          </div>
          <div className="divide-y divide-slate-100">
            {pagedList.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada konteks. Mulai dari menu Mulai.</p>
            ) : (
              pagedList.map((k: any) => (
                <a
                  key={k.id}
                  href={`/dashboard/evaluasi-pengendalian?konteks=${k.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">
                      {k.unit?.nama_unit || '–'}
                    </p>
                    <p className="text-xs text-slate-400">Tahun {k.tahun_penerapan}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </a>
              ))
            )}
          </div>
          {totalPages > 1 && (
            <div className="px-5 py-3 border-t bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-slate-500">Halaman {page} dari {totalPages} · {total} konteks</p>
              <div className="flex gap-2">
                {page > 1 && (
                  <a href={`?page=${page - 1}`} className="px-3 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors">← Sebelumnya</a>
                )}
                {page < totalPages && (
                  <a href={`?page=${page + 1}`} className="px-3 py-1 text-xs rounded border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors">Selanjutnya →</a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  const { data: konteksData } = await supabase
    .from('penetapan_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .eq('id', konteksId)
    .single()

  if (!konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <a href="/dashboard/evaluasi-pengendalian" className={buttonVariants({ className: 'mt-2' })}>← Pilih Konteks</a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit || '–'
  const tahun: number    = konteksData.tahun_penerapan

  // Fetch all risks for this konteks
  const { data: risikoRaw } = await supabase
    .from('risiko')
    .select('*')
    .eq('konteks_id', konteksId)
    .order('created_at', { ascending: true })

  const risikoIds = (risikoRaw ?? []).map((r: any) => r.id)

  // Fetch analisis for kecukupan_pengendalian
  const { data: analisisRaw } = risikoIds.length > 0
    ? await supabase
        .from('analisis_risiko')
        .select('risiko_id, kecukupan_pengendalian')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const analisisMap: Record<string, string | null> = {}
  for (const a of analisisRaw ?? []) {
    analisisMap[a.risiko_id] = a.kecukupan_pengendalian ?? null
  }

  // Fetch existing evaluasi_pengendalian_utama records
  const { data: evaluasiRaw } = risikoIds.length > 0
    ? await supabase
        .from('evaluasi_pengendalian_utama')
        .select('*')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const evaluasiMap: Record<string, any> = {}
  for (const e of evaluasiRaw ?? []) {
    evaluasiMap[e.risiko_id] = e
  }

  const rows = (risikoRaw ?? []).map((r: any) => ({
    id:                     r.id,
    kode_risiko:            r.kode_risiko ?? null,
    pernyataan_risiko:      r.pernyataan_risiko,
    dampak_potensial:       r.dampak_potensial ?? null,
    kecukupan_pengendalian: analisisMap[r.id] ?? null,
    pengendalian_eksisting: evaluasiMap[r.id]?.pengendalian_eksisting ?? null,
    pengendalian_utama:     evaluasiMap[r.id]?.pengendalian_utama     ?? null,
    evaluasiId:             evaluasiMap[r.id]?.id ?? null,
  }))

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href="/dashboard/evaluasi-pengendalian"
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Pilih konteks lain"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold tracking-tight font-serif">
              Evaluasi Pengendalian Utama
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Kertas Kerja Evaluasi Pengendalian Utama · Konteks Tahun{' '}
            <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        <Badge variant="outline" className="mt-1">
          {rows.length} risiko
        </Badge>
      </div>

      {/* ── Context Banner ───────────────────────────── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-500 mb-0.5">Unit Pemilik Risiko (a)</p>
          <p className="font-semibold text-slate-800">{unitNama}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-500 mb-0.5">Tahun (b)</p>
          <p className="font-semibold text-slate-800">{tahun}</p>
        </div>
      </div>

      {/* ── Main Table ───────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">
              Kertas Kerja Evaluasi Pengendalian Utama
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kecukupan Desain Pengendalian diambil otomatis dari hasil analisis risiko (kuesioner kecukupan)
            </p>
          </div>
        </div>

        <EvaluasiPengendalianTable rows={rows} konteksId={konteksId} />

        {/* Keterangan */}
        <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed space-y-1">
          <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Butir (a) : Diisi nama unit pemilik risiko</p>
            <p>Kolom Risiko : Kode dan pernyataan risiko dari register identifikasi</p>
            <p>Butir (b) : Diisi tahun berjalan</p>
            <p>Kolom Dampak : Uraian dampak/akibat dari entry identifikasi risiko</p>
            <p>Kolom Pengendalian Eksisting : Uraian pengendalian yang sudah ada</p>
            <p>Kolom Pengendalian Utama : Pengendalian utama yang ditetapkan/diprioritaskan</p>
            <p className="col-span-2">Kecukupan Desain : Dihasilkan otomatis dari kuesioner 4 pertanyaan pada kolom Memadai/Belum di Analisis Risiko</p>
          </div>
        </div>
      </div>
    </div>
  )
}
