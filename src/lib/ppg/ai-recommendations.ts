import type { PpgAnalyticsResult } from './analytics'
import type { PpgAssistedInsight } from './insights'

export const PPG_AI_PROMPT_VERSION = 'ppg-program-recommendation-v2'

export type PpgAiProposedAction = {
  name: string
  description: string
  control_type: 'preventif' | 'detektif' | 'korektif'
  risk_categories: string[]
  target_default: string
  lead_time_days: number
  output_indicator: string
  outcome_indicator: string
}

export type PpgAiRecommendation = {
  key: string
  title: string
  finding: string
  evidence: string[]
  reasoning_summary: string
  timing: string
  target_roles: string[]
  concrete_actions: string[]
  linked_risk_id: string
  linked_risk_code: string
  existing_action_code: string
  proposed_action: PpgAiProposedAction | null
  limitations: string[]
  confidence: 'tinggi' | 'sedang' | 'rendah'
}

export type PpgAiRecommendationRun = {
  id: string
  analysis_year: number
  analysis_quarter: number | null
  period_label: string
  program_label: string
  model: string
  prompt_version: string
  recommendations: PpgAiRecommendation[]
  created_at: string
}

export function parsePpgAiJsonText(rawText: string): unknown {
  let text = rawText.trim().replace(/^\uFEFF/, '')
  const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
  if (fenced) text = fenced[1].trim()
  try {
    return JSON.parse(text)
  } catch (originalError) {
    const object = firstCompleteJsonObject(text)
    if (object && object !== text) return JSON.parse(object)
    throw originalError
  }
}

type CatalogAction = Record<string, unknown>

export function buildPpgAiAggregateInput(analytics: PpgAnalyticsResult, risks: PpgAssistedInsight[], actions: CatalogAction[]) {
  const groups = (rows: PpgAnalyticsResult['roles'], safeLabel: (value: string) => string = (value) => clean(value, 160)) => rows.slice(0, 7).map((row) => ({
    label: safeLabel(row.label),
    reports: row.reports,
    share_pct: round(row.share * 100),
    money_share_pct: round(row.moneyShare * 100),
    rejection_rate_pct: round(row.rejectionRate * 100),
  }))
  return {
    privacy_notice: 'Agregat anonim; tidak memuat nama orang, nomor laporan, nama Satker, kronologi, atau uraian laporan mentah.',
    period: {
      year: analytics.period.year,
      quarter: analytics.period.quarter,
      analysis_label: analytics.period.label,
      program_label: analytics.period.programLabel,
      start: analytics.period.start,
      end: analytics.period.end,
    },
    summary: {
      unique_reports: analytics.summary.uniqueReports,
      item_count: analytics.summary.itemCount,
      money_items_pct: analytics.summary.itemCount ? round(analytics.summary.moneyItems / analytics.summary.itemCount * 100) : 0,
      rejection_rate_pct: round(analytics.summary.rejectionRate * 100),
      missing_context_pct: analytics.summary.itemCount ? round(analytics.summary.missingContext / analytics.summary.itemCount * 100) : 0,
      late_report_rate_pct: round(analytics.summary.lateReportRate * 100),
      comparable_change_pct: analytics.summary.comparableChange === null ? null : round(analytics.summary.comparableChange * 100),
    },
    top_patterns: {
      roles: groups(analytics.roles),
      objects: groups(analytics.objects),
      scenarios: groups(analytics.scenarios, safeScenarioLabel),
      months: [...analytics.monthly].sort((a, b) => b.seasonalIndex - a.seasonalIndex).slice(0, 6).map((row) => ({ label: clean(row.label, 40), reports: row.reports, seasonal_index: round(row.seasonalIndex, 2) })),
      role_object_associations: analytics.associations.slice(0, 8).map((row) => ({ label: clean(row.label, 220), reports: row.reports, lift: round(row.lift, 2) })),
    },
    risk_signals: risks.slice(0, 18).map((risk) => ({
      risk_id: risk.risk_library_id,
      code: risk.kode,
      category: risk.kategori,
      insight_a_score: risk.insight_a_score,
      insight_b_score: risk.insight_b_score,
      observed_satkers: risk.eligible_satkers,
      affected_satkers: risk.affected_satkers,
      affected_satkers_pct: risk.affected_pct,
      high_impact_satkers: risk.high_impact_satkers,
      high_impact_satkers_pct: risk.high_impact_pct,
      recurring_satkers: risk.recurring_satkers,
      recurring_satkers_pct: risk.recurring_pct,
      control_failure_satkers: risk.control_failure_satkers,
      control_failure_satkers_pct: risk.control_failure_pct,
      appetite_set_satkers: risk.appetite_set_satkers,
      above_appetite_satkers: risk.above_appetite_satkers,
      above_appetite_satkers_pct: risk.above_appetite_pct,
      upper_limit_satkers: risk.upper_limit_satkers,
      data_confidence: risk.data_confidence,
    })),
    action_catalog: actions.slice(0, 100).map((action) => ({
      code: String(action.kode || ''),
      name: clean(action.nama, 180),
      risk_categories: Array.isArray(action.risk_categories) ? action.risk_categories.map(String) : [],
      target: clean(action.target_default, 300),
      lead_time_days: Number(action.lead_time_days || 0),
      output_indicator: clean(action.output_indicator, 300),
      outcome_indicator: clean(action.outcome_indicator, 300),
    })),
  }
}

