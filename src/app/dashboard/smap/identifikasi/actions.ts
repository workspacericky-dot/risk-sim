'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function addSmapRisiko(formData: FormData) {
  const supabase = await createClient()

  const konteks_id            = formData.get('konteks_id') as string
  const kegiatan_utama_kode   = formData.get('kegiatan_utama_kode') as string
  const kegiatan_utama_nama   = formData.get('kegiatan_utama_nama') as string
  const jenis_kegiatan_kode   = formData.get('jenis_kegiatan_kode') as string
  const jenis_kegiatan_nama   = formData.get('jenis_kegiatan_nama') as string
  const proses_kegiatan       = (formData.get('proses_kegiatan') as string) ?? ''
  const jenis_korupsi         = formData.get('jenis_korupsi') as string
  const uraian_risiko_ref_id  = formData.get('uraian_risiko_ref_id') as string
  const uraian_risiko_final   = formData.get('uraian_risiko_final') as string
  const why1                  = (formData.get('why1') as string) ?? ''
  const why2                  = (formData.get('why2') as string) ?? ''
  const why3                  = (formData.get('why3') as string) ?? ''
  const why4                  = (formData.get('why4') as string) ?? ''
  const why5                  = (formData.get('why5') as string) ?? ''
  const penyebab              = (formData.get('penyebab') as string) ?? ''
  const dampak                = (formData.get('dampak') as string) ?? ''
  const risk_owner            = (formData.get('risk_owner') as string) ?? ''

  if (!konteks_id || !kegiatan_utama_kode || !jenis_korupsi || !uraian_risiko_final) {
    return { error: 'Kegiatan Utama, Jenis Korupsi, dan Uraian Risiko wajib diisi.' }
  }

  // Get current max no_urut
  const { data: existing } = await supabase
    .from('smap_risiko')
    .select('no_urut')
    .eq('konteks_id', konteks_id)
    .order('no_urut', { ascending: false })
    .limit(1)

  const no_urut = existing && existing.length > 0 ? existing[0].no_urut + 1 : 1

  const { error } = await supabase.from('smap_risiko').insert([{
    konteks_id,
    no_urut,
    kegiatan_utama_kode,
    kegiatan_utama_nama,
    jenis_kegiatan_kode,
    jenis_kegiatan_nama,
    proses_kegiatan,
    jenis_korupsi,
    uraian_risiko_ref_id,
    uraian_risiko_final,
    why1, why2, why3, why4, why5,
    penyebab,
    dampak,
    risk_owner,
  }])

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/smap/identifikasi`)
  return { success: true }
}

export async function updateSmapRisiko(formData: FormData) {
  const supabase = await createClient()

  const id                    = formData.get('id') as string
  const konteks_id            = formData.get('konteks_id') as string
  const kegiatan_utama_kode   = formData.get('kegiatan_utama_kode') as string
  const kegiatan_utama_nama   = formData.get('kegiatan_utama_nama') as string
  const jenis_kegiatan_kode   = formData.get('jenis_kegiatan_kode') as string
  const jenis_kegiatan_nama   = formData.get('jenis_kegiatan_nama') as string
  const proses_kegiatan       = (formData.get('proses_kegiatan') as string) ?? ''
  const jenis_korupsi         = formData.get('jenis_korupsi') as string
  const uraian_risiko_ref_id  = formData.get('uraian_risiko_ref_id') as string
  const uraian_risiko_final   = formData.get('uraian_risiko_final') as string
  const why1                  = (formData.get('why1') as string) ?? ''
  const why2                  = (formData.get('why2') as string) ?? ''
  const why3                  = (formData.get('why3') as string) ?? ''
  const why4                  = (formData.get('why4') as string) ?? ''
  const why5                  = (formData.get('why5') as string) ?? ''
  const penyebab              = (formData.get('penyebab') as string) ?? ''
  const dampak                = (formData.get('dampak') as string) ?? ''
  const risk_owner            = (formData.get('risk_owner') as string) ?? ''

  if (!id) return { error: 'ID tidak ditemukan.' }

  const { error } = await supabase.from('smap_risiko').update({
    kegiatan_utama_kode,
    kegiatan_utama_nama,
    jenis_kegiatan_kode,
    jenis_kegiatan_nama,
    proses_kegiatan,
    jenis_korupsi,
    uraian_risiko_ref_id,
    uraian_risiko_final,
    why1, why2, why3, why4, why5,
    penyebab,
    dampak,
    risk_owner,
  }).eq('id', id)

  if (error) return { error: error.message }
  revalidatePath(`/dashboard/smap/identifikasi`)
  return { success: true }
}

export async function deleteSmapRisiko(id: string, konteksId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('smap_risiko').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/smap/identifikasi`)
  return { success: true }
}
