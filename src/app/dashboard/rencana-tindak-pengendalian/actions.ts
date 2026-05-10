'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function upsertRtpRow(formData: FormData) {
  const supabase = await createClient()

  const penyebabId        = formData.get('penyebab_id') as string
  const risikoId          = formData.get('risiko_id') as string
  const konteksId         = formData.get('konteks_id') as string
  const klasifikasiSpip   = (formData.get('klasifikasi_spip')  as string) ?? ''
  const penanggungJawab   = (formData.get('penanggung_jawab')  as string) ?? ''
  const indikatorKeluaran = (formData.get('indikator_keluaran') as string) ?? ''
  const targetWaktu       = (formData.get('target_waktu')      as string) ?? ''
  const frekuensiRaw      = formData.get('frekuensi_rencana')
  const dampakRaw         = formData.get('dampak_rencana')
  const frekuensiRencana  = frekuensiRaw ? parseInt(frekuensiRaw as string) : null
  const dampakRencana     = dampakRaw    ? parseInt(dampakRaw    as string) : null

  if (!penyebabId || !risikoId || !konteksId) {
    return { error: 'Data tidak lengkap' }
  }

  const { error } = await supabase
    .from('rencana_tindak_pengendalian')
    .upsert({
      penyebab_id:         penyebabId,
      risiko_id:           risikoId,
      konteks_id:          konteksId,
      klasifikasi_spip:    klasifikasiSpip,
      penanggung_jawab:    penanggungJawab,
      indikator_keluaran:  indikatorKeluaran,
      target_waktu:        targetWaktu,
      frekuensi_rencana:   frekuensiRencana,
      dampak_rencana:      dampakRencana,
    }, { onConflict: 'penyebab_id' })

  if (error) return { error: error.message }

  revalidatePath('/dashboard/rencana-tindak-pengendalian')
  return { success: true }
}
