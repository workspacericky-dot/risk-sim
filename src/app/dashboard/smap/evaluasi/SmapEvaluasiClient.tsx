'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { smapScore, smapRiskLevel, SMAP_K_OPTIONS, SMAP_D_OPTIONS } from '@/lib/smap-data'
import SmapPetaRisiko from './SmapPetaRisiko'
import SmapEfektivitasModal from './SmapEfektivitasModal'
import { Trash2, FileDown, Info } from 'lucide-react'

type Risiko = {
  id: string
  no_urut: number
  uraian_risiko_final: string
  jenis_korupsi: string
}
type Analisis = {
  risiko_id: string
  status_existing: number | null
  kemungkinan_existing: number | null
  dampak_existing: number | null
}
type Evaluasi = {
  risiko_id: string
  uraian_penanganan: string | null
  batas_waktu: string | null
  pic: string | null
  efektif: boolean | null
  efektif_level: string | null
  kemungkinan_residual: number | null
  dampak_residual: number | null
  status_residual: number | null
  target_level: string | null
}

type Props = {
  konteksId: string
  namaUnit: string
  tahun: number
  namaPemilik: string
  jabatanPemilik: string
  risikoList: Risiko[]
  analisisList: Analisis[]
  evaluasiList: Evaluasi[]
}

// Risiko dengan score ≥ 5 (Moderat ke atas) dapat ditangani
const ACTIONABLE_THRESHOLD = 5

