'use client'

import { useActionState } from 'react'
import { Download, FileSpreadsheet, LoaderCircle, Upload } from 'lucide-react'
import { importPpgRiskRegister } from './risk-import-actions'
import { initialRiskImportState } from './risk-import-state'

export function RiskRegisterImportForm({ defaultMode = 'bootstrap_library', allowModeChoice = true }: { defaultMode?: 'bootstrap_library' | 'operasional_assessment'; allowModeChoice?: boolean }) {
  const [state, action, pending] = useActionState(importPpgRiskRegister, initialRiskImportState)
  return <section className="rounded-2xl border border-indigo-200 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3"><span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700"><FileSpreadsheet className="h-5 w-5" /></span><div><h3 className="font-bold text-slate-900">Impor Risk Register baku</h3><p className="mt-1 max-w-2xl text-sm text-slate-600">Gunakan template kosong berekstensi <b>.xlsx</b> dengan satu sheet bernama <b>Risk Register 2026</b>. Data masuk ke staging untuk dicocokkan dan dikurasi; tidak langsung mengubah Risk Library.</p></div></div>
      <a href="/templates/Template_Risk_Register_PPG_2026_Kosong.xlsx" download className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"><Download className="h-4 w-4" />Unduh template kosong</a>
    </div>
    <form action={action} className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)_auto] md:items-end">
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>File Excel</span><input type="file" name="file" accept=".xlsx" required className="block w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-sm" /></label>
      {allowModeChoice ? <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Tujuan impor</span><select name="mode" defaultValue={defaultMode} className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-normal"><option value="bootstrap_library">Susun kandidat Risk Library</option><option value="operasional_assessment">Cocokkan untuk Penilaian Risiko</option></select></label> : <input type="hidden" name="mode" value={defaultMode} />}
      <button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-indigo-700 px-4 text-sm font-semibold text-white disabled:opacity-50">{pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{pending ? 'Memproses…' : 'Unggah dan analisis'}</button>
    </form>
    <p className="mt-3 text-xs text-slate-500">Isi satu risiko per baris mulai baris 6. Kolom yang belum tersedia—termasuk residual risk dan treated risk—boleh dikosongkan lalu dilengkapi dalam aplikasi.</p>
    {state.message ? <p aria-live="polite" className={`mt-3 rounded-xl px-3 py-2 text-sm ${state.status === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'}`}>{state.message}</p> : null}
  </section>
}
