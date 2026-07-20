'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, Check, Dices, Plus, Trash2, Waypoints, X } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'
import { PROSES_BISNIS } from '@/lib/rals-probis'
import {
  SWIFT_MAX_NODES, SWIFT_GUIDEWORDS, SWIFT_PRIORITIES, isHighPriority,
  type SwiftSession, type SwiftNode, type SwiftScenario, type SwiftPriority,
} from '@/lib/rals-swift'

export default function SwiftFlow({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [swiftSession, setSwiftSession] = useState<SwiftSession | null>(null)
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [starting, setStarting] = useState(false)
  const [setupError, setSetupError] = useState<string | null>(null)

  const [nodes, setNodes] = useState<SwiftNode[]>([])
  const [newStep, setNewStep] = useState('')
  const [showMapper, setShowMapper] = useState(true)

  const [scenarios, setScenarios] = useState<SwiftScenario[]>([])

  const [selectedNodeId, setSelectedNodeId] = useState('')
  const [generatedPrompt, setGeneratedPrompt] = useState('')
  const [whatIf, setWhatIf] = useState('')
  const [impact, setImpact] = useState('')
  const [outcome, setOutcome] = useState('')
  const [pendingPriority, setPendingPriority] = useState<SwiftPriority | null>(null)
  const [currentControl, setCurrentControl] = useState('')
  const [treatment, setTreatment] = useState('')
  const [saving, setSaving] = useState(false)
  const [canvasError, setCanvasError] = useState<string | null>(null)

  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)

  const fetchNodes = useCallback(async (sid: string) => {
    const sb = createClient()
    const { data } = await sb.from('rals_swift_node').select('*').eq('swift_session_id', sid).order('step_order', { ascending: true })
    setNodes((data ?? []) as SwiftNode[])
  }, [])

  const fetchScenarios = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('rals_swift_scenario').select('*').eq('participant_id', participantId).order('created_at', { ascending: false })
    setScenarios((data ?? []) as SwiftScenario[])
  }, [participantId])

  useEffect(() => { fetchScenarios() }, [fetchScenarios])
  useEffect(() => { if (swiftSession) fetchNodes(swiftSession.id) }, [swiftSession, fetchNodes])

  async function handleStart(e: React.FormEvent) {
    e.preventDefault()
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!l1 || !l2) { setSetupError('Pilih proses & subproses bisnis yang akan dipetakan.'); return }
    setStarting(true); setSetupError(null)
    const sb = createClient()
    const { data, error } = await sb.from('rals_swift_session').insert({
      session_id: sessionId, participant_id: participantId, l1_kode: l1.kode, l1_nama: l1.nama, l2_kode: l2.kode, l2_nama: l2.nama,
    }).select('*').single()
    setStarting(false)
    if (error || !data) { setSetupError(error?.message ?? 'Gagal memulai pemetaan.'); return }
    setSwiftSession(data as SwiftSession)
  }

  function handleNewMapping() {
    setSwiftSession(null); setNodes([]); setL2Idx('')
    resetCanvas()
  }

  async function handleAddNode(e: React.FormEvent) {
    e.preventDefault()
    if (!swiftSession || !newStep.trim() || nodes.length >= SWIFT_MAX_NODES) return
    const sb = createClient()
    await sb.from('rals_swift_node').insert({ swift_session_id: swiftSession.id, step_order: nodes.length + 1, step_description: newStep.trim() })
    setNewStep('')
    fetchNodes(swiftSession.id)
  }

  async function handleDeleteNode(id: string) {
    if (!swiftSession) return
    const sb = createClient()
    await sb.from('rals_swift_node').delete().eq('id', id)
    if (selectedNodeId === id) setSelectedNodeId('')
    fetchNodes(swiftSession.id)
  }

  function resetCanvas() {
    setGeneratedPrompt(''); setWhatIf(''); setImpact(''); setOutcome('')
    setPendingPriority(null); setCurrentControl(''); setTreatment(''); setCanvasError(null)
  }

  function handleGeneratePrompt() {
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) { setCanvasError('Pilih langkah proses terlebih dahulu.'); return }
    setCanvasError(null)
    const gw = SWIFT_GUIDEWORDS[Math.floor(Math.random() * SWIFT_GUIDEWORDS.length)]
    const prompt = gw.template(node.step_description)
    setGeneratedPrompt(`${gw.label}: ${prompt}`)
    setWhatIf(prompt)
  }

  async function saveScenario(priority: SwiftPriority) {
    if (!swiftSession) return
    if (isHighPriority(priority) && (!currentControl.trim() || !treatment.trim())) {
      setCanvasError('Risiko tinggi terdeteksi — isi status kontrol & rekomendasi tindak lanjut dulu.')
      return
    }
    setSaving(true)
    const sb = createClient()
    await sb.from('rals_swift_scenario').insert({
      swift_session_id: swiftSession.id, node_id: selectedNodeId || null, session_id: sessionId, participant_id: participantId,
      generated_prompt: generatedPrompt, what_if_scenario: whatIf.trim(), immediate_impact: impact.trim(), final_outcome: outcome.trim(),
      risk_priority: priority, current_control: currentControl.trim(), treatment_recommendation: treatment.trim(),
    })
    setSaving(false)
    resetCanvas()
    fetchScenarios()
  }

  function handlePriorityClick(priority: SwiftPriority) {
    if (!whatIf.trim() || !impact.trim() || !outcome.trim()) { setCanvasError('Lengkapi ketiga kartu dulu sebelum menentukan prioritas.'); return }
    setCanvasError(null)
    if (isHighPriority(priority)) { setPendingPriority(priority); return }
    saveScenario(priority)
  }

  async function handlePromote(scenario: SwiftScenario, kategori: string) {
    const sb = createClient()
    const { data: risk, error } = await sb.from('rals_risk').insert({
      session_id: sessionId, participant_id: participantId,
      pernyataan: scenario.what_if_scenario, kategori,
      penyebab: scenario.immediate_impact, dampak_uraian: scenario.final_outcome,
    }).select('id').single()
    if (!error && risk) {
      await sb.from('rals_swift_scenario').update({ promoted_risk_id: risk.id, kategori }).eq('id', scenario.id)
    }
    fetchScenarios()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  // ── Belum ada sesi pemetaan: setup ────────────────────────────────────────
  if (!swiftSession) {
    return (
      <div className="space-y-4">
        <form onSubmit={handleStart} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
            <Waypoints className="w-4 h-4 text-indigo-500" /> Petakan Proses
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Proses Bisnis <span className="text-slate-400 font-normal">(L1)</span></label>
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
            {starting ? 'Memulai...' : 'Mulai Pemetaan'}
          </button>
        </form>

        <DraftList scenarios={scenarios} onPromote={handlePromote} />
      </div>
    )
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold text-indigo-600">#{swiftSession.l2_nama.replace(/\s+/g, '')}</p>
          <p className="text-sm text-slate-700">{swiftSession.l1_nama} › {swiftSession.l2_kode} {swiftSession.l2_nama}</p>
        </div>
        <button onClick={handleNewMapping} className="shrink-0 text-xs text-slate-400 hover:text-slate-600 underline">Petakan Proses Baru</button>
      </div>

      {/* Process Mapper */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <button onClick={() => setShowMapper((v) => !v)} className="w-full flex items-center justify-between px-5 py-3 border-b bg-slate-50 text-xs font-semibold text-slate-600">
          <span>Pemetaan Proses ({nodes.length}/{SWIFT_MAX_NODES} langkah)</span>
          <span>{showMapper ? '▲' : '▼'}</span>
        </button>
        {showMapper && (
          <div className="p-4 space-y-3">
            {nodes.length > 0 && (
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {nodes.map((n, i) => (
                  <button key={n.id} onClick={() => setSelectedNodeId(n.id)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                      selectedNodeId === n.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                    }`}>
                    <span className="opacity-60">{i + 1}.</span> {n.step_description}
                    <X className="w-3 h-3 opacity-50 hover:opacity-100" onClick={(e) => { e.stopPropagation(); handleDeleteNode(n.id) }} />
                  </button>
                ))}
              </div>
            )}
            {nodes.length < SWIFT_MAX_NODES ? (
              <form onSubmit={handleAddNode} className="flex gap-2">
                <input value={newStep} onChange={(e) => setNewStep(e.target.value)}
                  placeholder={`Langkah ${nodes.length + 1}, mis. Penerimaan Berkas`} className={inputCls} />
                <button type="submit" disabled={!newStep.trim()}
                  className="shrink-0 px-4 rounded-lg bg-indigo-600 text-white disabled:opacity-50 hover:bg-indigo-700 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
                Pertahankan di level makro. Fokus pada 10 langkah utama proses.
              </p>
            )}
          </div>
        )}
      </div>

      {/* What-If Canvas */}
      {nodes.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Tambahkan minimal satu langkah proses dulu.</div>
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-semibold text-slate-600">Langkah aktif:</label>
            <select value={selectedNodeId} onChange={(e) => setSelectedNodeId(e.target.value)} className={inputCls + ' bg-white w-auto flex-1 min-w-[160px]'}>
              <option value="">Pilih langkah...</option>
              {nodes.map((n, i) => <option key={n.id} value={n.id}>{i + 1}. {n.step_description}</option>)}
            </select>
            <button onClick={handleGeneratePrompt} disabled={!selectedNodeId}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              <Dices className="w-3.5 h-3.5" /> Generate Prompt
            </button>
          </div>

          {generatedPrompt && (
            <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2">{generatedPrompt}</p>
          )}

          {/* Kartu domino */}
          <div className="grid sm:grid-cols-3 gap-3 items-start">
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Card 1 · Skenario What-If</label>
              <textarea value={whatIf} onChange={(e) => setWhatIf(e.target.value)} rows={4}
                placeholder="Bagaimana jika...?" className={inputCls} />
            </div>
            <div className="hidden sm:flex items-center justify-center pt-8"><ArrowRight className="w-4 h-4 text-slate-300" /></div>
            <div className="space-y-1.5 sm:col-start-2">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Card 2 · Dampak Langsung</label>
              <textarea value={impact} onChange={(e) => setImpact(e.target.value)} rows={4}
                placeholder="Apa yang langsung terjadi?" className={inputCls} />
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 items-start">
            <div className="hidden sm:block" />
            <div className="hidden sm:flex items-center justify-center pt-8"><ArrowRight className="w-4 h-4 text-slate-300" /></div>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Card 3 · Konsekuensi Lanjutan</label>
              <textarea value={outcome} onChange={(e) => setOutcome(e.target.value)} rows={4}
                placeholder="Apa akibat lanjutannya?" className={inputCls} />
            </div>
          </div>

          {canvasError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{canvasError}</p>}

          {/* Prioritas */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600">Evaluasi Prioritas</label>
            <div className="grid grid-cols-4 gap-2">
              {SWIFT_PRIORITIES.map((p) => (
                <button key={p.key} onClick={() => handlePriorityClick(p.key)} disabled={saving}
                  className="py-2.5 rounded-lg text-xs font-bold text-white transition-transform hover:scale-[1.03] disabled:opacity-50"
                  style={{ backgroundColor: p.color }}>
                  {p.key}
                </button>
              ))}
            </div>
          </div>

          {/* Modal wajib untuk prioritas tinggi */}
          {pendingPriority && (
            <div className="rounded-xl border-2 border-red-200 bg-red-50/60 p-4 space-y-3">
              <p className="text-xs font-bold text-red-700">⚠ Risiko {pendingPriority} Terdeteksi. Tentukan Status Kontrol Saat Ini & Rekomendasi Tindak Lanjut.</p>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Status Kontrol Saat Ini</label>
                <textarea value={currentControl} onChange={(e) => setCurrentControl(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-600">Rekomendasi Tindak Lanjut</label>
                <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} rows={2} className={inputCls} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => saveScenario(pendingPriority)} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-red-700 text-white text-xs font-semibold hover:bg-red-800 disabled:opacity-60 transition-colors">
                  {saving ? 'Menyimpan...' : 'Simpan Skenario Berisiko Tinggi'}
                </button>
                <button onClick={() => setPendingPriority(null)} className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-500 hover:bg-slate-50">
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <DraftList scenarios={scenarios} onPromote={handlePromote} />
    </div>
  )
}

function DraftList({ scenarios, onPromote }: { scenarios: SwiftScenario[]; onPromote: (s: SwiftScenario, kategori: string) => void }) {
  const [kategoriMap, setKategoriMap] = useState<Record<string, string>>({})
  const [promotingId, setPromotingId] = useState<string | null>(null)

  async function handleClick(s: SwiftScenario) {
    const kategori = kategoriMap[s.id]
    if (!kategori) return
    setPromotingId(s.id)
    await onPromote(s, kategori)
    setPromotingId(null)
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Draf Skenario Saya</h3>
        <span className="text-[11px] text-slate-400">{scenarios.length} skenario</span>
      </div>
      {scenarios.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada skenario. Jalankan roulette di atas dulu.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {scenarios.map((s) => {
            const p = SWIFT_PRIORITIES.find((x) => x.key === s.risk_priority)
            return (
              <div key={s.id} className="px-5 py-3 space-y-2">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 text-[10px] font-bold text-white px-2 py-0.5 rounded" style={{ backgroundColor: p?.color }}>{s.risk_priority}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">{s.what_if_scenario}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">{s.immediate_impact} → {s.final_outcome}</p>
                  </div>
                </div>
                {s.promoted_risk_id ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 pl-9"><Check className="w-3.5 h-3.5" /> Di register</span>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 pl-9">
                    {KATEGORI_RISIKO.map((k) => (
                      <button key={k.key} onClick={() => setKategoriMap((m) => ({ ...m, [s.id]: k.label }))}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors ${
                          kategoriMap[s.id] === k.label ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                        }`}>{k.label}</button>
                    ))}
                    <button onClick={() => handleClick(s)} disabled={!kategoriMap[s.id] || promotingId === s.id}
                      className="ml-auto px-3 py-1 rounded-lg bg-green-700 text-white text-[11px] font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors">
                      {promotingId === s.id ? 'Menambahkan...' : 'Tambahkan ke Register Saya'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