function ScoreBadge({ score }: { score: number | null }) {
  if (!score) return <span className="text-slate-300 text-[10px]">–</span>
  const lvl = smapRiskLevel(score)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${lvl.color} ${lvl.textColor}`}>
      {score} – {lvl.label}
    </span>
  )
}

function EvaluasiRow({
  risiko,
  analisis,
  initial,
  isLastActionable,
}: {
  risiko: Risiko
  analisis: Analisis | null
  initial: Evaluasi | null
  isLastActionable: boolean
}) {
  const existingScore   = analisis?.status_existing ?? null
  const isActionable    = (existingScore ?? 0) >= ACTIONABLE_THRESHOLD

  const [uraian,       setUraian]       = useState<string>(initial?.uraian_penanganan ?? '')
  const [batas,        setBatas]        = useState<string>(initial?.batas_waktu ?? '')
  const [pic,          setPic]          = useState<string>(initial?.pic ?? '')
  const [efektifLevel, setEfektifLevel] = useState<string | null>(initial?.efektif_level ?? null)
  const [kr,           setKr]           = useState<number>(initial?.kemungkinan_residual ?? 0)
  const [dr,           setDr]           = useState<number>(initial?.dampak_residual ?? 0)

  const [pending,  setPending]  = useState(false)
  const [savedOk,  setSavedOk]  = useState(false)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)

  const router = useRouter()
  const residualScore = isActionable && kr && dr ? smapScore(kr, dr) : null

  async function handleSave() {
    setPending(true); setSaveErr(null)
    const supabase = createClient()
    const { error } = await supabase.from('smap_evaluasi').upsert([{
      risiko_id: risiko.id,
      uraian_penanganan: uraian || null,
      batas_waktu: batas || null,
      pic: pic || null,
      efektif_level: efektifLevel || null,
      efektif: efektifLevel === 'Memadai' ? true : efektifLevel ? false : null,
      kemungkinan_residual: kr || null,
      dampak_residual: dr || null,
      status_residual: kr && dr ? smapScore(kr, dr) : null,
      target_level: 'Rendah',
      updated_at: new Date().toISOString(),
    }], { onConflict: 'risiko_id' })

    if (error) { setSaveErr(error.message); setPending(false); return }
    setPending(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Reset evaluasi risiko ini?')) return
    const supabase = createClient()
    await supabase.from('smap_evaluasi').delete().eq('risiko_id', risiko.id)
    setUraian(''); setBatas(''); setPic(''); setEfektifLevel(null); setKr(0); setDr(0)
    router.refresh()
  }

  const sel = (border: string) =>
    `w-full h-7 rounded border ${border} bg-white text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-orange-400`

  const grey = 'border border-slate-100 px-2 py-2 bg-slate-100/40 text-center'

  const targetBadge = (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-semibold border border-green-200">
      Rendah
    </span>
  )

  return (
    <tr
      className={`hover:bg-orange-50/20 transition-colors align-middle ${
        isLastActionable
          ? 'border-b-2 border-slate-400'
          : 'border-b border-slate-100'
      }`}
    >
      {/* No */}
      <td className="border border-slate-100 px-2 py-2 text-center">
        <span className="text-[10px] font-bold text-orange-600">{risiko.no_urut}</span>
      </td>
      {/* Uraian Risiko */}
      <td className="border border-slate-100 px-2 py-2.5">
        <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-medium mb-0.5">
          {risiko.jenis_korupsi}
        </span>
        <p className="text-[11px] font-medium text-slate-800 leading-relaxed line-clamp-2">
          {risiko.uraian_risiko_final}
        </p>
      </td>
      {/* Status setelah Kontrol Saat Ini */}
      <td className="border border-slate-100 px-2 py-2 text-center bg-indigo-50/30">
        <ScoreBadge score={existingScore} />
      </td>

      {isActionable ? (
        <>
          {/* Uraian Penanganan */}
          <td className="border border-slate-100 px-1.5 py-2 bg-teal-50/30 min-w-[160px]">
            <textarea
              value={uraian}
              onChange={e => setUraian(e.target.value)}
              placeholder="Upaya penanganan risiko..."
              rows={2}
              className="w-full rounded border border-teal-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none"
            />
          </td>
          {/* Batas Waktu */}
          <td className="border border-slate-100 px-1.5 py-2 bg-teal-50/30 w-28">
            <input
              type="date"
              value={batas}
              onChange={e => setBatas(e.target.value)}
              className="w-full h-7 rounded border border-teal-200 bg-white px-1.5 text-[10px] focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </td>
          {/* PIC */}
          <td className="border border-slate-100 px-1.5 py-2 bg-teal-50/30 min-w-[100px]">
            <input
              type="text"
              value={pic}
              onChange={e => setPic(e.target.value)}
              placeholder="Nama jabatan..."
              className="w-full h-7 rounded border border-teal-200 bg-white px-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </td>
          {/* Efektif */}
          <td className="border border-slate-100 px-1.5 py-2 bg-teal-50/30 w-28">
            <SmapEfektivitasModal currentLevel={efektifLevel} onConfirm={setEfektifLevel} />
          </td>
          {/* K Sisa */}
          <td className="border border-slate-100 px-1.5 py-2 text-center bg-purple-50/30">
            <select value={kr || ''} onChange={e => setKr(Number(e.target.value))} className={sel('border-purple-200')}>
              <option value="">–</option>
              {SMAP_K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
            </select>
          </td>
          {/* D Sisa */}
          <td className="border border-slate-100 px-1.5 py-2 text-center bg-purple-50/30">
            <select value={dr || ''} onChange={e => setDr(Number(e.target.value))} className={sel('border-purple-200')}>
              <option value="">–</option>
              {SMAP_D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
            </select>
          </td>
          {/* Status setelah Penanganan */}
          <td className="border border-slate-100 px-1.5 py-2 text-center bg-purple-100/40">
            <ScoreBadge score={residualScore} />
          </td>
          {/* Target Level — locked */}
          <td className="border border-slate-100 px-2 py-2 bg-purple-50/30 w-28 text-center">
            {targetBadge}
          </td>
          {/* Aksi */}
          <td className="border border-slate-100 px-1.5 py-2 text-center print:hidden">
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={pending}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  saveErr  ? 'bg-red-500 text-white'
                  : savedOk ? 'bg-green-600 text-white'
                  : pending ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                  : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
                title={saveErr ?? undefined}
              >
                {pending ? '...' : saveErr ? '✗' : savedOk ? '✓' : 'Simpan'}
              </button>
              {initial && (
                <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 transition-colors p-0.5" title="Reset">
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
              {saveErr && <p className="text-[9px] text-red-600 max-w-[56px] break-words">{saveErr}</p>}
            </div>
          </td>
        </>
      ) : (
        <>
          {/* Non-actionable: greyed-out cells */}
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          <td className={grey}><span className="text-[10px] text-slate-300">—</span></td>
          {/* Status setelah Penanganan = copy of existing */}
          <td className={`${grey} bg-slate-100/40`}>
            <ScoreBadge score={existingScore} />
          </td>
          {/* Target Level */}
          <td className={`${grey} w-28`}>{targetBadge}</td>
          {/* Aksi — empty */}
          <td className="border border-slate-100 px-2 py-2 text-center print:hidden">
            <span className="text-[10px] text-slate-200">—</span>
          </td>
        </>
      )}
    </tr>
  )
}

export default function SmapEvaluasiClient({
  konteksId, namaUnit, tahun, namaPemilik, jabatanPemilik,
  risikoList, analisisList, evaluasiList,
}: Props) {
  const analisisMap = Object.fromEntries(analisisList.map(a => [a.risiko_id, a]))
  const evaluasiMap = Object.fromEntries(evaluasiList.map(e => [e.risiko_id, e]))

  // Sort by status_existing descending; null/undefined treated as -1
  const sortedList = [...risikoList].sort((a, b) => {
    const sa = analisisMap[a.id]?.status_existing ?? -1
    const sb = analisisMap[b.id]?.status_existing ?? -1
    return sb - sa
  })

  // Index of last actionable row (for thick separator border)
  const lastActionableIdx = sortedList.reduce<number>((acc, r, i) => {
    return (analisisMap[r.id]?.status_existing ?? 0) >= ACTIONABLE_THRESHOLD ? i : acc
  }, -1)

  // Peta risiko: semua risiko yg sudah dianalisis, berdasarkan Status setelah Kontrol Saat Ini
  const petaPoints = analisisList
    .filter(a => a.kemungkinan_existing && a.dampak_existing && a.status_existing)
    .map(a => {
      const r = risikoList.find(x => x.id === a.risiko_id)
      return r ? {
        id: r.id,
        no_urut: r.no_urut,
        uraian: r.uraian_risiko_final,
        k: a.kemungkinan_existing!,
        d: a.dampak_existing!,
        score: a.status_existing!,
      } : null
    })
    .filter(Boolean) as any[]

  // Star overlays: risiko yang sudah dievaluasi (Status setelah Penanganan)
  const petaResidualPoints = evaluasiList
    .filter(e => e.kemungkinan_residual && e.dampak_residual && e.status_residual)
    .map(e => {
      const r = risikoList.find(x => x.id === e.risiko_id)
      return r ? {
        id: r.id,
        no_urut: r.no_urut,
        uraian: r.uraian_risiko_final,
        k: e.kemungkinan_residual!,
        d: e.dampak_residual!,
        score: e.status_residual!,
      } : null
    })
    .filter(Boolean) as any[]

  function handlePrint() { window.print() }

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end">
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors print:hidden"
        >
          <FileDown className="w-4 h-4" />
          Ekspor PDF
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-6">
        <h1 className="text-lg font-bold">Formulir Penilaian Risiko Penyuapan (SMAP)</h1>
        <p className="text-sm">Tahun {tahun} · {namaUnit}</p>
        {namaPemilik && <p className="text-sm">Pemilik Risiko: {namaPemilik} — {jabatanPemilik}</p>}
      </div>

      {/* Form 3 Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden print:shadow-none print:border-none">
        <div className="px-5 py-3 border-b bg-orange-50/60 print:hidden">
          <h3 className="text-sm font-semibold text-orange-900">Form 3 — Evaluasi Risiko Penyuapan (Status Risiko Sisa)</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">
            Risiko dengan nilai ≥ 5 (Moderat ke atas) dapat ditangani. Risiko Rendah/Sangat Rendah dikunci.
          </p>
        </div>
        <div className="px-5 py-3 border-b bg-slate-50/60 flex items-center gap-4 text-[10px] text-slate-500 flex-wrap print:hidden">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200 inline-block" />
            Status setelah Kontrol Saat Ini (dari Form 2)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-teal-50 border border-teal-200 inline-block" />
            Penanganan Risiko
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-purple-50 border border-purple-200 inline-block" />
            Residual Risk
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-slate-100 border border-slate-300 inline-block" />
            Tidak perlu ditangani
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1100px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b text-center">
                <th className="border border-slate-100 px-2 py-2 w-8">No</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[200px]">Uraian Risiko</th>
                <th className="border border-slate-100 px-2 py-2 bg-indigo-50/60 w-28">
                  Status<br/><span className="font-normal text-slate-400">setelah Kontrol Saat Ini</span>
                </th>
                <th className="border border-slate-100 px-2 py-2 bg-teal-50/60 min-w-[150px]">Uraian Penanganan</th>
                <th className="border border-slate-100 px-2 py-2 bg-teal-50/60 w-28">Batas Waktu</th>
                <th className="border border-slate-100 px-2 py-2 bg-teal-50/60 min-w-[100px]">PIC</th>
                <th className="border border-slate-100 px-2 py-2 bg-teal-50/60 w-24">Efektif?</th>
                <th className="border border-slate-100 px-2 py-2 bg-purple-50/60 w-16">K<br/><span className="font-normal text-slate-400">Sisa</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-purple-50/60 w-16">D<br/><span className="font-normal text-slate-400">Sisa</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-purple-100/40 w-28">
                  Status<br/><span className="font-normal text-slate-400">setelah Penanganan</span>
                </th>
                <th
                  className="border border-slate-100 px-2 py-2 bg-purple-50/60 w-28 cursor-help"
                  title="sesuai SK SEKMA 475/2019"
                >
                  <span className="inline-flex items-center gap-1 justify-center">
                    Target Level
                    <Info className="w-3 h-3 text-slate-400" />
                  </span>
                </th>
                <th className="border border-slate-100 px-2 py-2 w-16 print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {sortedList.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-slate-400 text-xs">
                    Belum ada data risiko. Selesaikan Form 1 (Identifikasi) terlebih dahulu.
                  </td>
                </tr>
              ) : (
                sortedList.map((r, idx) => {
                  const isLast = idx === lastActionableIdx
                  const isFirstNonActionable =
                    lastActionableIdx >= 0 &&
                    idx === lastActionableIdx + 1

                  return (
                    <React.Fragment key={r.id}>
                      {isFirstNonActionable && (
                        <tr>
                          <td
                            colSpan={12}
                            className="px-4 py-1.5 bg-slate-100/70 text-[10px] text-slate-500 font-medium border-y border-slate-200"
                          >
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500 inline-block shrink-0" />
                              Risiko di bawah ini bernilai Rendah — tidak memerlukan penanganan khusus
                            </span>
                          </td>
                        </tr>
                      )}
                      <EvaluasiRow
                        risiko={r}
                        analisis={analisisMap[r.id] ?? null}
                        initial={evaluasiMap[r.id] ?? null}
                        isLastActionable={isLast}
                      />
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Peta Risiko */}
      <div className="rounded-2xl border bg-white shadow-sm p-5 print:shadow-none print:border print:border-slate-200">
        <SmapPetaRisiko points={petaPoints} residualPoints={petaResidualPoints} />
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print\\:hidden { display: none !important; }
          #__next, #__next * { visibility: visible; }
          @page { margin: 15mm; size: A4 landscape; }
        }
      `}</style>
    </div>
  )
}
