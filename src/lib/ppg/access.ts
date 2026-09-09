import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { PPG_REAL_SCENARIO_ID, type PpgScenarioKey } from './scenario'

export async function requirePpgAdmin() {
  const access = await requirePpgAccess()
  if (!access.isPusat) redirect('/dashboard/ppg/loss-event')
  return access
}

export async function requirePpgAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('users')
    .select('role,unit_kerja_id,status_aktif')
    .eq('id', user.id)
    .single()

  const role = profile?.role ?? ''
  if (!profile?.status_aktif || !['admin_sistem', 'upg_pusat', 'upg_satker'].includes(role)) redirect('/dashboard')
  if (role === 'upg_satker' && !profile.unit_kerja_id) redirect('/dashboard')

  const { data: preference } = await supabase
    .from('ppg_user_scenario_preferences')
    .select('scenario_id,scenario:ppg_scenarios(key,nama,is_demo)')
    .eq('user_id', user.id)
    .maybeSingle()
  const scenarioRow = Array.isArray(preference?.scenario) ? preference.scenario[0] : preference?.scenario
  const scenarioKey: PpgScenarioKey = scenarioRow?.key === 'demo' ? 'demo' : 'real'
  const scenarioId = String(preference?.scenario_id || PPG_REAL_SCENARIO_ID)
  return {
    supabase,
    user,
    role,
    unitId: profile.unit_kerja_id as string | null,
    isAdmin: role === 'admin_sistem',
    isPusat: role === 'admin_sistem' || role === 'upg_pusat',
    isUpgPusat: role === 'upg_pusat',
    isSatker: role === 'upg_satker',
    scenarioId,
    scenarioKey,
    scenarioName: String(scenarioRow?.nama || 'Data Riil'),
    isDemo: scenarioKey === 'demo',
  }
}
