'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addSmapKonteks(formData: FormData) {
  const supabase = await createClient()

  const unit_kerja_id          = formData.get('unit_kerja_id') as string
  const tahun                  = parseInt(formData.get('tahun') as string)
  const nama_pemilik_risiko    = (formData.get('nama_pemilik_risiko') as string) ?? ''
  const jabatan_pemilik_risiko = (formData.get('jabatan_pemilik_risiko') as string) ?? ''

  if (!unit_kerja_id || isNaN(tahun)) {
    return { error: 'Unit kerja dan tahun wajib diisi.' }
  }

  const { error } = await supabase.from('smap_konteks').insert([{
    unit_kerja_id,
    tahun,
    nama_pemilik_risiko,
    jabatan_pemilik_risiko,
  }])

  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap')
  return { success: true }
}

export async function updateSmapKonteks(formData: FormData) {
  const supabase = await createClient()

  const id                     = formData.get('id') as string
  const nama_pemilik_risiko    = (formData.get('nama_pemilik_risiko') as string) ?? ''
  const jabatan_pemilik_risiko = (formData.get('jabatan_pemilik_risiko') as string) ?? ''
  const tahun                  = parseInt(formData.get('tahun') as string)

  if (!id) return { error: 'ID tidak ditemukan.' }

  const { error } = await supabase.from('smap_konteks').update({
    nama_pemilik_risiko,
    jabatan_pemilik_risiko,
    tahun,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap')
  return { success: true }
}

export async function deleteSmapKonteks(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('smap_konteks').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap')
  return { success: true }
}
