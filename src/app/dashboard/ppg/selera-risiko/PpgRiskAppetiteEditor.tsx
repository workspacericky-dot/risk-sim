'use client'

import { useActionState, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'
import { PPG_APPETITE_CATEGORIES, PPG_DEFAULT_APPETITE } from '@/lib/ppg/risk-appetite'
import { savePpgRiskAppetite, type AppetiteActionState } from './actions'

type AppetiteRow = Record<string, unknown> | null
const initialState: AppetiteActionState = { status: 'idle', message: '' }

export function PpgRiskAppetiteEditor({ unitId, unitName, year, initial }: { unitId: string; unitName: string; year: number; initial: AppetiteRow }) {
  const [state, action, pending] = useActionState(savePpgRiskAppetite, initialState)
  const [values, setValues] = useState(() => Object.fromEntries(PPG_APPETITE_CATEGORIES.map((category) => [category.key, Number(initial?.[category.key] ?? PPG_DEFAULT_APPETITE[category.key])])))
  const acceptedCells = useMemo(() => Object.values(values).reduce((sum, threshold) => sum + productScores.filter((score) => score <= threshold).length, 0), [values])

  return <form action={action} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <input type="hidden" name="unit_kerja_id" value={unitId} /><input type="hidden" name="tahun" value={year} />
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900">Penetapan ambang per kategori</h3><p className="mt-1 text-xs text-slate-500">{unitName} · Tahun {year}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{initial ? 'Sudah ditetapkan' : 'Belum ditetapkan · nilai saran ditampilkan'}</span></div>
    <p className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-950"><strong>Aturan keputusan:</strong> residual risk dengan skor <strong>lebih besar</strong> dari nilai maksimum yang diterima menjadi kandidat treatment/Program PPG. Nilai yang sama atau lebih kecil berada dalam selera, tetapi tetap dapat dieskalasi oleh UPG Pusat bila ada loss event upper-limit atau alasan kebijakan yang terdokumentasi.</p>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{PPG_APPETITE_CATEGORIES.map((category) => <label key={category.key} className="rounded-xl border border-slate-200 p-4 text-xs text-slate-600"><span className="block font-bold text-slate-900">{category.label}</span><span className="mt-1 block min-h-8 leading-relaxed">{category.description}</span><span className="mt-3 block font-semibold">Skor maksimum diterima</span><input name={category.key} type="number" min="1" max="25" required value={values[category.key]} onChange={(event) => setValues((current) => ({ ...current, [category.key]: Math.min(25, Math.max(1, Number(event.target.value) || 1)) }))} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-center text-lg font-bold outline-none focus:border-indigo-500" /></label>)}</div>
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-slate-900">Pratinjau matriks PPG K×D</h4><p className="mt-1 text-xs text-slate-500">Contoh kategori Kecurangan · hijau berarti skor produk K×D ≤ {values.kecurangan}.</p></div><span className="text-xs text-slate-500">Rerata sel diterima: {Math.round(acceptedCells / (PPG_APPETITE_CATEGORIES.length * 25) * 100)}%</span></div><ProductMatrix threshold={values.kecurangan} /></div>
    <label className="grid gap-1 text-xs font-semibold text-slate-600">Catatan/justifikasi<textarea name="catatan" defaultValue={String(initial?.catatan || '')} maxLength={1500} rows={3} placeholder="Contoh: toleransi Risiko Kecurangan ditetapkan sangat rendah karena kebijakan zero tolerance terhadap gratifikasi." className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-normal outline-none focus:border-indigo-500" /></label>
    {state.message && <p aria-live="polite" className={`flex items-center gap-2 rounded-xl p-3 text-sm ${state.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{state.status === 'success' ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}{state.message}</p>}
    <button disabled={pending} className="w-full rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Menyimpan…' : 'Tetapkan Selera Risiko PPG'}</button>
  </form>
}

const productScores = Array.from({ length: 25 }, (_, index) => (Math.floor(index / 5) + 1) * ((index % 5) + 1))
function ProductMatrix({ threshold }: { threshold: number }) {
  return <div className="mt-4 overflow-x-auto"><div className="grid min-w-[390px] grid-cols-6 gap-1 text-center text-[10px]"><div /><>{[1,2,3,4,5].map((impact) => <b key={impact} className="p-1 text-slate-500">D{impact}</b>)}</>{[5,4,3,2,1].flatMap((probability) => [<b key={`k-${probability}`} className="flex items-center justify-center p-1 text-slate-500">K{probability}</b>, ...[1,2,3,4,5].map((impact) => { const score = probability * impact; const accepted = score <= threshold; return <span key={`${probability}-${impact}`} className={`rounded p-2 font-bold ${accepted ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{score}</span> })])}</div></div>
}
