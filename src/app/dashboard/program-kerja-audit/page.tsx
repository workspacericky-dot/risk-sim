import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ClipboardList, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PkaTable, { type PkaRow } from './PkaTable'
import { synthesizeUraian } from './synthesis'

export const dynamic = 'force-dynamic'

// Kecukupan values that require audit attention (exclude 'Memadai')
const PERLU_AUDIT: string[] = [
  'Tidak Memiliki Pengendalian',
  'Tidak Memadai',
  'Kurang Memadai',
  'Cukup Memadai',
]

export default async function ProgramKerjaAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string; page?: string }>
}) {
  const supabase  = await createClient()
  const p         = await searchParams
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
          <ClipboardList className="w-6 h-6 text-slate-600" />
          <div>
            <h2 className="text-2xl font-bold tracking-tight font-serif">Program Kerja Audit</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Pilih konteks satuan kerja terlebih dahulu</p>
          </div>
        </div>

        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b bg-slate-50">
            <h3 className="font-serif font-semibold text-slate-800">Daftar Konteks Tersedia</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Klik untuk membuka Program Kerja Audit satker tersebut</p>
          </div>
          <div className="divide-y divide-slate-100">
            {pagedList.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-400">Belum ada konteks. Mulai dari menu Mulai.</p>
            ) : (
              pagedList.map((k: any) => (
                <a
                  key={k.id}
                  href={`/dashboard/program-kerja-audit?konteks=${k.id}`}
                  className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">
                      {k.unit?.nama_unit || '–'}
                    </p>
                    <p className="text-xs text-slate-400">Tahun {k.tahun_penerapan}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors" />
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

  // ── With konteks ─────────────────────────────────────────────────────────
  const { data: konteksData } = await supabase
    .from('penetapan_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .eq('id', konteksId)
    .single()

  if (!konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <a href="/dashboard/program-kerja-audit" className={buttonVariants({ className: 'mt-2' })}>← Pilih Konteks</a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit || '–'
  const tahun            = konteksData.tahun_penerapan

  // Fetch all risks for this konteks
  const { data: risikoRaw } = await supabase
    .from('risiko')
    .select('id, kode_risiko, pernyataan_risiko')
    .eq('konteks_id', konteksId)
    .order('created_at', { ascending: true })

  const risikoIds = (risikoRaw ?? []).map((r: any) => r.id)

  // Fetch analisis for kecukupan
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

  // Fetch evaluasi_pengendalian_utama for synthesis inputs
  const { data: evaluasiRaw } = risikoIds.length > 0
    ? await supabase
        .from('evaluasi_pengendalian_utama')
        .select('risiko_id, pengendalian_eksisting, pengendalian_utama')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const evaluasiMap: Record<string, { eks: string | null; utama: string | null }> = {}
  for (const e of evaluasiRaw ?? []) {
    evaluasiMap[e.risiko_id] = {
      eks:   e.pengendalian_eksisting ?? null,
      utama: e.pengendalian_utama     ?? null,
    }
  }

  // Fetch penyebab (akar masalah) for synthesis enrichment
  const { data: penyebabRaw } = risikoIds.length > 0
    ? await supabase
        .from('penyebab_risiko_detail')
        .select('risiko_id, akar_penyebab')
        .in('risiko_id', risikoIds)
        .not('akar_penyebab', 'is', null)
    : { data: [] }

  // Group akar_penyebab by risiko_id (deduplicate)
  const penyebabMap: Record<string, string[]> = {}
  for (const pb of penyebabRaw ?? []) {
    if (!pb.akar_penyebab) continue
    if (!penyebabMap[pb.risiko_id]) penyebabMap[pb.risiko_id] = []
    if (!penyebabMap[pb.risiko_id].includes(pb.akar_penyebab)) {
      penyebabMap[pb.risiko_id].push(pb.akar_penyebab)
    }
  }

  // Fetch existing PKA records
  const { data: pkaRaw } = risikoIds.length > 0
    ? await supabase
        .from('program_kerja_audit')
        .select('*')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const pkaMap: Record<string, any> = {}
  for (const p of pkaRaw ?? []) {
    pkaMap[p.risiko_id] = p
  }

  // Build rows: only risks where kecukupan requires audit (not 'Memadai' and not null)
  const rows: PkaRow[] = (risikoRaw ?? [])
    .filter((r: any) => {
      const k = analisisMap[r.id]
      return k !== null && k !== undefined && PERLU_AUDIT.includes(k)
    })
    .map((r: any) => {
      const kecukupan = analisisMap[r.id] ?? null
      const ev        = evaluasiMap[r.id] ?? { eks: null, utama: null }
      const existing  = pkaMap[r.id]

      // Generate synthesis only if no saved uraian yet
      const generatedUraian = synthesizeUraian({
        kodeRisiko:            r.kode_risiko,
        pernyataanRisiko:      r.pernyataan_risiko,
        pengendalianEksisting: ev.eks,
        pengendalianUtama:     ev.utama,
        kecukupan,
        penyebab:              penyebabMap[r.id] ?? [],
      })

      return {
        pkaId:                  existing?.id          ?? null,
        risikoId:               r.id,
        kodeRisiko:             r.kode_risiko         ?? null,
        pernyataan:             r.pernyataan_risiko,
        kecukupan,
        pengendalianEksisting:  ev.eks,
        pengendalianUtama:      ev.utama,
        uraian:                 existing?.uraian      ?? generatedUraian,
        noKka:                  existing?.no_kka      ?? '',
        waktu:                  existing?.waktu_pelaksanaan ?? '',
        dilaksanakan:           existing?.dilaksanakan_oleh ?? '',
        saving: false,
        saved:  false,
        error:  null,
      } satisfies PkaRow
    })

  const belumAdaEvaluasi = (risikoRaw ?? []).filter((r: any) => {
    const k = analisisMap[r.id]
    return k === null || k === undefined
  }).length

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href="/dashboard/program-kerja-audit"
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Pilih konteks lain"
        >
          <ClipboardList className="w-4 h-4" />
        </a>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-serif">Program Kerja Audit</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Audit atas Manajemen Risiko · Tahun <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">{rows.length} sasaran audit</Badge>
          {rows.length > 0 && (
            <a
              href={`/dashboard/evaluasi-pengendalian?konteks=${konteksId}`}
              className="text-xs text-indigo-500 hover:underline"
            >
              ← Evaluasi Pengendalian
            </a>
          )}
        </div>
      </div>

      {/* ── Context Banner ───────────────────────────── */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-3 flex flex-wrap gap-6 text-sm">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-blue-500 mb-0.5">Unit Pemilik Risiko</p>
          <p className="font-semibold text-slate-800">{unitNama}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-blue-500 mb-0.5">Tahun</p>
          <p className="font-semibold text-slate-800">{tahun}</p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-blue-500 mb-0.5">Sasaran Audit</p>
          <p className="font-semibold text-slate-800">
            {rows.length} risiko (pengendalian belum memadai)
          </p>
        </div>
      </div>

      {/* ── Notice: risks not yet analysed ──────────── */}
      {belumAdaEvaluasi > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-xs text-amber-800">
          <strong>{belumAdaEvaluasi} risiko</strong> belum memiliki data evaluasi pengendalian dan tidak ditampilkan di sini.
          Lengkapi terlebih dahulu melalui{' '}
          <a href={`/dashboard/evaluasi-pengendalian?konteks=${konteksId}`} className="underline font-semibold">
            Evaluasi Pengendalian Utama
          </a>.
        </div>
      )}

      {/* ── Main Table ───────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">Matriks Program Kerja Audit</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Kolom "Uraian" digenerate otomatis dari Evaluasi Pengendalian Utama — dapat diedit sebelum disimpan.
              Hanya menampilkan risiko dengan pengendalian yang belum memadai.
            </p>
          </div>
        </div>

        <PkaTable rows={rows} konteksId={konteksId} tahun={tahun} unitNama={unitNama} />

        {/* Keterangan */}
        <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Kolom Uraian : Sintesa dari kolom Pengendalian Eksisting dan Pengendalian Utama per risiko</p>
            <p>Kolom No. KKA : Nomor Kertas Kerja Audit, diisi oleh auditor</p>
            <p>Risiko yang ditampilkan : Hanya risiko dengan kecukupan pengendalian selain "Memadai"</p>
            <p>Kolom Waktu Pelaksanaan : Periode pelaksanaan audit (format bebas)</p>
            <p>Kolom Dilaksanakan Oleh : Nama/tim auditor yang bertanggung jawab</p>
          </div>
        </div>
      </div>
    </div>
  )
}
