'use client'

import { useActionState } from 'react'
import { Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { importZiWorkbook } from '../actions'
import { initialZiImportState } from '../import-state'

export function ZiImportForm() {
  const [state, action, pending] = useActionState(importZiWorkbook, initialZiImportState)
  return <section className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start"><div className="flex items-start gap-3"><span className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700"><FileSpreadsheet className="h-5 w-5"/></span><div><h2 className="font-bold text-slate-900">Impor data uji publik</h2><p className="mt-1 text-sm text-slate-600">Gunakan file .xlsx dengan header: no, nama, usia, kelamin, pekerjaan, unit kerja, tag_list, pendapat, dan rating_bintang.</p></div></div><a href="/templates/Template_Uji_Publik_ZI.xlsx" download className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"><Download className="h-4 w-4"/>Unduh template</a></div>
    <form action={action} className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="min-w-0 flex-1 space-y-1 text-sm font-semibold text-slate-600"><span>File Excel</span><input type="file" name="file" accept=".xlsx" required className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm"/></label>
      <button disabled={pending} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:opacity-50">{pending?<LoaderCircle className="h-4 w-4 animate-spin"/>:<Upload className="h-4 w-4"/>}{pending?'Memproses…':'Unggah dan analisis'}</button>
    </form>
    <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-950"><strong>Privasi:</strong> nama disimpan untuk detail terbatas. Dashboard dan laporan hanya menerima data anonim.</div>
    {state.message && <p role={state.status==='error'?'alert':'status'} className={`mt-3 rounded-xl px-3 py-2 text-sm ${state.status==='success'?'bg-emerald-50 text-emerald-800':'bg-rose-50 text-rose-800'}`}>{state.message}</p>}
  </section>
}
