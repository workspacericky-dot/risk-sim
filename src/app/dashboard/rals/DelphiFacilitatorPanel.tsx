'use client'

import { useCallback, useEffect, useState } from 'react'
import { Lock, Plus, Trash2, Users } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { KATEGORI_RISIKO, DAMPAK_LABELS } from '@/lib/risk-engine'
import { AGREEMENT_LABELS, type DelphiTopic, type DelphiResponse } from '@/lib/rals-delphi'

export default function DelphiFacilitatorPanel({ sessionId }: { sessionId: string }) {
  const [topics, setTopics] = useState<DelphiTopic[]>([])
  const [responses, setResponses] = useState<DelphiResponse[]>([])
  const [promoCounts, setPromoCounts] = useState<Record<string, number>>({})
  const [pertanyaan, setPertanyaan] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const { data: topicRows } = await sb.from('rals_delphi_topic').select('*')
      .eq('session_id', sessionId).order('created_at', { ascending: false })
    const t = (topicRows ?? []) as DelphiTopic[]
    setTopics(t)

    if (t.length) {
      const ids = t.map((x) => x.id)
      const [{ data: respRows }, { data: promoRows }] = await Promise.all([
        sb.from('rals_delphi_response').select('*').in('topic_id', ids),
        sb.from('rals_delphi_promotion').select('topic_id').in('topic_id', ids),
      ])
      setResponses((respRows ?? []) as DelphiResponse[])
      const counts: Record<string, number> = {}
      for (const p of promoRows ?? []) counts[p.topic_id] = (counts[p.topic_id] ?? 0) + 1
      setPromoCounts(counts)
    } else {
      setResponses([]); setPromoCounts({})
    }
  }, [sessionId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_delphi_fac:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_delphi_topic', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_delphi_response' }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000)
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  async function handleCreateTopic(e: React.FormEvent) {
    e.preventDefault()
    if (!pertanyaan.trim()) return
    setCreating(true)
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    await sb.from('rals_delphi_topic').insert({ session_id: sessionId, pertanyaan: pertanyaan.trim(), created_by: user?.id ?? null })
    setCreating(false)
    setPertanyaan('')
    fetchAll()
  }

  async function handleDeleteTopic(id: string) {
    if (!confirm('Hapus topik Delphi ini beserta seluruh respons pakar? Tindakan ini tidak dapat dibatalkan.')) return
    const sb = createClient()
    await sb.from('rals_delphi_topic').delete().eq('id', id)
    fetchAll()
  }

  async function handleOpenRound2(topicId: string, ringkasan: string) {
    const sb = createClient()
    await sb.from('rals_delphi_topic').update({ ronde: 'konvergensi', ringkasan_fasilitator: ringkasan }).eq('id', topicId)
    fetchAll()
  }

  async function handleLockConsensus(topicId: string, payload: { penyebab: string; pernyataan: string; dampak: string; kategori: string }) {
    const sb = createClient()
    await sb.from('rals_delphi_topic').update({
      ronde: 'selesai', rumusan_penyebab: payload.penyebab, rumusan_pernyataan: payload.pernyataan,
      rumusan_dampak: payload.dampak, rumusan_kategori: payload.kategori,
    }).eq('id', topicId)
    fetchAll()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <form onSubmit={handleCreateTopic} className="rounded-xl border bg-white p-4 space-y-2">
        <label className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-indigo-500" /> Buat Topik Panel Delphi Baru
        </label>
        <div className="flex gap-2">
          <input value={pertanyaan} onChange={(e) => setPertanyaan(e.target.value)}
            placeholder="Skenario/pertanyaan strategis untuk panel pakar..." className={inputCls} />
          <button type="submit" disabled={creating || !pertanyaan.trim()}
            className="shrink-0 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold disabled:opacity-50 hover:bg-indigo-700 transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </form>

      {topics.length === 0 ? (
        <p className="text-center text-xs text-muted-foreground py-6">Belum ada topik Delphi.</p>
      ) : topics.map((t) => (
        <DelphiTopicCard key={t.id} topic={t}
          responses={responses.filter((r) => r.topic_id === t.id)}
          promoCount={promoCounts[t.id] ?? 0}
          onDelete={() => handleDeleteTopic(t.id)}
          onOpenRound2={(ringkasan) => handleOpenRound2(t.id, ringkasan)}
          onLockConsensus={(payload) => handleLockConsensus(t.id, payload)}
        />
      ))}
    </div>
  )
}

