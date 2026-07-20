'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, ChevronRight, Eye, EyeOff, Mic, Plus, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'
import { PROSES_BISNIS } from '@/lib/rals-probis'
import { STANDARD_QUESTIONS, DAMPAK_OPTIONS, type InterviewSession, type InterviewDraft } from '@/lib/rals-interview'

type QState = {
  jawaban: string
  pernyataan: string
  kategori: string
  whys: string[]
  dampak: string[]
  adaKontrol: boolean | null
  catatanKontrol: string
  draftId: string | null
}

const BLANK_Q: QState = { jawaban: '', pernyataan: '', kategori: '', whys: [''], dampak: [], adaKontrol: null, catatanKontrol: '', draftId: null }

export default function InterviewFlow({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [interview, setInterview] = useState<InterviewSession | null>(null)
  const [narasumberNama, setNarasumberNama] = useState('')
  const [narasumberJabatan, setNarasumberJabatan] = useState('')
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [starting, setStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const [qIndex, setQIndex] = useState(0)
  const [qStates, setQStates] = useState<QState[]>(STANDARD_QUESTIONS.map(() => ({ ...BLANK_Q, whys: [''], dampak: [] })))
  const [showAnalyst, setShowAnalyst] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [drafts, setDrafts] = useState<InterviewDraft[]>([])
  const [promotingId, setPromotingId] = useState<string | null>(null)

  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)

  const fetchDrafts = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('rals_interview_draft').select('*')
      .eq('participant_id', participantId).order('created_at', { ascending: false })
    setDrafts((data ?? []) as InterviewDraft[])
  }, [participantId])

  useEffect(() => { fetchDrafts() }, [fetchDrafts])

  async function handleStartInterview(e: React.FormEvent) {
    e.preventDefault()
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!narasumberNama.trim() || !l1 || !l2) { setSetupError('Nama narasumber dan fokus wawancara wajib diisi.'); return }
    setStarting(true); setSetupError(null)
    const sb = createClient()
    const { data, error } = await sb.from('rals_interview_session').insert({
      session_id: sessionId, participant_id: participantId,
      narasumber_nama: narasumberNama.trim(), narasumber_jabatan: narasumberJabatan.trim(),
      l1_kode: l1.kode, l1_nama: l1.nama, l2_kode: l2.kode, l2_nama: l2.nama,
    }).select('*').single()
    setStarting(false)
    if (error || !data) { setSetupError(error?.message ?? 'Gagal memulai wawancara.'); return }
    setInterview(data as InterviewSession)
    setQIndex(0)
    setQStates(STANDARD_QUESTIONS.map(() => ({ ...BLANK_Q, whys: [''], dampak: [] })))
  }

  function handleNewInterview() {
    setInterview(null)
    setNarasumberNama(''); setNarasumberJabatan(''); setL2Idx('')
  }

  function patchQ(patch: Partial<QState>) {
    setQStates((prev) => prev.map((q, i) => (i === qIndex ? { ...q, ...patch } : q)))
  }

  const q = qStates[qIndex]

  function addWhy() {
    if (q.whys[q.whys.length - 1]?.trim() === '') return
    patchQ({ whys: [...q.whys, ''] })
  }
  function updateWhy(i: number, value: string) {
    patchQ({ whys: q.whys.map((w, wi) => (wi === i ? value : w)) })
  }
  function removeWhy(i: number) {
    patchQ({ whys: q.whys.length > 1 ? q.whys.filter((_, wi) => wi !== i) : [''] })
  }
  function toggleDampak(opt: string) {
    patchQ({ dampak: q.dampak.includes(opt) ? q.dampak.filter((d) => d !== opt) : [...q.dampak, opt] })
  }

  async function handleSaveQuestion() {
    if (!interview) return
    if (!q.pernyataan.trim()) { setSaveError('Uraian risiko wajib diisi.'); return }
    if (!q.kategori) { setSaveError('Pilih satu kategori risiko.'); return }
    setSaving(true); setSaveError(null)
    const sb = createClient()
    const payload = {
      interview_id: interview.id, session_id: sessionId, participant_id: participantId,
      pertanyaan: STANDARD_QUESTIONS[qIndex].pertanyaan, jawaban_narasumber: q.jawaban.trim(),
      pernyataan: q.pernyataan.trim(), kategori: q.kategori,
      penyebab: q.whys.map((w) => w.trim()).filter(Boolean).join(' → '),
      dampak: q.dampak.join('; '), ada_kontrol: q.adaKontrol, catatan_kontrol: q.catatanKontrol.trim(),
    }
    const result = q.draftId
      ? await sb.from('rals_interview_draft').update(payload).eq('id', q.draftId).select('id').single()
      : await sb.from('rals_interview_draft').insert(payload).select('id').single()
    setSaving(false)
    if (result.error) { setSaveError(result.error.message); return }
    patchQ({ draftId: result.data.id })
    fetchDrafts()
    if (qIndex < STANDARD_QUESTIONS.length - 1) setQIndex(qIndex + 1)
  }

  async function handlePromote(draft: InterviewDraft) {
    setPromotingId(draft.id)
    const sb = createClient()
    // Kode risiko dihasilkan trigger DB, berurutan per sesi (perspektif organisasi).
    const { data: risk, error } = await sb.from('rals_risk').insert({
      session_id: sessionId, participant_id: participantId,
      pernyataan: draft.pernyataan, kategori: draft.kategori, dampak_uraian: draft.dampak, penyebab: draft.penyebab,
    }).select('id').single()
    if (!error && risk) {
      await sb.from('rals_interview_draft').update({ promoted_risk_id: risk.id }).eq('id', draft.id)
    }
    setPromotingId(null)
    fetchDrafts()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  // ── Belum ada wawancara aktif: Pre-Session setup ──────────────────────────
  if (!interview) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleStartInterview} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-500" /> Mulai Wawancara Baru
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Nama Narasumber</label>
              <input value={narasumberNama} onChange={(e) => setNarasumberNama(e.target.value)}
                placeholder="Nama narasumber" className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Jabatan <span className="text-slate-400 font-normal">(opsional)</span></label>
              <input value={narasumberJabatan} onChange={(e) => setNarasumberJabatan(e.target.value)}
                placeholder="mis. Panitera Muda Perkara" className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Fokus Wawancara — Proses Bisnis <span className="text-slate-400 font-normal">(L1)</span></label>
              <select value={l1Kode} onChange={(e) => { setL1Kode(e.target.value); setL2Idx('') }} className={inputCls + ' bg-white'}>
                {PROSES_BISNIS.map((p) => <option key={p.kode} value={p.kode}>{p.kode} — {p.nama}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Subproses Bisnis <span className="text-slate-400 font-normal">(L2)</span></label>
              <select value={l2Idx} onChange={(e) => setL2Idx(e.target.value)} className={inputCls + ' bg-white'}>
                <option value="" disabled>Pilih subproses...</option>
                {currentL1?.sub.map((s, i) => <option key={i} value={i}>{s.kode} — {s.nama}</option>)}
              </select>
            </div>
          </div>
          {setupError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{setupError}</p>}
          <button type="submit" disabled={starting}
            className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {starting ? 'Memulai...' : 'Mulai Wawancara'}
          </button>
        </form>

        <DraftList drafts={drafts} promotingId={promotingId} onPromote={handlePromote} />
      </div>
    )
  }

  // ── Wawancara aktif: stepper dual-pane ────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Info wawancara */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-indigo-600">#{interview.l2_nama.replace(/\s+/g, '')}</p>
          <p className="text-sm font-semibold text-slate-800">{interview.narasumber_nama}{interview.narasumber_jabatan && ` — ${interview.narasumber_jabatan}`}</p>
          <p className="text-xs text-slate-500 mt-0.5">{interview.l1_nama} › {interview.l2_kode} {interview.l2_nama}</p>
        </div>
        <button onClick={handleNewInterview} className="shrink-0 text-xs text-slate-400 hover:text-slate-600 underline">Wawancara Baru</button>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1.5">
        {STANDARD_QUESTIONS.map((sq, i) => (
          <button key={sq.key} onClick={() => setQIndex(i)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              qIndex === i ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
            }`}>
            {qStates[i].draftId && <Check className="w-3 h-3" />} Pertanyaan {i + 1}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 text-center">Pertanyaan {qIndex + 1} dari {STANDARD_QUESTIONS.length}</p>

      {/* Dual pane */}
      <div className="grid sm:grid-cols-2 gap-4">
        {/* Pane kiri — Listener */}
        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Pertanyaan Baku</p>
          <p className="text-sm font-semibold text-slate-800">{STANDARD_QUESTIONS[qIndex].pertanyaan}</p>
          <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            💡 Panduan: {STANDARD_QUESTIONS[qIndex].panduan}
          </p>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Jawaban Narasumber (fakta lapangan)</label>
            <textarea value={q.jawaban} onChange={(e) => patchQ({ jawaban: e.target.value })} rows={8}
              placeholder="Ketik cepat apa yang disampaikan narasumber..." className={inputCls} />
          </div>
        </div>

        {/* Pane kanan — Analyst (collapsible) */}
        <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
          <button onClick={() => setShowAnalyst((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 border-b bg-slate-50 text-xs font-semibold text-slate-600">
            <span>Analisis Risiko</span>
            {showAnalyst ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          </button>
          {showAnalyst && (
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Uraian Risiko</label>
                <textarea value={q.pernyataan} onChange={(e) => patchQ({ pernyataan: e.target.value })} rows={2}
                  placeholder="Rumuskan risikonya dari jawaban narasumber..." className={inputCls} />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Kategori Risiko</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {KATEGORI_RISIKO.map((k) => (
                    <button type="button" key={k.key} onClick={() => patchQ({ kategori: k.label })} title={k.hint}
                      className={`text-left rounded-lg border px-2 py-1.5 transition-all ${
                        q.kategori === k.label ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300'
                      }`}>
                      <span className="block text-[11px] font-semibold text-slate-800">{k.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 5 Whys */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Akar Penyebab — 5 Whys</label>
                <div className="space-y-1.5">
                  {q.whys.map((w, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="shrink-0 text-[10px] font-bold text-slate-400 w-14">Why {i + 1}?</span>
                      <input value={w} onChange={(e) => updateWhy(i, e.target.value)}
                        placeholder={i === 0 ? 'Mengapa masalah ini terjadi?' : 'Mengapa itu terjadi?'}
                        className={inputCls + ' text-xs py-1.5'} />
                      {q.whys.length > 1 && (
                        <button type="button" onClick={() => removeWhy(i)} className="shrink-0 text-slate-300 hover:text-red-500 p-1">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addWhy}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">
                  <Plus className="w-3 h-3" /> Gali Lebih Dalam (Why)
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Potensi Dampak</label>
                <div className="space-y-1">
                  {DAMPAK_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-start gap-2 text-xs text-slate-700 cursor-pointer">
                      <input type="checkbox" checked={q.dampak.includes(opt)} onChange={() => toggleDampak(opt)}
                        className="mt-0.5" />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Status Kontrol</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
                  <button type="button" onClick={() => patchQ({ adaKontrol: true })}
                    className={`px-3 py-1 ${q.adaKontrol === true ? 'bg-green-600 text-white' : 'bg-white text-slate-500'}`}>Ada</button>
                  <button type="button" onClick={() => patchQ({ adaKontrol: false })}
                    className={`px-3 py-1 ${q.adaKontrol === false ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>Tidak Ada</button>
                </div>
                <input value={q.catatanKontrol} onChange={(e) => patchQ({ catatanKontrol: e.target.value })}
                  placeholder="Catatan singkat (opsional)" className={inputCls + ' text-xs'} />
              </div>

              {saveError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>}
              <button onClick={handleSaveQuestion} disabled={saving}
                className="w-full px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center justify-center gap-2">
                {q.draftId ? <Check className="w-4 h-4" /> : null}
                {saving ? 'Menyimpan...' : q.draftId ? 'Diperbarui — Simpan Lagi' : 'Simpan sebagai Draf'}
                {qIndex < STANDARD_QUESTIONS.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          )}
        </div>
      </div>

      <DraftList drafts={drafts} promotingId={promotingId} onPromote={handlePromote} />
    </div>
  )
}

function DraftList({ drafts, promotingId, onPromote }: {
  drafts: InterviewDraft[]; promotingId: string | null; onPromote: (d: InterviewDraft) => void
}) {
  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Draf Saya</h3>
        <span className="text-[11px] text-slate-400">{drafts.length} draf</span>
      </div>
      {drafts.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada draf. Simpan hasil analisis wawancara di atas dulu.</p>
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
                <button onClick={() => onPromote(d)} disabled={promotingId === d.id}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-green-700 text-white text-[11px] font-semibold hover:bg-green-800 disabled:opacity-60 transition-colors">
                  {promotingId === d.id ? 'Menambahkan...' : 'Tambahkan ke Register Saya'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
