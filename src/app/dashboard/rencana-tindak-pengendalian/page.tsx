import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ClipboardCheck } from 'lucide-react'
import RtpTable, { type RtpRowData } from './RtpTable'

// ── Helpers ──────────────────────────────────────────────────────────────────
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getResidualBesaran(k: number | null, d: number | null): number | null {
  if (!k || !d) return null
  return RISK_MATRIX[k]?.[d] ?? null
}

function getCategoryThreshold(
  kategoriRisiko: string | null,
  selera: Record<string, number> | null,
): number | null {
  if (!selera || !kategoriRisiko) return null
  const k = kategoriRisiko.toLowerCase()
  if (k.includes('strategis'))                          return selera.strategis
  if (k.includes('kebijakan'))                          return selera.kebijakan
  if (k.includes('kecurangan') || k.includes('fraud'))  return selera.kecurangan
  if (k.includes('bencana'))                            return selera.bencana
  if (k.includes('kepatuhan'))                          return selera.kepatuhan
  if (k.includes('operasional'))                        return selera.operasional
  if (k.includes('kemitraan'))                          return selera.kemitraan
  return null
}

function deriveAkar(why1: string, why2: string, why3: string, why4: string, why5: string): string {
  if (why5.trim()) return why5.trim()
  if (why4.trim()) return why4.trim()
  if (why3.trim()) return why3.trim()
  if (why2.trim()) return why2.trim()
  return why1.trim()
}

