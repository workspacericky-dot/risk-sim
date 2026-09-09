export type PpgControlUsage = {
  efektivitas: string | null
  registerId: string
}

export function calculatePpgControlEffectiveness(
  usages: PpgControlUsage[],
  failuresByRegister: ReadonlyMap<string, number>,
) {
  let efektif = 0
  let sebagian = 0
  let tidakEfektif = 0
  let belumDinilai = 0
  let totalFailures = 0

  for (const usage of usages) {
    if (usage.efektivitas === 'efektif') efektif++
    else if (usage.efektivitas === 'sebagian') sebagian++
    else if (usage.efektivitas === 'tidak_efektif') tidakEfektif++
    else belumDinilai++

    totalFailures += failuresByRegister.get(usage.registerId) ?? 0
  }

  const totalRated = efektif + sebagian + tidakEfektif
  if (totalRated === 0) {
    return { efektif, sebagian, tidakEfektif, belumDinilai, totalRated, totalFailures, baseScore: null, cei: null }
  }

  const baseScore = Math.round(((efektif + sebagian * 0.5) / totalRated) * 100)
  const cei = Math.max(0, baseScore - totalFailures * 5)
  return { efektif, sebagian, tidakEfektif, belumDinilai, totalRated, totalFailures, baseScore, cei }
}

export function normalizePpgControlText(value: string) {
  return value.trim().toLocaleLowerCase('id-ID').replace(/\s+/g, ' ')
}
