'use client'

import { useActionState } from 'react'
import { LoaderCircle } from 'lucide-react'
import { PPG_BUSINESS_PROCESSES, PPG_CAUSE_FACTORS, PPG_RISK_CATEGORIES, PPG_RISK_CLASSIFICATIONS } from '@/lib/ppg/references'
import { reviewPpgRiskCandidate } from './risk-import-actions'
import { initialRiskImportState } from './risk-import-state'

type Row = Record<string, unknown>

export function RiskCandidateReview({ candidates, libraries }: { candidates: Row[]; libraries: Row[] }) {
  if (!candidates.length) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center"><h3 className="font-semibold text-slate-800">Belum ada usulan yang menunggu kurasi</h3><p className="mt-2 text-sm text-slate-500">Unggah Risk Register baku untuk menyusun kandidat risiko generik.</p></div>
  return <div className="space-y-4">{candidates.map((candidate) => <CandidateCard key={String(candidate.id)} candidate={candidate} libraries={libraries} />)}</div>
}

function CandidateCard({ candidate, libraries }: { candidate: Row; libraries: Row[] }) {
  const [state, action, pending] = useActionState(reviewPpgRiskCandidate, initialRiskImportState)
  const members = Array.isArray(candidate.members) ? candidate.members as Row[] : []
  const sourceRows = members.map((member) => relation(member.row)).filter((row) => Object.keys(row).length)
  const units = new Set(sourceRows.map((row) => String(row.unit_nama_raw || '')).filter(Boolean))
  const average = members.length ? members.reduce((sum, member) => sum + Number(member.similarity || 0), 0) / members.length : Number(candidate.confidence || 0)
  const selectClass = 'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm'
  const inputClass = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm'

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Usulan risiko generik</p><h4 className="mt-1 font-bold text-slate-900">{String(candidate.peristiwa)}</h4><p className="mt-1 text-xs text-slate-500">{sourceRows.length} baris sumber · {units.size} satker · kemiripan rata-rata {average.toFixed(1)}%</p></div><span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">PERLU KEPUTUSAN</span></div>
    <details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold text-slate-700">Lihat bukti sumber ({sourceRows.length})</summary><div className="mt-3 space-y-2">{sourceRows.map((row) => <div key={String(row.id)} className="rounded-lg border border-slate-200 bg-white p-3 text-xs"><b>{String(row.unit_nama_raw || 'Unit belum dikenali')} · baris {String(row.source_row)}</b><p className="mt-1 text-slate-700">{String(row.peristiwa)}</p>{Array.isArray(row.validation_errors) && row.validation_errors.length ? <p className="mt-1 text-rose-700">Perlu dilengkapi: {row.validation_errors.join(', ')}</p> : null}</div>)}</div></details>
    <form action={action} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="candidate_id" value={String(candidate.id)} />
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Kategori risiko</span><select name="kategori" defaultValue={String(candidate.kategori || '')} className={selectClass}><option value="">Pilih kategori</option>{PPG_RISK_CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Klasifikasi risiko</span><select name="klasifikasi_risiko" defaultValue={String(candidate.klasifikasi_risiko || '')} className={selectClass}><option value="">Pilih klasifikasi</option>{PPG_RISK_CLASSIFICATIONS.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Proses bisnis</span><select name="proses_bisnis" defaultValue={String(candidate.proses_bisnis || '')} className={selectClass}><option value="">Pilih proses</option>{PPG_BUSINESS_PROCESSES.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Subproses bisnis</span><input name="subproses_bisnis" defaultValue={String(candidate.subproses_bisnis || '')} placeholder="Wajib untuk Administrasi Umum" className={inputClass} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Faktor penyebab</span><select name="faktor_penyebab" defaultValue={String(candidate.faktor_penyebab || '')} className={selectClass}><option value="">Pilih faktor</option>{PPG_CAUSE_FACTORS.map((item) => <option key={item.label}>{item.label}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Gabungkan ke risiko yang sudah ada</span><select name="library_id" defaultValue="" className={selectClass}><option value="">Pilih bila ingin menggabungkan</option>{libraries.map((item) => <option key={String(item.id)} value={String(item.id)}>{String(item.kode)} · {String(item.peristiwa)}</option>)}</select></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600 sm:col-span-2"><span>Peristiwa generik</span><textarea name="peristiwa" defaultValue={String(candidate.peristiwa || '')} className={`${inputClass} min-h-20`} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Penyebab generik</span><textarea name="penyebab" defaultValue={String(candidate.penyebab || '')} className={`${inputClass} min-h-24`} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Dampak generik</span><textarea name="dampak" defaultValue={String(candidate.dampak || '')} className={`${inputClass} min-h-24`} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600 sm:col-span-2"><span>Catatan keputusan</span><input name="catatan_keputusan" placeholder="Dasar penggabungan, penyuntingan, atau penolakan" className={inputClass} /></label>
      <div className="flex flex-wrap gap-2 sm:col-span-2"><button name="decision" value="approve_new" disabled={pending} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Setujui sebagai risiko baru</button><button name="decision" value="merge_existing" disabled={pending || !libraries.length} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Gabungkan ke library</button><button name="decision" value="reject" disabled={pending} className="rounded-xl border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 disabled:opacity-50">Tolak</button>{pending ? <LoaderCircle className="h-5 w-5 animate-spin self-center text-indigo-600" /> : null}</div>
      {state.message ? <p aria-live="polite" className={`rounded-xl px-3 py-2 text-sm sm:col-span-2 ${state.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{state.message}</p> : null}
    </form>
  </article>
}

function relation(value: unknown): Row {
  if (Array.isArray(value)) return relation(value[0])
  return value && typeof value === 'object' ? value as Row : {}
}
