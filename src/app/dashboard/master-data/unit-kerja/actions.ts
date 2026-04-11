'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addUnitKerja(formData: FormData) {
  const supabase = await createClient()

  const kode_unit = formData.get('kode_unit') as string
  const nama_unit = formData.get('nama_unit') as string
  const tingkat = parseInt(formData.get('tingkat') as string)
  const lokasi = formData.get('lokasi') as string
  const parent_unit_id = formData.get('parent_unit_id') as string | null

  // Minimal validation
  if (!kode_unit || !nama_unit || isNaN(tingkat)) {
    return { error: 'Kode Unit, Nama Unit, dan Tingkat wajib diisi.' }
  }

  const payload = {
    kode_unit,
    nama_unit,
    tingkat,
    lokasi: lokasi || null,
    parent_unit_id: (!parent_unit_id || parent_unit_id === 'none') ? null : parent_unit_id,
  }

  const { error } = await supabase.from('unit_kerja').insert([payload])

  if (error) {
    console.error("Error adding unit kerja", error)
    return { error: error.message }
  }

  revalidatePath('/dashboard/master-data/unit-kerja')
  return { success: true }
}
