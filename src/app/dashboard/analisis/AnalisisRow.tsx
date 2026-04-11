'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

// ── Risk Matrix [kemungkinan][dampak] → besaran ───────────────────────────
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getBesaran(k: number, d: number): number | null {
  if (!k || !d) return null
  return RISK_MATRIX[k]?.[d] ?? null
}

function getLevelFromBesaran(besaran: number): number {
  if (besaran >= 20) return 5
  if (besaran >= 16) return 4
  if (besaran >= 11) return 3
  if (besaran >= 6)  return 2
  return 1
}

function getLevelInfo(besaran: number | null): {
  level: number; label: string; bgClass: string; textClass: string
} | null {
  if (besaran === null) return null
  if (besaran >= 20) return { level: 5, label: 'Sangat Tinggi', bgClass: 'bg-red-500',    textClass: 'text-white' }
  if (besaran >= 16) return { level: 4, label: 'Tinggi',        bgClass: 'bg-orange-500', textClass: 'text-white' }
  if (besaran >= 11) return { level: 3, label: 'Moderat',       bgClass: 'bg-yellow-400', textClass: 'text-slate-900' }
  if (besaran >= 6)  return { level: 2, label: 'Rendah',        bgClass: 'bg-green-500',  textClass: 'text-white' }
  return               { level: 1, label: 'Sangat Rendah',      bgClass: 'bg-blue-400',   textClass: 'text-white' }
}

const K_OPTIONS = [
  { v: 1, label: '1 – Tidak terjadi' },
  { v: 2, label: '2 – Kecil' },
  { v: 3, label: '3 – Mungkin' },
  { v: 4, label: '4 – Besar' },
  { v: 5, label: '5 – Hampir pasti' },
]
const D_OPTIONS = [
  { v: 1, label: '1 – Sangat Rendah' },
  { v: 2, label: '2 – Rendah' },
  { v: 3, label: '3 – Sedang' },
  { v: 4, label: '4 – Tinggi' },
  { v: 5, label: '5 – Sangat Tinggi' },
]

type AnalisisRecord = {
  level_kemungkinan?: number | null
  level_dampak?: number | null
  ada_pengendalian?: boolean | null
  existing_control?: string | null
  efektivitas_control?: boolean | null
  residual_kemungkinan?: number | null
  residual_dampak?: number | null
}

type Props = {
  risikoId: string
  kodeRisiko: string | null
  pernyataanRisiko: string
  kategoriRisiko: string | null
  konteksId: string
  seleraRisiko: number
  initialAnalisis: AnalisisRecord | null
  onSaved?: () => void   // lightweight callback to update parent counter
}

