'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Unit = {
  id: string
  nama_unit: string
  tingkat?: number
  kode_unit?: string
}

type DropdownPos = { top: number; left: number; width: number }

export function SearchableUnitSelect({
  units,
  name,
  required,
}: {
  units: Unit[]
  name: string
  required?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Unit | null>(null)
  const [pos, setPos] = useState<DropdownPos | null>(null)

  const triggerRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const DROPDOWN_WIDTH = 500

  const filtered = units.filter(
    (u) =>
      u.nama_unit.toLowerCase().includes(search.toLowerCase()) ||
      (u.kode_unit ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const calcPos = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const vw = window.innerWidth
    let left = rect.left
    if (left + DROPDOWN_WIDTH > vw - 8) {
      left = Math.max(8, vw - DROPDOWN_WIDTH - 8)
    }
    setPos({ top: rect.bottom + window.scrollY + 4, left, width: DROPDOWN_WIDTH })
  }, [])

  const openDropdown = useCallback(() => {
    calcPos()
    setOpen(true)
  }, [calcPos])

  // Close on outside click or scroll
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (
        triggerRef.current?.contains(e.target as Node) ||
        dropdownRef.current?.contains(e.target as Node)
      ) return
      setOpen(false)
      setSearch('')
    }
    function onScroll() {
      calcPos()
    }
    document.addEventListener('mousedown', handler)
    window.addEventListener('scroll', onScroll, true)
    return () => {
      document.removeEventListener('mousedown', handler)
      window.removeEventListener('scroll', onScroll, true)
    }
  }, [open, calcPos])

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 20)
  }, [open])

  // Escape closes
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setSearch('') } }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [])

  return (
    <div className="relative w-full">
      <input type="hidden" name={name} value={selected?.id ?? ''} required={required} />

      <button
        ref={triggerRef}
        type="button"
        onClick={() => open ? (setOpen(false), setSearch('')) : openDropdown()}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 h-9 text-sm transition-colors outline-none',
          'hover:border-ring focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50',
          !selected && 'text-muted-foreground'
        )}
      >
        <span className="truncate flex-1 text-left">
          {selected ? selected.nama_unit : 'Pilih unit kerja...'}
        </span>
        <ChevronDown className={cn('size-4 text-muted-foreground shrink-0 transition-transform', open && 'rotate-180')} />
      </button>

      {open && pos && (
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 9999,
          }}
          className="max-h-72 rounded-xl border bg-popover text-popover-foreground shadow-xl ring-1 ring-foreground/10 overflow-hidden flex flex-col"
        >
          {/* Search bar */}
          <div className="p-2 border-b shrink-0 bg-popover">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-input bg-background">
              <Search className="size-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama atau kode unit kerja..."
                className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground text-xs shrink-0"
                >
                  ✕
                </button>
              )}
            </div>
            {search && (
              <p className="text-xs text-muted-foreground mt-1 px-1">
                {filtered.length} hasil dari {units.length}
              </p>
            )}
          </div>

          {/* Options */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="py-5 text-sm text-muted-foreground text-center">
                Tidak ditemukan untuk &ldquo;{search}&rdquo;
              </p>
            ) : (
              filtered.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelected(u); setOpen(false); setSearch('') }}
                  className={cn(
                    'flex w-full items-center gap-2.5 px-3 py-2.5 text-sm text-left hover:bg-accent hover:text-accent-foreground transition-colors',
                    selected?.id === u.id && 'bg-accent/50 font-medium'
                  )}
                >
                  {selected?.id === u.id
                    ? <Check className="size-3.5 shrink-0 text-primary" />
                    : <span className="size-3.5 shrink-0" />
                  }
                  <span className="flex-1 leading-snug">{u.nama_unit}</span>
                  {u.tingkat !== undefined && (
                    <span className="text-[11px] text-muted-foreground bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                      Lv {u.tingkat}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
