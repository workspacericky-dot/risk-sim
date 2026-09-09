'use server'

import { revalidatePath } from 'next/cache'
import { requirePpgAdmin } from '@/lib/ppg/access'
import { createAdminClient } from '@/utils/supabase/admin'

export async function deactivateControlLibrary(controlId: string, alasan: string) {
  const { supabase, user } = await requirePpgAdmin()
  const { error } = await supabase
    .from('ppg_control_library')
    .update({
      status: 'nonaktif',
      alasan_nonaktif: alasan,
      nonaktif_by: user.id,
      nonaktif_at: new Date().toISOString()
    })
    .eq('id', controlId)
    
  if (error) {
    return { status: 'error', message: error.message }
  }
  
  revalidatePath('/dashboard/ppg/pustaka')
  return { status: 'success', message: 'Kontrol berhasil dinonaktifkan.' }
}

export async function promoteMitigationToControl(riskLibraryId: string, tindakan: string, jenis: string = 'preventif') {
  const { user } = await requirePpgAdmin()
  
  const admin = createAdminClient()
  
  const { data: maxKode } = await admin.from('ppg_control_library').select('kode').order('kode', { ascending: false }).limit(1)
  let nextKodeNum = 1
  if (maxKode && maxKode.length > 0) {
    const numMatch = maxKode[0].kode.match(/\d+/)
    if (numMatch) {
       nextKodeNum = parseInt(numMatch[0], 10) + 1
    }
  }
  const nextKode = 'C-' + String(nextKodeNum).padStart(3, '0')
  
  const { data: control, error: controlError } = await admin
    .from('ppg_control_library')
    .insert({
       kode: nextKode,
       nama: tindakan,
       jenis: jenis,
       uraian: 'Diangkat dari mitigasi satker',
       status: 'aktif',
       created_by: user.id
    })
    .select('id')
    .single()
    
  if (controlError) {
    return { status: 'error', message: controlError.message }
  }
  
  const { error: linkError } = await admin
    .from('ppg_library_risk_controls')
    .insert({
       risk_library_id: riskLibraryId,
       control_id: control.id,
       catatan_keterkaitan: 'Promosi mitigasi ke pustaka'
    })
    
  if (linkError) {
    return { status: 'error', message: linkError.message }
  }
  
  revalidatePath('/dashboard/ppg/pustaka')
  return { status: 'success', message: 'Mitigasi berhasil diangkat menjadi kontrol.' }
}
