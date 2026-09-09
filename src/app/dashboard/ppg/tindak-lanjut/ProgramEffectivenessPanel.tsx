'use client'

import { useActionState, useMemo, useState } from 'react'
import { updatePpgTreatedRisk, type PpgTreatedRiskActionState } from '../actions'
import { PpgCombobox } from '../PpgCombobox'
import { PPG_IMPACT_OPTIONS, PPG_PROBABILITY_OPTIONS } from '@/lib/ppg/references'

type Row = Record<string, unknown>
const initialState: PpgTreatedRiskActionState = { status: 'idle', message: '' }
const input = 'h-9 w-full rounded-lg border border-input bg-white px-3 text-sm font-normal outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/50'

export function ProgramEffectivenessPanel({ registers, programs, canEdit }: { registers: Row[]; programs: Row[]; canEdit: boolean }) {
  const [state, action, pending] = useActionState(updatePpgTreatedRisk, initialState)
  const [registerId, setRegisterId] = useState('')
  const [programId, setProgramId] = useState('')
  const selectedRegister = registers.find((row) => String(row.id) === registerId)
  const eligiblePrograms = useMemo(() => programs.filter((program) => arrayRecords(program.items).some((item) => String(item.risk_library_id) === String(selectedRegister?.risk_library_id) && String(item.status) === 'selesai')), [programs, selectedRegister])
  const assessed = registers.filter((row) => row.skor_treated && row.treated_program_id)

  return <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
    <div><h3 className="font-bold text-emerald-950">Nilai treated risk pasca-Program PPG</h3><p className="mt-1 text-xs text-emerald-800">Bandingkan residual risk sebelum program dengan treated risk setelah program selesai, lalu nilai efektivitas program dan sertakan evidence.</p></div>
    {canEdit ? <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <div className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Risk Register Satker</span><PpgCombobox name="register_id" required searchable value={registerId} onValueChange={(value) => { setRegisterId(value); setProgramId('') }} placeholder="Pilih register yang menerima Program PPG" options={registers.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.unit_nama)}`, description: `${String(row.peristiwa)} · residual ${String(row.skor_existing)} (${String(row.level_existing)})` }))} /></div>
      <div className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Program PPG terkait</span><PpgCombobox name="program_id" required searchable value={programId} onValueChange={setProgramId} disabled={!registerId || !eligiblePrograms.length} placeholder={!registerId ? 'Pilih Risk Register terlebih dahulu' : eligiblePrograms.length ? 'Pilih program yang telah selesai' : 'Belum ada program selesai untuk risiko ini'} options={eligiblePrograms.map((program) => ({ value: String(program.id), label: `${String(program.kode)} · ${String(program.nama)}`, description: `${dateLabel(program.program_start)}—${dateLabel(program.program_end)}` }))} /></div>
      {selectedRegister && <p className="rounded-xl bg-white p-3 text-xs text-emerald-900 sm:col-span-2"><b>Baseline residual risk:</b> {String(selectedRegister.skor_existing)} · {String(selectedRegister.level_existing)}</p>}
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Probabilitas treated</span><PpgCombobox name="kemungkinan_treated" required placeholder="Pilih probabilitas" options={PPG_PROBABILITY_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Dampak treated</span><PpgCombobox name="dampak_treated" required placeholder="Pilih dampak" options={PPG_IMPACT_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Efektivitas Program PPG<select name="efektivitas_program" required defaultValue="" className={input}><option value="" disabled>Pilih efektivitas program</option><option value="tidak_efektif">Tidak efektif</option><option value="kurang_efektif">Kurang efektif</option><option value="cukup_efektif">Cukup efektif</option><option value="efektif">Efektif</option></select></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Evidence efektivitas Program PPG<input name="bukti_efektivitas_program_url" type="url" required placeholder="https://drive.google.com/... atau OneDrive" className={input} /></label>
      <button disabled={pending || !eligiblePrograms.length} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? 'Menyimpan…' : 'Simpan evaluasi dampak program'}</button>
      {state.message && <p aria-live="polite" className={`rounded-xl px-3 py-2 text-sm sm:col-span-2 ${state.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}>{state.message}</p>}
    </form> : <p className="mt-3 rounded-xl bg-white p-3 text-xs text-slate-600">UPG Pusat memantau hasil. Pengisian dilakukan oleh UPG Satker atau Admin Sistem setelah item program selesai.</p>}

    {assessed.length > 0 && <details className="mt-5 rounded-xl border border-emerald-200 bg-white p-3"><summary className="cursor-pointer text-sm font-semibold text-emerald-900">Hasil evaluasi tersimpan ({assessed.length})</summary><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-slate-50"><tr><th className="p-2">Satker / Risiko</th><th className="p-2">Residual</th><th className="p-2">Treated</th><th className="p-2">Perubahan</th><th className="p-2">Efektivitas program</th><th className="p-2">Evidence</th></tr></thead><tbody>{assessed.map((row) => <tr key={String(row.id)} className="border-t"><td className="p-2"><b>{String(row.unit_nama)}</b><span className="block text-slate-500">{String(row.kode)} · {String(row.peristiwa)}</span></td><td className="p-2">{String(row.skor_existing)} · {String(row.level_existing)}</td><td className="p-2">{String(row.skor_treated)} · {String(row.level_treated)}</td><td className="p-2"><RiskDelta residual={Number(row.skor_existing)} treated={Number(row.skor_treated)} /></td><td className="p-2 capitalize">{String(row.efektivitas_program).replaceAll('_', ' ')}</td><td className="p-2"><a href={String(row.bukti_efektivitas_program_url)} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">Buka evidence</a></td></tr>)}</tbody></table></div></details>}
  </section>
}

function arrayRecords(value: unknown): Row[] { return Array.isArray(value) ? value.map((item) => record(item)) : [] }
function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {} }
function dateLabel(value: unknown) { const source = String(value || ''); return source ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${source.slice(0, 10)}T00:00:00Z`)) : '—' }
function RiskDelta({ residual, treated }: { residual: number; treated: number }) { const delta = treated - residual; return <span className={`font-semibold ${delta < 0 ? 'text-emerald-700' : delta > 0 ? 'text-rose-700' : 'text-amber-700'}`}>{delta < 0 ? `Turun ${Math.abs(delta)}` : delta > 0 ? `Naik ${delta}` : 'Tetap'}</span> }
