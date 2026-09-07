import { AlertTriangle, CalendarRange, Database, FileSpreadsheet, TrendingUp } from 'lucide-react'
import { getPpgAnalytics, getPpgLedAnalytics, getPpgNationalRiskInsights } from '@/lib/ppg/data'
import type { PpgGroupMetric } from '@/lib/ppg/analytics'
import { buildPpgAssistedInsights } from '@/lib/ppg/insights'
import { EmptyState, SectionHeading, StatCard } from '../_components'
import { InsightVisuals } from './InsightVisuals'

type Props = { searchParams: Promise<{ tahun?: string; triwulan?: string }> }

export default async function TitikRawanPage({ searchParams }: Props) {
  const query = await searchParams
  const selectedYear = Number(query.tahun) || undefined
  const selectedQuarter = query.triwulan ? Number(query.triwulan) : null
  const data = await getPpgAnalytics(selectedYear, selectedQuarter)
  const [led, nationalRisks] = await Promise.all([getPpgLedAnalytics(data.period.baselineStart, data.period.end), getPpgNationalRiskInsights(data.period.baselineStart, data.period.end)])
  const assistedInsights = buildPpgAssistedInsights(data, nationalRisks.rows)
  const { summary, period } = data
  const money = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

  return <div className="space-y-6">
    <div className="flex flex-wrap items-end justify-between gap-4">
      <SectionHeading eyebrow="Advanced analytics anonim" title="Analisis Titik Rawan" description="Mendeteksi konsentrasi paparan, tren lima tahun, musim rawan, asosiasi jabatan-objek, serta menerjemahkannya menjadi rekomendasi Program PPG." />
      <form className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
        <select name="tahun" defaultValue={period.year} className={input} aria-label="Tahun analisis">
          {(data.coverage.yearsAvailable.length ? data.coverage.yearsAvailable : [period.year]).map((year) => <option key={year}>{year}</option>)}
        </select>
        <select name="triwulan" defaultValue={period.quarter ?? ''} className={input} aria-label="Cakupan periode">
          <option value="">Tahunan</option><option value="1">Triwulan I</option><option value="2">Triwulan II</option><option value="3">Triwulan III</option><option value="4">Triwulan IV</option>
        </select>
        <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Analisis</button>
      </form>
    </div>

    {!summary.itemCount ? <EmptyState title="Belum ada data pada periode ini" description="Pilih periode lain atau impor worksheet melalui Referensi & Impor. Identitas pribadi tidak disimpan oleh modul PPG." /> : <>
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950">
        <strong>Dasar rancangan:</strong> {period.label} untuk Program PPG {period.programLabel}. Baseline tren {formatDate(period.baselineStart)} s.d. {formatDate(period.baselineEnd)} ({data.coverage.baselineYears.length} tahun tersedia).
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-5">
        <StatCard label="Laporan unik" value={summary.uniqueReports} note={`${summary.itemCount} item gratifikasi`} icon={FileSpreadsheet} />
        <StatCard label="Nilai penetapan" value={money.format(summary.totalValue)} note={`${summary.moneyItems} item uang/setara uang`} icon={TrendingUp} tone="cyan" />
        <StatCard label="Ditolak" value={percent(summary.rejectionRate)} note={`${summary.rejectedReports} laporan unik`} icon={AlertTriangle} tone="amber" />
        <StatCard label="Perubahan YoY" value={summary.comparableChange === null ? 'n/a' : signedPercent(summary.comparableChange)} note={`Pembanding: ${summary.priorComparableReports} laporan`} icon={CalendarRange} tone="rose" />
        <StatCard label="Kualitas konteks" value={percent(1 - summary.missingContext / Math.max(summary.itemCount, 1))} note={`${summary.missingContext} item perlu dilengkapi`} icon={Database} />
      </div>
      <InsightVisuals rows={assistedInsights} year={period.year} quarter={period.quarter} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold text-slate-900">Sinyal tindakan dari Insight A untuk {period.programLabel}</h3>
        <p className="mt-1 text-xs text-slate-500">Bagian ini menjelaskan sinyal paparan lintas risiko. Gunakan kartu fusi A × B di atas untuk membentuk draf Program PPG pada satu risiko generik.</p>
        <div className="mt-4 grid gap-3 lg:grid-cols-2">{data.recommendations.map((item) => <article key={item.actionCode} className="rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between gap-3"><span className="text-xs font-bold text-indigo-700">{item.actionCode}</span><Priority value={item.priority} /></div>
          <h4 className="mt-2 font-semibold text-slate-900">{item.title}</h4><p className="mt-1 text-sm text-slate-600">{item.rationale}</p>
          <dl className="mt-3 grid gap-1 text-xs text-slate-600"><div><dt className="inline font-semibold">Waktu: </dt><dd className="inline">{item.timing}</dd></div><div><dt className="inline font-semibold">Sasaran: </dt><dd className="inline">{item.target}</dd></div></dl>
          <p className="mt-4 text-xs font-semibold text-indigo-700">Sinyal ini telah dipadukan dengan Insight B pada kartu kandidat program di atas.</p>
        </article>)}</div>
        {!data.recommendations.length && <p className="mt-4 text-sm text-slate-500">Belum ada sinyal yang melampaui ambang rekomendasi pada periode ini.</p>}
      </section>
      <div className="grid gap-5 xl:grid-cols-3"><Ranking title="Jabatan penerima" rows={data.roles} /><Ranking title="Objek gratifikasi" rows={data.objects} /><Ranking title="Skenario" rows={data.scenarios} /></div>
      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Tren hingga lima tahun</h3><div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-slate-500"><tr><th className="py-2">Tahun</th><th>Laporan</th><th>Item</th><th>Nilai</th></tr></thead><tbody>{data.yearly.map((row) => <tr key={row.year} className="border-t border-slate-100"><td className="py-2 font-semibold">{row.year}</td><td>{row.reports}</td><td>{row.items}</td><td>{money.format(row.value)}</td></tr>)}</tbody></table></div></section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Indeks musim bulanan</h3><p className="mt-1 text-xs text-slate-500">Indeks di atas 1 berarti lebih tinggi daripada rata-rata bulanan baseline.</p><div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">{data.monthly.map((row) => <div key={row.month} className={`rounded-xl border p-3 ${row.seasonalIndex >= 1.5 ? 'border-rose-200 bg-rose-50' : row.seasonalIndex >= 1 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}><p className="text-xs text-slate-500">{row.label.slice(0, 3)}</p><p className="text-lg font-bold">{row.seasonalIndex.toFixed(2)}</p><p className="text-[11px] text-slate-500">{row.reports} laporan</p></div>)}</div></section>
      </div>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">Kombinasi jabatan × objek yang menonjol</h3><p className="mt-1 text-xs text-slate-500">Lift &gt; 1 menunjukkan kombinasi muncul lebih sering daripada perkiraan apabila keduanya independen; minimal 3 laporan.</p><div className="mt-4 grid gap-2 md:grid-cols-2">{data.associations.map((row) => <div key={row.label} className="flex justify-between gap-4 rounded-xl bg-slate-50 px-4 py-3 text-sm"><span>{row.label}</span><span className="shrink-0 font-bold text-indigo-700">{row.lift.toFixed(2)}× · {row.reports}</span></div>)}</div></section>
      <section className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 shadow-sm"><h3 className="font-bold text-cyan-950">Validasi pola dengan Loss Event Database</h3><p className="mt-1 text-xs text-cyan-800">Laporan menunjukkan paparan; LED menunjukkan risiko yang benar-benar terealisasi. Hanya hubungan yang dikonfirmasi UPG Pusat dihitung.</p>{led.ready ? <><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><Mini label="Loss event tervalidasi" value={led.events} /><Mini label="Upper limit" value={led.upperLimit} /><Mini label="Dampak tinggi/sangat tinggi" value={led.highImpact} /><Mini label="Laporan terkonfirmasi" value={led.confirmedReports} /><Mini label="Belum ada bukti LED" value={led.reportsWithoutConfirmedLoss} /></div><div className="mt-4 grid gap-2 md:grid-cols-2">{led.scenarios.map(([label,count]) => <div key={label} className="flex justify-between rounded-lg bg-white px-3 py-2 text-xs"><span>{label}</span><b>{count} hubungan</b></div>)}</div></> : <p className="mt-3 text-sm text-cyan-800">Skema LEDM belum tersedia. Jalankan migrasi terbaru untuk mengaktifkan analisis keterhubungan.</p>}</section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Insight B nasional per risiko generik</h3><p className="mt-1 text-xs text-slate-500">Signifikansi menggunakan persentase Satker, bukan jumlah kejadian mentah. Penyebutnya seluruh Satker pada master unit kerja.</p>{nationalRisks.error ? <p className="mt-3 text-sm text-amber-700">Insight B belum tersedia: {nationalRisks.error}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[900px] text-left text-xs"><thead className="text-slate-500"><tr><th className="p-2">Risiko generik</th><th className="p-2">Satker terdampak</th><th className="p-2">Dampak tinggi</th><th className="p-2">Berulang</th><th className="p-2">Kontrol gagal</th><th className="p-2">Klaster 1/2/3</th><th className="p-2">Keyakinan data</th></tr></thead><tbody>{nationalRisks.rows.filter((row) => row.affected_satkers > 0).map((row) => <tr key={row.risk_library_id} className="border-t border-slate-100"><td className="p-2"><b>{row.kode}</b><p className="mt-1 max-w-md text-slate-500">{row.peristiwa}</p></td><td className="p-2 font-bold text-indigo-700">{row.affected_pct.toFixed(1)}%</td><td className="p-2">{row.high_impact_pct.toFixed(1)}%</td><td className="p-2">{row.recurring_pct.toFixed(1)}%</td><td className="p-2">{row.control_failure_pct.toFixed(1)}%</td><td className="p-2">{row.cluster_1_satkers} / {row.cluster_2_satkers} / {row.cluster_3_satkers}</td><td className="p-2 capitalize">{row.data_confidence}</td></tr>)}</tbody></table>{!nationalRisks.rows.some((row) => row.affected_satkers > 0) && <p className="p-4 text-sm text-slate-500">Belum ada loss event tervalidasi yang terpetakan ke risiko generik pada periode analisis.</p>}</div>}</section>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><strong>Batas interpretasi:</strong> Indeks Eksposur mengukur konsentrasi laporan, nilai, dan objek uang—bukan probabilitas pelanggaran atau penilaian individu. Volume pegawai hanya layak menjadi faktor bila tersedia denominator jumlah pegawai per satker/jabatan; tanpa itu sistem tidak menyimpulkan “semakin banyak pegawai semakin berisiko”. Keluaran selalu memerlukan review UPG Pusat.</div>
    </>}
  </div>
}

const input = 'rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500'
function percent(value: number) { return `${(value * 100).toFixed(1)}%` }
function signedPercent(value: number) { return `${value > 0 ? '+' : ''}${percent(value)}` }
function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${value}T00:00:00Z`)) }
function Priority({ value }: { value: 'tinggi' | 'sedang' | 'normal' }) { const tone = value === 'tinggi' ? 'bg-rose-50 text-rose-700' : value === 'sedang' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'; return <span className={`rounded-full px-2 py-1 text-[11px] font-bold uppercase ${tone}`}>{value}</span> }
function Ranking({ title, rows }: { title: string; rows: PpgGroupMetric[] }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold">{title}</h3><div className="mt-4 space-y-3">{rows.slice(0, 7).map((row) => <div key={row.label}><div className="flex justify-between gap-3 text-xs"><span className="truncate text-slate-600" title={row.label}>{row.label}</span><b>{row.exposureScore.toFixed(1)}</b></div><div className="mt-1 h-2 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-gradient-to-r from-indigo-600 to-cyan-500" style={{ width: `${Math.max(2, row.exposureScore)}%` }} /></div><p className="mt-1 text-[11px] text-slate-400">{row.reports} laporan · {percent(row.share)}</p></div>)}</div></section> }
function Mini({ label, value }: { label: string; value: string | number }) { return <div className="min-w-0 overflow-hidden rounded-xl bg-white p-3"><p className="text-[11px] text-slate-500">{label}</p><p className="mt-1 break-words font-bold leading-tight text-slate-900 [overflow-wrap:anywhere]">{value}</p></div> }
