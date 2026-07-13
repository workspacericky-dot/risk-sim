'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export async function login(formData: FormData) {
  const identifier = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string

  if (!identifier || !password) return { error: 'ID pengguna dan kata sandi wajib diisi.' }

  // ID bisa berupa email atau nama lengkap. Jika bukan email, cari email-nya.
  let email = identifier
  if (!identifier.includes('@')) {
    const admin = createAdminClient()
    const { data: matches } = await admin.from('users').select('email').ilike('nama_lengkap', identifier)
    if (!matches || matches.length === 0) return { error: 'Nama atau email tidak ditemukan.' }
    if (matches.length > 1) return { error: 'Nama tidak unik. Silakan login menggunakan email.' }
    email = matches[0].email
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: error.message }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

// Pendaftaran mandiri — role DIKUNCI ke peserta_consulting di sisi server.
export async function register(formData: FormData) {
  const nama_lengkap = (formData.get('nama_lengkap') as string)?.trim()
  const emailInput = (formData.get('email') as string)?.trim()
  const password = formData.get('password') as string
  const passwordConfirm = formData.get('password_confirm') as string

  if (!nama_lengkap || !password) return { error: 'Nama dan kata sandi wajib diisi.' }
  if (password.length < 8) return { error: 'Kata sandi minimal 8 karakter.' }
  if (passwordConfirm != null && password !== passwordConfirm) return { error: 'Konfirmasi kata sandi tidak cocok.' }

  const admin = createAdminClient()

  // Email opsional. Tanpa email, nama lengkap menjadi ID login → wajib unik.
  let email = emailInput
  if (!email) {
    const { data: dup } = await admin.from('users').select('id').ilike('nama_lengkap', nama_lengkap).limit(1)
    if (dup && dup.length > 0) return { error: 'Nama sudah digunakan. Tambahkan pembeda (mis. unit) atau isi email.' }
    const slug = nama_lengkap.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '') || 'peserta'
    email = `${slug}.${Math.random().toString(36).slice(2, 8)}@rals.local`
  }

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
