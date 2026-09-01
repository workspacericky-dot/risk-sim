'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { catatLog } from '@/lib/e-perjadin/log'
import { KOMPONEN_SBM } from '@/lib/e-perjadin/konstanta'

const JALUR = '/dashboard/e-perjadin/sbm'

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null, userId: null }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null, userId: null }

  return { error: null, supabase, userId: user.id }
}

export async function simpanSbm(formData: FormData) {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const tahun = Number(formData.get('tahun'))
  const provinsi = String(formData.get('provinsi') ?? '').trim()
  const komponen = String(formData.get('komponen') ?? '')
  const tingkat_biaya = String(formData.get('tingkat_biaya') ?? '').trim()
  const nilai = Number(formData.get('nilai'))
  const satuan = String(formData.get('satuan') ?? '').trim()

  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100) return { error: 'Tahun anggaran tidak sah.' }
  if (!provinsi) return { error: 'Provinsi wajib diisi.' }
  if (!(KOMPONEN_SBM as readonly string[]).includes(komponen)) return { error: 'Komponen tidak sah.' }
  if (!tingkat_biaya) return { error: 'Tingkat biaya wajib diisi.' }
  if (!Number.isFinite(nilai) || nilai < 0) return { error: 'Nilai tarif tidak sah.' }
  if (!satuan) return { error: 'Satuan wajib diisi.' }

  const { error } = await supabase.from('perjadin_sbm').upsert(
    { tahun, provinsi, komponen, tingkat_biaya, nilai: Math.round(nilai), satuan, updated_at: new Date().toISOString() },
    { onConflict: 'tahun,provinsi,komponen,tingkat_biaya' },
  )
  if (error) return { error: error.message }

  await catatLog(supabase, {
    aktorId: userId!, aksi: 'upsert_sbm', entitas: 'perjadin_sbm',
    entitasId: `${tahun}/${provinsi}/${komponen}/${tingkat_biaya}`,
    nilaiBaru: { nilai: Math.round(nilai), satuan },
  })

  revalidatePath(JALUR)
  return { success: true }
}

export async function hapusSbm(id: string) {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const { error } = await supabase.from('perjadin_sbm').delete().eq('id', id)
  if (error) return { error: error.message }

  await catatLog(supabase, { aktorId: userId!, aksi: 'hapus_sbm', entitas: 'perjadin_sbm', entitasId: id })

  revalidatePath(JALUR)
  return { success: true }
}
