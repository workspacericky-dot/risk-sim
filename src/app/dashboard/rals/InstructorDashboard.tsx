'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { RiskMatrix, type RiskPoint } from '@/components/RiskMatrix'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'

type Participant = { id: string; nama: string }
type Risk = { id: string; kode: string; pernyataan: string; kategori: string; participant_id: string; created_at: string }
type Analysis = { risk_id: string; k_residu: number | null; d_residu: number | null }

export default function InstructorDashboard({ sessionId }: { sessionId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const [{ data: p }, { data: r }] = await Promise.all([
      sb.from('rals_participant').select('id, nama').eq('session_id', sessionId),
      sb.from('rals_risk').select('id, kode, pernyataan, kategori, participant_id, created_at')
        .eq('session_id', sessionId).order('created_at', { ascending: false }),
    ])
    setParticipants((p ?? []) as Participant[])
    const rows = (r ?? []) as Risk[]
    setRisks(rows)
    if (rows.length) {
      const { data: a } = await sb.from('rals_analysis').select('risk_id, k_residu, d_residu').in('risk_id', rows.map((x) => x.id))
      const map: Record<string, Analysis> = {}
      for (const it of (a ?? []) as Analysis[]) map[it.risk_id] = it
      setAnalyses(map)
    } else {
      setAnalyses({})
    }
  }, [sessionId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_dash:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_risk', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_participant', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_analysis' }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000) // fallback jika realtime tak terkirim
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  const analisedRisks = risks.filter((r) => {
    const a = analyses[r.id]
    return a && a.k_residu != null && a.d_residu != null
  })

  const points: RiskPoint[] = analisedRisks.map((r) => ({
    id: r.id, label: r.kode, kemungkinan: analyses[r.id].k_residu!, dampak: analyses[r.id].d_residu!, pernyataan: r.pernyataan,
  }))

  const nama = (pid: string) => participants.find((p) => p.id === pid)?.nama ?? '—'
  const katCount = (label: string) => risks.filter((r) => r.kategori === label).length
  const maxKat = Math.max(1, ...KATEGORI_RISIKO.map((k) => katCount(k.label)))

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Statistik */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Peserta" value={participants.length} />
        <Stat label="Total Risiko" value={risks.length} />
        <Stat label="Dianalisis" value={analisedRisks.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Heatmap agregat (residu) */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Peta Risiko Kelas (Residu)</h4>
          {points.length === 0
            ? <p className="text-xs text-muted-foreground py-8 text-center">Belum ada risiko yang dianalisis.</p>
            : <RiskMatrix risks={points} />}
        </div>

        {/* Distribusi kategori */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Distribusi Kategori</h4>
          <div className="space-y-1.5">
            {KATEGORI_RISIKO.map((k) => {
              const c = katCount(k.label)
              return (
                <div key={k.key} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 w-28 shrink-0 truncate">{k.label}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded" style={{ width: `${(c / maxKat) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 w-5 text-right">{c}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Umpan risiko masuk */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-slate-50 text-sm font-semibold text-slate-700">Umpan Risiko Masuk</div>
        {risks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada risiko masuk.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {risks.slice(0, 30).map((r) => (
              <div key={r.id} className="flex items-start gap-2 px-4 py-2">
                <span className="shrink-0 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">{r.kode}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800">{r.pernyataan}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{nama(r.participant_id)}{r.kategori ? ` · ${r.kategori}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className="text-2xl font-bold font-serif text-slate-800">{value}</p>
    </div>
  )
}
