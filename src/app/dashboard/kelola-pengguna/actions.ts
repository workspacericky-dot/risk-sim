'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

async function assertAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as string, supabase: null, userId: null }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as string, supabase: null, userId: null }
  return { error: null, supabase, userId: user.id }
}

export async function createUser(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const { error: authErr, supabase } = await assertAdmin()
  if (authErr || !supabase) return { error: authErr ?? 'Akses ditolak.' }

  const email = (formData.get('email') as string).trim()
  const password = formData.get('password') as string
  const nama_lengkap = (formData.get('nama_lengkap') as string).trim()
  const role = formData.get('role') as string
  const unit_kerja_id = (formData.get('unit_kerja_id') as string) || null

  if (!email || !password || !nama_lengkap || !role) return { error: 'Semua field wajib diisi.' }

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError) return { error: authError.message }

  const { error: dbError } = await supabase.from('users').insert({
    id: authData.user.id,
    email,
    nama_lengkap,
    role,
    unit_kerja_id,
    status_aktif: true,
  })
  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  revalidatePath('/dashboard/kelola-pengguna')
  return { success: true }
}

export async function deleteUser(userId: string): Promise<{ error?: string; success?: boolean }> {
  const { error: authErr, supabase, userId: callerId } = await assertAdmin()
  if (authErr || !supabase) return { error: authErr ?? 'Akses ditolak.' }
  if (callerId === userId) return { error: 'Tidak dapat menghapus akun Anda sendiri.' }

  await supabase.from('users').delete().eq('id', userId)

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/kelola-pengguna')
  return { success: true }
}
