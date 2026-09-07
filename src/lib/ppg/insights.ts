import type { PpgAnalyticsResult, PpgRecommendation } from './analytics'
import type { PpgNationalRiskInsight } from './data'

export type PpgAssistedInsight = PpgNationalRiskInsight & {
  insight_a_score: number
  insight_a_method_version: 'exposure-components-v2'
  insight_a_components: PpgInsightAComponent[]
  insight_b_score: number
  priority_score: number
  priority: 'prioritas_nasional' | 'preventif' | 'perbaikan_kontrol' | 'monitoring'
  insight_a_narrative: string
  insight_b_narrative: string
  action_code: string
  action_title: string
  suggested_kri: string
  suggested_kri_green: string
  suggested_kri_warning: string
  suggested_kri_red: string
  suggested_outcome_a: string
  suggested_outcome_a_baseline: number
  suggested_outcome_a_target: number
  suggested_outcome_b: string
  suggested_outcome_b_baseline: number
  suggested_outcome_b_target: number
}

export type PpgInsightAComponent = {
  key: 'scenario_concentration' | 'seasonal_anomaly' | 'role_concentration' | 'risky_object_exposure' | 'positive_trend'
  label: string
  raw_value: number
  raw_display: string
  normalized_score: number
  weight: number
  contribution: number
  explanation: string
}

const recommendationPriority = { tinggi: 3, sedang: 2, normal: 1 } as const

export function buildPpgAssistedInsights(analytics: PpgAnalyticsResult, risks: PpgNationalRiskInsight[]): PpgAssistedInsight[] {
  return risks.map((risk) => {
    const recommendation = bestRecommendation(analytics.recommendations.filter((item) => item.riskCategories.includes(risk.kategori)))
    const insightA = calculateInsightA(analytics)
    const insightAScore = insightA.score
    const insightBScore = clamp(
      risk.affected_pct * 2 + risk.high_impact_pct * 4 + risk.recurring_pct * 4 + risk.control_failure_pct * 2,
      0,
      100,
    )
    const priority = classifyPriority(insightAScore, insightBScore)
    const outcomeATarget = clamp(round(Math.max(0, exposureBaseline(analytics, recommendation) * 0.8), 1), 0, 100)
    const outcomeBTarget = clamp(round(Math.max(0, risk.affected_pct * 0.75), 1), 0, 100)
    return {
      ...risk,
      insight_a_score: insightAScore,
      insight_a_method_version: 'exposure-components-v2' as const,
      insight_a_components: insightA.components,
      insight_b_score: round(insightBScore, 1),
      priority_score: round(insightAScore * 0.45 + insightBScore * 0.55, 1),
      priority,
      insight_a_narrative: recommendation?.rationale || `Belum ada sinyal paparan yang melampaui ambang rekomendasi mesin untuk kategori ${risk.kategori}. Risiko tetap dipantau karena berada dalam Risk Library aktif.`,
      insight_b_narrative: risk.affected_satkers
        ? `${risk.affected_pct.toFixed(1)}% Satker mengalami loss event tervalidasi; ${risk.high_impact_pct.toFixed(1)}% berdampak tinggi, ${risk.recurring_pct.toFixed(1)}% berulang, dan ${risk.control_failure_pct.toFixed(1)}% mencatat kegagalan kontrol.`
        : `Belum ada loss event tervalidasi untuk risiko ini pada periode analisis. Kondisi ini tidak otomatis berarti tanpa risiko dan harus dibaca bersama kualitas pelaporan.`,
      action_code: recommendation?.actionCode || '',
      action_title: recommendation?.title || 'Monitoring dan pemeliharaan kontrol',
      suggested_kri: suggestedKri(risk),
      suggested_kri_green: '< 5%',
      suggested_kri_warning: '5–10%',
      suggested_kri_red: '> 10%',
      suggested_outcome_a: suggestedOutcomeA(recommendation),
      suggested_outcome_a_baseline: exposureBaseline(analytics, recommendation),
      suggested_outcome_a_target: outcomeATarget,
      suggested_outcome_b: 'Persentase Satker dengan loss event tervalidasi pada risiko generik utama',
      suggested_outcome_b_baseline: risk.affected_pct,
      suggested_outcome_b_target: outcomeBTarget,
    }
  }).sort((a, b) => b.priority_score - a.priority_score || a.kode.localeCompare(b.kode))
}

function bestRecommendation(items: PpgRecommendation[]) {
  return [...items].sort((a, b) => recommendationPriority[b.priority] - recommendationPriority[a.priority])[0]
}

