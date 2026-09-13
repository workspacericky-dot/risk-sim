import 'server-only'

import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export const ZI_ALLOWED_ROLES = ['admin_sistem', 'evaluator_apip'] as const

export async function requireZiAccess() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('users')
    .select('role,status_aktif,nama_lengkap')
    .eq('id', user.id)
    .single()
  if (!profile?.status_aktif || !ZI_ALLOWED_ROLES.includes(profile.role as (typeof ZI_ALLOWED_ROLES)[number])) redirect('/dashboard')
  return { supabase, user, role: profile.role, name: profile.nama_lengkap, isAdmin: profile.role === 'admin_sistem' }
}

