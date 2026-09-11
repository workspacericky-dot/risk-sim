'use server'

import { revalidatePath } from 'next/cache'
import { requirePpgAdmin } from '@/lib/ppg/access'
import { createPpgAdminClient } from '@/lib/ppg/scenario'
import { getPpgActionCatalog, getPpgAnalytics, getPpgNationalRiskInsights } from '@/lib/ppg/data'
import { buildPpgAssistedInsights } from '@/lib/ppg/insights'
import { buildPpgAiAggregateInput, PPG_AI_PROMPT_VERSION, type PpgAiRecommendation } from '@/lib/ppg/ai-recommendations'
import { generateGeminiPpgRecommendations } from '@/lib/ppg/gemini'

export type PpgAiActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function generatePpgAiRecommendationRun(_previous: PpgAiActionState, formData: FormData): Promise<PpgAiActionState> {
  const access = await requirePpgAdmin()
  if (!access.isDemo) return failure('Rekomendasi AI hanya diaktifkan pada save slot Simulasi Lengkap untuk melindungi data riil.')
  const year = Number(formData.get('tahun'))
  const quarterValue = String(formData.get('triwulan') || '')
  const quarter = quarterValue ? Number(quarterValue) : null
  if (!Number.isInteger(year) || year < 2000 || year > 2200 || (quarter !== null && ![1, 2, 3, 4].includes(quarter))) return failure('Periode analisis tidak valid.')

  try {
    const analytics = await getPpgAnalytics(year, quarter)
    if (!analytics.summary.itemCount) return failure('Tidak ada data agregat pada periode yang dipilih.')
    const [national, catalog] = await Promise.all([
      getPpgNationalRiskInsights(analytics.period.baselineStart, analytics.period.end),
      getPpgActionCatalog(),
    ])
    if (national.error || catalog.error) return failure(`Data rekomendasi belum lengkap: ${national.error || catalog.error}`)
    const risks = buildPpgAssistedInsights(analytics, national.rows)
    const input = buildPpgAiAggregateInput(analytics, risks, catalog.rows)
    const generated = await generateGeminiPpgRecommendations(input, risks, catalog.rows.map((row) => String(row.kode)))
    const admin = createPpgAdminClient(access.scenarioId)
    const inserted = await admin.from('ppg_ai_recommendation_runs').insert({
      analysis_year: analytics.period.year,
      analysis_quarter: analytics.period.quarter,
      analysis_start: analytics.period.start,
      analysis_end: analytics.period.end,
      period_label: analytics.period.label,
      program_label: analytics.period.programLabel,
      model: generated.model,
      prompt_version: PPG_AI_PROMPT_VERSION,
      input_summary: input,
      recommendations: generated.recommendations,
      created_by: access.user.id,
    }).select('id').single()
    if (inserted.error || !inserted.data) return failure(`Rekomendasi berhasil dibuat tetapi snapshot gagal disimpan: ${inserted.error?.message || 'record tidak tersedia'}`)
    await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_ai_recommendation_run', entity_id: inserted.data.id, action: 'generate', changes: { model: generated.model, prompt_version: PPG_AI_PROMPT_VERSION, recommendations: generated.recommendations.length, privacy: 'aggregate_only', period: analytics.period.label } })
    revalidatePath('/dashboard/ppg/analitik')
    return { status: 'success', message: `${generated.recommendations.length} rekomendasi AI tersimpan untuk ${analytics.period.label}.` }
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Rekomendasi AI gagal dibuat.')
  }
}

