'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Save, CheckCircle2 } from 'lucide-react'

function kecukupanBadgeClass(k: string | null | undefined) {
  if (!k) return 'bg-slate-100 text-slate-400 border-slate-200'
  if (k === 'Memadai') return 'bg-green-100 text-green-700 border-green-300'
  if (k === 'Cukup Memadai') return 'bg-blue-100 text-blue-700 border-blue-300'
  if (k === 'Kurang Memadai') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (k === 'Tidak Memadai') return 'bg-orange-100 text-orange-700 border-orange-300'
  if (k === 'Tidak Memiliki Pengendalian') return 'bg-red-100 text-red-700 border-red-300'
  return 'bg-slate-100 text-slate-400 border-slate-200'
}

type RisikoRow = {
  id: string
  kode_risiko: string | null
  pernyataan_risiko: string
  dampak_potensial: string | null
  kecukupan_pengendalian: string | null
  pengendalian_eksisting: string | null
  pengendalian_utama: string | null
  evaluasiId: string | null
}

type Props = {
  rows: RisikoRow[]
  konteksId: string
}

type RowState = {
  pengendalianEksisting: string
  pengendalianUtama: string
  saving: boolean
  saved: boolean
  error: string | null
}

export default function EvaluasiPengendalianTable({ rows, konteksId }: Props) {
  const router = useRouter()

  const [states, setStates] = useState<Record<string, RowState>>(() => {
    const init: Record<string, RowState> = {}
    for (const r of rows) {
      init[r.id] = {
        pengendalianEksisting: r.pengendalian_eksisting ?? '',
        pengendalianUtama:     r.pengendalian_utama     ?? '',
        saving:  false,
        saved:   false,
        error:   null,
      }
    }
    return init
  })

  function update(risikoId: string, patch: Partial<RowState>) {
    setStates(prev => ({ ...prev, [risikoId]: { ...prev[risikoId], ...patch } }))
  }

  async function handleSave(r: RisikoRow) {
    update(r.id, { saving: true, error: null })
    const supabase = createClient()
    const s = states[r.id]

    const payload = {
      risiko_id:              r.id,
      konteks_id:             konteksId,
      pengendalian_eksisting: s.pengendalianEksisting || null,
      pengendalian_utama:     s.pengendalianUtama     || null,
    }

    let err
    if (r.evaluasiId) {
      const res = await supabase
        .from('evaluasi_pengendalian_utama')
        .update({
          pengendalian_eksisting: payload.pengendalian_eksisting,
          pengendalian_utama:     payload.pengendalian_utama,
          updated_at:             new Date().toISOString(),
        })
        .eq('id', r.evaluasiId)
      err = res.error
    } else {
      const res = await supabase
        .from('evaluasi_pengendalian_utama')
        .insert([payload])
      err = res.error
    }

    if (err) {
      update(r.id, { saving: false, error: err.message })
    } else {
      update(r.id, { saving: false, saved: true })
      setTimeout(() => update(r.id, { saved: false }), 2500)
      router.refresh()
    }
  }

  if (rows.length === 0) {
    return (
      <div className="px-4 py-16 text-center text-slate-400">
        <p className="text-sm">Belum ada risiko yang teridentifikasi untuk konteks ini.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-collapse min-w-[900px]">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-8" rowSpan={2}>No</th>
            {/* Risiko group */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold bg-sky-50" colSpan={2}>
              Risiko
            </th>
            {/* Dampak */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[140px]" rowSpan={2}>
              Dampak
            </th>
            {/* Pengendalian Eksisting */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[160px]" rowSpan={2}>
              Pengendalian Eksisting
            </th>
            {/* Pengendalian Utama */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[160px]" rowSpan={2}>
              Pengendalian Utama
            </th>
            {/* Kecukupan Desain */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[120px]" rowSpan={2}>
              Kecukupan Desain Pengendalian
            </th>
            {/* Aksi */}
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-16" rowSpan={2}>
              Aksi
            </th>
          </tr>
          <tr className="bg-slate-100 text-slate-500 text-[10px]">
            <th className="border border-slate-200 px-2 py-1.5 text-center font-semibold w-24 bg-sky-50">
              Kode Risiko
            </th>
            <th className="border border-slate-200 px-2 py-1.5 text-center font-semibold min-w-[180px] bg-sky-50">
              Pernyataan Risiko
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => {
            const s = states[r.id]
            return (
              <tr key={r.id} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors align-top">
                <td className="border border-slate-100 px-2 py-2.5 text-center text-slate-400">{idx + 1}</td>

                {/* Kode Risiko */}
                <td className="border border-slate-100 px-2 py-2.5 text-center bg-sky-50/30">
                  <span className="font-mono text-[11px] text-slate-600">{r.kode_risiko || '–'}</span>
                </td>

                {/* Pernyataan Risiko */}
                <td className="border border-slate-100 px-2 py-2.5 bg-sky-50/30">
                  <p className="text-[11px] font-medium text-slate-800 leading-relaxed">{r.pernyataan_risiko}</p>
                </td>

                {/* Dampak */}
                <td className="border border-slate-100 px-2 py-2.5">
                  <p className="text-[11px] text-slate-700 leading-relaxed">
                    {r.dampak_potensial || <span className="text-slate-300">–</span>}
                  </p>
                </td>

                {/* Pengendalian Eksisting */}
                <td className="border border-slate-100 px-2 py-2.5 bg-amber-50/30">
                  <textarea
                    value={s?.pengendalianEksisting ?? ''}
                    onChange={e => update(r.id, { pengendalianEksisting: e.target.value })}
                    rows={2}
                    placeholder="Uraian pengendalian yang sudah ada..."
                    className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-[10px] resize-y focus:outline-none focus:ring-1 focus:ring-amber-400 min-h-[40px]"
                  />
                </td>

                {/* Pengendalian Utama */}
                <td className="border border-slate-100 px-2 py-2.5 bg-indigo-50/30">
                  <textarea
                    value={s?.pengendalianUtama ?? ''}
                    onChange={e => update(r.id, { pengendalianUtama: e.target.value })}
                    rows={2}
                    placeholder="Pengendalian utama yang ditetapkan..."
                    className="w-full rounded border border-indigo-200 bg-white px-2 py-1 text-[10px] resize-y focus:outline-none focus:ring-1 focus:ring-indigo-400 min-h-[40px]"
                  />
                </td>

                {/* Kecukupan Desain — from analisis */}
                <td className="border border-slate-100 px-2 py-2.5 text-center">
                  {r.kecukupan_pengendalian ? (
                    <span className={`inline-block px-2 py-1 rounded border text-[10px] font-semibold leading-tight ${kecukupanBadgeClass(r.kecukupan_pengendalian)}`}>
                      {r.kecukupan_pengendalian}
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-300 italic">Belum dianalisis</span>
                  )}
                </td>

                {/* Aksi */}
                <td className="border border-slate-100 px-2 py-2.5 text-center">
                  <button
                    type="button"
                    onClick={() => handleSave(r)}
                    disabled={s?.saving}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all shadow-sm flex items-center gap-1 mx-auto ${
                      s?.error
                        ? 'bg-red-500 text-white'
                        : s?.saved
                        ? 'bg-green-600 text-white'
                        : s?.saving
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                    title={s?.error ?? undefined}
                  >
                    {s?.saving ? '...' : s?.error ? '✗' : s?.saved ? <><CheckCircle2 className="w-3 h-3" /> ✓</> : <><Save className="w-3 h-3" /> Simpan</>}
                  </button>
                  {s?.error && (
                    <p className="text-[9px] text-red-600 mt-1 leading-tight">{s.error}</p>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
