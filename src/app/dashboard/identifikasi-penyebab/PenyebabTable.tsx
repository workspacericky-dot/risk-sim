'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Plus, Trash2, Save, CheckCircle2, ArrowRight } from 'lucide-react'

// 5M+EX category codes
const KATEGORI_OPTIONS = [
  { value: 'MN', label: 'MN – Orang (Man)' },
  { value: 'MY', label: 'MY – Dana (Money)' },
  { value: 'MD', label: 'MD – Metode (Method)' },
  { value: 'MR', label: 'MR – Bahan (Material)' },
  { value: 'MC', label: 'MC – Mesin (Machine)' },
  { value: 'EX', label: 'EX – Eksternal' },
]

function generateKodePenyebab(
  kodeRisiko: string | null,
  kategori: string,
  nomorUrut: number,
): string {
  if (!kodeRisiko || !kategori) return ''
  return `${kodeRisiko}.${kategori}.${nomorUrut}`
}

// Derive akar penyebab: value of last non-empty why field
function deriveAkar(why1: string, why2: string, why3: string, why4: string, why5: string): string {
  if (why5.trim()) return why5.trim()
  if (why4.trim()) return why4.trim()
  if (why3.trim()) return why3.trim()
  if (why2.trim()) return why2.trim()
  if (why1.trim()) return why1.trim()
  return ''
}

type PenyebabRow = {
  id: string | null
  why1: string
  why2: string
  why3: string
  why4: string
  why5: string
  kategoriPenyebab: string
  kodePenyebab: string
  kegiatanPengendalian: string
  saving: boolean
  saved: boolean
  error: string | null
  isNew: boolean
}

type Props = {
  risikoId: string
  kodeRisiko: string | null
  pernyataanRisiko: string
  konteksId: string
  initialRows: Array<{
    id: string
    why1: string | null
    why2: string | null
    why3: string | null
    why4: string | null
    why5: string | null
    akar_penyebab: string | null
    kategori_penyebab: string | null
    kode_penyebab: string | null
    kegiatan_pengendalian: string | null
    nomor_urut_dalam_kategori: number | null
  }>
}

