'use client'

import { useActionState } from 'react'
import { PPG_IMPACT_OPTIONS, PPG_PROBABILITY_OPTIONS } from '@/lib/ppg/references'
import { createPpgRegisterFromImport, initialRiskImportState } from '../risk-import-actions'

type Row = Record<string, unknown>

export function ImportedRiskDraftReview({ rows, risks }: { rows: Row[]; risks: Row[] }) {
  if (!rows.length) return null
  return <section className="space-y-3"><div><h3 className="font-bold text-slate-900">Draf hasil impor yang perlu dilengkapi</h3><p className="mt-1 text-sm text-slate-500">Data Excel sudah terisi. Pilih generic risk dan lengkapi residual risk sebelum membuat Penilaian Risiko.</p></div>{rows.map((row) => <ImportedRow key={String(row.id)} row={row} risks={risks} />)}</section>
}

function ImportedRow({ row, risks }: { row: Row; risks: Row[] }) {
  const [state, action, pending] = useActionState(createPpgRegisterFromImport, initialRiskImportState)
  const selectClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
  const errors = Array.isArray(row.validation_errors) ? row.validation_errors.map(String) : []
  return <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <summary className="cursor-pointer list-none"><div className="flex flex-wrap items-start justify-between gap-3"><div><b className="text-slate-900">{String(row.peristiwa)}</b><p className="mt-1 text-xs text-slate-500">{String(row.unit_nama_raw || 'Unit akun')} · {String(row.periode)} {String(row.tahun || '')} · baris {String(row.source_row)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${row.matched_library_id ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{row.matched_library_id ? 'GENERIC RISK DITEMUKAN' : 'MENUNGGU KURASI'}</span></div></summary>
    <form action={action} className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
      <input type="hidden" name="import_row_id" value={String(row.id)} />
      <label className="space-y-1 text-xs font-semibold text-slate-600 sm:col-span-2"><span>Generic risk aktif</span><select name="risk_library_id" defaultValue={String(row.matched_library_id || '')} className={selectClass}><option value="">Pilih setelah kurasi UPG Pusat</option>{risks.map((risk) => <option key={String(risk.id)} value={String(risk.id)}>{String(risk.kode)} · {String(risk.peristiwa)}</option>)}</select></label>
      <RiskSelect name="kemungkinan_inherent" label="Probabilitas inherent" value={Number(row.kemungkinan_inherent || 0)} options={PPG_PROBABILITY_OPTIONS} />
      <RiskSelect name="dampak_inherent" label="Dampak inherent" value={Number(row.dampak_inherent || 0)} options={PPG_IMPACT_OPTIONS} />
      <RiskSelect name="kemungkinan_residual" label="Probabilitas residual" value={Number(row.kemungkinan_residual || 0)} options={PPG_PROBABILITY_OPTIONS} />
      <RiskSelect name="dampak_residual" label="Dampak residual" value={Number(row.dampak_residual || 0)} options={PPG_IMPACT_OPTIONS} />
      {String(row.control_text || '') ? <p className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 sm:col-span-2"><b>Kontrol dari Excel:</b> {String(row.control_text)}</p> : null}
      {errors.length ? <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900 sm:col-span-2"><b>Perlu diperiksa:</b> {errors.join(', ')}</p> : null}
      <button disabled={pending || !risks.length} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? 'Menyimpan…' : 'Buat draf Penilaian Risiko'}</button>
      {state.message ? <p className={`rounded-xl px-3 py-2 text-sm sm:col-span-2 ${state.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{state.message}</p> : null}
    </form>
  </details>
}

function RiskSelect({ name, label, value, options }: { name: string; label: string; value: number; options: readonly { value: number; label: string }[] }) {
  return <label className="space-y-1 text-xs font-semibold text-slate-600"><span>{label}</span><select name={name} defaultValue={value || ''} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-normal"><option value="">Pilih nilai</option>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
}
