'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import type { EntriKalender } from '@/lib/ca-kepeg/kalender'
import { KATEGORI_KALENDER } from '@/lib/ca-kepeg/konstanta'

const JALUR = '/dashboard/master-data/kalender-libur'

const KATEGORI_SAH: readonly string[] = KATEGORI_KALENDER

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null }

  return { error: null, supabase }
}

/**
 * Simpan entri hasil impor. Entri sudah diratakan di sisi klien (satu baris per
 * tanggal, rentang Ramadhan terekspansi), jadi di sini cukup upsert.
 */
export async function imporKalender(entri: EntriKalender[]) {
  const { error: errAkses, supabase } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  if (!Array.isArray(entri) || entri.length === 0) {
    return { error: 'Tidak ada entri untuk diimpor.' }
  }

  const baris = entri
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.tanggal) && KATEGORI_SAH.includes(e.kategori))
    .map((e) => ({
      tanggal: e.tanggal,
      kategori: e.kategori,
      keterangan: e.keterangan ?? '',
      updated_at: new Date().toISOString(),
    }))

  if (baris.length === 0) return { error: 'Semua entri ditolak karena format tidak sah.' }

  const { error } = await supabase
    .from('kalender_libur')
    .upsert(baris, { onConflict: 'tanggal' })

  if (error) return { error: error.message }

  revalidatePath(JALUR)
  return { success: true, jumlah: baris.length }
}

export async function tambahTanggal(formData: FormData) {
  const { error: errAkses, supabase } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const tanggal = String(formData.get('tanggal') ?? '')
  const kategori = String(formData.get('kategori') ?? '')
  const keterangan = String(formData.get('keterangan') ?? '')

  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal wajib diisi.' }
  if (!KATEGORI_SAH.includes(kategori)) return { error: 'Kategori tidak sah.' }

  const { error } = await supabase
    .from('kalender_libur')
    .upsert({ tanggal, kategori, keterangan, updated_at: new Date().toISOString() },
      { onConflict: 'tanggal' })

  if (error) return { error: error.message }

  revalidatePath(JALUR)
  return { success: true }
}

export async function hapusTanggal(id: string) {
  const { error: errAkses, supabase } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const { error } = await supabase.from('kalender_libur').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath(JALUR)
  return { success: true }
}

export async function hapusTahun(tahun: number) {
  const { error: errAkses, supabase } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const { error } = await supabase
    .from('kalender_libur')
    .delete()
    .gte('tanggal', `${tahun}-01-01`)
    .lte('tanggal', `${tahun}-12-31`)

  if (error) return { error: error.message }

  revalidatePath(JALUR)
  return { success: true }
}
