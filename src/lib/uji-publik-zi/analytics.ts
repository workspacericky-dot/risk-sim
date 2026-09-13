import type { ZiAnalysisResult, ZiCriWeights, ZiResponseForAnalysis } from './types'

const POSITIVE = ['baik','bagus','ramah','cepat','puas','mudah','jelas','transparan','bersih','profesional','adil','nyaman']
const NEGATIVE = ['buruk','lambat','lama','sulit','kecewa','tidak ramah','tidak jelas','pungli','suap','gratifikasi','diskriminasi','mahal','antrean panjang']
const TAG_RULES: Array<[string, string[]]> = [
  ['Integritas Pimpinan', ['integritas pimpinan','pimpinan','keteladanan']],
  ['Pungutan Liar', ['pungli','pungutan liar','bayar tambahan','uang pelicin']],
  ['Gratifikasi', ['gratifikasi','hadiah','pemberian']],
  ['Suap', ['suap','sogok','uang pelicin']],
  ['Kualitas Layanan', ['layanan','pelayanan','petugas','ramah','profesional']],
  ['Waktu Layanan', ['antrean','antrian','lambat','lama','cepat']],
  ['Transparansi', ['transparan','informasi','biaya','prosedur']],
]
export const DEFAULT_HIGH_RISK_TAGS = ['Integritas Pimpinan','Pungutan Liar','Gratifikasi','Suap']
export const DEFAULT_CRI_WEIGHTS: ZiCriWeights = { lowRating: 0.4, highRiskTag: 0.35, negativeSentiment: 0.25 }

export function analyzeZiResponse(response: ZiResponseForAnalysis, highRiskTags = DEFAULT_HIGH_RISK_TAGS): ZiAnalysisResult {
  const text = normalizeZiText(response.opinion)
  const positive = POSITIVE.filter((word) => text.includes(normalizeZiText(word))).length
  const negative = NEGATIVE.filter((word) => text.includes(normalizeZiText(word))).length
  const denominator = Math.max(1, positive + negative)
  const sentimentScore = clamp((positive - negative) / denominator, -1, 1)
  const sentimentLabel = sentimentScore > 0.15 ? 'positif' : sentimentScore < -0.15 ? 'negatif' : 'netral'
  const aiTags = TAG_RULES.filter(([, terms]) => terms.some((term) => text.includes(normalizeZiText(term)))).map(([tag]) => tag)
  const combinedTags = [...new Set([...response.sourceTags, ...aiTags])]
  const normalizedHighRisk = new Map(highRiskTags.map((tag) => [normalizeZiText(tag), tag]))
  const foundHighRisk = combinedTags.flatMap((tag) => normalizedHighRisk.get(normalizeZiText(tag)) ?? []).filter(Boolean)
  const highStarsNegative = response.starRating >= 4 && sentimentLabel === 'negatif'
  const lowStarsPositive = response.starRating <= 2 && sentimentLabel === 'positif'
  const mismatch = highStarsNegative || lowStarsPositive
  return {
    sentimentScore,
    sentimentLabel,
    mismatch,
    mismatchReason: highStarsNegative ? 'Rating tinggi tidak selaras dengan sentimen negatif' : lowStarsPositive ? 'Rating rendah tidak selaras dengan sentimen positif' : null,
    aiTags,
    highRiskTags: [...new Set(foundHighRisk)],
    confidence: Math.min(0.95, 0.55 + Math.abs(sentimentScore) * 0.35 + (positive + negative > 1 ? 0.05 : 0)),
    modelName: 'rule-based-id-v1',
  }
}

export function calculateZiCri(rows: Array<{ starRating: number; sentimentScore: number | null; highRiskTags: string[] }>, weights = DEFAULT_CRI_WEIGHTS) {
  if (!rows.length) return { averageRating: 0, lowRatingPct: 0, highRiskTagPct: 0, negativeSentimentIntensity: 0, criScore: 0, riskLevel: 'rendah' as const }
  const lowRatingPct = percentage(rows.filter((row) => row.starRating <= 2).length, rows.length)
  const highRiskTagPct = percentage(rows.filter((row) => row.highRiskTags.length > 0).length, rows.length)
  const negativeSentimentIntensity = percentage(rows.reduce((sum, row) => sum + Math.max(0, -(row.sentimentScore ?? 0)), 0), rows.length)
  const criScore = round(lowRatingPct * weights.lowRating + highRiskTagPct * weights.highRiskTag + negativeSentimentIntensity * weights.negativeSentiment)
  return {
    averageRating: round(rows.reduce((sum, row) => sum + row.starRating, 0) / rows.length),
    lowRatingPct: round(lowRatingPct), highRiskTagPct: round(highRiskTagPct), negativeSentimentIntensity: round(negativeSentimentIntensity), criScore,
    riskLevel: criScore >= 65 ? 'tinggi' as const : criScore >= 35 ? 'menengah' as const : 'rendah' as const,
  }
}

function percentage(value: number, total: number) { return total ? (value / total) * 100 : 0 }
function round(value: number) { return Math.round(value * 100) / 100 }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
function normalizeZiText(value: unknown) { return String(value ?? '').normalize('NFKD').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ') }
