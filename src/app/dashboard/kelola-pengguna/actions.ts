'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

const ALLOWED_ROLES = new Set([
  'admin_sistem', 'admin_satker', 'pemilik_risiko', 'pengelola_risiko',
  'kepala_umr', 'anggota_umr', 'kepala_apip', 'anggota_apip',
  'pemilik_risiko_ma', 'peserta_consulting', 'upg_pusat', 'upg_satker', 'evaluator_apip',
])

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
  if (!ALLOWED_ROLES.has(role)) return { error: 'Role pengguna tidak dikenali.' }
  if (role === 'upg_satker' && !unit_kerja_id) return { error: 'Role UPG Satker wajib dikaitkan dengan unit kerja.' }

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

  const admin = createAdminClient()
  // Pertahankan histori PPG saat akun UPG dihapus; identitas aktor menjadi null,
  // sementara data kejadian/program tetap utuh untuk audit organisasi.
  await Promise.all([
    ...['ppg_risk_library','ppg_control_library','ppg_register','ppg_mitigations','ppg_import_batches','ppg_classification_rules','ppg_analysis_snapshots','ppg_risk_import_batches','ppg_risk_candidates','ppg_programs','ppg_program_items','ppg_program_updates','ppg_led_limit_versions'].map((table) => admin.from(table).update({ created_by: null }).eq('created_by', userId)),
    admin.from('ppg_audit_log').update({ actor_id: null }).eq('actor_id', userId),
    admin.from('ppg_loss_events').update({ created_by: null }).eq('created_by', userId),
    admin.from('ppg_loss_events').update({ validated_by: null }).eq('validated_by', userId),
    admin.from('ppg_loss_event_report_links').update({ created_by: null }).eq('created_by', userId),
    admin.from('ppg_loss_event_report_links').update({ reviewed_by: null }).eq('reviewed_by', userId),
    admin.from('ppg_risk_candidates').update({ reviewed_by: null }).eq('reviewed_by', userId),
    admin.from('ppg_risk_library').update({ nonaktif_by: null }).eq('nonaktif_by', userId),
  ])
  await supabase.from('users').delete().eq('id', userId)

  const { error } = await admin.auth.admin.deleteUser(userId)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/kelola-pengguna')
  return { success: true }
}