export function calculateInsightA(analytics: PpgAnalyticsResult) {
  const identifiedScenarios = analytics.scenarios.filter((item) => item.label !== 'Tidak teridentifikasi')
  const identifiedRoles = analytics.roles.filter((item) => item.label !== 'Tidak teridentifikasi')
  const scenarioShare = clamp(identifiedScenarios[0]?.share ?? 0, 0, 1)
  const roleShare = clamp(identifiedRoles[0]?.share ?? 0, 0, 1)
  const moneyShare = analytics.summary.itemCount ? clamp(analytics.summary.moneyItems / analytics.summary.itemCount, 0, 1) : 0
  const peakMonth = [...analytics.monthly].sort((a, b) => b.seasonalIndex - a.seasonalIndex)[0]
  const peakSeasonalIndex = Math.max(0, peakMonth?.seasonalIndex ?? 0)
  const comparableChange = analytics.summary.comparableChange ?? 0

  const definitions: Omit<PpgInsightAComponent, 'contribution'>[] = [
    {
      key: 'scenario_concentration', label: 'Kekuatan konsentrasi skenario', raw_value: scenarioShare,
      raw_display: `${round(scenarioShare * 100, 1)}% laporan pada skenario teridentifikasi paling dominan`,
      normalized_score: round(scenarioShare * 100, 1), weight: 0.30,
      explanation: 'Proporsi laporan unik pada skenario teridentifikasi paling dominan; 0% menjadi skor 0 dan 100% menjadi skor 100.',
    },
    {
      key: 'seasonal_anomaly', label: 'Anomali periode rawan', raw_value: peakSeasonalIndex,
      raw_display: `Indeks musim ${round(peakSeasonalIndex, 2)} pada ${peakMonth?.label ?? 'bulan belum tersedia'}`,
      normalized_score: round(clamp((peakSeasonalIndex - 1) / 2 * 100, 0, 100), 1), weight: 0.25,
      explanation: 'Indeks 1 berarti sesuai ekspektasi bulanan (skor 0); indeks 3 atau lebih berarti sedikitnya tiga kali ekspektasi dan dibatasi pada skor 100.',
    },
    {
      key: 'role_concentration', label: 'Konsentrasi jabatan', raw_value: roleShare,
      raw_display: `${round(roleShare * 100, 1)}% laporan pada jabatan teridentifikasi paling dominan`,
      normalized_score: round(roleShare * 100, 1), weight: 0.20,
      explanation: 'Proporsi laporan unik pada kelompok jabatan teridentifikasi paling dominan.',
    },
    {
      key: 'risky_object_exposure', label: 'Paparan objek berisiko', raw_value: moneyShare,
      raw_display: `${round(moneyShare * 100, 1)}% item berupa uang atau setara uang`,
      normalized_score: round(moneyShare * 100, 1), weight: 0.15,
      explanation: 'Proporsi item uang dan setara uang terhadap seluruh item pada periode analisis.',
    },
    {
      key: 'positive_trend', label: 'Pertumbuhan paparan', raw_value: comparableChange,
      raw_display: analytics.summary.comparableChange === null
        ? 'Periode pembanding belum tersedia'
        : `${round(comparableChange * 100, 1)}% dibanding periode setara sebelumnya`,
      normalized_score: round(clamp(Math.max(0, comparableChange) * 100, 0, 100), 1), weight: 0.10,
      explanation: 'Hanya pertumbuhan positif menambah paparan: kenaikan 0% menjadi skor 0, kenaikan 100% atau lebih dibatasi pada skor 100.',
    },
  ]
  const components = definitions.map((item) => ({ ...item, contribution: round(item.normalized_score * item.weight, 1) }))
  return { score: round(components.reduce((total, item) => total + item.contribution, 0), 1), components }
}

function classifyPriority(a: number, b: number): PpgAssistedInsight['priority'] {
  if (a >= 55 && b >= 45) return 'prioritas_nasional'
  if (a >= 55) return 'preventif'
  if (b >= 45) return 'perbaikan_kontrol'
  return 'monitoring'
}

function exposureBaseline(analytics: PpgAnalyticsResult, recommendation?: PpgRecommendation) {
  if (!analytics.summary.itemCount) return 0
  if (recommendation?.signalKey === 'objek_uang') return round(analytics.summary.moneyItems / analytics.summary.itemCount * 100, 1)
  if (recommendation?.signalKey === 'keterlambatan_pelaporan') return round(analytics.summary.lateReportRate * 100, 1)
  if (recommendation?.signalKey === 'kualitas_data') return round(analytics.summary.missingContext / analytics.summary.itemCount * 100, 1)
  if (recommendation?.signalKey === 'jabatan_prioritas') return round((analytics.roles[0]?.share ?? 0) * 100, 1)
  if (recommendation?.signalKey === 'musim_rawan') {
    const total = analytics.monthly.reduce((sum, item) => sum + item.reports, 0)
    const peak = Math.max(...analytics.monthly.map((item) => item.reports), 0)
    return round(total ? peak / total * 100 : 0, 1)
  }
  if (recommendation?.signalKey === 'relasi_eksternal') {
    const external = analytics.giverTypes.filter((item) => /bank|vendor|perusahaan|advokat|pemerintah|instansi/i.test(item.label)).reduce((sum, item) => sum + item.reports, 0)
    return round(analytics.summary.uniqueReports ? external / analytics.summary.uniqueReports * 100 : 0, 1)
  }
  return round((analytics.scenarios[0]?.share ?? 0) * 100, 1)
}

function suggestedOutcomeA(recommendation?: PpgRecommendation) {
  switch (recommendation?.signalKey) {
    case 'objek_uang': return 'Proporsi item uang dan setara uang pada laporan gratifikasi'
    case 'keterlambatan_pelaporan': return 'Proporsi laporan gratifikasi yang disampaikan lebih dari 30 hari'
    case 'kualitas_data': return 'Proporsi laporan gratifikasi tanpa konteks yang memadai'
    case 'jabatan_prioritas': return 'Proporsi paparan pada jabatan prioritas'
    case 'musim_rawan': return 'Proporsi laporan pada bulan puncak periode rawan'
    case 'relasi_eksternal': return 'Proporsi laporan yang melibatkan pihak eksternal prioritas'
    default: return 'Proporsi skenario paparan dominan pada laporan gratifikasi'
  }
}

function suggestedKri(risk: PpgNationalRiskInsight) {
  if (risk.control_failure_pct > 0) return 'Persentase Satker dengan kontrol terkait yang tidak efektif atau belum memiliki bukti efektivitas'
  if (risk.recurring_pct > 0) return 'Persentase Satker dengan indikator penyebab berulang yang belum ditindaklanjuti'
  return 'Persentase Satker yang belum menerapkan kontrol preventif wajib untuk risiko generik ini'
}

function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
function round(value: number, digits = 0) { const factor = 10 ** digits; return Math.round(value * factor) / factor }
