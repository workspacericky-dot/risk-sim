'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Save, CheckCircle2, RefreshCw } from 'lucide-react'

// Kecukupan badge colours
function kBadge(k: string | null | undefined) {
  if (!k) return 'bg-slate-100 text-slate-400 border-slate-200'
  if (k === 'Cukup Memadai')  return 'bg-blue-100 text-blue-700 border-blue-300'
  if (k === 'Kurang Memadai') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (k === 'Tidak Memadai')  return 'bg-orange-100 text-orange-700 border-orange-300'
  return 'bg-red-100 text-red-700 border-red-300' // Tidak Memiliki Pengendalian
}

export type PkaRow = {
  pkaId:                  string | null   // null = not yet saved
  risikoId:               string
  kodeRisiko:             string | null
  pernyataan:             string
  kecukupan:              string | null
  pengendalianEksisting:  string | null
  pengendalianUtama:      string | null
  // Editable
  uraian:        string
  noKka:         string
  waktu:         string
  dilaksanakan:  string
  // UI state
  saving: boolean
  saved:  boolean
  error:  string | null
}

type Props = {
  rows:      PkaRow[]
  konteksId: string
  tahun:     number | string
  unitNama:  string
}

export default function PkaTable({ rows: initialRows, konteksId, tahun, unitNama }: Props) {
  const router = useRouter()
  const [rows, setRows] = useState<PkaRow[]>(initialRows)

  function update(idx: number, patch: Partial<PkaRow>) {
    setRows(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...patch }
      return next
    })
  }

  async function handleSave(idx: number) {
    const row = rows[idx]
    update(idx, { saving: true, error: null })
    const supabase = createClient()

    const payload = {
      konteks_id:        konteksId,
      risiko_id:         row.risikoId,
      uraian:            row.uraian   || null,
      no_kka:            row.noKka    || null,
      waktu_pelaksanaan: row.waktu    || null,
      dilaksanakan_oleh: row.dilaksanakan || null,
    }

    let err
    if (row.pkaId) {
      const res = await supabase
        .from('program_kerja_audit')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', row.pkaId)
      err = res.error
    } else {
      const res = await supabase
        .from('program_kerja_audit')
        .insert([payload])
        .select('id')
        .single()
      err = res.error
      if (!err && res.data?.id) {
        update(idx, { pkaId: res.data.id })
      }
    }

    if (err) {
      update(idx, { saving: false, error: err.message })
    } else {
      update(idx, { saving: false, saved: true })
      setTimeout(() => update(idx, { saved: false }), 2500)
      router.refresh()
    }
  }

  const inputClass = 'w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-blue-400 placeholder:text-slate-300'
  const taClass    = inputClass + ' resize-y min-h-[36px]'

  if (rows.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-slate-400 space-y-2">
        <p className="text-sm font-medium">Tidak ada risiko yang perlu diaudit.</p>
        <p className="text-xs">Semua risiko telah memiliki pengendalian yang memadai, atau belum ada data evaluasi pengendalian.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse" style={{ minWidth: 900 }}>
        <thead>
          <tr className="bg-slate-100 text-slate-600 text-[10px]">
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-7">No</th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[320px]">
              Uraian Program Kerja Audit
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24">No. KKA</th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-36">Waktu Pelaksanaan</th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-36">Dilaksanakan Oleh</th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-16">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={row.risikoId} className="border-b border-slate-100 align-top hover:bg-slate-50/50 transition-colors">

              {/* No */}
              <td className="border border-slate-100 px-2 py-2 text-center text-slate-400">{idx + 1}</td>

              {/* Uraian — editable, pre-filled with synthesis */}
              <td className="border border-slate-100 px-2 py-2">
                {/* Risk tag + kecukupan badge */}
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="font-mono text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {row.kodeRisiko || '–'}
                  </span>
                  {row.kecukupan && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-semibold ${kBadge(row.kecukupan)}`}>
                      {row.kecukupan}
                    </span>
                  )}
                </div>

                {/* Pengendalian detail */}
                {(row.pengendalianEksisting || row.pengendalianUtama) && (
                  <div className="mb-2 rounded bg-slate-50 border border-slate-200 px-2 py-1.5 space-y-1">
                    {row.pengendalianEksisting && (
                      <div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Pengendalian Eksisting: </span>
                        <span className="text-[10px] text-slate-600">{row.pengendalianEksisting}</span>
                      </div>
                    )}
                    {row.pengendalianUtama && (
                      <div>
                        <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">Pengendalian Utama: </span>
                        <span className="text-[10px] text-slate-600">{row.pengendalianUtama}</span>
                      </div>
                    )}
                  </div>
                )}

                <textarea
                  value={row.uraian}
                  onChange={e => update(idx, { uraian: e.target.value })}
                  rows={4}
                  className={taClass}
                />
              </td>

              {/* No. KKA */}
              <td className="border border-slate-100 px-2 py-2 bg-sky-50/30">
                <input
                  type="text"
                  value={row.noKka}
                  onChange={e => update(idx, { noKka: e.target.value })}
                  placeholder="KKA-01"
                  className={inputClass}
                />
              </td>

              {/* Waktu Pelaksanaan */}
              <td className="border border-slate-100 px-2 py-2 bg-sky-50/30">
                <input
                  type="text"
                  value={row.waktu}
                  onChange={e => update(idx, { waktu: e.target.value })}
                  placeholder="Jan–Mar 2026"
                  className={inputClass}
                />
              </td>

              {/* Dilaksanakan Oleh */}
              <td className="border border-slate-100 px-2 py-2 bg-sky-50/30">
                <input
                  type="text"
                  value={row.dilaksanakan}
                  onChange={e => update(idx, { dilaksanakan: e.target.value })}
                  placeholder="Tim Audit Internal"
                  className={inputClass}
                />
              </td>

              {/* Aksi */}
              <td className="border border-slate-100 px-2 py-2 text-center">
                <button
                  type="button"
                  onClick={() => handleSave(idx)}
                  disabled={row.saving}
                  className={`w-full px-2 py-1.5 rounded-lg text-[10px] font-semibold transition-all shadow-sm flex items-center justify-center gap-1 ${
                    row.error   ? 'bg-red-500 text-white'
                    : row.saved   ? 'bg-green-600 text-white'
                    : row.saving  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                  title={row.error ?? undefined}
                >
                  {row.saving ? <><RefreshCw className="w-3 h-3 animate-spin" /> ...</>
                    : row.error ? '✗'
                    : row.saved ? <><CheckCircle2 className="w-3 h-3" /> OK</>
                    : <><Save className="w-3 h-3" /> Simpan</>
                  }
                </button>
                {row.error && (
                  <p className="text-[9px] text-red-600 mt-1 leading-tight">{row.error}</p>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
