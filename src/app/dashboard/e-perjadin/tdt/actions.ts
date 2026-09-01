'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { catatLog } from '@/lib/e-perjadin/log'
import { hitungMetrikMingguan, seninPekan } from '@/lib/e-perjadin/metrik'
import { muatMentahMetrik } from './data'

const JALUR = '/dashboard/e-perjadin/tdt'

/** Hitung ulang & simpan snapshot metrik satu pekan (tombol manual, §4). */
export async function hitungMetrikSnapshot(mingguIso: string): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Hanya admin sistem yang dapat menghitung snapshot.' }

  const mingguMulai = seninPekan(mingguIso)
  if (Date.parse(`${mingguMulai}T00:00:00Z`) >= Date.parse(`${seninPekan(new Date().toISOString().slice(0, 10))}T00:00:00Z`)) {
    return { error: 'Pekan berjalan belum tutup — hanya pekan yang sudah lewat yang boleh di-snapshot.' }
  }

  const mentah = await muatMentahMetrik(supabase, mingguMulai)
  const h = hitungMetrikMingguan(mentah)

  const { error } = await supabase.from('perjadin_metrik_mingguan').upsert({
    minggu_mulai: mingguMulai,
    tdt_pembilang: h.tdt_pembilang,
    tdt_penyebut: h.tdt_penyebut,
    kr: h.kr,
    anti_metrik: h.anti_metrik,
    heart: h.heart,
    dihitung_pada: new Date().toISOString(),
    dihitung_oleh: user.id,
  }, { onConflict: 'minggu_mulai' })
  if (error) return { error: error.message }

  await catatLog(supabase, { aktorId: user.id, aksi: 'hitung_metrik_mingguan', entitas: 'perjadin_metrik_mingguan', entitasId: mingguMulai, nilaiBaru: { tdt: `${h.tdt_pembilang}/${h.tdt_penyebut}` } })
  revalidatePath(JALUR)
  return { success: true }
}
