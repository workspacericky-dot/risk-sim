'use server'

import { revalidatePath } from 'next/cache'
import { requirePpgAccess } from '@/lib/ppg/access'
import { ensurePpgDemoData, resetPpgDemoData } from '@/lib/ppg/demo-seed'
import { scenarioIdForKey, type PpgScenarioKey } from '@/lib/ppg/scenario'

export async function setPpgScenario(key: PpgScenarioKey) {
  const access = await requirePpgAccess()
  if (key !== 'real' && key !== 'demo') return { ok: false, message: 'Slot data tidak valid.' }
  const { error } = await access.supabase.from('ppg_user_scenario_preferences').upsert({
    user_id: access.user.id,
    scenario_id: scenarioIdForKey(key),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  if (error) return { ok: false, message: `Slot gagal diganti: ${error.message}. Jalankan migration_ppg.sql terbaru.` }
  if (key === 'demo') {
    const seeded = await ensurePpgDemoData(access.user.id)
    if (!seeded.ok) {
      await access.supabase.from('ppg_user_scenario_preferences').update({ scenario_id: scenarioIdForKey('real'), updated_at: new Date().toISOString() }).eq('user_id', access.user.id)
      return { ...seeded, message: `${seeded.message} Slot dikembalikan ke Data Riil.` }
    }
  }
  revalidatePath('/dashboard/ppg', 'layout')
  return { ok: true, message: key === 'demo' ? 'Simulasi Lengkap aktif.' : 'Data Riil aktif.' }
}

export async function resetPpgDemo() {
  const access = await requirePpgAccess()
  if (!access.isAdmin) return { ok: false, message: 'Reset simulasi hanya tersedia bagi Admin Sistem.' }
  const result = await resetPpgDemoData(access.user.id)
  revalidatePath('/dashboard/ppg', 'layout')
  return result
}
