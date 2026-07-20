'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowUp, Check, Send, Sparkles, Trash2, Wand2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'
import { PROSES_BISNIS } from '@/lib/rals-probis'
import type { BrainstormDraft, BrainstormIdea, BrainstormVote } from '@/lib/rals-brainstorm'

type Phase = 'dump' | 'refine'

export default function BrainstormBoard({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [phase, setPhase] = useState<Phase>('dump')
  const [ideas, setIdeas] = useState<BrainstormIdea[]>([])
  const [votes, setVotes] = useState<BrainstormVote[]>([])
  const [drafts, setDrafts] = useState<BrainstormDraft[]>([])
  const [ideaText, setIdeaText] = useState('')
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [posting, setPosting] = useState(false)
  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
  const [selectedIdea, setSelectedIdea] = useState<BrainstormIdea | null>(null)
  const [pernyataan, setPernyataan] = useState('')
  const [kategori, setKategori] = useState('')
  const [penyebab, setPenyebab] = useState('')
  const [dampak, setDampak] = useState('')
  const [savingDraft, setSavingDraft] = useState(false)
  const [promotingId, setPromotingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const { data: ideaRows } = await sb.from('rals_brainstorm_idea').select('*')
      .eq('session_id', sessionId).order('created_at', { ascending: true })
    const rows = (ideaRows ?? []) as BrainstormIdea[]
    setIdeas(rows)

    if (rows.length) {
      const { data: voteRows } = await sb.from('rals_brainstorm_vote').select('*')
        .in('idea_id', rows.map((r) => r.id))
      setVotes((voteRows ?? []) as BrainstormVote[])
    } else {
      setVotes([])
    }

    const { data: draftRows } = await sb.from('rals_brainstorm_draft').select('*')
      .eq('participant_id', participantId).order('created_at', { ascending: false })
    setDrafts((draftRows ?? []) as BrainstormDraft[])
  }, [sessionId, participantId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_brainstorm:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_brainstorm_idea', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_brainstorm_vote' }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000)
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!ideaText.trim() || !l1 || !l2) return
    setPosting(true)
    const sb = createClient()
    await sb.from('rals_brainstorm_idea').insert({
      session_id: sessionId, participant_id: participantId, teks: ideaText.trim(),
      l1_kode: l1.kode, l1_nama: l1.nama, l2_kode: l2.kode, l2_nama: l2.nama,
    })
    setPosting(false)
    setIdeaText('')
    fetchAll()
  }

  function voteCount(ideaId: string) {
    return votes.filter((v) => v.idea_id === ideaId).length
  }
  function myVote(ideaId: string) {
    return votes.find((v) => v.idea_id === ideaId && v.participant_id === participantId) ?? null
  }
  async function toggleVote(ideaId: string) {
    const sb = createClient()
    const existing = myVote(ideaId)
    if (existing) await sb.from('rals_brainstorm_vote').delete().eq('id', existing.id)
    else await sb.from('rals_brainstorm_vote').insert({ idea_id: ideaId, participant_id: participantId })
    fetchAll()
  }

  const sortedIdeas = [...ideas].sort((a, b) => voteCount(b.id) - voteCount(a.id) || (a.created_at < b.created_at ? 1 : -1))

  async function handleDeleteIdea(ideaId: string) {
    const sb = createClient()
    await sb.from('rals_brainstorm_idea').delete().eq('id', ideaId)
    if (selectedIdea?.id === ideaId) setSelectedIdea(null)
    fetchAll()
  }

  function selectIdea(idea: BrainstormIdea) {
    setSelectedIdea(idea)
    setPernyataan(idea.teks)
    setKategori(''); setPenyebab(''); setDampak(''); setError(null)
  }

  function onDropZone(e: React.DragEvent) {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    const idea = ideas.find((i) => i.id === id)
    if (idea) selectIdea(idea)
  }

  async function handleSaveDraft(e: React.FormEvent) {
    e.preventDefault()
    if (!pernyataan.trim()) { setError('Pernyataan risiko wajib diisi.'); return }
    if (!kategori) { setError('Pilih satu kategori risiko.'); return }
    setSavingDraft(true); setError(null)
    const sb = createClient()
    const { error: insErr } = await sb.from('rals_brainstorm_draft').insert({
      session_id: sessionId, participant_id: participantId, idea_id: selectedIdea?.id ?? null,
      pernyataan: pernyataan.trim(), kategori, penyebab: penyebab.trim(), dampak: dampak.trim(),
    })
    setSavingDraft(false)
    if (insErr) { setError(insErr.message); return }
    setSelectedIdea(null); setPernyataan(''); setKategori(''); setPenyebab(''); setDampak('')
    fetchAll()
  }

  async function handlePromote(draft: BrainstormDraft) {
    setPromotingId(draft.id)
    const sb = createClient()
    // Kode risiko dihasilkan trigger DB, berurutan per sesi (perspektif organisasi).
    const { data: risk, error: insErr } = await sb.from('rals_risk').insert({
      session_id: sessionId, participant_id: participantId,
      pernyataan: draft.pernyataan, kategori: draft.kategori, dampak_uraian: draft.dampak, penyebab: draft.penyebab,
    }).select('id').single()
    if (!insErr && risk) {
      await sb.from('rals_brainstorm_draft').update({ promoted_risk_id: risk.id }).eq('id', draft.id)
    }
    setPromotingId(null)
    fetchAll()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="space-y-4">
      {/* Tab fase */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100">
        {([
          { key: 'dump' as Phase, label: '1. Brain Dump' },
          { key: 'refine' as Phase, label: '2. Refinery' },
        ]).map((t) => (
          <button key={t.key} onClick={() => setPhase(t.key)}
            className={`py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
              phase === t.key ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {phase === 'dump' ? (
        <div className="space-y-4">
          <form onSubmit={handlePost} className="rounded-2xl border bg-white shadow-sm p-4 space-y-3">
            <p className="text-sm font-medium text-slate-700">Apa yang mengganggu pikiran Anda di pekerjaan anda akhir-akhir ini?</p>

            <div className="grid sm:grid-cols-2 gap-2">
              <select value={l1Kode} onChange={(e) => { setL1Kode(e.target.value); setL2Idx('') }}
                className={inputCls + ' bg-white text-xs'}>
                {PROSES_BISNIS.map((p) => <option key={p.kode} value={p.kode}>{p.kode} — {p.nama}</option>)}
              </select>
              <select value={l2Idx} onChange={(e) => setL2Idx(e.target.value)} className={inputCls + ' bg-white text-xs'}>
                <option value="" disabled>Pilih subproses untuk hashtag...</option>
                {currentL1?.sub.map((s, i) => <option key={i} value={i}>{s.kode} — {s.nama}</option>)}
              </select>
            </div>

            <div className="flex gap-2">
              <input value={ideaText} onChange={(e) => setIdeaText(e.target.value)} maxLength={200}
                placeholder="Ketik ide singkat lalu kirim..." className={inputCls} />
              <button type="submit" disabled={posting || !ideaText.trim() || l2Idx === ''}
                className="shrink-0 px-4 rounded-lg bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400">Papan ini anonim (@anonim) — nama Anda tidak ditampilkan. Setiap ide diberi hashtag subproses agar konteksnya tetap jelas. Tulis bebas, tanpa takut dihakimi.</p>
          </form>

          <div className="grid sm:grid-cols-2 gap-3">
            {sortedIdeas.length === 0 ? (
              <p className="sm:col-span-2 text-center text-sm text-muted-foreground py-8">Belum ada ide. Jadilah yang pertama menulis.</p>
            ) : sortedIdeas.map((idea) => {
              const voted = !!myVote(idea.id)
              return (
                <div key={idea.id} className="rounded-2xl border bg-white shadow-sm p-4 flex items-start gap-3">
                  <button onClick={() => toggleVote(idea.id)}
                    className={`shrink-0 flex flex-col items-center justify-center w-11 h-11 rounded-xl border transition-colors ${
                      voted ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300'
                    }`}>
                    <ArrowUp className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">{voteCount(idea.id)}</span>
                  </button>
                  <div className="pt-1 flex-1 min-w-0">
                    {idea.l2_nama && (
                      <p className="text-[11px] font-semibold text-indigo-600">#{idea.l2_nama.replace(/\s+/g, '')}</p>
                    )}
                    <p className="text-sm text-slate-800 leading-snug mt-0.5">{idea.teks}</p>
                    <p className="text-[11px] text-slate-400 mt-1.5">— @anonim</p>
                  </div>
                  {idea.participant_id === participantId && (
                    <button onClick={() => handleDeleteIdea(idea.id)} title="Hapus ide ini"
                      className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {!selectedIdea ? (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDropZone}
              className="rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 p-6 text-center space-y-3"
            >
              <Wand2 className="w-6 h-6 text-indigo-400 mx-auto" />
              <p className="text-sm text-slate-600">Seret salah satu ide ke sini, atau klik <span className="font-semibold">Pilih</span> pada kartu di bawah untuk mulai menyusunnya jadi risiko.</p>
            </div>
          ) : (
            <form onSubmit={handleSaveDraft} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" /> Susun Menjadi Risiko
                </h3>
                <button type="button" onClick={() => setSelectedIdea(null)} className="text-xs text-slate-400 hover:text-slate-600">Batal</button>
              </div>

              {selectedIdea.l2_nama && (
                <p className="text-[11px] font-semibold text-indigo-600">#{selectedIdea.l2_nama.replace(/\s+/g, '')} · dari @anonim</p>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Pernyataan Risiko</label>
                <textarea value={pernyataan} onChange={(e) => setPernyataan(e.target.value)} rows={2} className={inputCls} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Gara-gara... <span className="text-slate-400 font-normal">(penyebab)</span></label>
                  <textarea value={penyebab} onChange={(e) => setPenyebab(e.target.value)} rows={2}
                    placeholder="Akar penyebabnya apa?" className={inputCls} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-600">Maka berakibat... <span className="text-slate-400 font-normal">(dampak)</span></label>
                  <textarea value={dampak} onChange={(e) => setDampak(e.target.value)} rows={2}
                    placeholder="Apa yang terdampak?" className={inputCls} />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Kategori Risiko</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {KATEGORI_RISIKO.map((k) => (
                    <button type="button" key={k.key} onClick={() => setKategori(k.label)} title={k.hint}
                      className={`text-left rounded-xl border p-2 transition-all ${
                        kategori === k.label ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300'
                      }`}>
                      <span className="block text-xs font-semibold text-slate-800">{k.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
              <button type="submit" disabled={savingDraft}
                className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                {savingDraft ? 'Menyimpan...' : 'Simpan sebagai Draf'}
              </button>
            </form>
          )}

          {/* Papan ide (drag/pilih) */}
          <div className="grid sm:grid-cols-2 gap-3">
            {sortedIdeas.map((idea) => (
              <div key={idea.id} draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', idea.id)}
                className="rounded-2xl border bg-white shadow-sm p-4 flex items-start justify-between gap-3 cursor-grab active:cursor-grabbing">
                <div className="flex-1 min-w-0">
                  {idea.l2_nama && (
                    <p className="text-[11px] font-semibold text-indigo-600">#{idea.l2_nama.replace(/\s+/g, '')}</p>
                  )}
                  <p className="text-sm text-slate-800 leading-snug mt-0.5">{idea.teks}</p>
                  <p className="text-[11px] text-slate-400 mt-1.5">— @anonim</p>
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  <button type="button" onClick={() => selectIdea(idea)}
                    className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-semibold hover:bg-indigo-100 transition-colors">
                    Pilih
                  </button>
                  {idea.participant_id === participantId && (
                    <button onClick={() => handleDeleteIdea(idea.id)} title="Hapus ide ini"
                      className="text-slate-300 hover:text-red-500 transition-colors p-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Draf saya */}
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700">Draf Saya</h3>
              <span className="text-[11px] text-slate-400">{drafts.length} draf</span>
            </div>
            {drafts.length === 0 ? (
              <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada draf. Susun ide di atas menjadi risiko dulu.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {drafts.map((d) => (
                  <div key={d.id} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{d.pernyataan}</p>
                      {d.kategori && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{d.kategori}</span>}
                    </div>
                    {d.promoted_risk_id ? (
                      <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                        <Check className="w-3.5 h-3.5" /> Di register
                      </span>
                    ) : (
                      <button onClick={() => handlePromote(d)} disabled={promotingId === d.id}
                        className="shrink-0 px-3 py-1.5 rounded-lg bg-green-700 text-white text-[11px] font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors">
                        {promotingId === d.id ? 'Menambahkan...' : 'Tambahkan ke Register Saya'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
