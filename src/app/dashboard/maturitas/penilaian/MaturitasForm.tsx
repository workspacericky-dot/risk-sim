'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Check, X, Lock, Save, CheckCircle2, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

// --- MMR Items from uji_MMR.xlsx ---
const MMR_ITEMS = [
  'Tujuan organisasi terdokumentasi dan dipahami dengan baik',
  'Pimpinan unit organisasi telah memahami risiko dan tanggung jawab atas risiko tersebut',
  'Sistem skoring untuk penilaian risiko telah ditetapkan',
  'Risk appetite telah ditetapkan dengan sistem skoring',
  'Risiko telah dibagi tanggung jawabnya dan didokumentasikan dalam risk register',
  'Proses identifikasi risiko telah ditetapkan dan dipatuhi',
  'Seluruh risiko yang teridentifikasi telah dinilai dengan sistem skoring yang telah ditetapkan',
  'Respon atas risiko telah ditetapkan dan diimplementasikan',
  'Pimpinan unit organisasi telah menetapkan model pemantauan atas proses, respon dan action plan risiko.',
  'Risk register di-update secara periodik (minimal sekali setahun)',
  'Terdapat pelaporan kepada pimpinan puncak bila terdapat risiko yang belum ditekan pada tingkat yang dapat diterima',
  'Kegiatan yang bersifat proyek/program selalu dinilai risikonya',
  'Uraian tanggung jawab menetapkan risiko, menilai risiko dan mengelolanya, termasuk dalam uraian tugas dan tanggung jawab pegawai',
  'Pimpinan memberikan jaminan efektivitas atas pengelolaan risiko',
  'Pimpinan dinilai kinerjanya dalam mengelola risiko',
]

type ConversionLevel = {
  label: string
  level: number
  min: number
  max: number
  color: string
  bg: string
  description: string
}

