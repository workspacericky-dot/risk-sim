'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { smapScore } from '@/lib/smap-data'

export async function upsertSmapEvaluasi(formData: FormData) {
  const supabase = await createClient()

  const risiko_id           = formData.get('risiko_id') as string
  const uraian_penanganan   = (formData.get('uraian_penanganan') as string) ?? ''
  const batas_waktu         = (formData.get('batas_waktu') as string) || null
  const pic                 = (formData.get('pic') as string) ?? ''
  const efektif_level        = (formData.get('efektif_level') as string) || null
  const efektif              = efektif_level === 'Memadai' ? true : efektif_level ? false : null
  const kemungkinan_residual = parseInt(formData.get('kemungkinan_residual') as string)
  const dampak_residual      = parseInt(formData.get('dampak_residual') as string)
  const target_level         = (formData.get('target_level') as string) || null

  if (!risiko_id) return { error: 'Risiko ID tidak ditemukan.' }

  const status_residual = (!isNaN(kemungkinan_residual) && !isNaN(dampak_residual))
    ? smapScore(kemungkinan_residual, dampak_residual)
    : null

  const { error } = await supabase.from('smap_evaluasi').upsert([{
    risiko_id,
    uraian_penanganan,
    batas_waktu,
    pic,
    efektif_level,
    efektif,
    kemungkinan_residual: isNaN(kemungkinan_residual) ? null : kemungkinan_residual,
    dampak_residual:      isNaN(dampak_residual) ? null : dampak_residual,
    status_residual,
    target_level,
    updated_at: new Date().toISOString(),
  }], { onConflict: 'risiko_id' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap/evaluasi')
  return { success: true }
}

export async function deleteSmapEvaluasi(risikoId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('smap_evaluasi').delete().eq('risiko_id', risikoId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap/evaluasi')
  return { success: true }
}
