'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addRTP(formData: FormData) {
  const supabase = await createClient()

  const analisis_id = formData.get('analisis_id') as string
  const kegiatan_pengendalian = formData.get('kegiatan_pengendalian') as string
  const indikator_keluaran = formData.get('indikator_keluaran') as string
  const target_waktu = formData.get('target_waktu') as string
  const level_kemungkinan_treated = parseInt(formData.get('level_kemungkinan_treated') as string)
  const level_dampak_treated = parseInt(formData.get('level_dampak_treated') as string)

  if (!analisis_id || !kegiatan_pengendalian || !target_waktu || isNaN(level_kemungkinan_treated)) {
    return { error: 'Form belum lengkap' }
  }

  const status_risiko_treated = level_kemungkinan_treated * level_dampak_treated

  const { error } = await supabase.from('rtp').insert([{
    analisis_id,
    kegiatan_pengendalian,
    indikator_keluaran,
    target_waktu,
    level_kemungkinan_treated,
    level_dampak_treated,
    status_risiko_treated,
    status_rtp: 'Disetujui' // for simplicity in prototype
  }])

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/dashboard/rtp`)
  return { success: true }
}
