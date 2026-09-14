'use client'

import { useActionState } from 'react'
import { CalendarPlus, Loader2 } from 'lucide-react'
import { createInterviewSession } from './actions'
import type { InterviewActionState } from './actions'

const input = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
const initialInterviewActionState: InterviewActionState = { ok: false, message: '' }

export function NewSessionForm() {
  const [state, action, pending] = useActionState(createInterviewSession, initialInterviewActionState)
  return <details className="group rounded-2xl border border-teal-200 bg-white shadow-sm">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-5 font-bold text-slate-900">
      <span className="flex items-center gap-2"><CalendarPlus className="h-5 w-5 text-teal-700"/>Buat sesi wawancara</span><span className="text-xs font-medium text-teal-700 group-open:hidden">Buka formulir</span>
    </summary>
    <form action={action} className="grid gap-4 border-t border-slate-100 p-5 md:grid-cols-2 lg:grid-cols-3">
      <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Nama satuan kerja<input className={input} name="unit_name" required minLength={3} placeholder="Contoh: Pengadilan Negeri ..."/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Jenis/tingkat pengadilan<input className={input} name="court_type" placeholder="PN, PA, PT, PTA, dan lainnya"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Tanggal wawancara<input className={input} name="interview_date" type="date"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Tahap kandidat<input className={input} name="candidate_stage" defaultValue="WBK 2026"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Nomor KKE<input className={input} name="kke_number"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Tim evaluator<input className={input} name="team_name" defaultValue="TIM 4"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Sekretaris tim<input className={input} name="secretary_name" defaultValue="Iana Fahdhasila"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Ketua<input className={input} name="ketua"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Wakil Ketua<input className={input} name="wakil_ketua"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Panitera<input className={input} name="panitera"/></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Sekretaris satker<input className={input} name="sekretaris_satker"/></label>
      <div className="flex items-end md:col-span-2 lg:col-span-3"><button disabled={pending} className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-50">{pending && <Loader2 className="h-4 w-4 animate-spin"/>}Buat dan buka sesi</button></div>
      {state.message && <p className={`text-sm ${state.ok ? 'text-emerald-700' : 'text-rose-700'} md:col-span-2 lg:col-span-3`}>{state.message}</p>}
    </form>
  </details>
}
