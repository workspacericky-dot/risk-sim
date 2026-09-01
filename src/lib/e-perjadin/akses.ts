import type { SupabaseClient } from '@supabase/supabase-js'
import { PERAN_PERJADIN, type PeranPerjadin } from './konstanta'

/**
 * Boleh membuka modul E-Perjadin: admin_sistem, atau pemegang peran perjadin
 * aktif mana pun — mengikuti pola gerbang akses modul CA (PRD F-6.1).
 */
export function bisaAksesEPerjadin(
  role: string | null | undefined,
  peranAktif: readonly string[],
): boolean {
  return role === 'admin_sistem' || peranAktif.length > 0
}

export type AksesEPerjadin = {
  userId: string | null
  role: string | null
  peran: PeranPerjadin[]
  bisaAkses: boolean
  isAdmin: boolean
}

/** Muat konteks akses modul untuk satu request server (dipakai layout & halaman). */
export async function muatAksesEPerjadin(supabase: SupabaseClient): Promise<AksesEPerjadin> {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, role: null, peran: [], bisaAkses: false, isAdmin: false }

  const [{ data: profile }, { data: barisPeran }] = await Promise.all([
    supabase.from('users').select('role').eq('id', user.id).single(),
    supabase.from('perjadin_peran').select('peran').eq('user_id', user.id).eq('aktif', true),
  ])

  const peran = ((barisPeran ?? []) as { peran: string }[])
    .map((b) => b.peran)
    .filter((p): p is PeranPerjadin => (PERAN_PERJADIN as readonly string[]).includes(p))
  const role = (profile as { role?: string } | null)?.role ?? null

  return { userId: user.id, role, peran, bisaAkses: bisaAksesEPerjadin(role, peran), isAdmin: role === 'admin_sistem' }
}
