'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type PpgComboboxOption = { value: string; label: string; description?: string }
type DropdownPosition = { top: number; left: number; width: number }

export function PpgCombobox({ name, options, placeholder, required, disabled, searchable = false, value, defaultValue = '', onValueChange, className }: {
  name?: string
  options: PpgComboboxOption[]
  placeholder: string
  required?: boolean
  disabled?: boolean
  searchable?: boolean
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState<DropdownPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selectedValue = value ?? internalValue
  const selected = options.find((option) => option.value === selectedValue)
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    return term ? options.filter((option) => `${option.label} ${option.description ?? ''}`.toLowerCase().includes(term)) : options
  }, [options, search])

  const calculatePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    setPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width })
  }, [])

  useEffect(() => {
    if (!open) return
    const closeOutside = (event: MouseEvent) => {
      if (!triggerRef.current?.contains(event.target as Node) && !panelRef.current?.contains(event.target as Node)) { setOpen(false); setSearch('') }
    }
    document.addEventListener('mousedown', closeOutside)
    window.addEventListener('scroll', calculatePosition, true)
    window.addEventListener('resize', calculatePosition)
    return () => { document.removeEventListener('mousedown', closeOutside); window.removeEventListener('scroll', calculatePosition, true); window.removeEventListener('resize', calculatePosition) }
  }, [calculatePosition, open])

  useEffect(() => { if (open && searchable) setTimeout(() => searchRef.current?.focus(), 20) }, [open, searchable])

  function select(nextValue: string) {
    if (value === undefined) setInternalValue(nextValue)
    onValueChange?.(nextValue)
    setOpen(false)
    setSearch('')
  }

  return <div className={cn('relative w-full', className)}>
    {name ? <input type="hidden" name={name} value={selectedValue} required={required} /> : null}
    <button ref={triggerRef} type="button" disabled={disabled} onClick={() => { calculatePosition(); setOpen((current) => !current) }} className={cn('flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 text-sm transition-colors outline-none hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400', !selected && !disabled && 'text-muted-foreground')}>
      <span className="truncate text-left">{selected?.label ?? placeholder}</span><ChevronDown className={cn('size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
    </button>
    {open && position ? <div ref={panelRef} style={{ position: 'fixed', top: position.top, left: position.left, width: position.width, zIndex: 9999 }} className="flex max-h-72 flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10">
      {searchable ? <div className="shrink-0 border-b bg-popover p-2"><div className="flex items-center gap-2 rounded-lg border border-input bg-background px-2.5 py-1.5"><Search className="size-3.5 shrink-0 text-muted-foreground" /><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Cari opsi..." className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />{search ? <button type="button" onClick={() => setSearch('')}><X className="size-3.5 text-muted-foreground" /></button> : null}</div></div> : null}
      <div className="overflow-y-auto">{filtered.length ? filtered.map((option) => <button key={option.value} type="button" onClick={() => select(option.value)} className={cn('flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground', selectedValue === option.value && 'bg-accent/50 font-medium')}><span className="mt-0.5 size-3.5 shrink-0">{selectedValue === option.value ? <Check className="size-3.5 text-primary" /> : null}</span><span className="min-w-0"><span className="block leading-snug">{option.label}</span>{option.description ? <span className="mt-0.5 block text-xs text-muted-foreground">{option.description}</span> : null}</span></button>) : <p className="py-5 text-center text-sm text-muted-foreground">Tidak ada hasil.</p>}</div>
    </div> : null}
  </div>
}
