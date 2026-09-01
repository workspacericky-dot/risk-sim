'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { cekKombinasiPeran } from '@/lib/e-perjadin/sod'
import { catatLog } from '@/lib/e-perjadin/log'
import { PERAN_PERJADIN } from '@/lib/e-perjadin/konstanta'

const JALUR = '/dashboard/e-perjadin/peran'

async function klienAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' as const, supabase: null, userId: null }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') return { error: 'Akses ditolak.' as const, supabase: null, userId: null }

  return { error: null, supabase, userId: user.id }
}

/** Ganti seluruh peran perjadin satu pengguna. SoD ditegakkan sebelum menulis. */
export async function setPeranPengguna(targetUserId: string, peranTerpilih: string[]) {
  const { error: errAkses, supabase, userId } = await klienAdmin()
  if (errAkses || !supabase) return { error: errAkses ?? 'Akses ditolak.' }

  const peran = [...new Set(peranTerpilih)].filter((p) =>
    (PERAN_PERJADIN as readonly string[]).includes(p),
  )

  const sod = cekKombinasiPeran(peran)
  if (!sod.ok) return { error: sod.error }

  const { data: sebelum } = await supabase
    .from('perjadin_peran').select('peran').eq('user_id', targetUserId)

  const { error: errHapus } = await supabase
    .from('perjadin_peran').delete().eq('user_id', targetUserId)
  if (errHapus) return { error: errHapus.message }

  if (peran.length > 0) {
    const { error: errSisip } = await supabase.from('perjadin_peran').insert(
      peran.map((p) => ({ user_id: targetUserId, peran: p, aktif: true })),
    )
    if (errSisip) return { error: errSisip.message }
  }

  await catatLog(supabase, {
    aktorId: userId!,
    aksi: 'set_peran_perjadin',
    entitas: 'perjadin_peran',
    entitasId: targetUserId,
    nilaiLama: (sebelum ?? []).map((b) => b.peran),
    nilaiBaru: peran,
  })

  revalidatePath(JALUR)
  return { success: true }
}