export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
export default async function RtpPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase  = await createClient()
  const p         = await searchParams
  const konteksId = p?.konteks

  // ── No context selected ───────────────────────────────────────────────────
  if (!konteksId) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <ClipboardCheck className="w-12 h-12 text-slate-300 mx-auto" />
        <h3 className="text-xl font-semibold font-serif text-slate-700">Rencana Tindak Pengendalian</h3>
        <p className="text-muted-foreground text-sm">
          Akses halaman ini melalui tombol RTP di laman Evaluasi Risiko.
        </p>
        <a href="/dashboard/konteks" className={buttonVariants({ className: 'mt-2' })}>
          Lihat Daftar Konteks
        </a>
      </div>
    )
  }

  // ── Fetch konteks ─────────────────────────────────────────────────────────
  const { data: konteksData } = await supabase
    .from('penetapan_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .eq('id', konteksId)
    .single()

  if (!konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <a href="/dashboard/konteks" className={buttonVariants({ className: 'mt-2' })}>
          ← Kembali
        </a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit || '–'
  const tahun: number    = konteksData.tahun_penerapan

  // ── Fetch selera risiko kategori ──────────────────────────────────────────
  const { data: seleraKategori } = await supabase
    .from('selera_risiko_kategori')
    .select('*')
    .eq('konteks_id', konteksId)
    .single()

  const selera = seleraKategori as Record<string, number> | null

  // ── Fetch all risks for this konteks ─────────────────────────────────────
  const { data: risikoRaw } = await supabase
    .from('risiko')
    .select('*')
    .eq('konteks_id', konteksId)
    .order('created_at', { ascending: true })

  const risikoIds = (risikoRaw ?? []).map((r: any) => r.id)

  // ── Fetch analisis (two-step) ─────────────────────────────────────────────
  const { data: analisisRaw } = risikoIds.length > 0
    ? await supabase
        .from('analisis_risiko')
        .select('*')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const analisisMap: Record<string, any> = {}
  for (const a of analisisRaw ?? []) analisisMap[a.risiko_id] = a

  // ── Determine priority risks ──────────────────────────────────────────────
  const prioritasRisiko = (risikoRaw ?? [])
    .filter((r: any) => {
      const a = analisisMap[r.id]
      if (!a) return false
      const besaran   = getResidualBesaran(a.residual_kemungkinan, a.residual_dampak)
      const threshold = getCategoryThreshold(r.kategori_risiko, selera)
      if (threshold !== null && besaran !== null) return besaran > threshold
      return a.di_atas_selera_risiko === true
    })
    .sort((a: any, b: any) => {
      const besA = getResidualBesaran(analisisMap[a.id]?.residual_kemungkinan, analisisMap[a.id]?.residual_dampak) ?? 0
      const besB = getResidualBesaran(analisisMap[b.id]?.residual_kemungkinan, analisisMap[b.id]?.residual_dampak) ?? 0
      return besB - besA
    })

  // ── Fetch penyebab for all priority risks ─────────────────────────────────
  const prioritasIds = prioritasRisiko.map((r: any) => r.id)
  const { data: penyebabRaw } = prioritasIds.length > 0
    ? await supabase
        .from('penyebab_risiko_detail')
        .select('id,risiko_id,kode_penyebab,why1,why2,why3,why4,why5,akar_penyebab,kegiatan_pengendalian')
        .in('risiko_id', prioritasIds)
        .order('created_at', { ascending: true })
    : { data: [] }

  // Group penyebab by risiko_id
  const penyebabByRisiko: Record<string, any[]> = {}
  for (const p2 of penyebabRaw ?? []) {
    if (!penyebabByRisiko[p2.risiko_id]) penyebabByRisiko[p2.risiko_id] = []
    penyebabByRisiko[p2.risiko_id].push(p2)
  }

  // ── Fetch existing RTP rows ───────────────────────────────────────────────
  const allPenyebabIds = (penyebabRaw ?? []).map((p2: any) => p2.id)
  const { data: existingRtp } = allPenyebabIds.length > 0
    ? await supabase
        .from('rencana_tindak_pengendalian')
        .select('*')
        .in('penyebab_id', allPenyebabIds)
    : { data: [] }

  const rtpMap: Record<string, any> = {}
  for (const rtp of existingRtp ?? []) rtpMap[rtp.penyebab_id] = rtp

  // ── Build flat RtpRowData list ────────────────────────────────────────────
  const rows: RtpRowData[] = []

  for (const risiko of prioritasRisiko) {
    const a          = analisisMap[risiko.id]
    const kemungkinan: number = a?.residual_kemungkinan ?? 0
    const dampak: number      = a?.residual_dampak      ?? 0

    // Respons Risiko: compare residual kemungkinan vs dampak
    const responRisiko =
      kemungkinan >= dampak ? 'Mengurangi Frekuensi' : 'Mengurangi Dampak'

    const penyebabList = penyebabByRisiko[risiko.id] ?? []

    // If no penyebab rows, still show one placeholder row for the risk
    if (penyebabList.length === 0) {
      rows.push({
        penyebabId:           '',
        risikoId:             risiko.id,
        konteksId,
        kodePenyebab:         '–',
        pernyataanRisiko:     risiko.pernyataan_risiko,
        responRisiko,
        pernyataanPenyebab:   '(Belum ada penyebab teridentifikasi)',
        kegiatanPengendalian: '',
        rtpId:                null,
        klasifikasiSpip:      '',
        penanggungJawab:      '',
        indikatorKeluaran:    '',
        targetWaktu:          '',
        frekuensiRencana:     null,
        dampakRencana:        null,
        isFirstInRisiko:      true,
        risikoRowSpan:        1,
      })
      continue
    }

    penyebabList.forEach((py: any, pyIdx: number) => {
      const rtp = rtpMap[py.id]
      const akar = py.akar_penyebab ||
        deriveAkar(py.why1 ?? '', py.why2 ?? '', py.why3 ?? '', py.why4 ?? '', py.why5 ?? '')

      rows.push({
        penyebabId:           py.id,
        risikoId:             risiko.id,
        konteksId,
        kodePenyebab:         py.kode_penyebab || '–',
        pernyataanRisiko:     risiko.pernyataan_risiko,
        responRisiko,
        pernyataanPenyebab:   akar,
        kegiatanPengendalian: py.kegiatan_pengendalian ?? '',
        rtpId:                rtp?.id ?? null,
        klasifikasiSpip:      rtp?.klasifikasi_spip   ?? '',
        penanggungJawab:      rtp?.penanggung_jawab   ?? '',
        indikatorKeluaran:    rtp?.indikator_keluaran ?? '',
        targetWaktu:          rtp?.target_waktu       ?? '',
        frekuensiRencana:     rtp?.frekuensi_rencana  ?? null,
        dampakRencana:        rtp?.dampak_rencana     ?? null,
        isFirstInRisiko:      pyIdx === 0,
        risikoRowSpan:        penyebabList.length,
      })
    })
  }

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href={`/dashboard/evaluasi?konteks=${konteksId}`}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Evaluasi Risiko"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <ClipboardCheck className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold tracking-tight font-serif">
              Rencana Tindak Pengendalian
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lampiran Pedoman No. 10 · Konteks Tahun{' '}
            <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
            {prioritasRisiko.length} risiko prioritas
          </span>
        </div>
      </div>

      {/* ── Info banner ─────────────────────────────── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-500 mb-1">Unit Pemilik Risiko</p>
        <p className="font-semibold text-slate-800">{unitNama}</p>
        <p className="text-xs text-slate-500 mt-0.5">Tahun Berjalan: <strong>{tahun}</strong></p>
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">Matriks Rencana Tindak Pengendalian</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hanya menampilkan risiko yang nilai residunya melampaui selera risiko kategorinya.
              Klik Simpan pada setiap baris untuk menyimpan data.
            </p>
          </div>
        </div>

        <div className="p-4">
          <RtpTable rows={rows} />
        </div>

        {/* Keterangan */}
        <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Kolom 1: Kode penyebab (dari Identifikasi Penyebab Risiko)</p>
            <p>Kolom 7: Pihak/pejabat yang melaksanakan kegiatan pengendalian</p>
            <p>Kolom 2: Pernyataan risiko prioritas (nilai residu melebihi selera)</p>
            <p>Kolom 8: Indikator keluaran berupa dokumen, aplikasi, atau bentuk lainnya</p>
            <p>Kolom 3: Respons risiko (otomatis: Mengurangi Frekuensi jika K≥D, Mengurangi Dampak jika D&gt;K)</p>
            <p>Kolom 9: Rencana semester pelaksanaan atas rencana kegiatan pengendalian</p>
            <p>Kolom 4: Akar penyebab (kolom 8 Lampiran 9)</p>
            <p>Kolom 10: Nilai kemungkinan jika rencana pengendalian pada kolom 5 dilakukan</p>
            <p>Kolom 5: Kegiatan pengendalian yang dirancang untuk mengatasi akar penyebab</p>
            <p>Kolom 11: Nilai dampak jika rencana pengendalian pada kolom 5 dilakukan</p>
            <p>Kolom 6: Sub unsur SPIP yang berkaitan dengan rencana kegiatan pengendalian</p>
            <p>Kolom 12: Level risiko berdasarkan matriks analisis risiko (kolom 10 × 11)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
