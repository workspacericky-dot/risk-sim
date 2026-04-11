import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Target } from 'lucide-react'
import { RiskMapPopup } from './RiskMapPopup'
import type { RiskPoint } from '@/components/RiskMatrix'

// ── 5×5 besaran lookup (same as everywhere else) ─────────────────────────────
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

function getLevelLabel(besaran: number | null | undefined): string {
  if (!besaran) return '–'
  if (besaran >= 20) return '5 – Sangat Tinggi'
  if (besaran >= 16) return '4 – Tinggi'
  if (besaran >= 11) return '3 – Moderat'
  if (besaran >= 6)  return '2 – Rendah'
  return '1 – Sangat Rendah'
}

function getLevelBadgeClass(besaran: number | null | undefined): string {
  if (!besaran) return 'bg-slate-50 text-slate-400 border-slate-200'
  if (besaran >= 20) return 'bg-red-100 text-red-700 border-red-300'
  if (besaran >= 16) return 'bg-orange-100 text-orange-700 border-orange-300'
  if (besaran >= 11) return 'bg-amber-100 text-amber-700 border-amber-300'
  if (besaran >= 6)  return 'bg-green-100 text-green-700 border-green-300'
  return 'bg-cyan-100 text-cyan-700 border-cyan-300'
}

/** Map kategori_risiko string → threshold from selera_risiko_kategori */
function getCategoryThreshold(
  kategoriRisiko: string | null,
  selera: Record<string, number> | null,
): number | null {
  if (!selera || !kategoriRisiko) return null
  const k = kategoriRisiko.toLowerCase()
  if (k.includes('strategis'))                           return selera.strategis
  if (k.includes('kebijakan'))                           return selera.kebijakan
  if (k.includes('kecurangan') || k.includes('fraud'))  return selera.kecurangan
  if (k.includes('bencana'))                             return selera.bencana
  if (k.includes('kepatuhan'))                           return selera.kepatuhan
  if (k.includes('operasional'))                         return selera.operasional
  if (k.includes('kemitraan'))                           return selera.kemitraan
  return null
}

