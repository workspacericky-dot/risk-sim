'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addKonteks(formData: FormData) {
  const supabase = await createClient()

  const unit_kerja_id = formData.get('unit_kerja_id') as string
  const tahun_penerapan = parseInt(formData.get('tahun_penerapan') as string)
  const sasaran_strategis = formData.get('sasaran_strategis') as string
  const proses_bisnis = formData.get('proses_bisnis') as string
  const selera_risiko = parseInt(formData.get('selera_risiko') as string)

  if (!unit_kerja_id || isNaN(tahun_penerapan) || !sasaran_strategis) {
    return { error: 'Semua field wajib diisi' }
  }

  const { error } = await supabase.from('penetapan_konteks').insert([
    {
      unit_kerja_id,
      tahun_penerapan,
      sasaran_strategis,
      proses_bisnis,
      selera_risiko,
      status: 'Draft'
    }
  ])

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard/konteks')
  return { success: true }
}
