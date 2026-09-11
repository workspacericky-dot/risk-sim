type Row = Record<string, unknown>

export function isPpgProgramEligibleForTreatedRisk(program: Row, register: Row) {
  if (String(program.status) !== 'selesai' || !program.ditetapkan_at) return false
  return eligibleItems(program, register).some((item) => String(item.status) === 'selesai')
}

export function eligiblePpgProgramItemsForPlanning(program: Row, register: Row) {
  if (!program.ditetapkan_at || String(program.status) === 'dibatalkan') return []
  return eligibleItems(program, register)
}

export function isPpgProgramItemEligibleForPlanning(program: Row, itemId: string, register: Row) {
  return eligiblePpgProgramItemsForPlanning(program, register).some((item) => String(item.id) === itemId)
}

function eligibleItems(program: Row, register: Row) {
  const unitId = String(register.unit_kerja_id || '')
  const riskId = String(register.risk_library_id || '')
  if (!unitId || !riskId) return []
  return rows(program.items).filter((item) =>
    String(item.risk_library_id) === riskId
    && rows(item.clusters).some((cluster) => rows(cluster.units).some((unit) => String(unit.unit_kerja_id) === unitId)),
  )
}

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.map((item) => record(item)) : []
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}
