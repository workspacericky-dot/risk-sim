'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { catatLog } from '@/lib/e-perjadin/log'

const JALUR = '/dashboard/e-perjadin/koordinat-satker'

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null, userId: null }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null, userId: null }
  return { error: null, supabase, userId: user.id }
}

export async function simpanKoordinat(unitId: string, fd: FormData): Promise<{ error: string } | { success: true }> {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const kosong = fd.get('hapus') === 'true'
  const lintang = kosong ? null : Number(fd.get('lintang'))
  const bujur = kosong ? null : Number(fd.get('bujur'))
  const radius = kosong ? null : Math.round(Number(fd.get('radius_geofence')))

  if (!kosong) {
    if (!Number.isFinite(lintang) || lintang! < -90 || lintang! > 90) return { error: 'Lintang tidak sah (-90..90).' }
    if (!Number.isFinite(bujur) || bujur! < -180 || bujur! > 180) return { error: 'Bujur tidak sah (-180..180).' }
    if (!Number.isFinite(radius) || radius! <= 0) return { error: 'Radius geofence harus > 0 meter.' }
  }

  const { error } = await supabase.from('unit_kerja')
    .update({ lintang, bujur, radius_geofence: radius, updated_at: new Date().toISOString() }).eq('id', unitId)
  if (error) return { error: error.message }

  await catatLog(supabase, {
    aktorId: userId!, aksi: kosong ? 'hapus_koordinat_satker' : 'set_koordinat_satker',
    entitas: 'unit_kerja', entitasId: unitId, nilaiBaru: kosong ? null : { lintang, bujur, radius },
  })
  revalidatePath(JALUR)
  return { success: true }
}