export function parsePpgAiRecommendations(value: unknown, validRisks: PpgAssistedInsight[], validActionCodes: string[]): PpgAiRecommendation[] {
  const source = record(value)
  const rawItems = Array.isArray(source.recommendations) ? source.recommendations : []
  const riskById = new Map(validRisks.map((risk) => [risk.risk_library_id, risk]))
  const actionCodes = new Set(validActionCodes)
  const seen = new Set<string>()
  const recommendations: PpgAiRecommendation[] = []

  for (const [index, raw] of rawItems.slice(0, 5).entries()) {
    const item = record(raw)
    const risk = riskById.get(clean(item.linked_risk_id, 80))
    if (!risk) continue
    const key = clean(item.key, 80) || `rekomendasi-${index + 1}`
    if (seen.has(key)) continue
    seen.add(key)
    const existingActionCode = clean(item.existing_action_code, 80)
    const proposed = record(item.proposed_action)
    const useExisting = actionCodes.has(existingActionCode)
    const proposedAction = useExisting ? null : parseProposedAction(proposed, risk.kategori)
    const title = clean(item.title, 180)
    const finding = clean(item.finding, 700)
    const reasoning = clean(item.reasoning_summary, 1200)
    if (!title || !finding || !reasoning || (!useExisting && !proposedAction)) continue
    recommendations.push({
      key,
      title,
      finding,
      evidence: strings(item.evidence, 5, 300),
      reasoning_summary: reasoning,
      timing: clean(item.timing, 300),
      target_roles: strings(item.target_roles, 6, 100),
      concrete_actions: strings(item.concrete_actions, 6, 350),
      linked_risk_id: risk.risk_library_id,
      linked_risk_code: risk.kode,
      existing_action_code: useExisting ? existingActionCode : '',
      proposed_action: proposedAction,
      limitations: strings(item.limitations, 4, 300),
      confidence: ['tinggi', 'sedang', 'rendah'].includes(String(item.confidence)) ? item.confidence as PpgAiRecommendation['confidence'] : 'sedang',
    })
  }
  if (recommendations.length < 3) throw new Error('Model tidak menghasilkan sedikitnya tiga rekomendasi yang valid dan dapat ditelusuri.')
  return recommendations
}

function parseProposedAction(value: Record<string, unknown>, fallbackCategory: string): PpgAiProposedAction | null {
  const name = clean(value.name, 180)
  const description = clean(value.description, 1200)
  const output = clean(value.output_indicator, 300)
  const outcome = clean(value.outcome_indicator, 300)
  if (!name || !description || !output || !outcome) return null
  const type = ['preventif', 'detektif', 'korektif'].includes(String(value.control_type)) ? String(value.control_type) as PpgAiProposedAction['control_type'] : 'preventif'
  return {
    name,
    description,
    control_type: type,
    risk_categories: strings(value.risk_categories, 7, 100).length ? strings(value.risk_categories, 7, 100) : [fallbackCategory],
    target_default: clean(value.target_default, 300),
    lead_time_days: Math.min(365, Math.max(0, Math.round(Number(value.lead_time_days) || 30))),
    output_indicator: output,
    outcome_indicator: outcome,
  }
}

function strings(value: unknown, maxItems: number, maxLength: number) {
  return Array.isArray(value) ? value.map((item) => clean(item, maxLength)).filter(Boolean).slice(0, maxItems) : []
}
function safeScenarioLabel(value: string) {
  const allowed = [
    'Tidak teridentifikasi', 'Bingkisan Hari Raya / Keagamaan', 'Paket Sembako',
    'Jamuan / Konsumsi Rapat & Kegiatan', 'Oleh-oleh / Buah Tangan Perjalanan',
    'Pemberian Uang Langsung', 'Suvenir / Merchandise Kegiatan & Kunjungan',
    'Parsel/Bingkisan Umum (non-hari raya)', 'Pemberian Umum / Tanpa Konteks',
    'Pemberian terkait layanan perkara', 'Parsel hari raya', 'Fasilitas dari penyedia',
    'Jamuan kegiatan kedinasan',
  ]
  return allowed.includes(value) ? value : 'Skenario teridentifikasi lainnya (label disamarkan)'
}
function clean(value: unknown, maxLength: number) { return String(value ?? '').trim().slice(0, maxLength) }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function round(value: number, digits = 1) { const factor = 10 ** digits; return Math.round(value * factor) / factor }

function firstCompleteJsonObject(value: string) {
  const start = value.indexOf('{')
  if (start < 0) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let index = start; index < value.length; index += 1) {
    const character = value[index]
    if (inString) {
      if (escaped) escaped = false
      else if (character === '\\') escaped = true
      else if (character === '"') inString = false
      continue
    }
    if (character === '"') inString = true
    else if (character === '{') depth += 1
    else if (character === '}' && --depth === 0) return value.slice(start, index + 1)
  }
  return null
}
