'use client'

import { useState } from 'react'
import { Save, CheckCircle2, Loader2 } from 'lucide-react'
import { upsertRtpRow } from './actions'

// ── 5×5 matrix ───────────────────────────────────────────────────────────────
const MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function levelLabel(k: number | null, d: number | null): string {
  if (!k || !d) return '–'
  const b = MATRIX[k]?.[d]
  if (!b) return '–'
  if (b >= 20) return 'Sangat Tinggi'
  if (b >= 16) return 'Tinggi'
  if (b >= 11) return 'Moderat'
  if (b >= 6)  return 'Rendah'
  return 'Sangat Rendah'
}

function levelBadgeStyle(k: number | null, d: number | null): string {
  if (!k || !d) return 'bg-slate-100 text-slate-400 border-slate-200'
  const b = MATRIX[k]?.[d]
  if (!b) return 'bg-slate-100 text-slate-400 border-slate-200'
  if (b >= 20) return 'bg-red-100 text-red-700 border-red-300'
  if (b >= 16) return 'bg-orange-100 text-orange-700 border-orange-300'
  if (b >= 11) return 'bg-amber-100 text-amber-700 border-amber-300'
  if (b >= 6)  return 'bg-green-100 text-green-700 border-green-300'
  return 'bg-cyan-100 text-cyan-700 border-cyan-300'
}

// ── Types ─────────────────────────────────────────────────────────────────────
export type RtpRowData = {
  penyebabId:           string
  risikoId:             string
  konteksId:            string
  kodePenyebab:         string
  pernyataanRisiko:     string
  responRisiko:         string
  pernyataanPenyebab:   string
  kegiatanPengendalian: string
  // persisted fields
  rtpId:                string | null
  klasifikasiSpip:      string
  penanggungJawab:      string
  indikatorKeluaran:    string
  targetWaktu:          string
  frekuensiRencana:     number | null
  dampakRencana:        number | null
  // grouping
  isFirstInRisiko:      boolean
  risikoRowSpan:        number
}

type RowState = {
  klasifikasiSpip:   string
  penanggungJawab:   string
  indikatorKeluaran: string
  targetWaktu:       string
  frekuensiRencana:  number | null
  dampakRencana:     number | null
  saving:            boolean
  saved:             boolean
  error:             string | null
}

const SCORE_OPTIONS = [
  { value: 1, label: '1 – Sangat Rendah' },
  { value: 2, label: '2 – Rendah' },
  { value: 3, label: '3 – Sedang' },
  { value: 4, label: '4 – Tinggi' },
  { value: 5, label: '5 – Sangat Tinggi' },
]

