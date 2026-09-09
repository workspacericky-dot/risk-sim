import { AlertTriangle, CheckCircle2, Scale, Target } from 'lucide-react'
import { getPpgRiskAppetiteWorkspace } from '@/lib/ppg/data'
import { evaluatePpgAppetite } from '@/lib/ppg/risk-appetite'
import { SectionHeading } from '../_components'
import { PpgRiskAppetiteEditor } from './PpgRiskAppetiteEditor'

type Props = { searchParams: Promise<{ tahun?: string; unit?: string }> }

export default async function PpgRiskAppetitePage({ searchParams }: Props) {
  const query = await searchParams
  const year = Number(query.tahun) >= 2000 && Number(query.tahun) <= 2200 ? Number(query.tahun) : new Date().getFullYear()
  const data = await getPpgRiskAppetiteWorkspace(year)
  const selectedUnitId = data.access.isSatker ? data.access.unitId : (query.unit || (data.access.isAdmin ? String(data.units[0]?.id || '') : ''))
  const selectedUnit = data.units.find((unit) => String(unit.id) === selectedUnitId)
  const selectedAppetite = data.appetites.find((row) => String(row.unit_kerja_id) === selectedUnitId) ?? null
  const appetiteByUnit = new Map(data.appetites.map((row) => [String(row.unit_kerja_id), row]))
  const assessments = data.registers.map((register) => ({ register, evaluation: evaluatePpgAppetite(register.skor_existing, register.kategori, appetiteByUnit.get(String(register.unit_kerja_id))) }))
  const above = assessments.filter((item) => item.evaluation.status === 'di_atas_selera').length
  const accepted = assessments.filter((item) => item.evaluation.status === 'dalam_selera').length
  const unset = assessments.filter((item) => item.evaluation.status === 'belum_ditetapkan').length

  return <div className="space-y-6">
    <SectionHeading eyebrow="Ex-ante treatment gate" title="Selera Risiko PPG" description="Setiap UPG Satker menetapkan skor residual tertinggi yang masih dapat diterima per kategori. Hasilnya menjadi landasan awal apakah risiko perlu ditreatment melalui Program PPG." />
    {data.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">Data selera risiko belum dapat dimuat: {data.error}. Jalankan migration_ppg.sql terbaru.</div>}
    <section className="grid gap-3 md:grid-cols-2"><article className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-950"><div className="flex gap-3"><Target className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="font-bold">Selera risiko · ditetapkan UPG Satker</h3><p className="mt-1 text-xs leading-relaxed">Batas penerimaan atas <strong>residual risk</strong> per kategori, Satker, dan tahun. Skor residual &gt; selera berarti secara awal perlu treatment; skor ≤ selera dapat diterima dengan monitoring.</p></div></div></article><article className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-950"><div className="flex gap-3"><Scale className="mt-0.5 h-5 w-5 shrink-0" /><div><h3 className="font-bold">Upper limit · ditetapkan UPG Pusat</h3><p className="mt-1 text-xs leading-relaxed">Ambang <strong>dampak kejadian aktual</strong> pada Loss Event untuk eskalasi dan Insight B. Ia bukan selera risiko dan dapat menjadi dasar intervensi pusat meskipun penilaian residual Satker masih dalam selera.</p></div></div></article></section>

    <form className="flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><label className="grid gap-1 text-xs font-semibold text-slate-600">Tahun<input name="tahun" type="number" min="2000" max="2200" defaultValue={year} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>{data.access.isAdmin && <label className="grid min-w-72 flex-1 gap-1 text-xs font-semibold text-slate-600">Satker yang disunting<select name="unit" defaultValue={selectedUnitId || ''} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal">{data.units.map((unit) => <option key={String(unit.id)} value={String(unit.id)}>{String(unit.nama_unit)}</option>)}</select></label>}<button className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white">Tampilkan</button></form>

    <div className="grid gap-3 sm:grid-cols-3"><Metric icon={AlertTriangle} label="Di atas selera" value={above} note="Kandidat Program PPG" tone="rose" /><Metric icon={CheckCircle2} label="Dalam selera" value={accepted} note="Diterima dengan monitoring" tone="emerald" /><Metric icon={Target} label="Belum dapat dinilai" value={unset} note="Selera Satker belum ditetapkan" tone="amber" /></div>

    {(data.access.isSatker || data.access.isAdmin) && selectedUnit ? <PpgRiskAppetiteEditor key={`${selectedUnitId}-${year}-${String(selectedAppetite?.updated_at || '')}`} unitId={String(selectedUnit.id)} unitName={String(selectedUnit.nama_unit)} year={year} initial={selectedAppetite} /> : null}

    {data.access.isPusat && !data.access.isAdmin && <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Cakupan penetapan Satker · {year}</h3><p className="mt-1 text-xs text-slate-500">UPG Pusat memantau tetapi tidak menetapkan selera atas nama Satker.</p><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-3 py-2">Satker</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Kecurangan</th><th className="px-3 py-2">Kepatuhan</th><th className="px-3 py-2">Operasional</th></tr></thead><tbody className="divide-y divide-slate-100">{data.units.map((unit) => { const appetite = appetiteByUnit.get(String(unit.id)); return <tr key={String(unit.id)}><td className="px-3 py-2 font-medium">{String(unit.nama_unit)}</td><td className="px-3 py-2">{appetite ? 'Sudah ditetapkan' : 'Belum ditetapkan'}</td><td className="px-3 py-2">{appetite ? String(appetite.kecurangan) : '—'}</td><td className="px-3 py-2">{appetite ? String(appetite.kepatuhan) : '—'}</td><td className="px-3 py-2">{appetite ? String(appetite.operasional) : '—'}</td></tr> })}</tbody></table></div></section>}
  </div>
}

function Metric({ icon: Icon, label, value, note, tone }: { icon: typeof Target; label: string; value: number; note: string; tone: 'rose' | 'emerald' | 'amber' }) {
  const colors = { rose: 'bg-rose-50 text-rose-700', emerald: 'bg-emerald-50 text-emerald-700', amber: 'bg-amber-50 text-amber-700' }
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><Icon className={`h-5 w-5 rounded-lg p-0.5 ${colors[tone]}`} /><p className="mt-3 text-xs font-semibold text-slate-500">{label}</p><p className="text-2xl font-bold text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{note}</p></article>
}
