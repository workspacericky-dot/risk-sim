'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { smapScore, smapRiskLevel, SMAP_K_OPTIONS, SMAP_D_OPTIONS } from '@/lib/smap-data'
import { Trash2 } from 'lucide-react'
import SmapReferensiModal from '../SmapReferensiModal'

type Risiko = {
  id: string
  no_urut: number
  uraian_risiko_final: string
  jenis_korupsi: string
}

type Analisis = {
  risiko_id: string
  kemungkinan_inherent: number | null
  dampak_inherent: number | null
  status_inherent: number | null
  kontrol_saat_ini: string | null
  kemungkinan_existing: number | null
  dampak_existing: number | null
  status_existing: number | null
}

type Props = {
  konteksId: string
  risikoList: Risiko[]
  analisisList: Analisis[]
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-slate-300 text-[10px]">–</span>
  const lvl = smapRiskLevel(score)
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${lvl.color} ${lvl.textColor}`}>
      {score} – {lvl.label}
    </span>
  )
}

function AnalisisRow({
  risiko,
  initial,
  konteksId,
}: {
  risiko: Risiko
  initial: Analisis | null
  konteksId: string
}) {
  const [ki, setKi] = useState<number>(initial?.kemungkinan_inherent ?? 0)
  const [di, setDi] = useState<number>(initial?.dampak_inherent ?? 0)
  const [kontrol, setKontrol] = useState<string>(initial?.kontrol_saat_ini ?? '')
  const [ke, setKe] = useState<number>(initial?.kemungkinan_existing ?? 0)
  const [de, setDe] = useState<number>(initial?.dampak_existing ?? 0)

  const [pending, setPending]   = useState(false)
  const [savedOk, setSavedOk]   = useState(false)
  const [saveErr, setSaveErr]   = useState<string | null>(null)

  const router = useRouter()

  const inherentScore  = ki && di ? smapScore(ki, di) : null
  const existingScore  = ke && de ? smapScore(ke, de) : null

  async function handleSave() {
    if (!ki || !di) { setSaveErr('Isi Inherent Risk terlebih dahulu'); return }
    setPending(true); setSaveErr(null)
    const supabase = createClient()
    const { error } = await supabase.from('smap_analisis').upsert([{
      risiko_id: risiko.id,
      kemungkinan_inherent: ki,
      dampak_inherent: di,
      status_inherent: smapScore(ki, di),
      kontrol_saat_ini: kontrol || null,
      kemungkinan_existing: ke || null,
      dampak_existing: de || null,
      status_existing: ke && de ? smapScore(ke, de) : null,
      updated_at: new Date().toISOString(),
    }], { onConflict: 'risiko_id' })

    if (error) { setSaveErr(error.message); setPending(false); return }
    setPending(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Reset analisis risiko ini?')) return
    const supabase = createClient()
    await supabase.from('smap_analisis').delete().eq('risiko_id', risiko.id)
    setKi(0); setDi(0); setKontrol(''); setKe(0); setDe(0)
    router.refresh()
  }

  const sel = (border: string) =>
    `w-full h-7 rounded border ${border} bg-white text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-orange-400`

  return (
    <tr className="border-b border-slate-100 hover:bg-orange-50/20 transition-colors align-middle">
      {/* No + Uraian */}
      <td className="border border-slate-100 px-2 py-2 text-center">
        <span className="text-[10px] font-bold text-orange-600">{risiko.no_urut}</span>
      </td>
      <td className="border border-slate-100 px-2 py-2.5">
        <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-medium mb-0.5">{risiko.jenis_korupsi}</span>
        <p className="text-[11px] font-medium text-slate-800 leading-relaxed line-clamp-3">{risiko.uraian_risiko_final}</p>
      </td>

      {/* ── INHERENT RISK ─── */}
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-sky-50/30">
        <select value={ki || ''} onChange={e => setKi(Number(e.target.value))} className={sel('border-sky-200')}>
          <option value="">–</option>
          {SMAP_K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-sky-50/30">
        <select value={di || ''} onChange={e => setDi(Number(e.target.value))} className={sel('border-sky-200')}>
          <option value="">–</option>
          {SMAP_D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-sky-100/50">
        <ScoreBadge score={inherentScore} />
      </td>

      {/* ── KONTROL ─── */}
      <td className="border border-slate-100 px-1.5 py-2.5 bg-amber-50/40 min-w-[160px]">
        <textarea
          value={kontrol}
          onChange={e => setKontrol(e.target.value)}
          placeholder="Pengendalian yang berjalan saat ini..."
          rows={2}
          className="w-full rounded border border-amber-200 bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-amber-400 resize-none"
        />
      </td>

      {/* ── EXISTING RISK ─── */}
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-indigo-50/30">
        <select value={ke || ''} onChange={e => setKe(Number(e.target.value))} className={sel('border-indigo-200')}>
          <option value="">–</option>
          {SMAP_K_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-indigo-50/30">
        <select value={de || ''} onChange={e => setDe(Number(e.target.value))} className={sel('border-indigo-200')}>
          <option value="">–</option>
          {SMAP_D_OPTIONS.map(o => <option key={o.v} value={o.v}>{o.v}</option>)}
        </select>
      </td>
      <td className="border border-slate-100 px-1.5 py-2.5 text-center bg-indigo-100/50">
        <ScoreBadge score={existingScore} />
      </td>

      {/* Aksi */}
      <td className="border border-slate-100 px-1.5 py-2.5 text-center">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              saveErr ? 'bg-red-500 text-white'
              : savedOk ? 'bg-green-600 text-white'
              : pending ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
            title={saveErr ?? undefined}
          >
            {pending ? '...' : saveErr ? '✗' : savedOk ? '✓' : 'Simpan'}
          </button>
          {initial && (
            <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 transition-colors p-0.5" title="Reset analisis">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {saveErr && <p className="text-[9px] text-red-600 max-w-[56px] break-words">{saveErr}</p>}
        </div>
      </td>
    </tr>
  )
}

export default function SmapAnalisisTable({ konteksId, risikoList, analisisList }: Props) {
  const analisisMap = Object.fromEntries(analisisList.map(a => [a.risiko_id, a]))
  const allAnalyzed = risikoList.length > 0 &&
    risikoList.every(r => analisisMap[r.id]?.kemungkinan_inherent)

  return (
    <div className="space-y-4">
      {allAnalyzed && (
        <div className="flex justify-end">
          <a
            href={`/dashboard/smap/evaluasi?konteks=${konteksId}`}
            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            Evaluasi Risiko →
          </a>
        </div>
      )}

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-orange-50/60">
          <h3 className="text-sm font-semibold text-orange-900">Form 2 — Analisis Risiko Penyuapan</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Tentukan Inherent Risk (tanpa kontrol) dan Existing Risk (dengan kontrol saat ini)</p>
        </div>

        {/* Legend */}
        <div className="px-5 py-2 border-b bg-slate-50/60 flex items-center gap-4 text-[10px] text-slate-500 flex-wrap">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-sky-100 border border-sky-200 inline-block" />Inherent Risk (tanpa kontrol)</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-50 border border-amber-200 inline-block" />Kontrol Saat Ini</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-50 border border-indigo-200 inline-block" />Existing Risk (setelah kontrol)</span>
          <span className="ml-auto flex items-center gap-2">
            <span className="text-slate-400">Scoring: K × D</span>
            <SmapReferensiModal />
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b text-center">
                <th className="border border-slate-100 px-2 py-2 w-8">No</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[220px]">Uraian Risiko Penyuapan</th>
                <th className="border border-slate-100 px-2 py-2 bg-sky-50/60 w-16" colSpan={1}>K<br/><span className="font-normal text-slate-400">Inherent</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-sky-50/60 w-16" colSpan={1}>D<br/><span className="font-normal text-slate-400">Inherent</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-sky-100/50 w-28">Status<br/><span className="font-normal text-slate-400">Inherent</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-amber-50/60 min-w-[160px]">Kontrol Saat Ini<br/><span className="font-normal text-slate-400">/ Faktor Positif</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-indigo-50/60 w-16">K<br/><span className="font-normal text-slate-400">Existing</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-indigo-50/60 w-16">D<br/><span className="font-normal text-slate-400">Existing</span></th>
                <th className="border border-slate-100 px-2 py-2 bg-indigo-100/50 w-28">Status<br/><span className="font-normal text-slate-400">setelah Kontrol Saat Ini</span></th>
                <th className="border border-slate-100 px-2 py-2 w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {risikoList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400 text-xs">
                    Belum ada risiko. Tambahkan risiko pada halaman Identifikasi terlebih dahulu.
                  </td>
                </tr>
              ) : (
                risikoList.map(r => (
                  <AnalisisRow
                    key={r.id}
                    risiko={r}
                    initial={analisisMap[r.id] ?? null}
                    konteksId={konteksId}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
