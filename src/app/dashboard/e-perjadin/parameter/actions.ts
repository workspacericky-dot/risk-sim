'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { catatLog } from '@/lib/e-perjadin/log'
import { PARAMETER_BAWAAN } from '@/lib/e-perjadin/konstanta'

const JALUR = '/dashboard/e-perjadin/parameter'

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null, userId: null }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null, userId: null }
  return { error: null, supabase, userId: user.id }
}

export async function simpanParameter(key: string, nilai: string): Promise<{ error: string } | { success: true }> {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }
  const v = nilai.trim()
  if (!v) return { error: 'Nilai tidak boleh kosong.' }
  if (key === 'ambang_durasi_lokasi_menit' && Number(v) < 360) return { error: 'Ambang durasi lokasi tidak boleh < 360 menit (durasi_dinas).' }

  const { error } = await supabase.from('perjadin_parameter')
    .update({ nilai: v, updated_at: new Date().toISOString() }).eq('key', key)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: userId!, aksi: 'set_parameter', entitas: 'perjadin_parameter', entitasId: key, nilaiBaru: { nilai: v } })
  revalidatePath(JALUR)
  return { success: true }
}

export async function seedParameterHilang() {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }
  const { data: ada } = await supabase.from('perjadin_parameter').select('key')
  const adaSet = new Set((ada ?? []).map((r) => r.key))
  const baris = Object.entries(PARAMETER_BAWAAN)
    .filter(([k]) => !adaSet.has(k))
    .map(([key, v]) => ({ key, nilai: v.nilai, keterangan: v.keterangan }))
  if (baris.length === 0) return { success: true, jumlah: 0 }
  const { error } = await supabase.from('perjadin_parameter').insert(baris)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: userId!, aksi: 'seed_parameter_hilang', entitas: 'perjadin_parameter', entitasId: '-', nilaiBaru: baris.map((b) => b.key) })
  revalidatePath(JALUR)
  return { success: true, jumlah: baris.length }
}
