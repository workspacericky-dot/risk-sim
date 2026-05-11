'use client'

import { useState } from 'react'
import { Wand2 } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

export type ProsesOption = {
  kode: string
  nama: string
  indikator: string
  parentKode: string
  parentNama: string
}

// ── Shared style helpers ──────────────────────────────────────────────────────
const autoFieldCls = (hasValue: boolean) =>
  [
    'w-full rounded-md border px-3 py-1 text-sm h-8 outline-none cursor-default select-none transition-all',
    hasValue
      ? 'border-indigo-200 bg-indigo-50/60 text-indigo-900'
      : 'border-input bg-slate-50 text-muted-foreground',
  ].join(' ')

function AutoIcon() {
  return <Wand2 className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400" />
}

function AutoHint() {
  return (
    <p className="text-[10px] text-indigo-500 leading-tight">
      Terisi otomatis dari Penetapan Konteks
    </p>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
type Props = {
  options: ProsesOption[]
  /** Fallback list used for Sasaran Strategis when no proses selected */
  sasaranList: string[]
}

export default function ProsesBisnisSelect({ options, sasaranList }: Props) {
  const [selectedKode, setSelectedKode] = useState('')
  const [manualSasaran, setManualSasaran] = useState('')

  const selected = options.find(o => o.kode === selectedKode) ?? null

  // Auto values from selected process
  const sasaranAuto   = selected?.parentNama ?? ''
  const indikatorAuto = selected?.indikator  ?? ''

  function handleProsesChange(value: string | null) {
    if (!value) return
    // value = "MA-05.03 – Nama sub-proses"
    const kode = value.split(' – ')[0]
    setSelectedKode(kode)
  }

  return (
    <>
      {/* ── 1. Sasaran Strategis ─────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">
          Sasaran Strategis <span className="text-slate-400 font-normal">(Kol. 2)</span>
        </Label>

        {selected ? (
          /* Auto-generated from parent process group */
          <>
            <div className="relative">
              <input
                name="sasaran_strategis_item"
                value={sasaranAuto}
                readOnly
                className={autoFieldCls(true) + ' pr-7'}
              />
              <AutoIcon />
            </div>
            <AutoHint />
          </>
        ) : sasaranList.length > 0 ? (
          /* Dropdown from konteks sasaran */
          <>
            <Select name="sasaran_strategis_item">
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Pilih sasaran strategis..." />
              </SelectTrigger>
              <SelectContent>
                {sasaranList.map((s, i) => (
                  <SelectItem key={i} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-slate-400 leading-tight">
              Pilih Proses Bisnis di bawah untuk mengisi otomatis
            </p>
          </>
        ) : (
          /* Free-text fallback */
          <input
            name="sasaran_strategis_item"
            value={manualSasaran}
            onChange={e => setManualSasaran(e.target.value)}
            placeholder="Sasaran strategis yang relevan..."
            className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm h-8 focus:outline-none focus:border-ring focus:ring-1 focus:ring-ring/50 transition-all"
          />
        )}
      </div>

      {/* ── 2. Proses Bisnis ─────────────────────────────────────────── */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold">
          Proses Bisnis <span className="text-slate-400 font-normal">(referensi MA)</span>
        </Label>
        {options.length > 0 ? (
          <Select onValueChange={handleProsesChange}>
            <SelectTrigger className="h-8 text-sm">
              <SelectValue placeholder="Pilih proses bisnis..." />
            </SelectTrigger>
            <SelectContent>
              {options.map(p => (
                <SelectItem key={p.kode} value={`${p.kode} – ${p.nama}`}>
                  <span className="font-mono text-[10px] text-indigo-600 mr-1">{p.kode}</span>
                  {p.nama}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <input
            name="proses_bisnis_item"
            placeholder="Kode / nama proses bisnis..."
            className="w-full rounded-md border border-input bg-background px-3 py-1 text-sm h-8 focus:outline-none focus:border-ring transition-all"
          />
        )}
        {/* Hidden input carries selected value to server action */}
        <input
          type="hidden"
          name="proses_bisnis_item"
          value={selected ? `${selected.kode} – ${selected.nama}` : ''}
        />
      </div>

      {/* ── 3. Indikator Konteks — auto from sub-process indikator ───── */}
      <div className="space-y-1.5">
        <Label className="text-xs">
          Indikator Konteks <span className="text-slate-400">(Kol. 3)</span>
        </Label>
        <div className="relative">
          <input
            name="indikator_konteks"
            value={indikatorAuto}
            readOnly
            placeholder={
              selectedKode
                ? '(belum ada indikator untuk proses ini)'
                : 'Otomatis terisi setelah pilih Proses Bisnis...'
            }
            className={autoFieldCls(!!indikatorAuto) + (indikatorAuto ? ' pr-7' : '')}
          />
          {indikatorAuto && <AutoIcon />}
        </div>
        {indikatorAuto && <AutoHint />}
      </div>
    </>
  )
}
