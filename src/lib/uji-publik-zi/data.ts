import 'server-only'

import { requireZiAccess } from './access'

export type ZiDashboardRow = {
  id: string
  ageGroup: string
  gender: string
  occupation: string
  unitId: string | null
  unitName: string
  sourceTags: string[]
  opinion: string
  starRating: number
  createdAt: string
  latitude: number | null
  longitude: number | null
  sentimentScore: number | null
  sentimentLabel: string | null
  mismatch: boolean
  aiTags: string[]
  highRiskTags: string[]
}

export type ZiAnovaSummary = Record<string, { status?: string; groups?: number; f_statistic?: number; p_value?: number; significant_005?: boolean }>

export async function getZiDashboardData() {
  const { supabase } = await requireZiAccess()
  const [responses, batches, config, latestRun] = await Promise.all([
    supabase
      .from('zi_responses')
      .select('id,age_group,gender,occupation,unit_kerja_id,unit_nama_raw,source_tags,opinion,star_rating,created_at,unit:unit_kerja(nama_unit,lintang,bujur),analysis:zi_response_analysis(sentiment_score,sentiment_label,mismatch,ai_tags,high_risk_tags)')
      .order('created_at', { ascending: false })
      .limit(5000),
    supabase.from('zi_import_batches').select('id,nama_file,status,total_baris,baris_valid,baris_perlu_perbaikan,created_at').order('created_at', { ascending: false }).limit(20),
    supabase.from('zi_analysis_config').select('*').eq('id', 1).maybeSingle(),
    supabase.from('zi_analysis_runs').select('result_summary,model_name,completed_at').eq('status', 'selesai').order('completed_at', { ascending: false }).limit(1).maybeSingle(),
  ])
  if (responses.error) return { ready: false, rows: [] as ZiDashboardRow[], batches: [], config: null, error: responses.error.message }
  const rows = (responses.data ?? []).map((row) => {
    const unit = Array.isArray(row.unit) ? row.unit[0] : row.unit
    const analysis = Array.isArray(row.analysis) ? row.analysis[0] : row.analysis
    return {
      id: String(row.id), ageGroup: String(row.age_group), gender: String(row.gender), occupation: String(row.occupation),
      unitId: row.unit_kerja_id ? String(row.unit_kerja_id) : null,
      unitName: String(unit?.nama_unit || row.unit_nama_raw), sourceTags: row.source_tags ?? [], opinion: String(row.opinion),
      starRating: Number(row.star_rating), createdAt: String(row.created_at), latitude: numberOrNull(unit?.lintang), longitude: numberOrNull(unit?.bujur),
      sentimentScore: numberOrNull(analysis?.sentiment_score), sentimentLabel: analysis?.sentiment_label ? String(analysis.sentiment_label) : null,
      mismatch: Boolean(analysis?.mismatch), aiTags: analysis?.ai_tags ?? [], highRiskTags: analysis?.high_risk_tags ?? [],
    }
  })
  const resultSummary = latestRun.data?.result_summary as { anova?: ZiAnovaSummary } | null
  return { ready: true, rows, batches: batches.data ?? [], config: config.data, anova: resultSummary?.anova ?? null, modelName: latestRun.data?.model_name ?? null, error: batches.error?.message ?? config.error?.message ?? latestRun.error?.message ?? null }
}

export async function getZiImportWorkspace() {
  const { supabase, isAdmin } = await requireZiAccess()
  const [batches, runs] = await Promise.all([
    supabase.from('zi_import_batches').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('zi_analysis_runs').select('*').order('created_at', { ascending: false }).limit(50),
  ])
  return { ready: !batches.error, batches: batches.data ?? [], runs: runs.data ?? [], canDelete: isAdmin, error: batches.error?.message ?? runs.error?.message ?? null }
}

export async function getZiResponseDetails({ page = 1, pageSize = 10 }: { page?: number; pageSize?: number } = {}) {
  const { supabase } = await requireZiAccess()
  const safePageSize = [5, 10, 50, 100].includes(pageSize) ? pageSize : 10
  const requestedPage = Number.isInteger(page) && page > 0 ? page : 1
  const queryPage = (targetPage: number) => supabase
    .from('zi_responses')
    .select('id,source_row,respondent_name,age_group,gender,occupation,unit_nama_raw,source_tags,opinion,star_rating,created_at,analysis:zi_response_analysis(sentiment_label,mismatch,mismatch_reason,ai_tags,high_risk_tags,confidence,model_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((targetPage - 1) * safePageSize, targetPage * safePageSize - 1)

  let result = await queryPage(requestedPage)
  const total = result.count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / safePageSize))
  const currentPage = Math.min(requestedPage, totalPages)
  if (!result.error && currentPage !== requestedPage) result = await queryPage(currentPage)

  return {
    ready: !result.error,
    rows: result.data ?? [],
    error: result.error?.message ?? null,
    page: currentPage,
    pageSize: safePageSize,
    total,
    totalPages,
  }
}

function numberOrNull(value: unknown) { const number = Number(value); return Number.isFinite(number) ? number : null }
