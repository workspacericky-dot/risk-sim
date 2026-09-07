'use client'

import { useMemo, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PpgComboboxOption } from './PpgCombobox'

export function PpgMultiCombobox({ name, options, placeholder, required, disabled, defaultValues = [], values, onValuesChange }: {
  name: string
  options: PpgComboboxOption[]
  placeholder: string
  required?: boolean
  disabled?: boolean
  defaultValues?: string[]
  values?: string[]
  onValuesChange?: (values: string[]) => void
}) {
  const [internalValues, setInternalValues] = useState(defaultValues)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const selectedValues = values ?? internalValues
  const selectedSet = useMemo(() => new Set(selectedValues), [selectedValues])
  const selected = options.filter((option) => selectedSet.has(option.value))
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('id-ID')
    return term ? options.filter((option) => `${option.label} ${option.description ?? ''}`.toLocaleLowerCase('id-ID').includes(term)) : options
  }, [options, search])

  function commit(next: string[]) {
    if (values === undefined) setInternalValues(next)
    onValuesChange?.(next)
  }

  function toggle(value: string) {
    commit(selectedSet.has(value) ? selectedValues.filter((item) => item !== value) : [...selectedValues, value])
  }

  return <div className="relative min-w-0 w-full max-w-full">
    {selectedValues.map((value) => <input key={value} type="hidden" name={name} value={value} />)}
    {required && <input className="pointer-events-none absolute h-px w-px opacity-0" tabIndex={-1} required value={selectedValues.length ? 'selected' : ''} onChange={() => undefined} />}
    <button type="button" disabled={disabled} onClick={() => setOpen((current) => !current)} className={cn('flex min-h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1.5 text-sm font-normal outline-none transition-colors hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400', !selected.length && 'text-muted-foreground')}>
      <span className="flex min-w-0 flex-1 flex-wrap gap-1.5 overflow-hidden text-left">{selected.length ? selected.map((option) => <span key={option.value} className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs text-indigo-800"><span className="min-w-0 truncate">{option.label}</span><X className="size-3 shrink-0" onClick={(event) => { event.stopPropagation(); toggle(option.value) }} /></span>) : <span className="truncate">{placeholder}</span>}</span>
      <ChevronDown className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')} />
    </button>
    {open && !disabled ? <div className="absolute z-40 mt-2 flex max-h-80 w-full flex-col overflow-hidden rounded-xl border bg-white shadow-xl">
      <div className="flex items-center gap-2 border-b p-2"><Search className="size-4 text-slate-400" /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari kode, nama, atau peristiwa..." className="w-full bg-transparent text-sm outline-none" /></div>
      <div className="overflow-y-auto">{filtered.length ? filtered.map((option) => <button key={option.value} type="button" onClick={() => toggle(option.value)} className="flex w-full items-start gap-2 border-b border-slate-100 px-3 py-2.5 text-left text-sm last:border-0 hover:bg-indigo-50"><span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border border-slate-300">{selectedSet.has(option.value) && <Check className="size-3 text-indigo-700" />}</span><span className="min-w-0"><span className="block leading-snug">{option.label}</span>{option.description && <span className="mt-0.5 block text-xs text-slate-500">{option.description}</span>}</span></button>) : <p className="p-5 text-center text-sm text-slate-500">Tidak ada hasil.</p>}</div>
      <button type="button" onClick={() => { setOpen(false); setSearch('') }} className="border-t bg-slate-50 px-3 py-2 text-xs font-semibold text-indigo-700">Selesai · {selectedValues.length} dipilih</button>
    </div> : null}
  </div>
}