export default function RtpTable({ rows: initialRows }: { rows: RtpRowData[] }) {
  const [states, setStates] = useState<RowState[]>(() =>
    initialRows.map(r => ({
      klasifikasiSpip:   r.klasifikasiSpip,
      penanggungJawab:   r.penanggungJawab,
      indikatorKeluaran: r.indikatorKeluaran,
      targetWaktu:       r.targetWaktu,
      frekuensiRencana:  r.frekuensiRencana,
      dampakRencana:     r.dampakRencana,
      saving: false, saved: false, error: null,
    }))
  )

  function patch(idx: number, p: Partial<RowState>) {
    setStates(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], ...p }
      return next
    })
  }

  async function handleSave(idx: number) {
    const row = initialRows[idx]
    const st  = states[idx]
    patch(idx, { saving: true, saved: false, error: null })

    const fd = new FormData()
    fd.set('penyebab_id',         row.penyebabId)
    fd.set('risiko_id',           row.risikoId)
    fd.set('konteks_id',          row.konteksId)
    fd.set('klasifikasi_spip',    st.klasifikasiSpip)
    fd.set('penanggung_jawab',    st.penanggungJawab)
    fd.set('indikator_keluaran',  st.indikatorKeluaran)
    fd.set('target_waktu',        st.targetWaktu)
    if (st.frekuensiRencana) fd.set('frekuensi_rencana', String(st.frekuensiRencana))
    if (st.dampakRencana)    fd.set('dampak_rencana',    String(st.dampakRencana))

    const res = await upsertRtpRow(fd)
    if (res?.error) {
      patch(idx, { saving: false, error: res.error })
    } else {
      patch(idx, { saving: false, saved: true })
      setTimeout(() => patch(idx, { saved: false }), 2500)
    }
  }

  if (initialRows.length === 0) {
    return (
      <div className="py-16 text-center text-slate-400 space-y-2">
        <p className="text-sm font-medium">Tidak ada risiko prioritas yang perlu ditindaklanjuti.</p>
        <p className="text-xs">Pastikan selera risiko sudah ditetapkan dan analisis sudah dilakukan.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse min-w-[1400px]">
        <thead>
          <tr className="bg-slate-100 text-slate-600">
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-28">
              Kode<br /><span className="font-normal text-[9px] text-slate-400">(1)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[180px]">
              Pernyataan Risiko<br /><span className="font-normal text-[9px] text-slate-400">(2)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-32">
              Respons Risiko<br /><span className="font-normal text-[9px] text-slate-400">(3)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[160px]">
              Pernyataan Penyebab<br /><span className="font-normal text-[9px] text-slate-400">(4)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[160px]">
              Kegiatan Pengendalian<br /><span className="font-normal text-[9px] text-slate-400">(5)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[140px]">
              Klasifikasi Sub Unsur SPIP<br /><span className="font-normal text-[9px] text-slate-400">(6)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[130px]">
              Penanggung Jawab<br /><span className="font-normal text-[9px] text-slate-400">(7)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold min-w-[140px]">
              Indikator Keluaran<br /><span className="font-normal text-[9px] text-slate-400">(8)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold w-24">
              Target Waktu<br /><span className="font-normal text-[9px] text-slate-400">(9)</span>
            </th>
            <th className="border border-slate-200 px-2 py-2 text-center font-semibold" colSpan={3}>
              Risiko yang Direspons
            </th>
            <th className="border border-slate-200 px-2 py-2 w-16" />
          </tr>
          <tr className="bg-slate-100 text-slate-500 text-[9px]">
            {Array.from({ length: 9 }).map((_, i) => (
              <th key={i} className="border border-slate-200 px-1 py-1" />
            ))}
            <th className="border border-slate-200 px-2 py-1 text-center font-semibold w-24">
              Frekuensi<br /><span className="font-normal text-slate-400">(10)</span>
            </th>
            <th className="border border-slate-200 px-2 py-1 text-center font-semibold w-24">
              Dampak<br /><span className="font-normal text-slate-400">(11)</span>
            </th>
            <th className="border border-slate-200 px-2 py-1 text-center font-semibold w-28">
              Level Risiko<br /><span className="font-normal text-slate-400">(12)</span>
            </th>
            <th className="border border-slate-200 px-1 py-1" />
          </tr>
        </thead>
        <tbody>
          {initialRows.map((row, idx) => {
            const st = states[idx]
            const level = levelLabel(st.frekuensiRencana, st.dampakRencana)
            const badge = levelBadgeStyle(st.frekuensiRencana, st.dampakRencana)

            return (
              <tr
                key={row.penyebabId || `no-penyebab-${row.risikoId}`}
                className={`border-b border-slate-100 hover:bg-blue-50/20 transition-colors ${
                  row.isFirstInRisiko ? 'border-t-2 border-t-indigo-100' : ''
                }`}
              >
                {/* Col 1: Kode Penyebab */}
                <td className="border border-slate-100 px-2 py-2.5 text-center align-top">
                  <span className="font-mono text-[10px] text-slate-600 break-all">{row.kodePenyebab || '–'}</span>
                </td>

                {/* Col 2: Pernyataan Risiko (rowspan for same risk) */}
                {row.isFirstInRisiko && (
                  <td
                    className="border border-slate-100 px-2 py-2.5 align-top bg-indigo-50/40"
                    rowSpan={row.risikoRowSpan}
                  >
                    <p className="font-semibold text-slate-800 leading-relaxed">{row.pernyataanRisiko}</p>
                  </td>
                )}

                {/* Col 3: Respons Risiko (rowspan) */}
                {row.isFirstInRisiko && (
                  <td
                    className="border border-slate-100 px-2 py-2.5 text-center align-middle bg-indigo-50/20"
                    rowSpan={row.risikoRowSpan}
                  >
                    <span className={`inline-block px-2 py-1 rounded-lg border text-[10px] font-semibold leading-tight ${
                      row.responRisiko === 'Mengurangi Frekuensi'
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-purple-50 text-purple-700 border-purple-200'
                    }`}>
                      {row.responRisiko}
                    </span>
                  </td>
                )}

                {/* Col 4: Pernyataan Penyebab */}
                <td className="border border-slate-100 px-2 py-2.5 text-slate-700 align-top leading-relaxed">
                  {row.pernyataanPenyebab || <span className="text-slate-300 italic">–</span>}
                </td>

                {/* Col 5: Kegiatan Pengendalian */}
                <td className="border border-slate-100 px-2 py-2.5 text-slate-700 align-top leading-relaxed">
                  {row.kegiatanPengendalian || <span className="text-slate-300 italic">–</span>}
                </td>

                {/* Col 6: Klasifikasi Sub Unsur SPIP */}
                <td className="border border-slate-100 px-1.5 py-2 align-top">
                  <textarea
                    value={st.klasifikasiSpip}
                    onChange={e => patch(idx, { klasifikasiSpip: e.target.value, saved: false })}
                    placeholder="Mis: Pengendalian Intern atas Pelaporan..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-[10px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  />
                </td>

                {/* Col 7: Penanggung Jawab */}
                <td className="border border-slate-100 px-1.5 py-2 align-top">
                  <input
                    type="text"
                    value={st.penanggungJawab}
                    onChange={e => patch(idx, { penanggungJawab: e.target.value, saved: false })}
                    placeholder="Nama/jabatan..."
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-[10px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  />
                </td>

                {/* Col 8: Indikator Keluaran */}
                <td className="border border-slate-100 px-1.5 py-2 align-top">
                  <textarea
                    value={st.indikatorKeluaran}
                    onChange={e => patch(idx, { indikatorKeluaran: e.target.value, saved: false })}
                    placeholder="Dokumen, aplikasi, atau bentuk lainnya..."
                    rows={2}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-[10px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  />
                </td>

                {/* Col 9: Target Waktu */}
                <td className="border border-slate-100 px-1.5 py-2 align-top">
                  <input
                    type="text"
                    value={st.targetWaktu}
                    onChange={e => patch(idx, { targetWaktu: e.target.value, saved: false })}
                    placeholder="Mis: Semester I/2026"
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-2 py-1.5 text-[10px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  />
                </td>

                {/* Col 10: Frekuensi */}
                <td className="border border-slate-100 px-1.5 py-2 text-center align-top">
                  <select
                    value={st.frekuensiRencana ?? ''}
                    onChange={e => patch(idx, { frekuensiRencana: e.target.value ? parseInt(e.target.value) : null, saved: false })}
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-1.5 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  >
                    <option value="">–</option>
                    {SCORE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.value}</option>
                    ))}
                  </select>
                </td>

                {/* Col 11: Dampak */}
                <td className="border border-slate-100 px-1.5 py-2 text-center align-top">
                  <select
                    value={st.dampakRencana ?? ''}
                    onChange={e => patch(idx, { dampakRencana: e.target.value ? parseInt(e.target.value) : null, saved: false })}
                    className="w-full rounded-lg border border-slate-200 bg-white/80 px-1.5 py-1.5 text-[10px] text-slate-700 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  >
                    <option value="">–</option>
                    {SCORE_OPTIONS.map(o => (
                      <option key={o.value} value={o.value}>{o.value}</option>
                    ))}
                  </select>
                </td>

                {/* Col 12: Level Risiko (auto) */}
                <td className="border border-slate-100 px-2 py-2 text-center align-middle">
                  <span className={`inline-block px-2 py-1 rounded border text-[10px] font-semibold ${badge}`}>
                    {level}
                  </span>
                </td>

                {/* Save button */}
                <td className="border border-slate-100 px-2 py-2 text-center align-middle">
                  {st.error && (
                    <p className="text-[9px] text-red-500 mb-1">{st.error}</p>
                  )}
                  <button
                    onClick={() => handleSave(idx)}
                    disabled={st.saving}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all mx-auto ${
                      st.saved
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
                    }`}
                    title="Simpan baris ini"
                  >
                    {st.saving ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : st.saved ? (
                      <><CheckCircle2 className="w-3 h-3" /> Tersimpan</>
                    ) : (
                      <><Save className="w-3 h-3" /> Simpan</>
                    )}
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
