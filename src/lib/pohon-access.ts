import 'server-only'

import { cookies } from 'next/headers'
import { createAdminClient } from '@/utils/supabase/admin'
import { isUnlockTokenValid } from '@/lib/siwas-access'

export const POHON_REPORT_KEY = 'pohon_kinerja_2025'
export const POHON_COOKIE = 'risk_sim_pohon_kinerja_access'
export const POHON_PUBLIC_SUBJECT = 'public-pohon-kinerja-visitor'

export type PohonSetting = { pin_salt: string; pin_hash: string; updated_at: string }

export async function getPohonSetting(): Promise<PohonSetting | null> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('siwas_report_settings')
    .select('pin_salt, pin_hash, updated_at')
    .eq('report_key', POHON_REPORT_KEY)
    .maybeSingle()
  if (error) throw new Error(`Pengaturan PIN Pohon Kinerja gagal dibaca: ${error.message}`)
  return data as PohonSetting | null
}

export async function hasPohonUnlock(setting: PohonSetting | null) {
  if (!setting) return false
  const cookieStore = await cookies()
  return isUnlockTokenValid(cookieStore.get(POHON_COOKIE)?.value, POHON_PUBLIC_SUBJECT, setting)
}
