'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and Password are required' }
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// Pendaftaran mandiri — role DIKUNCI ke peserta_consulting di sisi server.
export async function register(formData: FormData) {
  const nama_lengkap = (formData.get('nama_lengkap') as string)?.trim()
  const email = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!nama_lengkap || !email || !password) return { error: 'Nama, email, dan kata sandi wajib diisi.' }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }

  const admin = createAdminClient()
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (authError) return { error: authError.message }

  // Insert via admin (service role) — bypass RLS; role dipaksa peserta_consulting.
  const { error: dbError } = await admin.from('users').insert({
    id: authData.user.id, email, nama_lengkap, role: 'peserta_consulting', status_aktif: true,
  })
  if (dbError) {
    await admin.auth.admin.deleteUser(authData.user.id)
    return { error: dbError.message }
  }

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) return { error: signInError.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard/rals')
}