function DelphiTopicCard({ topic, responses, promoCount, onDelete, onOpenRound2, onLockConsensus }: {
  topic: DelphiTopic
  responses: DelphiResponse[]
  promoCount: number
  onDelete: () => void
  onOpenRound2: (ringkasan: string) => void
  onLockConsensus: (payload: { penyebab: string; pernyataan: string; dampak: string; kategori: string }) => void
}) {
  const round1 = responses.filter((r) => r.ronde === 'eksplorasi')
  const round2 = responses.filter((r) => r.ronde === 'konvergensi')
  const [ringkasan, setRingkasan] = useState(topic.ringkasan_fasilitator)
  const [penyebab, setPenyebab] = useState(topic.rumusan_penyebab)
  const [pernyataan, setPernyataan] = useState(topic.rumusan_pernyataan)
  const [dampak, setDampak] = useState(topic.rumusan_dampak)
  const [kategori, setKategori] = useState(topic.rumusan_kategori)

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'
  const roundeLabel = topic.ronde === 'eksplorasi' ? 'Putaran 1 · Eksplorasi' : topic.ronde === 'konvergensi' ? 'Putaran 2 · Konvergensi' : 'Konsensus Terkunci'
  const roundeColor = topic.ronde === 'eksplorasi' ? 'bg-sky-100 text-sky-700' : topic.ronde === 'konvergensi' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'

  const avgKonsensus = round2.length ? (round2.reduce((s, r) => s + (r.konsensus_skor ?? 0), 0) / round2.length) : null
  const avgSeveritas = round2.length ? Math.round(round2.reduce((s, r) => s + (r.severitas ?? 0), 0) / round2.length) : null

  return (
    <div className="rounded-xl border bg-white p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className={`inline-block text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${roundeColor}`}>{roundeLabel}</span>
          <p className="text-sm font-semibold text-slate-800 mt-1">{topic.pertanyaan}</p>
        </div>
        <button onClick={onDelete} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
      </div>

      {topic.ronde === 'eksplorasi' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-slate-50 border p-3 max-h-40 overflow-y-auto space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Opini Masuk ({round1.length}, anonim)</p>
            {round1.length === 0
              ? <p className="text-xs text-muted-foreground">Belum ada opini masuk.</p>
              : round1.map((r) => <p key={r.id} className="text-xs text-slate-700 border-l-2 border-indigo-200 pl-2">{r.opini}</p>)}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Ringkasan Putaran 2 (sintesis opini di atas)</label>
            <textarea value={ringkasan} onChange={(e) => setRingkasan(e.target.value)} rows={3}
              placeholder="Rangkum benang merah opini pakar, hilangkan duplikasi, standarkan bahasa..." className={inputCls} />
          </div>
          <button onClick={() => onOpenRound2(ringkasan)} disabled={!ringkasan.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            Buka Putaran 2 (Konvergensi)
          </button>
        </div>
      )}

      {topic.ronde === 'konvergensi' && (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-3">
            <p className="text-[10px] uppercase tracking-widest text-amber-500 font-semibold">Ringkasan yang Dilihat Pakar</p>
            <p className="text-xs text-slate-700 mt-1">{topic.ringkasan_fasilitator}</p>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">
              Visualisasi Konsensus ({round2.length} respons{avgKonsensus ? ` · rata-rata ${avgKonsensus.toFixed(1)}` : ''})
            </p>
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map((score) => {
                const c = round2.filter((r) => r.konsensus_skor === score).length
                const pct = round2.length ? (c / round2.length) * 100 : 0
                return (
                  <div key={score} className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 w-28 shrink-0 truncate">{AGREEMENT_LABELS[score]}</span>
                    <div className="flex-1 h-3.5 bg-slate-100 rounded overflow-hidden">
                      <div className="h-full bg-indigo-400 rounded" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 w-5 text-right">{c}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {round2.some((r) => r.revisi.trim()) && (
            <div className="rounded-lg bg-slate-50 border p-3 max-h-32 overflow-y-auto space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Catatan Revisi (anonim)</p>
              {round2.filter((r) => r.revisi.trim()).map((r) => <p key={r.id} className="text-xs text-slate-700 border-l-2 border-amber-200 pl-2">{r.revisi}</p>)}
            </div>
          )}

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Rumusan Konsensus Final (Sebab → Kejadian → Dampak)</p>
            <input value={penyebab} onChange={(e) => setPenyebab(e.target.value)} placeholder="Sebab" className={inputCls} />
            <input value={pernyataan} onChange={(e) => setPernyataan(e.target.value)} placeholder="Kejadian (pernyataan risiko)" className={inputCls} />
            <input value={dampak} onChange={(e) => setDampak(e.target.value)} placeholder="Dampak" className={inputCls} />
            {avgSeveritas && <p className="text-[11px] text-slate-400">Rata-rata estimasi severitas pakar: {avgSeveritas} — {DAMPAK_LABELS[avgSeveritas]}</p>}
            <div className="grid grid-cols-3 gap-1.5">
              {KATEGORI_RISIKO.map((k) => (
                <button type="button" key={k.key} onClick={() => setKategori(k.label)}
                  className={`text-left rounded-lg border px-2 py-1.5 text-[11px] font-semibold transition-all ${
                    kategori === k.label ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-indigo-300'
                  }`}>{k.label}</button>
              ))}
            </div>
            <button onClick={() => onLockConsensus({ penyebab, pernyataan, dampak, kategori })}
              disabled={!penyebab.trim() || !pernyataan.trim() || !kategori}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-green-700 text-white text-xs font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
              <Lock className="w-3.5 h-3.5" /> Kunci Konsensus Akhir
            </button>
          </div>
        </div>
      )}

      {topic.ronde === 'selesai' && (
        <div className="rounded-lg bg-green-50 border border-green-100 p-3 space-y-1">
          <p className="text-xs text-slate-700"><span className="font-semibold">Sebab:</span> {topic.rumusan_penyebab}</p>
          <p className="text-xs text-slate-700"><span className="font-semibold">Kejadian:</span> {topic.rumusan_pernyataan}</p>
          <p className="text-xs text-slate-700"><span className="font-semibold">Dampak:</span> {topic.rumusan_dampak}</p>
          <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{topic.rumusan_kategori}</span>
          <p className="text-[11px] text-slate-400 pt-1">{promoCount} peserta telah menambahkan konsensus ini ke register mereka.</p>
        </div>
      )}
    </div>
  )
}
