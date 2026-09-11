import 'server-only'

import { createAdminClient } from '@/utils/supabase/admin'

export const PPG_REAL_SCENARIO_ID = '00000000-0000-4000-8000-000000000001'
export const PPG_DEMO_SCENARIO_ID = '00000000-0000-4000-8000-000000000002'

export type PpgScenarioKey = 'real' | 'demo'

type QueryChain = { eq: (column: string, value: string) => QueryChain }
type QueryTarget = {
  select: (...args: unknown[]) => QueryChain
  insert: (payload: unknown, ...args: unknown[]) => unknown
  upsert: (payload: unknown, ...args: unknown[]) => unknown
  update: (...args: unknown[]) => QueryChain
  delete: (...args: unknown[]) => QueryChain
}

export const PPG_SCENARIO_TABLES = new Set([
  'ppg_risk_appetites', 'ppg_risk_library', 'ppg_control_library', 'ppg_library_risk_controls', 'ppg_register',
  'ppg_risk_controls', 'ppg_risk_control_validations', 'ppg_mitigations', 'ppg_import_batches',
  'ppg_reports', 'ppg_audit_log', 'ppg_analysis_snapshots', 'ppg_risk_import_batches',
  'ppg_risk_import_rows', 'ppg_risk_candidates', 'ppg_risk_candidate_members', 'ppg_programs',
  'ppg_program_items', 'ppg_program_item_controls', 'ppg_program_clusters',
  'ppg_program_cluster_units', 'ppg_program_updates', 'ppg_satker_program_assignments', 'ppg_loss_events',
  'ppg_loss_event_controls', 'ppg_loss_event_code_counters', 'ppg_loss_event_report_links', 'ppg_program_loss_events',
  'ppg_ai_recommendation_runs', 'ppg_ai_action_candidates',
])

export function scenarioIdForKey(key: PpgScenarioKey) {
  return key === 'demo' ? PPG_DEMO_SCENARIO_ID : PPG_REAL_SCENARIO_ID
}

/**
 * Service-role client that still enforces the selected PPG save slot.
 * Some Satker workflows need service-role access for cross-table validation and
 * private evidence storage; this wrapper prevents that privilege from bypassing
 * scenario isolation.
 */
export function createPpgAdminClient(scenarioId: string) {
  const client = createAdminClient()
  return new Proxy(client, {
    get(target, property, receiver) {
      if (property !== 'from') return Reflect.get(target, property, receiver)
      return (table: string) => {
        const query = target.from(table)
        if (!PPG_SCENARIO_TABLES.has(table)) return query
        const scopedQuery = new Proxy(query as unknown as QueryTarget, {
          get(queryTarget, queryProperty, queryReceiver) {
            if (queryProperty === 'select') {
              return (...args: unknown[]) => queryTarget.select(...args).eq('scenario_id', scenarioId)
            }
            if (queryProperty === 'insert' || queryProperty === 'upsert') {
              return (values: unknown, ...args: unknown[]) => {
                const scoped = Array.isArray(values)
                  ? values.map((value) => ({ ...(value as Record<string, unknown>), scenario_id: scenarioId }))
                  : { ...(values as Record<string, unknown>), scenario_id: scenarioId }
                const method = queryTarget[queryProperty].bind(queryTarget)
                return method(scoped, ...args)
              }
            }
            if (queryProperty === 'update' || queryProperty === 'delete') {
              return (...args: unknown[]) => {
                const method = queryTarget[queryProperty].bind(queryTarget)
                return method(...args).eq('scenario_id', scenarioId)
              }
            }
            return Reflect.get(queryTarget, queryProperty, queryReceiver)
          },
        })
        return scopedQuery as unknown as typeof query
      }
    },
  }) as ReturnType<typeof createAdminClient>
}
