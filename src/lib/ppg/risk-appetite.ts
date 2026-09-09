export const PPG_APPETITE_CATEGORIES = [
  { key: 'strategis', label: 'Risiko Strategis', description: 'Risiko terhadap sasaran strategis organisasi.', suggested: 9 },
  { key: 'kebijakan', label: 'Risiko Kebijakan', description: 'Risiko akibat kebijakan yang tidak tepat atau tidak jelas.', suggested: 9 },
  { key: 'kecurangan', label: 'Risiko Kecurangan', description: 'Gratifikasi, fraud, suap, atau penyalahgunaan kewenangan.', suggested: 4 },
  { key: 'bencana', label: 'Risiko Bencana', description: 'Risiko akibat bencana alam maupun non-alam.', suggested: 9 },
  { key: 'kepatuhan', label: 'Risiko Kepatuhan', description: 'Ketidakpatuhan pada kewajiban pengendalian gratifikasi.', suggested: 8 },
  { key: 'operasional', label: 'Risiko Operasional', description: 'Kegagalan proses, SDM, atau sistem operasional.', suggested: 9 },
  { key: 'kemitraan', label: 'Risiko Kemitraan', description: 'Paparan dari penyedia, advokat, bank, dan mitra lain.', suggested: 9 },
] as const

export type PpgAppetiteKey = (typeof PPG_APPETITE_CATEGORIES)[number]['key']
export type PpgAppetiteValues = Record<PpgAppetiteKey, number>

export const PPG_DEFAULT_APPETITE: PpgAppetiteValues = Object.fromEntries(
  PPG_APPETITE_CATEGORIES.map((category) => [category.key, category.suggested]),
) as PpgAppetiteValues

export function ppgAppetiteKey(category: unknown): PpgAppetiteKey | null {
  const normalized = String(category || '').toLocaleLowerCase('id-ID')
  const match = PPG_APPETITE_CATEGORIES.find((item) => normalized.includes(item.key) || (item.key === 'kecurangan' && normalized.includes('fraud')))
  return match?.key ?? null
}

export function ppgAppetiteThreshold(category: unknown, appetite: Record<string, unknown> | null | undefined) {
  const key = ppgAppetiteKey(category)
  if (!key || !appetite) return null
  const value = Number(appetite[key])
  return Number.isInteger(value) && value >= 1 && value <= 25 ? value : null
}

export function evaluatePpgAppetite(score: unknown, category: unknown, appetite: Record<string, unknown> | null | undefined) {
  const residualScore = Number(score)
  const threshold = ppgAppetiteThreshold(category, appetite)
  if (!Number.isFinite(residualScore) || threshold === null) return { status: 'belum_ditetapkan' as const, threshold, residualScore }
  return { status: residualScore > threshold ? 'di_atas_selera' as const : 'dalam_selera' as const, threshold, residualScore }
}
