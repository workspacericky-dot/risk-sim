'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { HelpCircle, CheckCircle2, XCircle } from 'lucide-react'

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

// ── Kecukupan Pengendalian level derived from 4 questions ─────────────────
type QState = 'ya' | 'tidak' | null

function deriveKecukupan(q1: QState, q2: QState, q3: QState, q4: QState): string | null {
  if (q1 === null) return null
  if (q1 === 'tidak') return 'Tidak Memiliki Pengendalian'
  // q1 = ya
  if (q2 === null) return null
  if (q2 === 'tidak') return 'Tidak Memadai'
  // q2 = ya
  if (q3 === null) return null
  if (q3 === 'tidak') return 'Kurang Memadai'
  // q3 = ya
  if (q4 === null) return null
  if (q4 === 'tidak') return 'Cukup Memadai'
  return 'Memadai'
}

function kecukupanBadgeClass(k: string | null) {
  if (!k) return 'bg-slate-100 text-slate-400 border-slate-200'
  if (k === 'Memadai') return 'bg-green-100 text-green-700 border-green-300'
  if (k === 'Cukup Memadai') return 'bg-blue-100 text-blue-700 border-blue-300'
  if (k === 'Kurang Memadai') return 'bg-amber-100 text-amber-700 border-amber-300'
  if (k === 'Tidak Memadai') return 'bg-orange-100 text-orange-700 border-orange-300'
  if (k === 'Tidak Memiliki Pengendalian') return 'bg-red-100 text-red-700 border-red-300'
  return 'bg-slate-100 text-slate-400 border-slate-200'
}

// ── 4-Question Popup component ────────────────────────────────────────────
function KecukupanPopup({
  q1, q2, q3, q4,
  onChange,
}: {
  q1: QState; q2: QState; q3: QState; q4: QState
  onChange: (q1: QState, q2: QState, q3: QState, q4: QState) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const kecukupan = deriveKecukupan(q1, q2, q3, q4)

  function handleQ1(val: QState) {
    if (val === 'tidak') {
      // Building block: Q1=Tidak → all others auto Tidak
      onChange(val, 'tidak', 'tidak', 'tidak')
    } else {
      onChange(val, q2, q3, q4)
    }
  }
  function handleQ2(val: QState) {
    if (val === 'tidak') {
      onChange(q1, val, 'tidak', 'tidak')
    } else {
      onChange(q1, val, q3, q4)
    }
  }
  function handleQ3(val: QState) {
    if (val === 'tidak') {
      onChange(q1, q2, val, 'tidak')
    } else {
      onChange(q1, q2, val, q4)
    }
  }
  function handleQ4(val: QState) {
    onChange(q1, q2, q3, val)
  }

  const questions: {
    label: string
    enabled: boolean
    value: QState
    handler: (v: QState) => void
  }[] = [
    {
      label: 'Apakah terdapat pengendalian untuk mencegah risiko terjadi?',
      enabled: true,
      value: q1,
      handler: handleQ1,
    },
    {
      label: 'Apakah pengendalian cukup memadai untuk mencegah risiko terjadi?',
      enabled: q1 === 'ya',
      value: q2,
      handler: handleQ2,
    },
    {
      label: 'Apakah pengendalian telah dilaksanakan dengan konsisten?',
      enabled: q1 === 'ya' && q2 === 'ya',
      value: q3,
      handler: handleQ3,
    },
    {
      label: 'Apakah risiko sudah tidak terjadi?',
      enabled: q1 === 'ya' && q2 === 'ya' && q3 === 'ya',
      value: q4,
      handler: handleQ4,
    },
  ]

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`w-full h-7 px-1.5 rounded border text-[10px] font-semibold flex items-center justify-center gap-1 transition-colors ${
          kecukupan
            ? `${kecukupanBadgeClass(kecukupan)} border`
            : 'border-amber-200 bg-white text-slate-400 hover:bg-amber-50'
        }`}
        title="Klik untuk mengisi kuesioner kecukupan"
      >
        {kecukupan ? (
          <span className="truncate max-w-[80px]">{kecukupan}</span>
        ) : (
          <>
            <HelpCircle className="w-3 h-3 shrink-0" />
            <span>Isi</span>
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute z-50 right-0 top-9 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 w-72"
          style={{ minWidth: 280 }}
        >
          <p className="text-[11px] font-bold text-slate-700 mb-3 leading-tight">
            Kuesioner Kecukupan Desain Pengendalian
          </p>

          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className={`space-y-1.5 ${!q.enabled ? 'opacity-40' : ''}`}>
                <p className="text-[10px] text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">{i + 1}.</span> {q.label}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!q.enabled}
                    onClick={() => q.enabled && q.handler('ya')}
                    className={`flex-1 h-6 rounded text-[10px] font-semibold border transition-colors flex items-center justify-center gap-1 ${
                      q.value === 'ya'
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-green-400 hover:text-green-700'
                    }`}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Ya
                  </button>
                  <button
                    type="button"
                    disabled={!q.enabled}
                    onClick={() => q.enabled && q.handler('tidak')}
                    className={`flex-1 h-6 rounded text-[10px] font-semibold border transition-colors flex items-center justify-center gap-1 ${
                      q.value === 'tidak'
                        ? 'bg-red-500 text-white border-red-500'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-red-400 hover:text-red-700'
                    }`}
                  >
                    <XCircle className="w-3 h-3" /> Tidak
                  </button>
                </div>
              </div>
            ))}
          </div>

          {kecukupan && (
            <div className="mt-4 pt-3 border-t border-slate-100">
              <p className="text-[10px] text-slate-500 mb-1">Hasil:</p>
              <span className={`text-[11px] font-bold px-2 py-1 rounded border ${kecukupanBadgeClass(kecukupan)}`}>
                {kecukupan}
              </span>
            </div>
          )}

          <button
            type="button"
            onClick={() => setOpen(false)}
            className="mt-3 w-full h-7 rounded bg-slate-800 text-white text-[10px] font-semibold hover:bg-slate-700 transition-colors"
          >
            Selesai
          </button>
        </div>
      )}
    </div>
  )
}