export default async function EvaluasiPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  const { data: konteksData } = konteksId
    ? await supabase
        .from('penetapan_konteks')
        .select('*, unit:unit_kerja_id(nama_unit)')
        .eq('id', konteksId)
        .single()
    : { data: null }

  const { data: seleraKategori } = konteksId
    ? await supabase
        .from('selera_risiko_kategori')
        .select('*')
        .eq('konteks_id', konteksId)
        .single()
    : { data: null }

  // ── Two-step fetch (avoid unreliable PostgREST join) ──────────────────────
  const { data: risikoRaw } = konteksId
    ? await supabase
        .from('risiko')
        .select('*')
        .eq('konteks_id', konteksId)
        .order('created_at', { ascending: true })
    : { data: [] }

  const risikoIds = (risikoRaw ?? []).map((r: any) => r.id)
  const { data: analisisRaw } = risikoIds.length > 0
    ? await supabase
        .from('analisis_risiko')
        .select('*')
        .in('risiko_id', risikoIds)
    : { data: [] }

  const analisisMap: Record<string, any> = {}
  for (const a of analisisRaw ?? []) {
    analisisMap[a.risiko_id] = a
  }

  const risikoList = (risikoRaw ?? []).map((r: any) => ({
    ...r,
    analisis: analisisMap[r.id] ? [analisisMap[r.id]] : [],
  }))
  // ─────────────────────────────────────────────────────────────────────────

  if (!konteksId || !konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <p className="text-muted-foreground">Silakan kembali ke halaman Analisis Risiko.</p>
        <a href="/dashboard/konteks" className={buttonVariants({ className: 'mt-2' })}>← Kembali</a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit || '–'
  const tahun: number    = konteksData.tahun_penerapan
  const selera           = seleraKategori as Record<string, number> | null

  const allAnalised = risikoList.filter(
    (r) => r.analisis && r.analisis.length > 0
  )

  // Priority: residual besaran (computed from stored K,D) > category threshold
  const prioritasRisiko = allAnalised
    .filter((r) => {
      const a = r.analisis[0]
      const besaran   = getResidualBesaran(a.residual_kemungkinan, a.residual_dampak)
      const threshold = getCategoryThreshold(r.kategori_risiko, selera)
      if (threshold !== null && besaran !== null) {
        return besaran > threshold
      }
      // Fallback to stored boolean if no per-category selera set
      return a.di_atas_selera_risiko === true
    })
    .sort((a, b) => {
      const besA = getResidualBesaran(a.analisis[0].residual_kemungkinan, a.analisis[0].residual_dampak) ?? 0
      const besB = getResidualBesaran(b.analisis[0].residual_kemungkinan, b.analisis[0].residual_dampak) ?? 0
      return besB - besA
    })

  // Risk points for heatmap — label is kode_risiko
  const riskPoints: RiskPoint[] = allAnalised
    .filter(
      (r) =>
        r.analisis[0].residual_kemungkinan != null &&
        r.analisis[0].residual_dampak != null
    )
    .map((r) => ({
      id: r.id,
      label: r.kode_risiko || '?',
      kemungkinan: r.analisis[0].residual_kemungkinan as number,
      dampak:      r.analisis[0].residual_dampak      as number,
      pernyataan:  r.pernyataan_risiko,
    }))

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href={`/dashboard/analisis?konteks=${konteksId}`}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Analisis Risiko"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-serif">Evaluasi Risiko</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lampiran Pedoman No. 7 · Konteks Tahun{' '}
            <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <a
            href={`/dashboard/selera-risiko?konteks=${konteksId}`}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm transition-all text-sm font-medium"
            title="Lihat & ubah selera risiko"
          >
            <Target className="w-4 h-4" />
            <span>Selera Risiko</span>
          </a>
          <RiskMapPopup risks={riskPoints} unitNama={unitNama} tahun={tahun} />
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Total Risiko</p>
          <p className="text-3xl font-bold font-serif text-slate-800">{risikoList.length}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Sudah Dianalisis</p>
          <p className="text-3xl font-bold font-serif text-blue-700">{allAnalised.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-red-400 mb-1">Risiko Prioritas</p>
          <p className="text-3xl font-bold font-serif text-red-700">{prioritasRisiko.length}</p>
        </div>
      </div>

      {/* ── Daftar Risiko Prioritas Table ─────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">Daftar Risiko Prioritas Unit Kerja</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Risiko yang nilai residunya melebihi ambang batas selera risiko kategorinya — diurutkan dari prioritas tertinggi
            </p>
          </div>
          <Badge variant="destructive" className="text-xs">
            {prioritasRisiko.length} risiko prioritas
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-3 py-2.5 text-center font-semibold w-16">
                  Kode<br /><span className="font-normal text-slate-400">(1)</span>
                </th>
                <th className="border border-slate-200 px-3 py-2.5 text-center font-semibold min-w-[240px]">
                  Pernyataan Risiko<br /><span className="font-normal text-slate-400">(2)</span>
                </th>
                <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold" colSpan={3}>
                  Skor/Nilai Risiko Residu setelah Pengendalian yang Ada
                </th>
              </tr>
              <tr className="bg-slate-100 text-slate-500 text-[10px]">
                <th className="border border-slate-200 px-2 py-1.5" />
                <th className="border border-slate-200 px-2 py-1.5" />
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-32">
                  Skor Kemungkinan<br /><span className="font-normal text-slate-400">(3)</span>
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-32">
                  Skor Dampak<br /><span className="font-normal text-slate-400">(4)</span>
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-36">
                  Level Risiko<br /><span className="font-normal text-slate-400">(5)</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {prioritasRisiko.length > 0 ? (
                prioritasRisiko.map((r, idx) => {
                  const a         = r.analisis[0]
                  const besaran   = getResidualBesaran(a.residual_kemungkinan, a.residual_dampak)
                  const threshold = getCategoryThreshold(r.kategori_risiko, selera)
                  return (
                    <tr key={r.id} className="border-b border-slate-100 hover:bg-red-50/30 transition-colors">
                      <td className="border border-slate-100 px-3 py-3 text-center">
                        <span className="font-mono text-[11px] text-slate-600">{r.kode_risiko || '–'}</span>
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-slate-800 font-medium">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 font-normal shrink-0">{idx + 1}.</span>
                          <span className="leading-relaxed">{r.pernyataan_risiko}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                          {r.kategori_risiko && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[10px]">
                              {r.kategori_risiko}
                            </span>
                          )}
                          {threshold !== null && besaran !== null && (
                            <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-100 text-[10px]">
                              selera: {threshold} · nilai: {besaran}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center font-bold text-slate-700">
                        {a.residual_kemungkinan ?? '–'}
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center font-bold text-slate-700">
                        {a.residual_dampak ?? '–'}
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center">
                        <span className={`px-2 py-1 rounded border text-[10px] font-semibold ${getLevelBadgeClass(besaran)}`}>
                          {getLevelLabel(besaran)}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={5} className="border border-slate-100 px-4 py-12 text-center">
                    <div className="space-y-2">
                      <p className="text-green-700 font-semibold text-sm">✓ Tidak ada risiko di atas selera risiko</p>
                      <p className="text-muted-foreground text-xs">
                        Semua risiko yang teranalisis berada dalam batas toleransi yang dapat diterima.
                      </p>
                      {allAnalised.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                          Belum ada risiko yang dianalisis.{' '}
                          <a href={`/dashboard/analisis?konteks=${konteksId}`} className="text-blue-500 underline">
                            Kembali ke Analisis Risiko
                          </a>
                        </p>
                      )}
                      {selera === null && allAnalised.length > 0 && (
                        <p className="text-xs text-amber-600 mt-2">
                          Selera risiko per kategori belum ditetapkan.{' '}
                          <a href={`/dashboard/selera-risiko?konteks=${konteksId}`} className="underline">
                            Tetapkan sekarang
                          </a>
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Keterangan */}
        <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
          <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Butir (a) : Diisi nama unit pemilik risiko</p>
            <p>Kolom 1 : Kode risiko sebagaimana kolom 5 pada Lampiran 5</p>
            <p>Butir (b) : Diisi tahun berjalan</p>
            <p>Kolom 2 : Pernyataan risiko yang nilai residu-nya melebihi selera risiko kategorinya — diurutkan dari prioritas tertinggi</p>
            <p>Butir (c) : Diisi selera risiko per kategori sebagaimana ditetapkan di halaman Selera Risiko</p>
            <p>Kolom 3 : Nilai kemungkinan terjadinya risiko (kolom 9 Lampiran 6)</p>
            <p />
            <p>Kolom 4 : Nilai dampak terjadinya risiko (kolom 10 Lampiran 6)</p>
            <p />
            <p>Kolom 5 : Level risiko (kolom 11 Lampiran 6)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