const CONVERSION: ConversionLevel[] = [
  { level: 5, label: 'Risk Enabled',  min: 26, max: 30, color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  description: 'Organisasi telah mengintegrasikan manajemen risiko secara penuh ke dalam seluruh proses dan pengambilan keputusan.' },
  { level: 4, label: 'Risk Managed',  min: 21, max: 25, color: 'text-teal-700',   bg: 'bg-teal-50 border-teal-200',   description: 'Proses manajemen risiko telah terstandarisasi, dikelola secara aktif, dan ada pemantauan berkala.' },
  { level: 3, label: 'Risk Defined',  min: 15, max: 20, color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   description: 'Proses manajemen risiko telah terdefinisi dan terdokumentasi dengan baik, namun belum konsisten diterapkan.' },
  { level: 2, label: 'Risk Aware',    min: 8,  max: 14, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', description: 'Organisasi mulai menyadari pentingnya risiko dan ada beberapa inisiatif, namun masih bersifat ad hoc.' },
  { level: 1, label: 'Risk Naive',    min: 0,  max: 7,  color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     description: 'Tidak ada atau sangat minim kesadaran dan pengelolaan risiko secara formal.' },
]

type TriState = true | false | null

type RowState = {
  dokumen:    TriState
  wawancara:  TriState
  observasi:  TriState
  skor:       0 | 1 | 2 | null
}

function getConversionLevel(total: number): ConversionLevel {
  return CONVERSION.find((c) => total >= c.min && total <= c.max) ?? CONVERSION[4]
}

function getMaxAllowed(rows: RowState[], idx: number): 0 | 1 | 2 {
  for (let i = 0; i < idx; i++) {
    const s = rows[i].skor
    if (s === 0) return 0
    if (s === 1) return 1
  }
  return 2
}

function emptyRows(): RowState[] {
  return MMR_ITEMS.map(() => ({ dokumen: null, wawancara: null, observasi: null, skor: null }))
}

function TriStateSelect({ value, onChange, disabled }: {
  value: TriState
  onChange: (v: TriState) => void
  disabled?: boolean
}) {
  function cycle() {
    if (disabled) return
    if (value === null) onChange(true)
    else if (value === true) onChange(false)
    else onChange(null)
  }
  return (
    <button
      type="button"
      onClick={cycle}
      disabled={disabled}
      title={disabled ? 'Terkunci (building block)' : 'Klik untuk mengganti: – → ✓ → ✗'}
      className={cn(
        'flex items-center justify-center w-10 h-8 rounded-md border text-sm font-medium transition-colors mx-auto',
        disabled && 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200',
        !disabled && value === null  && 'border-slate-200 bg-slate-50 hover:bg-slate-100',
        !disabled && value === true  && 'border-green-200 bg-green-50 hover:bg-green-100',
        !disabled && value === false && 'border-red-200 bg-red-50 hover:bg-red-100',
      )}
    >
      {disabled
        ? <Lock className="size-3.5 text-slate-400" />
        : value === null && <span className="text-slate-400 text-base leading-none">–</span>}
      {!disabled && value === true  && <Check className="size-4 text-green-600" strokeWidth={2.5} />}
      {!disabled && value === false && <X     className="size-4 text-red-500"   strokeWidth={2.5} />}
    </button>
  )
}

function SkorSelect({ value, onChange, maxAllowed, isLocked }: {
  value:      0 | 1 | 2 | null
  onChange:   (v: 0 | 1 | 2 | null) => void
  maxAllowed: 0 | 1 | 2
  isLocked:   boolean
}) {
  return (
    <div className="relative mx-auto w-20">
      <select
        value={value ?? ''}
        disabled={isLocked}
        onChange={(e) => {
          const v = e.target.value
          onChange(v === '' ? null : (Number(v) as 0 | 1 | 2))
        }}
        className={cn(
          'w-full h-8 rounded-md border text-sm text-center font-semibold outline-none transition-colors cursor-pointer pr-1',
          isLocked  && 'opacity-40 cursor-not-allowed bg-slate-100 border-slate-200 text-slate-400',
          !isLocked && value === null && 'border-slate-200 bg-slate-50 text-slate-400',
          !isLocked && value === 0   && 'border-red-200 bg-red-50 text-red-700',
          !isLocked && value === 1   && 'border-yellow-200 bg-yellow-50 text-yellow-700',
          !isLocked && value === 2   && 'border-green-200 bg-green-50 text-green-700',
        )}
      >
        <option value="">–</option>
        {maxAllowed >= 0 && <option value="0">0</option>}
        {maxAllowed >= 1 && <option value="1">1</option>}
        {maxAllowed >= 2 && <option value="2">2</option>}
      </select>
      {isLocked && (
        <Lock className="absolute right-1.5 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none" />
      )}
    </div>
  )
}

type Props = {
  konteksId:     string
  unitNama:      string
  tahun:         number | string
  existingId:    string | null
  initialScores: RowState[] | null
}

export default function MaturitasForm({ konteksId, unitNama, tahun, existingId, initialScores }: Props) {
  const router = useRouter()

  const [rows,       setRows]       = useState<RowState[]>(
    initialScores && initialScores.length === MMR_ITEMS.length
      ? initialScores
      : emptyRows()
  )
  const [recordId,   setRecordId]   = useState<string | null>(existingId)
  const [saving,     setSaving]     = useState(false)
  const [saved,      setSaved]      = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)

  const totalSkor  = useMemo(() => rows.reduce((sum, r) => sum + (r.skor ?? 0), 0), [rows])
  const filledCount = rows.filter((r) => r.skor !== null).length
  const level       = getConversionLevel(totalSkor)

  const firstZeroIdx = rows.findIndex(r => r.skor === 0)
  const firstOneIdx  = rows.findIndex(r => r.skor === 1)

  function updateRow(idx: number, field: keyof RowState, value: TriState | 0 | 1 | 2 | null) {
    setRows((prev) => {
      const next = [...prev]
      if (field === 'skor') {
        const maxAllowed = getMaxAllowed(next, idx)
        const newSkor = value as (0 | 1 | 2 | null)
        if (newSkor !== null && newSkor > maxAllowed) return prev
        next[idx] = { ...next[idx], skor: newSkor }
        for (let i = idx + 1; i < next.length; i++) {
          const cap = getMaxAllowed(next, i)
          if (next[i].skor !== null && next[i].skor! > cap) {
            next[i] = { ...next[i], skor: cap }
          }
        }
      } else {
        next[idx] = { ...next[idx], [field]: value }
      }
      return next
    })
  }

  function resetAll() {
    setRows(emptyRows())
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)
    const supabase = createClient()

    const lvl     = getConversionLevel(totalSkor)
    const payload = {
      konteks_id:      konteksId,
      scores:          rows,
      total_skor:      totalSkor,
      level_maturitas: lvl.level,
      label_maturitas: lvl.label,
      updated_at:      new Date().toISOString(),
    }

    let err: any = null
    if (recordId) {
      const res = await supabase
        .from('maturitas_penilaian')
        .update(payload)
        .eq('id', recordId)
      err = res.error
    } else {
      const res = await supabase
        .from('maturitas_penilaian')
        .insert([payload])
        .select('id')
        .single()
      err = res.error
      if (!err && res.data?.id) setRecordId(res.data.id)
    }

    setSaving(false)
    if (err) {
      setSaveError(err.message)
    } else {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Building block notice */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 leading-relaxed">
        <span className="font-semibold">Sistem Penilaian Building Block:</span> Jika suatu pernyataan dinilai{' '}
        <span className="font-bold">0 (Tidak)</span>, pernyataan selanjutnya tidak bisa dinilai lebih dari 0. Jika dinilai{' '}
        <span className="font-bold">1 (Sebagian)</span>, pernyataan selanjutnya tidak bisa melebihi 1.
      </div>

      {/* Cascade warnings */}
      {firstZeroIdx >= 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm text-red-700 flex items-center gap-2">
          <X className="size-4 shrink-0" />
          <span>
            Pernyataan <strong>#{firstZeroIdx + 1}</strong> dinilai <strong>0</strong> — pernyataan #{firstZeroIdx + 2} s.d. #{MMR_ITEMS.length} dikunci pada nilai maks. 0.
          </span>
        </div>
      )}
      {firstZeroIdx < 0 && firstOneIdx >= 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-2.5 text-sm text-yellow-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>
            Pernyataan <strong>#{firstOneIdx + 1}</strong> dinilai <strong>1</strong> — pernyataan #{firstOneIdx + 2} s.d. #{MMR_ITEMS.length} dibatasi maks. 1.
          </span>
        </div>
      )}

      {/* Table Card */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-base text-slate-800">Tabel Penilaian Tingkat Maturitas MR</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {filledCount}/{MMR_ITEMS.length} item dinilai · Klik sel untuk mengganti nilai
            </p>
          </div>
          <button
            onClick={resetAll}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            Reset
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b text-slate-600">
                <th className="w-10 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">No.</th>
                <th className="px-4 py-3 text-left font-semibold text-xs uppercase tracking-wide">Uraian</th>
                <th className="w-24 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Dokumen</th>
                <th className="w-24 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Wawancara</th>
                <th className="w-24 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Observasi</th>
                <th className="w-28 px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Skor (0–2)</th>
              </tr>
              <tr className="border-b bg-slate-50/60">
                <td />
                <td className="px-4 py-1.5 text-xs text-muted-foreground italic">
                  Jika terbukti, beri tanda centang pada kolom yang relevan
                </td>
                <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">✔ / ✗</td>
                <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">✔ / ✗</td>
                <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">✔ / ✗</td>
                <td className="px-3 py-1.5 text-center text-xs text-muted-foreground">0 / 1 / 2</td>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {MMR_ITEMS.map((uraian, idx) => {
                const row             = rows[idx]
                const maxAllowed      = getMaxAllowed(rows, idx)
                const isLocked        = maxAllowed < 2
                const isFullyLocked   = maxAllowed === 0 && (firstZeroIdx >= 0 && firstZeroIdx < idx)

                return (
                  <tr
                    key={idx}
                    className={cn(
                      'hover:bg-slate-50/50 transition-colors',
                      row.skor === 2 && 'bg-green-50/30',
                      row.skor === 0 && idx === firstZeroIdx && 'bg-red-50/30',
                      isFullyLocked && 'bg-slate-50/50 opacity-70',
                    )}
                  >
                    <td className="px-3 py-3 text-center">
                      <span className={cn(
                        'text-xs font-medium',
                        isFullyLocked ? 'text-slate-300' : isLocked ? 'text-amber-500' : 'text-slate-400'
                      )}>
                        {idx + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 leading-snug">
                      <span className={cn(isFullyLocked ? 'text-slate-400' : 'text-slate-700')}>
                        {uraian}
                      </span>
                      {isFullyLocked && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                          <Lock className="size-2.5" /> dikunci
                        </span>
                      )}
                      {!isFullyLocked && isLocked && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-[10px] text-amber-500">
                          <Lock className="size-2.5" /> maks. {maxAllowed}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <TriStateSelect value={row.dokumen}   onChange={(v) => updateRow(idx, 'dokumen', v)}   disabled={isFullyLocked} />
                    </td>
                    <td className="px-3 py-3">
                      <TriStateSelect value={row.wawancara} onChange={(v) => updateRow(idx, 'wawancara', v)} disabled={isFullyLocked} />
                    </td>
                    <td className="px-3 py-3">
                      <TriStateSelect value={row.observasi} onChange={(v) => updateRow(idx, 'observasi', v)} disabled={isFullyLocked} />
                    </td>
                    <td className="px-3 py-3">
                      <SkorSelect
                        value={row.skor}
                        onChange={(v) => updateRow(idx, 'skor', v)}
                        maxAllowed={maxAllowed}
                        isLocked={isFullyLocked}
                      />
                    </td>
                  </tr>
                )
              })}

              {/* Total row */}
              <tr className="bg-slate-100 border-t-2 border-slate-300 font-semibold">
                <td />
                <td className="px-4 py-3 text-sm font-bold text-slate-800 uppercase tracking-wide">
                  Jumlah Skor
                </td>
                <td /><td /><td />
                <td className="px-3 py-3 text-center">
                  <span className={cn(
                    'inline-flex items-center justify-center w-12 h-8 rounded-lg text-base font-bold border',
                    totalSkor >= 26 ? 'bg-green-100 text-green-800 border-green-300' :
                    totalSkor >= 21 ? 'bg-teal-100 text-teal-800 border-teal-300' :
                    totalSkor >= 15 ? 'bg-blue-100 text-blue-800 border-blue-300' :
                    totalSkor >= 8  ? 'bg-yellow-100 text-yellow-800 border-yellow-300' :
                    'bg-red-100 text-red-800 border-red-300'
                  )}>
                    {totalSkor}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Save button */}
        <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-4">
          {saveError && (
            <p className="text-xs text-red-600">{saveError}</p>
          )}
          {!saveError && (
            <p className="text-xs text-slate-500">{filledCount} dari {MMR_ITEMS.length} item telah dinilai</p>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm',
              saved   ? 'bg-green-600 text-white' :
              saving  ? 'bg-slate-300 text-slate-500 cursor-not-allowed' :
              'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Menyimpan...</>
              : saved  ? <><CheckCircle2 className="w-4 h-4" /> Tersimpan</>
              : <><Save className="w-4 h-4" /> Simpan Penilaian</>}
          </button>
        </div>
      </div>

      {/* Conversion result */}
      <div className={cn('rounded-xl border p-6', level.bg)}>
        <div className="flex items-start gap-5">
          <div className="shrink-0 flex flex-col items-center">
            <div className={cn(
              'w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-sm',
              level.bg, level.color.replace('text-', 'border-')
            )}>
              <span className={cn('text-2xl font-black', level.color)}>{level.level}</span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">Level</span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className={cn('text-xl font-bold font-serif', level.color)}>{level.label}</h3>
              <span className={cn(
                'text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border',
                level.bg, level.color
              )}>
                Skor {totalSkor} dari 30 · Level {level.level}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{level.description}</p>
          </div>
        </div>

        <div className="mt-5 pt-4 border-t border-current/10">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Tabel Konversi Skor MMR</p>
          <div className="flex flex-wrap gap-2">
            {CONVERSION.map((c) => (
              <div
                key={c.level}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all',
                  totalSkor >= c.min && totalSkor <= c.max
                    ? cn(c.bg, c.color, 'ring-2 ring-offset-1 font-bold', c.color.replace('text-', 'ring-'))
                    : 'bg-white/60 border-slate-200 text-slate-500'
                )}
              >
                <span className="font-bold">Level {c.level}</span>
                <span>{c.label}</span>
                <span className="text-slate-400">({c.min}–{c.max})</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
