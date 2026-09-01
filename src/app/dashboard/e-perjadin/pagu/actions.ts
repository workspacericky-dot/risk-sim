'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { catatLog } from '@/lib/e-perjadin/log'

const JALUR = '/dashboard/e-perjadin/pagu'

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null, userId: null }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null, userId: null }

  return { error: null, supabase, userId: user.id }
}

export async function simpanPagu(formData: FormData) {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const tahun = Number(formData.get('tahun'))
  const mata_anggaran = String(formData.get('mata_anggaran') ?? '').trim()
  const uraian = String(formData.get('uraian') ?? '').trim()
  const pagu = Number(formData.get('pagu'))

  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return { error: 'Tahun anggaran tidak sah.' }
  if (!mata_anggaran) return { error: 'Mata anggaran wajib diisi.' }
  if (!Number.isFinite(pagu) || pagu < 0) return { error: 'Nilai pagu tidak sah.' }

  const { error } = await supabase.from('perjadin_pagu').upsert(
    { tahun, mata_anggaran, uraian, pagu: Math.round(pagu), updated_at: new Date().toISOString() },
    { onConflict: 'tahun,mata_anggaran' },
  )
  if (error) return { error: error.message }

  await catatLog(supabase, {
    aktorId: userId!, aksi: 'upsert_pagu', entitas: 'perjadin_pagu',
    entitasId: `${tahun}/${mata_anggaran}`, nilaiBaru: { pagu: Math.round(pagu), uraian },
  })

  revalidatePath(JALUR)
  return { success: true }
}

export async function hapusPagu(id: string) {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const { error } = await supabase.from('perjadin_pagu').delete().eq('id', id)
  if (error) return { error: error.message }

  await catatLog(supabase, { aktorId: userId!, aksi: 'hapus_pagu', entitas: 'perjadin_pagu', entitasId: id })

  revalidatePath(JALUR)
  return { success: true }
}