// ── Types ─────────────────────────────────────────────────────────────────

type AnalisisRecord = {
  level_kemungkinan?: number | null
  level_dampak?: number | null
  ada_pengendalian?: boolean | null
  existing_control?: string | null
  efektivitas_control?: boolean | null
  residual_kemungkinan?: number | null
  residual_dampak?: number | null
  q1_ada_pengendalian_pencegah?: boolean | null
  q2_pengendalian_memadai?: boolean | null
  q3_dilaksanakan_konsisten?: boolean | null
  q4_risiko_tidak_terjadi?: boolean | null
  kecukupan_pengendalian?: string | null
}

type Props = {
  risikoId: string
  kodeRisiko: string | null
  pernyataanRisiko: string
  kategoriRisiko: string | null
  konteksId: string
  seleraRisiko: number
  initialAnalisis: AnalisisRecord | null
  onSaved?: () => void
}

// ── Helper: bool DB value → QState ────────────────────────────────────────
function boolToQ(v: boolean | null | undefined): QState {
  if (v === true) return 'ya'
  if (v === false) return 'tidak'
  return null
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
  const [k,       setK]       = useState<number>(ia?.level_kemungkinan  ?? 0)
  const [d,       setD]       = useState<number>(ia?.level_dampak        ?? 0)
  const [adaP,    setAdaP]    = useState<string>(
    ia?.ada_pengendalian === true ? 'true' : ia?.ada_pengendalian === false ? 'false' : ''
  )
  const [uraian,  setUraian]  = useState<string>(ia?.existing_control ?? '')

  // 4-question state
  const [q1, setQ1] = useState<QState>(boolToQ(ia?.q1_ada_pengendalian_pencegah))
  const [q2, setQ2] = useState<QState>(boolToQ(ia?.q2_pengendalian_memadai))
  const [q3, setQ3] = useState<QState>(boolToQ(ia?.q3_dilaksanakan_konsisten))
  const [q4, setQ4] = useState<QState>(boolToQ(ia?.q4_risiko_tidak_terjadi))

  const [resK, setResK] = useState<number>(ia?.residual_kemungkinan ?? 0)
  const [resD, setResD] = useState<number>(ia?.residual_dampak      ?? 0)

  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [savedOk,   setSavedOk]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // ── Computed values ────────────────────────────────────────────────────
  const inherentBesaran = getBesaran(k, d)
  const inherentLevel   = getLevelInfo(inherentBesaran)

  const kecukupan = deriveKecukupan(q1, q2, q3, q4)
  const noKontrol = kecukupan === 'Tidak Memiliki Pengendalian'

  // When no control: residual = inherent (locked)
  const effectiveResK = noKontrol ? k   : resK
  const effectiveResD = noKontrol ? d   : resD
  const residualBesaran = getBesaran(effectiveResK, effectiveResD)
  const residualLevel   = getLevelInfo(residualBesaran)

  function handleQChange(nq1: QState, nq2: QState, nq3: QState, nq4: QState) {
    setQ1(nq1); setQ2(nq2); setQ3(nq3); setQ4(nq4)
  }

  // ── Save ───────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!k || !d) {
      setSaveError('Isi Kemungkinan & Dampak melekat terlebih dahulu')
      return
    }

    setIsPending(true)
    setSaveError(null)

    const supabase = createClient()

    const inherentBes   = getBesaran(k, d) ?? 0
    const inherentLvl   = getLevelFromBesaran(inherentBes)

    // If no control: residual mirrors inherent
    const finalResK = noKontrol ? k : (resK || null)
    const finalResD = noKontrol ? d : (resD || null)
    const residualBes   = (finalResK && finalResD) ? (getBesaran(finalResK, finalResD) ?? null) : null
    const residualLvl   = residualBes !== null ? getLevelFromBesaran(residualBes) : null
    const diAtasSelera  = residualLvl !== null ? residualLvl > seleraRisiko : false

    // Backward-compat: map kecukupan → efektivitas_control bool
    let efektivitas: boolean | null = null
    if (kecukupan === 'Memadai' || kecukupan === 'Cukup Memadai') efektivitas = true
    else if (kecukupan === 'Kurang Memadai' || kecukupan === 'Tidak Memadai' || kecukupan === 'Tidak Memiliki Pengendalian') efektivitas = false

    const payload = {
      risiko_id:                       risikoId,
      level_kemungkinan:               k,
      level_dampak:                    d,
      status_risiko:                   inherentBes,
      ada_pengendalian:                adaP === 'true' ? true : adaP === 'false' ? false : null,
      existing_control:                uraian || null,
      efektivitas_control:             efektivitas,
      residual_kemungkinan:            finalResK,
      residual_dampak:                 finalResD,
      residual_level:                  residualLvl,
      di_atas_selera_risiko:           diAtasSelera,
      q1_ada_pengendalian_pencegah:    q1 === 'ya' ? true : q1 === 'tidak' ? false : null,
      q2_pengendalian_memadai:         q2 === 'ya' ? true : q2 === 'tidak' ? false : null,
      q3_dilaksanakan_konsisten:       q3 === 'ya' ? true : q3 === 'tidak' ? false : null,
      q4_risiko_tidak_terjadi:         q4 === 'ya' ? true : q4 === 'tidak' ? false : null,
      kecukupan_pengendalian:          kecukupan,
    }

    const { error: upsertErr } = await supabase
      .from('analisis_risiko')
      .upsert([payload], { onConflict: 'risiko_id' })

    if (upsertErr) {
      setSaveError(upsertErr.message)
      setIsPending(false)
      return
    }

    await supabase
      .from('risiko')
      .update({ status: 'Dianalisis' })
      .eq('id', risikoId)

    setIsPending(false)
    setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
    router.refresh()
    onSaved?.()
  }

  const selClass = (border: string) =>
    `w-full h-7 rounded border ${border} bg-white text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-blue-400`

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors align-middle">

      {/* Col 1: Kode */}
      <td className="border border-slate-200 px-2 py-2.5 text-center">
        <span className="font-mono text-[10px] text-slate-600">{kodeRisiko || '–'}</span>
      </td>

      {/* Col 2: Pernyataan */}
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
        <select value={k || ''} onChange={e => setK(Number(e.target.value))} className={selClass('border-sky-200')}>
          <option value="">–</option>
          {K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 4: Dampak melekat */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-50/30">
        <select value={d || ''} onChange={e => setD(Number(e.target.value))} className={selClass('border-sky-200')}>
          <option value="">–</option>
          {D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>

      {/* Col 4a: Besaran melekat */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-100/50">
        {inherentBesaran !== null ? (
          <span className="text-xl font-extrabold text-sky-800 tabular-nums">{inherentBesaran}</span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* Col 5: Level melekat */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-sky-50/30">
        {inherentLevel ? (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${inherentLevel.bgClass} ${inherentLevel.textClass}`}>
            {inherentLevel.level} – {inherentLevel.label}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* ═══ PENGENDALIAN ════════════════════════════ */}

      {/* Col 6: Ada/Belum */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-amber-50/40">
        <select value={adaP} onChange={e => setAdaP(e.target.value)} className={selClass('border-amber-200')}>
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

      {/* Col 8: Memadai/Belum — 4-question popup */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-amber-50/40">
        <KecukupanPopup q1={q1} q2={q2} q3={q3} q4={q4} onChange={handleQChange} />
      </td>

      {/* ═══ SKOR RESIDU ═══════════════════════════════ */}

      {/* Col 9: Kemungkinan residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        {noKontrol ? (
          <div className="w-full h-7 flex items-center justify-center rounded border border-indigo-100 bg-indigo-50/50">
            <span className="text-[10px] font-bold text-indigo-500">{k || '–'}</span>
          </div>
        ) : (
          <select value={resK || ''} onChange={e => setResK(Number(e.target.value))} className={selClass('border-indigo-200')}>
            <option value="">–</option>
            {K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
          </select>
        )}
      </td>

      {/* Col 10: Dampak residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        {noKontrol ? (
          <div className="w-full h-7 flex items-center justify-center rounded border border-indigo-100 bg-indigo-50/50">
            <span className="text-[10px] font-bold text-indigo-500">{d || '–'}</span>
          </div>
        ) : (
          <select value={resD || ''} onChange={e => setResD(Number(e.target.value))} className={selClass('border-indigo-200')}>
            <option value="">–</option>
            {D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
          </select>
        )}
      </td>

      {/* Col 10a: Besaran residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-100/50">
        {residualBesaran !== null ? (
          <span className="text-xl font-extrabold text-indigo-800 tabular-nums">{residualBesaran}</span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* Col 11: Level residu */}
      <td className="border border-slate-200 px-1.5 py-2.5 text-center bg-indigo-50/30">
        {residualLevel ? (
          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold leading-tight ${residualLevel.bgClass} ${residualLevel.textClass}`}>
            {residualLevel.level} – {residualLevel.label}
          </span>
        ) : (
          <span className="text-slate-300 text-[10px]">–</span>
        )}
      </td>

      {/* Aksi */}
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
