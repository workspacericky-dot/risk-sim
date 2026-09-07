'use client'

import { useActionState, useState } from 'react'
import { savePpgLedLimit, type PpgLedLimitActionState } from '../actions'
import { PPG_IMPACT_LEVELS } from '@/lib/ppg/references'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const initialState: PpgLedLimitActionState = { status: 'idle', message: '' }

export function LedLimitForm({ year, level, versions }: { year: number; level: number; versions: { tahun: number; level: number }[] }) {
  const [state, action, pending] = useActionState(savePpgLedLimit, initialState)
  const [selectedYear, setSelectedYear] = useState(year)
  const [selectedLevel, setSelectedLevel] = useState(level)

  function changeYear(nextYear: number) {
    setSelectedYear(nextYear)
    setSelectedLevel(versions.find((item) => item.tahun === nextYear)?.level ?? 4)
  }

  return <form action={action} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_1fr_auto] md:items-end">
    <div className="md:col-span-3"><h3 className="font-bold">Konfigurasi limit tahunan</h3><p className="mt-1 text-xs text-slate-500">Upper limit ditentukan dari level dampak terpadu. Nilai yang tampil adalah konfigurasi aktif pada tahun terpilih.</p></div>
    <label className="grid gap-1 text-xs font-semibold text-slate-600">Tahun<input name="tahun" type="number" min="2000" max="2200" value={selectedYear} onChange={(event) => changeYear(Number(event.target.value))} required className={input} /></label>
    <label className="grid gap-1 text-xs font-semibold text-slate-600">Mulai upper limit<select name="level_dampak_upper" value={selectedLevel} onChange={(event) => setSelectedLevel(Number(event.target.value))} className={input}>{PPG_IMPACT_LEVELS.map((item) => <option key={item.value} value={item.value}>{item.label} ke atas</option>)}</select></label>
    <button disabled={pending} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{pending ? 'Menyimpan…' : 'Simpan versi limit'}</button>
    {versions.length > 0 && <p className="text-xs text-slate-500 md:col-span-3">Versi tersimpan: {versions.map((item) => `${item.tahun} (upper limit mulai Level ${item.level})`).join(' · ')}</p>}
    {state.message && <p aria-live="polite" className={`rounded-lg border p-2 text-xs font-semibold md:col-span-3 ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{state.message}</p>}
  </form>
}
