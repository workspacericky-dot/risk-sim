'use client'

import { useMemo, useState } from 'react'
import { Map, Search } from 'lucide-react'
import { PPG_LEVELS, ppgAssessment } from '@/lib/ppg/scoring'

type Unit = { id: string; nama_unit: string }
type Risk = {
  id: string
  kode: string
  unit_kerja_id: string
  unit_nama: string
  tahun: number
  periode: string
  kemungkinan_existing: number
  dampak_existing: number
  peristiwa: string
}

const K_LABELS: Record<number, string> = { 5: 'Hampir pasti', 4: 'Kemungkinan besar', 3: 'Mungkin', 2: 'Kemungkinan kecil', 1: 'Jarang' }
const D_LABELS: Record<number, string> = { 1: 'Sangat Rendah', 2: 'Rendah', 3: 'Sedang', 4: 'Tinggi', 5: 'Sangat Tinggi' }

export function PpgRiskMatrixExplorer({ units, risks, fixedUnitId }: { units: Unit[]; risks: Risk[]; fixedUnitId?: string | null }) {
  const firstUnitId = fixedUnitId || ''
  const initialRows = risks.filter((risk) => risk.unit_kerja_id === firstUnitId)
  const [selectedUnitId, setSelectedUnitId] = useState(firstUnitId)
  const [selectedYear, setSelectedYear] = useState(() => latestYear(initialRows))
  const [selectedPeriod, setSelectedPeriod] = useState(() => latestPeriod(initialRows, latestYear(initialRows)))
  const [search, setSearch] = useState('')

  const filteredUnits = useMemo(() => units.filter((unit) => unit.nama_unit.toLocaleLowerCase('id-ID').includes(search.toLocaleLowerCase('id-ID'))), [search, units])
  const unitRows = useMemo(() => risks.filter((risk) => risk.unit_kerja_id === selectedUnitId), [risks, selectedUnitId])
  const years = useMemo(() => [...new Set(unitRows.map((risk) => Number(risk.tahun)))].filter(Boolean).sort((a, b) => b - a), [unitRows])
  const periods = useMemo(() => [...new Set(unitRows.filter((risk) => Number(risk.tahun) === selectedYear).map((risk) => risk.periode || 'Tahunan'))], [selectedYear, unitRows])
  const displayed = unitRows.filter((risk) => Number(risk.tahun) === selectedYear && (risk.periode || 'Tahunan') === selectedPeriod)
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId)

  function selectUnit(unitId: string) {
    const rows = risks.filter((risk) => risk.unit_kerja_id === unitId)
    const year = latestYear(rows)
    setSelectedUnitId(unitId)
    setSelectedYear(year)
    setSelectedPeriod(latestPeriod(rows, year))
  }

  function selectYear(year: number) {
    setSelectedYear(year)
    setSelectedPeriod(latestPeriod(unitRows, year))
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-5"><h3 className="font-bold text-slate-900">Peta Risiko PPG per Satker</h3><p className="mt-1 text-xs text-slate-500">Pilih satker, tahun, dan periode untuk menampilkan posisi setiap risiko pada matriks 5×5.</p></div>
    <div className="grid min-h-[520px] lg:grid-cols-[260px_1fr]">
      <aside className="border-b border-slate-200 lg:border-b-0 lg:border-r">
        {!fixedUnitId && <div className="border-b p-3"><label className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2"><Search className="h-4 w-4 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari nama satker..." className="min-w-0 flex-1 bg-transparent text-xs outline-none" /></label></div>}
        <div className="max-h-72 overflow-y-auto lg:max-h-[460px]">{filteredUnits.map((unit) => { const count = risks.filter((risk) => risk.unit_kerja_id === unit.id).length; return <button key={unit.id} type="button" onClick={() => selectUnit(unit.id)} className={`flex w-full items-start justify-between gap-2 border-b border-slate-100 px-4 py-3 text-left text-xs transition ${selectedUnitId === unit.id ? 'bg-indigo-50 font-semibold text-indigo-800' : 'text-slate-700 hover:bg-slate-50'}`}><span>{unit.nama_unit}</span><span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-slate-500">{count}</span></button>})}{!filteredUnits.length && <p className="p-6 text-center text-xs text-slate-400">Satker tidak ditemukan.</p>}</div>
      </aside>
      <div className="min-w-0 p-4 sm:p-5">
        {!selectedUnit ? <div className="flex h-full min-h-80 flex-col items-center justify-center gap-3 text-slate-400"><Map className="h-10 w-10 opacity-30" /><p className="text-sm">Pilih satker di sebelah kiri untuk menampilkan peta risiko.</p></div> : <>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Satker terpilih</p><h4 className="font-bold text-slate-900">{selectedUnit.nama_unit}</h4><p className="text-xs text-slate-500">{displayed.length} risiko pada matriks</p></div><div className="flex gap-2"><label className="grid gap-1 text-[10px] font-semibold text-slate-500">Tahun<select value={selectedYear || ''} onChange={(event) => selectYear(Number(event.target.value))} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">{years.map((year) => <option key={year}>{year}</option>)}</select></label><label className="grid gap-1 text-[10px] font-semibold text-slate-500">Periode<select value={selectedPeriod} onChange={(event) => setSelectedPeriod(event.target.value)} className="max-w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700">{periods.map((period) => <option key={period}>{period}</option>)}</select></label></div></div>
          {displayed.length ? <PpgMatrix risks={displayed} /> : <div className="flex min-h-80 flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 text-slate-400"><Map className="h-8 w-8 opacity-30" /><p className="text-sm">Belum ada penilaian pada periode ini.</p></div>}
        </>}
      </div>
    </div>
  </section>
}

function PpgMatrix({ risks }: { risks: Risk[] }) {
  return <div className="w-full overflow-x-auto"><div className="min-w-[610px]">
    <div className="flex"><div className="w-36 shrink-0" />{[1,2,3,4,5].map((d) => <div key={d} className="flex-1 pb-2 text-center text-[10px] text-slate-600"><b className="block text-slate-400">{d}</b>{D_LABELS[d]}</div>)}</div>
    {[5,4,3,2,1].map((k) => <div key={k} className="flex"><div className="flex w-36 shrink-0 items-center justify-end px-3 text-right text-[10px] text-slate-600"><span><b className="block text-slate-400">{k}</b>{K_LABELS[k]}</span></div>{[1,2,3,4,5].map((d) => { const assessment = ppgAssessment(k, d); const level = PPG_LEVELS.find((item) => item.label === assessment.level); const points = risks.filter((risk) => Number(risk.kemungkinan_existing) === k && Number(risk.dampak_existing) === d); return <div key={d} title={`K${k} × D${d} = ${assessment.score} (${assessment.level})`} className="relative flex min-h-20 flex-1 flex-wrap items-center justify-center gap-1 border border-white/40 p-1" style={{ backgroundColor: level?.color }}><span className="absolute left-1.5 top-1 text-[9px] font-bold text-white/90">{assessment.score}</span>{points.map((risk) => <span key={risk.id} title={`${risk.kode}: ${risk.peristiwa}`} className="z-10 inline-flex min-h-7 max-w-[90%] items-center rounded-full border-2 border-white/80 bg-white px-2 text-center text-[9px] font-bold text-slate-800 shadow-md">{risk.kode}</span>)}</div>})}</div>)}
    <div className="ml-36 mt-2 text-center text-[11px] font-semibold text-slate-500">← Tingkat Dampak →</div><div className="mt-3 flex flex-wrap justify-center gap-3">{PPG_LEVELS.map((level) => <span key={level.label} className="flex items-center gap-1.5 text-[10px] text-slate-600"><i className="h-3 w-3 rounded-sm" style={{ backgroundColor: level.color }} />{level.label}</span>)}</div>
  </div></div>
}

function latestYear(rows: Risk[]) { return rows.reduce((latest, row) => Math.max(latest, Number(row.tahun) || 0), 0) }
function latestPeriod(rows: Risk[], year: number) { return rows.find((row) => Number(row.tahun) === year)?.periode || 'Tahunan' }
