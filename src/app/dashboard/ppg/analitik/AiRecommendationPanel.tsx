'use client'

import Link from 'next/link'
import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Bot, CheckCircle2, Database, Send, ShieldCheck, Sparkles } from 'lucide-react'
import type { PpgAiRecommendationRun, PpgAiRecommendation } from '@/lib/ppg/ai-recommendations'
import { generatePpgAiRecommendationRun, reviewPpgAiActionCandidate, submitPpgAiActionCandidate, type PpgAiActionState } from './ai-actions'

const initialState: PpgAiActionState = { status: 'idle', message: '' }

export function AiRecommendationPanel({ run, candidates, year, quarter, isDemo, error }: { run: PpgAiRecommendationRun | null; candidates: Record<string, unknown>[]; year: number; quarter: number | null; isDemo: boolean; error: string | null }) {
  const candidateByKey = new Map(candidates.map((candidate) => [String(candidate.recommendation_key), candidate]))
  return <section className="rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="max-w-3xl"><div className="flex items-center gap-2"><Sparkles className="size-5 text-violet-700" /><h3 className="font-bold text-violet-950">Rekomendasi Program PPG dengan AI</h3></div><p className="mt-2 text-xs leading-relaxed text-slate-600">Gemini menafsirkan agregat anonim Insight A dan B menjadi alternatif program yang spesifik. Keluaran adalah bahan pertimbangan, bukan keputusan otomatis atau kesimpulan hukum.</p></div>
      <GenerateButton year={year} quarter={quarter} disabled={!isDemo} hasRun={Boolean(run)} />
    </div>
    <div className="mt-4 flex flex-wrap gap-2 text-[11px]"><Guard icon={ShieldCheck} text="Hanya Simulasi Lengkap" /><Guard icon={Database} text="Agregat anonim—tanpa nama Satker/individu" /><Guard icon={Bot} text="JSON tervalidasi dan tersimpan sebagai snapshot" /></div>
    {!isDemo && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">AI dinonaktifkan pada Data Riil. Pindah ke <strong>Simulasi Lengkap</strong> untuk membuat rekomendasi tanpa mengirim data operasional.</p>}
    {error && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Snapshot AI belum tersedia: {error}. Pastikan migrasi database terbaru telah dijalankan.</p>}
    {run && <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl bg-white/80 px-4 py-3 text-[11px] text-slate-500"><span><b className="text-slate-700">Snapshot:</b> {dateTime(run.created_at)}</span><span><b className="text-slate-700">Model:</b> {run.model}</span><span><b className="text-slate-700">Metode:</b> {run.prompt_version}</span><span><b className="text-slate-700">Periode:</b> {run.period_label}</span></div>}
    {run?.recommendations.length ? <div className="mt-5 grid gap-4 xl:grid-cols-2">{run.recommendations.map((item, index) => <RecommendationCard key={item.key} item={item} index={index} runId={run.id} candidate={candidateByKey.get(item.key)} year={year} quarter={quarter} />)}</div> : isDemo && !error ? <p className="mt-5 rounded-xl border border-dashed border-violet-300 bg-white/60 p-5 text-center text-sm text-slate-600">Belum ada snapshot AI untuk periode ini. Klik <strong>Generate rekomendasi AI</strong>.</p> : null}
  </section>
}

function RecommendationCard({ item, index, runId, candidate, year, quarter }: { item: PpgAiRecommendation; index: number; runId: string; candidate?: Record<string, unknown>; year: number; quarter: number | null }) {
  const action = relation(candidate?.action)
  const actionCode = item.existing_action_code || (candidate?.status === 'disetujui' ? String(action.kode || '') : '')
  const draftHref = `/dashboard/ppg/tindak-lanjut?risk=${encodeURIComponent(item.linked_risk_id)}${actionCode ? `&action=${encodeURIComponent(actionCode)}` : ''}&tahun=${year}${quarter ? `&triwulan=${quarter}` : ''}&ai_run=${encodeURIComponent(runId)}&ai_rec=${encodeURIComponent(item.key)}`
  return <article className="rounded-2xl border border-violet-100 bg-white p-5 shadow-sm">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[10px] font-bold uppercase tracking-widest text-violet-600">Rekomendasi {index + 1} · {item.linked_risk_code}</p><h4 className="mt-1 text-base font-bold text-slate-950">{item.title}</h4></div><Confidence value={item.confidence} /></div>
    <p className="mt-3 text-sm leading-relaxed text-slate-700"><strong>Temuan:</strong> {item.finding}</p>
    <div className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold text-slate-800">Bukti agregat yang digunakan</p><ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">{item.evidence.map((evidence) => <li key={evidence}>{evidence}</li>)}</ul></div>
    <button type="button" onClick={() => openCombinedEvidence(item.linked_risk_id)} className="mt-3 text-xs font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-900">Lihat dasar analitik gabungan A × B</button>
    <p className="mt-4 text-xs leading-relaxed text-slate-700"><strong>Alasan rekomendasi:</strong> {item.reasoning_summary}</p>
    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2"><Field label="Waktu pelaksanaan" value={item.timing || 'Perlu ditetapkan UPG Pusat'} /><Field label="Sasaran" value={item.target_roles.join('; ') || 'Perlu ditetapkan UPG Pusat'} /></dl>
    <div className="mt-4"><p className="text-xs font-bold text-slate-800">Aksi konkret</p><ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-relaxed text-slate-600">{item.concrete_actions.map((action) => <li key={action}>{action}</li>)}</ol></div>
    {item.limitations.length > 0 && <div className="mt-4 flex gap-2 rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle className="mt-0.5 size-4 shrink-0" /><p><strong>Batas interpretasi:</strong> {item.limitations.join(' ')}</p></div>}
    <div className="mt-4 border-t border-slate-100 pt-4">
      {item.existing_action_code ? <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-600">Cocok dengan Action Catalog: <strong>{item.existing_action_code}</strong></p><Link href={draftHref} className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white">Gunakan sebagai draf Program PPG</Link></div> : item.proposed_action ? <CandidateControls runId={runId} recommendationKey={item.key} candidate={candidate} draftHref={draftHref} proposedName={item.proposed_action.name} /> : null}
    </div>
  </article>
}

function GenerateButton({ year, quarter, disabled, hasRun }: { year: number; quarter: number | null; disabled: boolean; hasRun: boolean }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(generatePpgAiRecommendationRun, initialState)
  useEffect(() => { if (state.status === 'success') router.refresh() }, [router, state.status, state.message])
  return <form action={action} className="min-w-60"><input type="hidden" name="tahun" value={year} /><input type="hidden" name="triwulan" value={quarter ?? ''} /><button disabled={disabled || pending} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="size-4" />{pending ? 'Gemini sedang menganalisis…' : hasRun ? 'Regenerasi rekomendasi AI' : 'Generate rekomendasi AI'}</button>{state.message && <p aria-live="polite" className={`mt-2 text-xs ${state.status === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p>}</form>
}

function CandidateControls({ runId, recommendationKey, candidate, draftHref, proposedName }: { runId: string; recommendationKey: string; candidate?: Record<string, unknown>; draftHref: string; proposedName: string }) {
  const router = useRouter()
  const [submitState, submitAction, submitting] = useActionState(submitPpgAiActionCandidate, initialState)
  const [reviewState, reviewAction, reviewing] = useActionState(reviewPpgAiActionCandidate, initialState)
  useEffect(() => { if (submitState.status === 'success' || reviewState.status === 'success') router.refresh() }, [router, submitState.status, submitState.message, reviewState.status, reviewState.message])
  const status = String(candidate?.status || '')
  const message = reviewState.message || submitState.message
  return <div className="space-y-3"><p className="text-xs text-slate-600">AI mengusulkan tindakan baru: <strong>{proposedName}</strong></p>
    {!status && <form action={submitAction}><input type="hidden" name="run_id" value={runId} /><input type="hidden" name="recommendation_key" value={recommendationKey} /><button disabled={submitting} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-3 py-2 text-xs font-semibold text-white"><Send className="size-3.5" />{submitting ? 'Mengajukan…' : 'Ajukan ke Action Catalog'}</button></form>}
    {status === 'menunggu' && <form action={reviewAction} className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3"><input type="hidden" name="candidate_id" value={String(candidate?.id)} /><textarea name="catatan_review" maxLength={1000} placeholder="Catatan review UPG Pusat/Admin (opsional)" className="min-h-16 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs" /><div className="flex flex-wrap gap-2"><button name="decision" value="disetujui" disabled={reviewing} className="inline-flex items-center gap-1 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"><CheckCircle2 className="size-3.5" />Setujui ke katalog</button><button name="decision" value="ditolak" disabled={reviewing} className="rounded-lg border border-rose-300 bg-white px-3 py-2 text-xs font-semibold text-rose-700">Tolak</button></div></form>}
    {status === 'disetujui' && <div className="flex flex-wrap items-center justify-between gap-3"><p className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="size-4" />Disetujui sebagai tindakan katalog</p><Link href={draftHref} className="rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white">Gunakan sebagai draf Program PPG</Link></div>}
    {status === 'ditolak' && <p className="text-xs font-semibold text-rose-700">Kandidat tindakan ditolak. {String(candidate?.catatan_review || '')}</p>}
    {message && <p aria-live="polite" className={`text-xs ${(reviewState.status === 'error' || submitState.status === 'error') ? 'text-rose-700' : 'text-emerald-700'}`}>{message}</p>}
  </div>
}

function Guard({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) { return <span className="inline-flex items-center gap-1 rounded-full border border-violet-100 bg-white px-2.5 py-1 text-slate-600"><Icon className="size-3" />{text}</span> }
function Confidence({ value }: { value: PpgAiRecommendation['confidence'] }) { const tone = value === 'tinggi' ? 'bg-emerald-50 text-emerald-700' : value === 'sedang' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'; return <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${tone}`}>Keyakinan {value}</span> }
function Field({ label, value }: { label: string; value: string }) { return <div><dt className="font-bold text-slate-700">{label}</dt><dd className="mt-1 leading-relaxed text-slate-600">{value}</dd></div> }
function relation(value: unknown): Record<string, unknown> { if (Array.isArray(value)) return relation(value[0]); return value && typeof value === 'object' ? value as Record<string, unknown> : {} }
function dateTime(value: string) { try { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) } catch { return value } }
function openCombinedEvidence(riskId: string) {
  const panel = document.getElementById('dasar-analitik-gabungan')
  if (panel instanceof HTMLDetailsElement) panel.open = true
  requestAnimationFrame(() => document.getElementById(`dasar-gabungan-${riskId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
}