export default function PenyebabTable({
  risikoId,
  kodeRisiko,
  pernyataanRisiko,
  konteksId,
  initialRows,
}: Props) {
  const router = useRouter()

  const [rows, setRows] = useState<PenyebabRow[]>(() =>
    initialRows.map(r => ({
      id:                   r.id,
      why1:                 r.why1 ?? '',
      why2:                 r.why2 ?? '',
      why3:                 r.why3 ?? '',
      why4:                 r.why4 ?? '',
      why5:                 r.why5 ?? '',
      kategoriPenyebab:     r.kategori_penyebab ?? '',
      kodePenyebab:         r.kode_penyebab ?? '',
      kegiatanPengendalian: r.kegiatan_pengendalian ?? '',
      saving: false,
      saved:  false,
      error:  null,
      isNew:  false,
    }))
  )

  function addRow() {
    setRows(prev => [...prev, {
      id: null,
      why1: '', why2: '', why3: '', why4: '', why5: '',
      kategoriPenyebab: '',
      kodePenyebab: '',
      kegiatanPengendalian: '',
      saving: false, saved: false, error: null, isNew: true,
    }])
  }

  // Update a why field with cascade-clear for downstream whys
  function updateWhy(idx: number, field: 'why1'|'why2'|'why3'|'why4'|'why5', value: string) {
    setRows(prev => {
      const next = [...prev]
      const row = { ...next[idx] }
      row[field] = value

      // If a why is cleared, cascade-clear all downstream whys
      if (!value.trim()) {
        if (field === 'why1') { row.why2 = ''; row.why3 = ''; row.why4 = ''; row.why5 = '' }
        if (field === 'why2') { row.why3 = ''; row.why4 = ''; row.why5 = '' }
        if (field === 'why3') { row.why4 = ''; row.why5 = '' }
        if (field === 'why4') { row.why5 = '' }
      }

      next[idx] = row
      return next
    })
  }

  function updateRow(idx: number, patch: Partial<PenyebabRow>) {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }

      // Auto-generate kode_penyebab when kategori changes
      if ('kategoriPenyebab' in patch) {
        const kategori = patch.kategoriPenyebab ?? next[idx].kategoriPenyebab
        const sameKat = next.filter((r, i) => i <= idx && r.kategoriPenyebab === kategori)
        const nomor = sameKat.length
        next[idx].kodePenyebab = generateKodePenyebab(kodeRisiko, kategori, nomor)
      }

      return next
    })
  }

  async function handleSave(idx: number) {
    const row = rows[idx]
    updateRow(idx, { saving: true, error: null })
    const supabase = createClient()

    const sameKat = rows.filter((r, i) => i <= idx && r.kategoriPenyebab === row.kategoriPenyebab)
    const nomorUrut = sameKat.length
    const kodePenyebab = generateKodePenyebab(kodeRisiko, row.kategoriPenyebab, nomorUrut)
    const akarPenyebab = deriveAkar(row.why1, row.why2, row.why3, row.why4, row.why5)

    const payload = {
      risiko_id:                 risikoId,
      why1:                      row.why1 || null,
      why2:                      row.why2 || null,
      why3:                      row.why3 || null,
      why4:                      row.why4 || null,
      why5:                      row.why5 || null,
      akar_penyebab:             akarPenyebab || null,
      kategori_penyebab:         row.kategoriPenyebab || null,
      kode_penyebab:             kodePenyebab || null,
      kegiatan_pengendalian:     row.kegiatanPengendalian || null,
      nomor_urut_dalam_kategori: nomorUrut,
    }

    let err, newId: string | null = null
    if (row.id) {
      const res = await supabase
        .from('penyebab_risiko_detail')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      err = res.error
    } else {
      const res = await supabase
        .from('penyebab_risiko_detail')
        .insert([payload])
        .select('id')
        .single()
      err = res.error
      newId = res.data?.id ?? null
    }

    if (err) {
      updateRow(idx, { saving: false, error: err.message })
    } else {
      updateRow(idx, {
        saving: false, saved: true, error: null, isNew: false,
        kodePenyebab,
        id: newId ?? row.id,
      })
      setTimeout(() => updateRow(idx, { saved: false }), 2500)
      router.refresh()
    }
  }

  async function handleDelete(idx: number) {
    const row = rows[idx]
    if (!row.id) {
      setRows(prev => prev.filter((_, i) => i !== idx))
      return
    }
    const supabase = createClient()
    const { error } = await supabase
      .from('penyebab_risiko_detail')
      .delete()
      .eq('id', row.id)
    if (!error) {
      setRows(prev => prev.filter((_, i) => i !== idx))
      router.refresh()
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full text-xs border-collapse" style={{ minWidth: 1100 }}>
          <thead>
            <tr className="bg-slate-100 text-slate-600">
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-20" rowSpan={2}>
                Kode<br /><span className="font-normal text-slate-400">(1)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[150px]" rowSpan={2}>
                Pernyataan Risiko<br /><span className="font-normal text-slate-400">(2)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24" rowSpan={2}>
                Why 1<br /><span className="font-normal text-slate-400">(3)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24" rowSpan={2}>
                Why 2<br /><span className="font-normal text-slate-400">(4)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24" rowSpan={2}>
                Why 3<br /><span className="font-normal text-slate-400">(5)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24" rowSpan={2}>
                Why 4<br /><span className="font-normal text-slate-400">(6)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24" rowSpan={2}>
                Why 5<br /><span className="font-normal text-slate-400">(7)</span>
              </th>
              {/* Akar Penyebab — auto-derived */}
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-28 bg-amber-50" rowSpan={2}>
                Akar Penyebab<br />
                <span className="font-normal text-amber-500 text-[9px]">(8 · otomatis)</span>
              </th>
              {/* Kode Penyebab: 2 sub-columns */}
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold" colSpan={2}>
                Kode Penyebab<br /><span className="font-normal text-slate-400">(9)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[140px]" rowSpan={2}>
                Kegiatan Pengendalian<br /><span className="font-normal text-slate-400">(10)</span>
              </th>
              <th className="border border-slate-200 px-2 py-2 text-center w-20" rowSpan={2}></th>
            </tr>
            <tr className="bg-slate-100 text-slate-500 text-[10px]">
              <th className="border border-slate-200 px-2 py-1.5 text-center font-semibold w-24">
                Kategori 5M+EX
              </th>
              <th className="border border-slate-200 px-2 py-1.5 text-center font-semibold w-28">
                Kode (otomatis)
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={12} className="border border-slate-100 px-4 py-10 text-center text-slate-400 text-sm">
                  Belum ada data penyebab risiko. Klik "+ Tambah Baris" untuk memulai.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                // Progressive disclosure: which whys are enabled
                const w1ok = row.why1.trim() !== ''
                const w2ok = w1ok && row.why2.trim() !== ''
                const w3ok = w2ok && row.why3.trim() !== ''
                const w4ok = w3ok && row.why4.trim() !== ''

                // Derived akar penyebab (live, read-only)
                const akar = deriveAkar(row.why1, row.why2, row.why3, row.why4, row.why5)

                return (
                  <tr key={idx} className="border-b border-slate-100 align-top hover:bg-slate-50/50 transition-colors">

                    {/* Kode */}
                    <td className="border border-slate-100 px-2 py-2 text-center bg-sky-50/40">
                      <span className="font-mono text-[10px] text-slate-600">{kodeRisiko || '–'}</span>
                    </td>

                    {/* Pernyataan */}
                    <td className="border border-slate-100 px-2 py-2 bg-sky-50/40">
                      <p className="text-[10px] text-slate-700 leading-relaxed line-clamp-3">{pernyataanRisiko}</p>
                    </td>

                    {/* Why 1 — always enabled */}
                    <WhyCell
                      value={row.why1}
                      enabled={true}
                      placeholder="Penyebab langsung risiko..."
                      onChange={v => updateWhy(idx, 'why1', v)}
                      isLast={!w1ok || (!row.why2.trim() && !row.why3.trim() && !row.why4.trim() && !row.why5.trim())}
                    />

                    {/* Why 2 — enabled when why1 filled */}
                    <WhyCell
                      value={row.why2}
                      enabled={w1ok}
                      placeholder="Mengapa why 1 terjadi?"
                      onChange={v => updateWhy(idx, 'why2', v)}
                      isLast={w1ok && (!row.why3.trim() && !row.why4.trim() && !row.why5.trim())}
                    />

                    {/* Why 3 — enabled when why2 filled */}
                    <WhyCell
                      value={row.why3}
                      enabled={w2ok}
                      placeholder="Mengapa why 2 terjadi?"
                      onChange={v => updateWhy(idx, 'why3', v)}
                      isLast={w2ok && (!row.why4.trim() && !row.why5.trim())}
                    />

                    {/* Why 4 — enabled when why3 filled */}
                    <WhyCell
                      value={row.why4}
                      enabled={w3ok}
                      placeholder="Mengapa why 3 terjadi?"
                      onChange={v => updateWhy(idx, 'why4', v)}
                      isLast={w3ok && !row.why5.trim()}
                    />

                    {/* Why 5 — enabled when why4 filled */}
                    <WhyCell
                      value={row.why5}
                      enabled={w4ok}
                      placeholder="Mengapa why 4 terjadi?"
                      onChange={v => updateWhy(idx, 'why5', v)}
                      isLast={w4ok}
                    />

                    {/* Akar Penyebab — read-only, live derived */}
                    <td className="border border-slate-100 px-1.5 py-2 bg-amber-50/50">
                      {akar ? (
                        <div className="rounded border border-amber-300 bg-amber-50 px-2 py-1.5 min-h-[40px]">
                          <div className="flex items-start gap-1 mb-1">
                            <ArrowRight className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                            <span className="text-[9px] text-amber-600 font-semibold uppercase tracking-wide">Akar Penyebab</span>
                          </div>
                          <p className="text-[10px] text-amber-900 font-medium leading-relaxed">{akar}</p>
                        </div>
                      ) : (
                        <div className="rounded border border-dashed border-amber-200 bg-amber-50/30 px-2 py-2 min-h-[40px] flex items-center justify-center">
                          <span className="text-[9px] text-amber-300 italic">otomatis dari why terakhir</span>
                        </div>
                      )}
                    </td>

                    {/* Kategori 5M+EX */}
                    <td className="border border-slate-100 px-1.5 py-2 bg-indigo-50/30">
                      <select
                        value={row.kategoriPenyebab}
                        onChange={e => updateRow(idx, { kategoriPenyebab: e.target.value })}
                        className="w-full h-7 rounded border border-indigo-200 bg-white text-[10px] focus:outline-none focus:ring-1 focus:ring-indigo-400"
                      >
                        <option value="">– Pilih –</option>
                        {KATEGORI_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </td>

                    {/* Kode Penyebab — auto-generated */}
                    <td className="border border-slate-100 px-1.5 py-2 bg-indigo-50/30 text-center">
                      <span className="font-mono text-[10px] text-indigo-700 font-semibold">
                        {row.kodePenyebab || (
                          <span className="text-slate-300 font-normal italic">otomatis</span>
                        )}
                      </span>
                    </td>

                    {/* Kegiatan Pengendalian */}
                    <td className="border border-slate-100 px-1.5 py-2">
                      <textarea
                        value={row.kegiatanPengendalian}
                        onChange={e => updateRow(idx, { kegiatanPengendalian: e.target.value })}
                        placeholder="Kegiatan pengendalian yang dirancang..."
                        className="w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-slate-300 min-h-[40px]"
                        rows={2}
                      />
                    </td>

                    {/* Actions */}
                    <td className="border border-slate-100 px-1.5 py-2 text-center">
                      <div className="flex flex-col gap-1.5 items-center">
                        <button
                          type="button"
                          onClick={() => handleSave(idx)}
                          disabled={row.saving}
                          className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all shadow-sm flex items-center justify-center gap-1 ${
                            row.error
                              ? 'bg-red-500 text-white'
                              : row.saved
                              ? 'bg-green-600 text-white'
                              : row.saving
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          {row.saving ? '...' : row.error ? '✗' : row.saved
                            ? <><CheckCircle2 className="w-3 h-3" /> OK</>
                            : <><Save className="w-3 h-3" /> Simpan</>
                          }
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(idx)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Hapus baris ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {row.error && (
                        <p className="text-[9px] text-red-600 mt-1 leading-tight">{row.error}</p>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Add row button */}
      <button
        type="button"
        onClick={addRow}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 border-dashed border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-400 transition-all text-sm font-medium"
      >
        <Plus className="w-4 h-4" />
        Tambah Baris Penyebab
      </button>
    </div>
  )
}

// ── WhyCell: single why input with progressive lock ───────────────────────
function WhyCell({
  value,
  enabled,
  placeholder,
  onChange,
  isLast,
}: {
  value: string
  enabled: boolean
  placeholder: string
  onChange: (v: string) => void
  isLast: boolean
}) {
  return (
    <td className={`border border-slate-100 px-1.5 py-2 transition-colors ${
      !enabled ? 'bg-slate-50' : isLast && value.trim() ? 'bg-amber-50/20' : ''
    }`}>
      {enabled ? (
        <div className="relative">
          <textarea
            value={value}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className={`w-full rounded border px-1.5 py-1 text-[10px] resize-y focus:outline-none focus:ring-1 placeholder:text-slate-300 min-h-[40px] transition-colors ${
              isLast && value.trim()
                ? 'border-amber-300 bg-amber-50/40 focus:ring-amber-400 text-amber-900'
                : 'border-slate-200 bg-white focus:ring-indigo-400'
            }`}
          />
          {/* "Akar" indicator on last filled why */}
          {isLast && value.trim() && (
            <span className="absolute -top-1.5 -right-1 bg-amber-400 text-white text-[8px] font-bold px-1 py-0.5 rounded-full leading-none">
              ←akar
            </span>
          )}
        </div>
      ) : (
        // Greyed-out locked state
        <div className="rounded border border-dashed border-slate-200 bg-slate-100/60 px-1.5 py-1 min-h-[40px] flex items-center justify-center">
          <span className="text-[9px] text-slate-300 select-none">
            isi why sebelumnya
          </span>
        </div>
      )}
    </td>
  )
}
