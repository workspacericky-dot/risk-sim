'use client'

import { useRef, useState } from 'react'
import { Combobox } from '@base-ui/react/combobox'
import { Check, ChevronDown, Search } from 'lucide-react'

type Option = { value: string; label: string }

export function SearchableSelect({
  id, name, options, defaultValue = '', required = false, searchPlaceholder,
}: {
  id: string
  name: string
  options: Option[]
  defaultValue?: string
  required?: boolean
  searchPlaceholder: string
}) {
  const searchRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')

  return (
    <Combobox.Root
      items={options}
      name={name}
      required={required}
      defaultValue={options.find((option) => option.value === defaultValue) ?? null}
      isItemEqualToValue={(a, b) => a.value === b.value}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={() => setQuery('')}
      autoHighlight
    >
      <Combobox.Trigger id={id} className="flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring data-placeholder:text-muted-foreground">
        <span className="min-w-0 truncate text-left"><Combobox.Value placeholder="— pilih —" /></span>
        <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="z-50">
          <Combobox.Popup initialFocus={searchRef} className="flex max-h-(--available-height) w-(--anchor-width) flex-col overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-lg">
            <div className="flex shrink-0 items-center gap-2 border-b p-2">
              <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <Combobox.Input ref={searchRef} aria-label={searchPlaceholder} placeholder={searchPlaceholder} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
            </div>
            <Combobox.Empty className="p-4 text-center text-sm text-muted-foreground">Tidak ada pilihan yang cocok.</Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto overscroll-contain p-1">
              {(option: Option) => (
                <Combobox.Item key={option.value} value={option} className="flex cursor-default items-start gap-2 rounded-md px-2 py-2 text-sm data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                  <span className="size-4 shrink-0"><Combobox.ItemIndicator><Check className="size-4" /></Combobox.ItemIndicator></span>
                  <span className="min-w-0 break-words">{option.label}</span>
                </Combobox.Item>
              )}
            </Combobox.List>
            {!required && <Combobox.Clear className="shrink-0 border-t px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent">Kosongkan pilihan</Combobox.Clear>}
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  )
}
