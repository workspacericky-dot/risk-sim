import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft } from 'lucide-react'

function getLevelLabel(score: number | null | undefined): string {
  if (!score) return '–'
  if (score >= 20) return '5 – Sangat Tinggi'
  if (score >= 15) return '4 – Tinggi'
  if (score >= 10) return '3 – Sedang'
  if (score >= 5)  return '2 – Rendah'
  return '1 – Sangat Rendah'
}

function getLevelBadge(score: number | null | undefined) {
  if (!score) return 'bg-slate-50 text-slate-400 border-slate-200'
  if (score >= 15) return 'bg-red-50 text-red-700 border-red-200'
  if (score >= 8)  return 'bg-yellow-50 text-yellow-700 border-yellow-200'
  return 'bg-green-50 text-green-700 border-green-200'
}

export default async function PrioritasPage({
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

  // Fetch risiko yang sudah dianalisis dan di atas selera
  const { data: risikoList } = konteksId
    ? await supabase
        .from('risiko')
        .select(`
          *,
          analisis:analisis_risiko(
            id,
            level_kemungkinan,
            level_dampak,
            status_risiko,
            residual_kemungkinan,
            residual_dampak,
            residual_level,
            di_atas_selera_risiko
          )
        `)
        .eq('konteks_id', konteksId)
        .order('created_at', { ascending: true })
    : { data: [] }

  if (!konteksId || !konteksData) {
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
  const unitNama = konteksData.unit?.nama_unit || '–'

  // Filter: hanya yang punya analisis DAN di_atas_selera_risiko = true
  // Sort by residual_level descending (highest priority first)
  const prioritasRisiko = (risikoList || [])
    .filter(r => r.analisis && r.analisis.length > 0 && r.analisis[0].di_atas_selera_risiko)
    .sort((a, b) => {
      const aLevel = a.analisis[0].residual_level ?? 0
      const bLevel = b.analisis[0].residual_level ?? 0
      return bLevel - aLevel
    })

  const allAnalised = (risikoList || []).filter(
    r => r.analisis && r.analisis.length > 0
  )

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
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-serif">Daftar Risiko Prioritas Unit Kerja</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lampiran Pedoman No. 7 · Konteks Tahun{' '}
            <strong>{konteksData.tahun_penerapan}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
      </div>

      {/* ── Metadata row ────────────────────────────── */}
      <div className="flex flex-wrap gap-10 text-sm text-slate-600 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Nama Unit Pemilik Risiko</span>
          <span className="text-slate-400">(a)</span>
          <span className="font-medium text-slate-800">{unitNama}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Tahun</span>
          <span className="text-slate-400">(b)</span>
          <span className="font-medium text-slate-800">{konteksData.tahun_penerapan}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Selera Risiko Pemilik Risiko</span>
          <span className="text-slate-400">(c)</span>
          <span className="font-medium text-slate-800">{konteksData.selera_risiko}</span>
        </div>
      </div>

      {/* ── Stats ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Total Risiko</p>
          <p className="text-3xl font-bold font-serif text-slate-800">{risikoList?.length || 0}</p>
        </div>
        <div className="bg-white rounded-xl border shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-slate-400 mb-1">Sudah Dianalisis</p>
          <p className="text-3xl font-bold font-serif text-blue-700">{allAnalised.length}</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-4 text-center">
          <p className="text-xs font-mono uppercase tracking-widest text-red-400 mb-1">Risiko Prioritas</p>
          <p className="text-3xl font-bold font-serif text-red-700">{prioritasRisiko.length}</p>
          <p className="text-[10px] text-red-500 mt-0.5">di atas selera risiko</p>
        </div>
      </div>

      {/* ── Table Card ──────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">Daftar Risiko Prioritas</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Risiko dengan nilai residu di atas selera risiko — diurutkan dari prioritas tertinggi
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
                <th
                  className="border border-slate-200 px-2 py-2.5 text-center font-semibold"
                  colSpan={3}
                >
                  Skor/Nilai Risiko Residu setelah Pengendalian yang Ada
                </th>
                <th className="border border-slate-200 px-3 py-2.5 text-center font-semibold w-20">Urgensi</th>
              </tr>
              <tr className="bg-slate-100 text-slate-600">
                <th className="border border-slate-200 px-2 py-1.5"></th>
                <th className="border border-slate-200 px-2 py-1.5"></th>
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-32">
                  Skor Kemungkinan Terjadi<br /><span className="font-normal text-slate-400">(3)</span>
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-32">
                  Skor Dampak<br /><span className="font-normal text-slate-400">(4)</span>
                </th>
                <th className="border border-slate-200 px-3 py-1.5 text-center font-semibold w-32">
                  Level Risiko<br /><span className="font-normal text-slate-400">(5)</span>
                </th>
                <th className="border border-slate-200 px-2 py-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {prioritasRisiko.length > 0 ? (
                prioritasRisiko.map((r, idx) => {
                  const a = r.analisis[0]
                  const residualLevel = a.residual_level
                  const urgency = idx === 0 ? '🔴 Kritis' : idx === 1 ? '🟠 Tinggi' : '🟡 Sedang'

                  return (
                    <tr
                      key={r.id}
                      className="border-b border-slate-100 hover:bg-red-50/30 transition-colors"
                    >
                      <td className="border border-slate-100 px-3 py-3 text-center">
                        <span className="font-mono text-[11px] text-slate-600">
                          {r.kode_risiko || '–'}
                        </span>
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-slate-800 font-medium">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 font-normal shrink-0">{idx + 1}.</span>
                          <span className="leading-relaxed">{r.pernyataan_risiko}</span>
                        </div>
                        {r.kategori_risiko && (
                          <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[10px]">
                            {r.kategori_risiko}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center font-bold text-slate-700">
                        {a.residual_kemungkinan ?? '–'}
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center font-bold text-slate-700">
                        {a.residual_dampak ?? '–'}
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center">
                        <span
                          className={`px-2 py-1 rounded border text-[10px] font-semibold ${getLevelBadge(residualLevel)}`}
                        >
                          {getLevelLabel(residualLevel)}
                        </span>
                      </td>
                      <td className="border border-slate-100 px-3 py-3 text-center text-xs">
                        {urgency}
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="border border-slate-100 px-4 py-12 text-center"
                  >
                    <div className="space-y-2">
                      <p className="text-green-700 font-semibold text-sm">
                        ✓ Tidak ada risiko di atas selera risiko
                      </p>
                      <p className="text-muted-foreground text-xs">
                        Semua risiko yang teranalisis berada dalam batas toleransi yang dapat diterima.
                      </p>
                      {allAnalised.length === 0 && (
                        <p className="text-xs text-slate-400 mt-2">
                          Belum ada risiko yang dianalisis.{' '}
                          <a
                            href={`/dashboard/analisis?konteks=${konteksId}`}
                            className="text-blue-500 underline"
                          >
                            Kembali ke Analisis Risiko
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Butir (a) : Diisi nama unit pemilik risiko</p>
            <p>Kolom 1 : Kode risiko sebagaimana kolom 5 pada Lampiran 5</p>
            <p>Butir (b) : Diisi tahun berjalan</p>
            <p>Kolom 2 : Pernyataan risiko-risiko terpilih yang nilai risiko residu di atas selera risiko — diurutkan dari prioritas yang akan direspons</p>
            <p>Butir (c) : Diisi skor selera risiko Pemilik Risiko pada tahun berjalan</p>
            <p>Kolom 3 : Nilai kemungkinan sesuai kolom 9 Lampiran 6</p>
            <p></p>
            <p>Kolom 4 : Nilai dampak sesuai kolom 10 Lampiran 6</p>
            <p></p>
            <p>Kolom 5 : Level risiko sesuai kolom 11 pada Lampiran 6</p>
          </div>
        </div>
      </div>
    </div>
  )
}
