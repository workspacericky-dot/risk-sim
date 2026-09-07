'use client'

import { useState } from 'react'
import { PPG_BUSINESS_PROCESSES } from '@/lib/ppg/references'
import { cn } from '@/lib/utils'
import { PpgCombobox } from './PpgCombobox'

const input = 'w-full rounded-lg border border-input bg-transparent px-3 h-9 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50'
const OTHER = '__other__'

export function ProcessBusinessFields({ className }: { className?: string }) {
  const [process, setProcess] = useState('')
  const [subprocess, setSubprocess] = useState('')
  const selected = PPG_BUSINESS_PROCESSES.find((item) => item.label === process)
  const hasSubprocess = Boolean(selected?.subprocesses.length)

  return <div className={cn('grid gap-3 sm:grid-cols-2', className)}>
    <label className="space-y-1 text-xs font-semibold text-slate-600">
      <span>Proses bisnis</span>
      <PpgCombobox name="proses_bisnis" required value={process} onValueChange={(nextValue) => { setProcess(nextValue); setSubprocess('') }} placeholder="Pilih proses bisnis" options={PPG_BUSINESS_PROCESSES.map((item) => ({ value: item.label, label: item.label }))} />
    </label>
    <label className="space-y-1 text-xs font-semibold text-slate-600">
      <span>Subproses bisnis</span>
      {hasSubprocess ? <PpgCombobox name="subproses_bisnis" required value={subprocess} onValueChange={setSubprocess} placeholder="Pilih subproses bisnis" options={[...(selected?.subprocesses ?? []).map((item) => ({ value: item, label: item })), { value: OTHER, label: 'Lainnya' }]} /> : <PpgCombobox name="subproses_bisnis" value="" disabled placeholder={process ? 'Tidak memiliki subproses' : 'Pilih proses terlebih dahulu'} options={[]} />}
    </label>
    {hasSubprocess && subprocess === OTHER ? <label className="space-y-1 text-xs font-semibold text-slate-600 sm:col-start-2"><span>Nama subproses lainnya</span><input name="subproses_bisnis_custom" required maxLength={150} placeholder="Tuliskan subproses" className={input} /></label> : null}
  </div>
}