export default function AnalisisRow({
  risikoId,
  kodeRisiko,
  pernyataanRisiko,
  kategoriRisiko,
  konteksId,
  seleraRisiko,
  initialAnalisis: ia,
  onSaved,
}: Props) {
  // ── Form state — initialised from DB data, NOT reset on save ──────────────
  const [k,       setK]       = useState<number>(ia?.level_kemungkinan  ?? 0)
  const [d,       setD]       = useState<number>(ia?.level_dampak        ?? 0)
  const [adaP,    setAdaP]    = useState<string>(
    ia?.ada_pengendalian === true ? 'true' : ia?.ada_pengendalian === false ? 'false' : ''
  )
  const [uraian,  setUraian]  = useState<string>(ia?.existing_control ?? '')
  const [efektif, setEfektif] = useState<string>(
    ia?.efektivitas_control === true ? 'true' : ia?.efektivitas_control === false ? 'false' : ''
  )
  const [resK, setResK] = useState<number>(ia?.residual_kemungkinan ?? 0)
  const [resD, setResD] = useState<number>(ia?.residual_dampak      ?? 0)

  const router = useRouter()

  // ── UI state ────────────────────────────────────────────────────────────
  const [isPending, setIsPending] = useState(false)
  const [savedOk,   setSavedOk]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Computed (reactive, no save needed) ────────────────────────────────
  const inherentBesaran = getBesaran(k, d)
  const inherentLevel   = getLevelInfo(inherentBesaran)
  const residualBesaran = getBesaran(resK, resD)
  const residualLevel   = getLevelInfo(residualBesaran)

  // ── Save: write directly to Supabase from browser ──────────────────────
  async function handleSave() {
    if (!k || !d) {
      setSaveError('Isi Kemungkinan & Dampak melekat terlebih dahulu')
      return
    }

    setIsPending(true)
    setSaveError(null)

    const supabase = createClient()

    // Compute derived values
    const inherentBes   = getBesaran(k, d) ?? 0
    const inherentLvl   = getLevelFromBesaran(inherentBes)
    const residualBes   = (resK && resD) ? (getBesaran(resK, resD) ?? null) : null
    const residualLvl   = residualBes !== null ? getLevelFromBesaran(residualBes) : null
    const diAtasSelera  = residualLvl !== null ? residualLvl > seleraRisiko : false

    const payload = {
      risiko_id:             risikoId,
      level_kemungkinan:     k,
      level_dampak:          d,
      status_risiko:         inherentBes,
      ada_pengendalian:      adaP === 'true' ? true : adaP === 'false' ? false : null,
      existing_control:      uraian || null,
      efektivitas_control:   efektif === 'true' ? true : efektif === 'false' ? false : null,
      residual_kemungkinan:  resK || null,
      residual_dampak:       resD || null,
      residual_level:        residualLvl,
      di_atas_selera_risiko: diAtasSelera,
    }

    // Upsert by risiko_id
    const { error: upsertErr } = await supabase
      .from('analisis_risiko')
      .upsert([payload], { onConflict: 'risiko_id' })

    if (upsertErr) {
      setSaveError(upsertErr.message)
      setIsPending(false)
      return
    }

    // Update risiko.status
    await supabase
      .from('risiko')
      .update({ status: 'Dianalisis' })
      .eq('id', risikoId)

    setIsPending(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)

    // Invalidate the router cache so navigating back shows fresh DB data
    router.refresh()

    // Notify parent to refresh the counter only
    onSaved?.()
  }

  // Helper select class
  const selClass = (border: string) =>
    `w-full h-7 rounded border ${border} bg-white text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-blue-400`

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors align-middle">

      {/* ── Col 1: Kode ──────────────────────────── */}
      <td className="border border-slate-200 px-2 py-2.5 text-center">
        <span className="font-mono text-[10px] text-slate-600">{kodeRisiko || '–'}</span>
      </td>

      {/* ── Col 2: Pernyataan ────────────────────── */}
      <td className="border border-slate-200 px-2 py-2.5">
        <p className="text-[11px] font-medium text-slate-800 leading-relaxed line-clamp-3">
          {pernyataanRisiko}
        </p>
        {kategoriRisiko && (
          <span className="mt-1 inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100 text-[9px]">
            {kategoriRisiko}
          </span>
        )}
      </td>

      {/* ═══ SKOR MELEKAT ════════════════════════════ */}

      {/* Col 3: Kemungkinan melekat */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-50/30">
        <select
          value={k || ''}
          onChange={e => setK(Number(e.target.value))}
          className={selClass('border-sky-200')}
        >
          <option value="">–</option>
          {K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 4: Dampak melekat */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-50/30">
        <select
          value={d || ''}
          onChange={e => setD(Number(e.target.value))}
          className={selClass('border-sky-200')}
        >
          <option value="">–</option>
          {D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 4a: Besaran melekat — REAKTIF */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-100/50">
        {inherentBesaran !== null ? (
          <span className="text-xl font-extrabold text-sky-800 tabular-nums">{inherentBesaran}</span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* Col 5: Level melekat — REAKTIF */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-50/30">
        {inherentLevel ? (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${inherentLevel.bgClass} ${inherentLevel.textClass}`}
          >
            {inherentLevel.level} – {inherentLevel.label}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* ═══ PENGENDALIAN ════════════════════════════ */}

      {/* Col 6: Ada/Belum */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-amber-50/40">
        <select
          value={adaP}
          onChange={e => setAdaP(e.target.value)}
          className={selClass('border-amber-200')}
        >
          <option value="">–</option>
          <option value="true">Ada</option>
          <option value="false">Belum Ada</option>
        </select>
      </td>

      {/* Col 7: Uraian */}
      <td className="border border-slate-200 px-1.5 py-2.5 bg-amber-50/40">
        <input
          type="text"
          value={uraian}
          onChange={e => setUraian(e.target.value)}
          placeholder="Uraian pengendalian..."
          className="w-full h-7 rounded border border-amber-200 bg-white px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      </td>

      {/* Col 8: Memadai/Belum */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-amber-50/40">
        <select
          value={efektif}
          onChange={e => setEfektif(e.target.value)}
          className={selClass('border-amber-200')}
        >
          <option value="">–</option>
          <option value="true">Memadai</option>
          <option value="false">Belum Memadai</option>
        </select>
      </td>

      {/* ═══ SKOR RESIDU ═══════════════════════════════ */}

      {/* Col 9: Kemungkinan residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        <select
          value={resK || ''}
          onChange={e => setResK(Number(e.target.value))}
          className={selClass('border-indigo-200')}
        >
          <option value="">–</option>
          {K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 10: Dampak residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        <select
          value={resD || ''}
          onChange={e => setResD(Number(e.target.value))}
          className={selClass('border-indigo-200')}
        >
          <option value="">–</option>
          {D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 10a: Besaran residu — REAKTIF */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-100/50">
        {residualBesaran !== null ? (
          <span className="text-xl font-extrabold text-indigo-800 tabular-nums">{residualBesaran}</span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* Col 11: Level residu — REAKTIF */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        {residualLevel ? (
          <span
            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${residualLevel.bgClass} ${residualLevel.textClass}`}
          >
            {residualLevel.level} – {residualLevel.label}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* ── Aksi ─────────────────────────────────────── */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all shadow-sm ${
            saveError
              ? 'bg-red-500 text-white'
              : savedOk
              ? 'bg-green-600 text-white'
              : isPending
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
          title={saveError ?? undefined}
        >
          {isPending ? '...' : saveError ? '✗' : savedOk ? '✓' : 'Simpan'}
        </button>
        {saveError && (
          <p className="text-[9px] text-red-600 mt-1 leading-tight max-w-[56px] break-words">
            {saveError}
          </p>
        )}
      </td>
    </tr>
  )
}
