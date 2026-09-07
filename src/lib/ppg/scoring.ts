export const PPG_LEVELS = [
  { min: 1, max: 5, label: 'Sangat Rendah', color: '#22c55e' },
  { min: 6, max: 11, label: 'Rendah', color: '#84cc16' },
  { min: 12, max: 15, label: 'Sedang', color: '#facc15' },
  { min: 16, max: 19, label: 'Tinggi', color: '#f97316' },
  { min: 20, max: 25, label: 'Sangat Tinggi', color: '#dc2626' },
] as const

export type PpgRiskLevel = (typeof PPG_LEVELS)[number]['label']

export function ppgScore(kemungkinan: number, dampak: number) {
  if (![kemungkinan, dampak].every((value) => Number.isInteger(value) && value >= 1 && value <= 5)) {
    throw new RangeError('Kemungkinan dan dampak PPG harus berupa bilangan 1 sampai 5.')
  }
  return kemungkinan * dampak
}

export function ppgRiskLevel(score: number): PpgRiskLevel {
  const level = PPG_LEVELS.find((item) => score >= item.min && score <= item.max)
  if (!level) throw new RangeError('Skor PPG harus berada pada rentang 1 sampai 25.')
  return level.label
}

export function ppgAssessment(kemungkinan: number, dampak: number) {
  const score = ppgScore(kemungkinan, dampak)
  return { score, level: ppgRiskLevel(score) }
}

export function ppgLevelColor(level: PpgRiskLevel) {
  return PPG_LEVELS.find((item) => item.label === level)?.color ?? '#64748b'
}