export async function submitPpgAiActionCandidate(_previous: PpgAiActionState, formData: FormData): Promise<PpgAiActionState> {
  const access = await requirePpgAdmin()
  if (!access.isDemo) return failure('Kandidat AI hanya dapat diajukan pada Simulasi Lengkap.')
  const runId = String(formData.get('run_id') || '')
  const recommendationKey = String(formData.get('recommendation_key') || '')
  if (!isUuid(runId) || !recommendationKey) return failure('Referensi rekomendasi tidak valid.')
  const admin = createPpgAdminClient(access.scenarioId)
  const result = await admin.from('ppg_ai_recommendation_runs').select('recommendations').eq('id', runId).single()
  if (result.error || !result.data) return failure('Snapshot rekomendasi tidak ditemukan pada save slot aktif.')
  const recommendation = (Array.isArray(result.data.recommendations) ? result.data.recommendations : []).find((item) => record(item).key === recommendationKey) as PpgAiRecommendation | undefined
  if (!recommendation?.proposed_action || recommendation.existing_action_code) return failure('Rekomendasi ini tidak memiliki tindakan baru yang dapat diajukan.')
  const action = recommendation.proposed_action
  const inserted = await admin.from('ppg_ai_action_candidates').upsert({
    run_id: runId,
    recommendation_key: recommendationKey,
    nama: action.name,
    uraian: action.description,
    jenis_kontrol: action.control_type,
    risk_categories: action.risk_categories,
    target_default: action.target_default,
    lead_time_days: action.lead_time_days,
    output_indicator: action.output_indicator,
    outcome_indicator: action.outcome_indicator,
    status: 'menunggu',
    diajukan_by: access.user.id,
    diajukan_at: new Date().toISOString(),
    reviewed_by: null,
    reviewed_at: null,
    catatan_review: '',
    promoted_action_id: null,
  }, { onConflict: 'scenario_id,run_id,recommendation_key' }).select('id').single()
  if (inserted.error) return failure(`Kandidat tindakan gagal diajukan: ${inserted.error.message}`)
  await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_ai_action_candidate', entity_id: inserted.data.id, action: 'ajukan', changes: { run_id: runId, recommendation_key: recommendationKey, nama: action.name } })
  revalidatePath('/dashboard/ppg/analitik')
  return { status: 'success', message: 'Tindakan baru masuk antrean persetujuan.' }
}

export async function reviewPpgAiActionCandidate(_previous: PpgAiActionState, formData: FormData): Promise<PpgAiActionState> {
  const access = await requirePpgAdmin()
  if (!access.isDemo) return failure('Review kandidat AI hanya dapat dilakukan pada Simulasi Lengkap.')
  const candidateId = String(formData.get('candidate_id') || '')
  const decision = String(formData.get('decision') || '')
  const note = String(formData.get('catatan_review') || '').trim().slice(0, 1000)
  if (!isUuid(candidateId) || !['disetujui', 'ditolak'].includes(decision)) return failure('Keputusan kandidat tidak valid.')
  const admin = createPpgAdminClient(access.scenarioId)
  const candidateResult = await admin.from('ppg_ai_action_candidates').select('*').eq('id', candidateId).single()
  const candidate = candidateResult.data
  if (candidateResult.error || !candidate || candidate.status !== 'menunggu') return failure('Kandidat tidak ditemukan atau sudah direview.')

  let promotedActionId: string | null = null
  let promotedCode = ''
  if (decision === 'disetujui') {
    promotedCode = `PPG-AI-${candidateId.slice(0, 8).toUpperCase()}`
    const promoted = await admin.from('ppg_action_catalog').insert({
      kode: promotedCode,
      nama: candidate.nama,
      uraian: candidate.uraian,
      jenis_kontrol: candidate.jenis_kontrol,
      risk_categories: candidate.risk_categories,
      target_default: candidate.target_default,
      lead_time_days: candidate.lead_time_days,
      output_indicator: candidate.output_indicator,
      outcome_indicator: candidate.outcome_indicator,
      status: 'aktif',
    }).select('id').single()
    if (promoted.error || !promoted.data) return failure(`Kandidat tidak dapat dipromosikan: ${promoted.error?.message || 'record tindakan tidak tersedia'}`)
    promotedActionId = String(promoted.data.id)
  }
  const reviewed = await admin.from('ppg_ai_action_candidates').update({ status: decision, reviewed_by: access.user.id, reviewed_at: new Date().toISOString(), catatan_review: note, promoted_action_id: promotedActionId }).eq('id', candidateId)
  if (reviewed.error) {
    if (promotedActionId) await admin.from('ppg_action_catalog').delete().eq('id', promotedActionId)
    return failure(`Status review gagal disimpan: ${reviewed.error.message}`)
  }
  await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_ai_action_candidate', entity_id: candidateId, action: decision, changes: { catatan: note, promoted_action_id: promotedActionId, promoted_code: promotedCode || null } })
  revalidatePath('/dashboard/ppg/analitik')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
  return { status: 'success', message: decision === 'disetujui' ? `Kandidat disetujui sebagai ${promotedCode}.` : 'Kandidat ditolak.' }
}

function failure(message: string): PpgAiActionState { return { status: 'error', message } }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
