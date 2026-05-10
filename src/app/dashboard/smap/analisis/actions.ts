'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'
import { smapScore } from '@/lib/smap-data'

export async function upsertSmapAnalisis(formData: FormData) {
  const supabase = await createClient()

  const risiko_id              = formData.get('risiko_id') as string
  const kemungkinan_inherent   = parseInt(formData.get('kemungkinan_inherent') as string)
  const dampak_inherent        = parseInt(formData.get('dampak_inherent') as string)
  const kontrol_saat_ini       = (formData.get('kontrol_saat_ini') as string) ?? ''
  const kemungkinan_existing   = parseInt(formData.get('kemungkinan_existing') as string)
  const dampak_existing        = parseInt(formData.get('dampak_existing') as string)

  if (!risiko_id || isNaN(kemungkinan_inherent) || isNaN(dampak_inherent)) {
    return { error: 'Risiko ID dan Inherent Risk (K & D) wajib diisi.' }
  }

  const status_inherent = smapScore(kemungkinan_inherent, dampak_inherent)
  const status_existing = (!isNaN(kemungkinan_existing) && !isNaN(dampak_existing))
    ? smapScore(kemungkinan_existing, dampak_existing)
    : null

  const payload = {
    risiko_id,
    kemungkinan_inherent,
    dampak_inherent,
    status_inherent,
    kontrol_saat_ini,
    kemungkinan_existing: isNaN(kemungkinan_existing) ? null : kemungkinan_existing,
    dampak_existing:      isNaN(dampak_existing) ? null : dampak_existing,
    status_existing,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('smap_analisis')
    .upsert([payload], { onConflict: 'risiko_id' })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap/analisis')
  return { success: true }
}

export async function deleteSmapAnalisis(risikoId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('smap_analisis').delete().eq('risiko_id', risikoId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/smap/analisis')
  return { success: true }
}
