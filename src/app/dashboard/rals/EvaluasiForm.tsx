'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { RiskMatrix, type RiskPoint } from '@/components/RiskMatrix'
import { getBesaran, getLevel, getKategoriKey } from '@/lib/risk-engine'
import { DEFAULT_SELERA } from '@/lib/rals-probis'
import OrgExportButton from './OrgExportButton'

type Risk = { id: string; kode: string; pernyataan: string; kategori: string }
type Analysis = { risk_id: string; k_residu: number | null; d_residu: number | null }

export default function EvaluasiForm({ participantId, sessionId }: { participantId: string; sessionId: string }) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [selera, setSelera] = useState<Record<string, number>>(DEFAULT_SELERA)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: r } = await sb.from('rals_risk').select('id, kode, pernyataan, kategori')
      .eq('participant_id', participantId).order('created_at', { ascending: true })
    const rows = (r ?? []) as Risk[]
    setRisks(rows)
    if (rows.length) {
      const { data: a } = await sb.from('rals_analysis').select('risk_id, k_residu, d_residu').in('risk_id', rows.map((x) => x.id))
      const map: Record<string, Analysis> = {}
      for (const it of (a ?? []) as Analysis[]) map[it.risk_id] = it
      setAnalyses(map)
    }
    const { data: sr } = await sb.from('rals_selera_risiko').select('*').eq('session_id', sessionId).maybeSingle()
    if (sr) {
      setSelera({
        strategis: sr.strategis, kebijakan: sr.kebijakan, kecurangan: sr.kecurangan, bencana: sr.bencana,
        kepatuhan: sr.kepatuhan, operasional: sr.operasional, kemitraan: sr.kemitraan,
      })
    }
    setLoading(false)
  }, [participantId, sessionId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Memuat...</div>

  // Titik heatmap dari risiko residu yang sudah dinilai
  const analised = risks
    .map((r) => ({ risk: r, a: analyses[r.id] }))
    .filter((x) => x.a && x.a.k_residu != null && x.a.d_residu != null)

  const points: RiskPoint[] = analised.map(({ risk, a }) => ({
    id: risk.id, label: risk.kode, kemungkinan: a!.k_residu!, dampak: a!.d_residu!, pernyataan: risk.pernyataan,
  }))

  // Prioritas: besaran residu > ambang selera kategorinya
  const prioritas = analised
    .map(({ risk, a }) => {
      const besaran = getBesaran(a!.k_residu, a!.d_residu)
      const key = getKategoriKey(risk.kategori)
      const threshold = key ? selera[key] ?? null : null
      return { risk, besaran, threshold, over: besaran != null && threshold != null && besaran > threshold }
    })
    .filter((x) => x.over)
    .sort((a, b) => (b.besaran ?? 0) - (a.besaran ?? 0))

  return (
    <div className="space-y-4">
      <OrgExportButton sessionId={sessionId} stage="evaluasi" />
      {analised.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">
          Belum ada risiko yang teranalisis. Selesaikan tahap Analisis lebih dulu.
        </div>
      ) : (
        <>
          {/* Peta risiko pribadi */}
          <div className="rounded-2xl border bg-white shadow-sm p-5">
            <h3 className="font-serif font-semibold text-slate-800 mb-3">Peta Risiko Anda (Residu)</h3>
            <RiskMatrix risks={points} />
          </div>

          {/* Prioritas */}
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h3 className="text-sm font-semibold text-slate-700">Risiko Prioritas</h3>
              <span className="ml-auto text-[11px] text-slate-400">{prioritas.length} melebihi selera</span>
            </div>
            {prioritas.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-green-700 flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Tidak ada risiko yang melebihi selera risiko.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {prioritas.map(({ risk, besaran, threshold }, i) => {
                  const lvl = getLevel(besaran)
                  return (
                    <div key={risk.id} className="flex items-start gap-3 px-5 py-3">
                      <span className="text-slate-400 text-sm">{i + 1}.</span>
                      <span className="shrink-0 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">{risk.kode}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-800">{risk.pernyataan}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {risk.kategori} · nilai {besaran} melebihi selera {threshold}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold px-2 py-1 rounded-lg border"
                        style={{ color: lvl.color, borderColor: lvl.color + '55', background: lvl.color + '11' }}>{lvl.label}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
