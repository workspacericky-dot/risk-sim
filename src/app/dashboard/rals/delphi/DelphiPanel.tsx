'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { DAMPAK_LABELS, KEMUNGKINAN_LABELS, getBesaran, getLevel } from '@/lib/risk-engine'
import { AGREEMENT_LABELS, type DelphiTopic, type DelphiResponse } from '@/lib/rals-delphi'

export default function DelphiPanel({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [topics, setTopics] = useState<DelphiTopic[]>([])
  const [myResponses, setMyResponses] = useState<DelphiResponse[]>([])
  const [promotedTopicIds, setPromotedTopicIds] = useState<Set<string>>(new Set())

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const { data: topicRows } = await sb.from('rals_delphi_topic').select('*')
      .eq('session_id', sessionId).order('created_at', { ascending: false })
    const t = (topicRows ?? []) as DelphiTopic[]
    setTopics(t)

    if (t.length) {
      const ids = t.map((x) => x.id)
      const [{ data: respRows }, { data: promoRows }] = await Promise.all([
        sb.from('rals_delphi_response').select('*').eq('participant_id', participantId).in('topic_id', ids),
        sb.from('rals_delphi_promotion').select('topic_id').eq('participant_id', participantId).in('topic_id', ids),
      ])
      setMyResponses((respRows ?? []) as DelphiResponse[])
      setPromotedTopicIds(new Set((promoRows ?? []).map((p) => p.topic_id)))
    } else {
      setMyResponses([]); setPromotedTopicIds(new Set())
    }
  }, [sessionId, participantId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_delphi_p:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_delphi_topic', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000)
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  async function handlePromote(topic: DelphiTopic) {
    const sb = createClient()
    const { data: risk, error } = await sb.from('rals_risk').insert({
      session_id: sessionId, participant_id: participantId,
      pernyataan: topic.rumusan_pernyataan, kategori: topic.rumusan_kategori,
      dampak_uraian: topic.rumusan_dampak, penyebab: topic.rumusan_penyebab,
    }).select('id').single()
    if (!error && risk) {
      await sb.from('rals_delphi_promotion').insert({ topic_id: topic.id, participant_id: participantId, risk_id: risk.id })
    }
    fetchAll()
  }

  if (topics.length === 0) {
    return <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Belum ada topik Delphi dari instruktur.</div>
  }

  return (
    <div className="space-y-4">
      {topics.map((t) => (
        <TopicCard key={t.id} topic={t}
          myRound1={myResponses.find((r) => r.topic_id === t.id && r.ronde === 'eksplorasi') ?? null}
          myRound2={myResponses.find((r) => r.topic_id === t.id && r.ronde === 'konvergensi') ?? null}
          promoted={promotedTopicIds.has(t.id)}
          onPromote={() => handlePromote(t)}
          onSaved={fetchAll}
          sessionId={sessionId} participantId={participantId}
        />
      ))}
    </div>
  )
}

function TopicCard({ topic, myRound1, myRound2, promoted, onPromote, onSaved, participantId }: {
  topic: DelphiTopic
  myRound1: DelphiResponse | null
  myRound2: DelphiResponse | null
  promoted: boolean
  onPromote: () => void
  onSaved: () => void
  sessionId: string
  participantId: string
}) {
  const [opini, setOpini] = useState(myRound1?.opini ?? '')
  const [konsensus, setKonsensus] = useState<number | null>(myRound2?.konsensus_skor ?? null)
  const [kemungkinan, setKemungkinan] = useState<number | null>(myRound2?.kemungkinan ?? null)
  const [severitas, setSeveritas] = useState<number | null>(myRound2?.severitas ?? null)
  const [revisi, setRevisi] = useState(myRound2?.revisi ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [promoting, setPromoting] = useState(false)

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'
  const roundeLabel = topic.ronde === 'eksplorasi' ? 'Putaran 1 · Eksplorasi' : topic.ronde === 'konvergensi' ? 'Putaran 2 · Konvergensi' : 'Konsensus Terkunci'
  const roundeColor = topic.ronde === 'eksplorasi' ? 'bg-sky-100 text-sky-700' : topic.ronde === 'konvergensi' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'

  async function saveRound1() {
    if (!opini.trim()) return
    setSaving(true)
    const sb = createClient()
    await sb.from('rals_delphi_response').upsert(
      { topic_id: topic.id, participant_id: participantId, ronde: 'eksplorasi', opini: opini.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'topic_id,participant_id,ronde' },
    )
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  async function saveRound2() {
    if (!konsensus) return
    setSaving(true)
    const sb = createClient()
    await sb.from('rals_delphi_response').upsert(
      { topic_id: topic.id, participant_id: participantId, ronde: 'konvergensi', konsensus_skor: konsensus, kemungkinan, severitas, revisi: revisi.trim(), updated_at: new Date().toISOString() },
      { onConflict: 'topic_id,participant_id,ronde' },
    )
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    onSaved()
  }

  async function handlePromoteClick() {
    setPromoting(true)
    await onPromote()
    setPromoting(false)
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
      <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${roundeColor}`}>{roundeLabel}</span>
      <p className="text-sm font-semibold text-slate-800">{topic.pertanyaan}</p>

      {topic.ronde === 'eksplorasi' && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-600">Opini Anda</label>
          <textarea value={opini} onChange={(e) => setOpini(e.target.value)} rows={5}
            placeholder="Tulis pandangan Anda secara bebas..." className={inputCls} />
          <p className="text-[11px] text-slate-400">Jawaban Anda anonim bagi peserta lain maupun fasilitator.</p>
          <button onClick={saveRound1} disabled={saving || !opini.trim()}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
            {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : myRound1 ? 'Perbarui Opini' : 'Kirim Opini'}
          </button>
        </div>
      )}

      {topic.ronde === 'konvergensi' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold">Ringkasan Fasilitator (anonim)</p>
            <p className="text-xs text-slate-700 mt-1">{topic.ringkasan_fasilitator}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Seberapa setuju Anda dengan ringkasan ini?</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setKonsensus(n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    konsensus === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{konsensus ? AGREEMENT_LABELS[konsensus] : ' '}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Estimasi Kemungkinan</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setKemungkinan(n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    kemungkinan === n ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{kemungkinan ? KEMUNGKINAN_LABELS[kemungkinan] : ' '}</p>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-600">Estimasi Dampak (severitas)</label>
            <div className="flex gap-1 mt-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} type="button" onClick={() => setSeveritas(n)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    severitas === n ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-slate-600 border-slate-200 hover:border-orange-300'
                  }`}>{n}</button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">{severitas ? DAMPAK_LABELS[severitas] : ' '}</p>
          </div>

          {kemungkinan && severitas && (() => {
            const besaran = getBesaran(kemungkinan, severitas)
            const lvl = getLevel(besaran)
            return (
              <p className="text-xs font-semibold inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border w-fit"
                style={{ color: lvl.color, borderColor: lvl.color + '55', background: lvl.color + '11' }}>
                Perkiraan besaran {besaran} · {lvl.label}
              </p>
            )
          })()}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Revisi Pandangan <span className="text-slate-400 font-normal">(opsional)</span></label>
            <textarea value={revisi} onChange={(e) => setRevisi(e.target.value)} rows={2}
              placeholder="Catatan tambahan jika ingin merevisi pandangan..." className={inputCls} />
          </div>

          <button onClick={saveRound2} disabled={saving || !konsensus}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
            {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : myRound2 ? 'Perbarui Jawaban' : 'Kirim Jawaban'}
          </button>
        </div>
      )}

      {topic.ronde === 'selesai' && (
        <div className="space-y-2">
          <div className="rounded-lg bg-green-50 border border-green-100 p-3 space-y-1">
            <p className="text-xs text-slate-700"><span className="font-semibold">Sebab:</span> {topic.rumusan_penyebab}</p>
            <p className="text-xs text-slate-700"><span className="font-semibold">Kejadian:</span> {topic.rumusan_pernyataan}</p>
            <p className="text-xs text-slate-700"><span className="font-semibold">Dampak:</span> {topic.rumusan_dampak}</p>
            <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{topic.rumusan_kategori}</span>
          </div>
          {promoted ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="w-3.5 h-3.5" /> Sudah di register Anda</span>
          ) : (
            <button onClick={handlePromoteClick} disabled={promoting}
              className="px-4 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors">
              {promoting ? 'Menambahkan...' : 'Tambahkan ke Register Saya'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
