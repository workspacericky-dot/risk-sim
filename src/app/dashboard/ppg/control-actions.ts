'use server'

import { revalidatePath } from 'next/cache'
import { requirePpgAdmin } from '@/lib/ppg/access'
import { normalizePpgControlText } from '@/lib/ppg/control-effectiveness'
import { createAdminClient } from '@/utils/supabase/admin'

type ControlActionResult = { status: 'success' | 'error'; message: string }

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const CONTROL_TYPES = ['Preventif', 'Detektif', 'Korektif'] as const

export async function deactivateControlLibrary(controlId: string, alasan: string): Promise<ControlActionResult> {
  const { user } = await requirePpgAdmin()
  const admin = createAdminClient()
  const reason = alasan.trim()
  if (!UUID_PATTERN.test(controlId) || reason.length < 5 || reason.length > 500) {
    return failure('Kontrol atau alasan penonaktifan tidak valid.')
  }

  const { data: control, error: controlError } = await admin
    .from('ppg_control_library')
    .select('id,kode,nama,status')
    .eq('id', controlId)
    .single()
  if (controlError || !control) return failure('Kontrol tidak ditemukan.')
  if (control.status !== 'aktif') return failure('Hanya kontrol aktif yang dapat dinonaktifkan dari panel CEI.')

  const { data: updated, error } = await admin
    .from('ppg_control_library')
    .update({ status: 'nonaktif', alasan_nonaktif: reason, nonaktif_by: user.id, nonaktif_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', controlId)
    .eq('status', 'aktif')
    .select('id')
    .maybeSingle()
  if (error) return failure(error.message)
  if (!updated) return failure('Status kontrol telah berubah. Muat ulang halaman lalu coba lagi.')

  await admin.from('ppg_audit_log').insert({
    actor_id: user.id,
    entity_type: 'ppg_control_library',
    entity_id: controlId,
    action: 'nonaktifkan_berdasarkan_cei',
    changes: { kode: control.kode, nama: control.nama, status_sebelumnya: control.status, status_baru: 'nonaktif', alasan: reason },
  })
  revalidateControlPages()
  return { status: 'success', message: 'Kontrol berhasil dinonaktifkan; histori penilaian tetap dipertahankan.' }
}

export async function promoteMitigationToControl(riskLibraryId: string, tindakan: string, jenis = 'Preventif'): Promise<ControlActionResult> {
  const { user } = await requirePpgAdmin()
  const admin = createAdminClient()
  const controlName = tindakan.trim()
  const controlType = CONTROL_TYPES.find((value) => value.toLocaleLowerCase('id-ID') === jenis.trim().toLocaleLowerCase('id-ID'))
  if (!UUID_PATTERN.test(riskLibraryId) || controlName.length < 5 || controlName.length > 500 || !controlType) {
    return failure('Risiko, tindakan mitigasi, atau jenis kontrol tidak valid.')
  }

  const [{ data: risk }, { data: mitigations, error: mitigationError }, { data: links, error: linksError }] = await Promise.all([
    admin.from('ppg_risk_library').select('id,kode,status').eq('id', riskLibraryId).neq('status', 'nonaktif').single(),
    admin.from('ppg_mitigations').select('id,tindakan,register:ppg_register!inner(risk_library_id)').eq('status', 'selesai').eq('register.risk_library_id', riskLibraryId).limit(1000),
    admin.from('ppg_library_risk_controls').select('control:ppg_control_library(id,nama,status)').eq('risk_library_id', riskLibraryId),
  ])
  if (!risk) return failure('Risiko library tujuan tidak tersedia.')
  if (mitigationError || linksError) return failure(mitigationError?.message ?? linksError?.message ?? 'Kandidat kontrol gagal diverifikasi.')

  const normalizedName = normalizePpgControlText(controlName)
  const isCompletedMitigation = (mitigations ?? []).some((row) => normalizePpgControlText(String(row.tindakan)) === normalizedName)
  if (!isCompletedMitigation) return failure('Mitigasi selesai yang menjadi sumber kandidat tidak ditemukan.')

  const alreadyPromoted = (links ?? []).some((link) => {
    const control = Array.isArray(link.control) ? link.control[0] : link.control
    return control?.status !== 'nonaktif' && normalizePpgControlText(String(control?.nama ?? '')) === normalizedName
  })
  if (alreadyPromoted) return failure('Tindakan ini sudah tersedia sebagai kontrol untuk risiko tersebut.')

  let createdControl: { id: string; kode: string } | null = null
  let insertError = ''
  for (let attempt = 0; attempt < 3 && !createdControl; attempt++) {
    const { data: controls, error: codesError } = await admin.from('ppg_control_library').select('kode')
    if (codesError) return failure(codesError.message)
    const lastSequence = (controls ?? []).reduce((highest, row) => {
      const match = String(row.kode).match(/^PPG\.K\.(\d+)$/)
      return Math.max(highest, match ? Number(match[1]) : 0)
    }, 0)
    const kode = `PPG.K.${lastSequence + 1}`
    const { data, error } = await admin
      .from('ppg_control_library')
      .insert({ kode, nama: controlName, jenis: controlType, uraian: 'Diangkat dari mitigasi satker yang telah selesai', status: 'aktif', created_by: user.id })
      .select('id,kode')
      .single()
    if (data) createdControl = data
    else {
      insertError = error?.message ?? 'Kontrol gagal dibuat.'
      if (error?.code !== '23505') break
    }
  }
  if (!createdControl) return failure(insertError)

  const { error: linkError } = await admin.from('ppg_library_risk_controls').insert({
    risk_library_id: riskLibraryId,
    control_id: createdControl.id,
    catatan_keterkaitan: 'Promosi mitigasi selesai melalui kurasi bottom-up',
    created_by: user.id,
  })
  if (linkError) {
    await admin.from('ppg_control_library').delete().eq('id', createdControl.id)
    return failure(`Relasi kontrol gagal dibuat: ${linkError.message}`)
  }

  await admin.from('ppg_audit_log').insert({
    actor_id: user.id,
    entity_type: 'ppg_control_library',
    entity_id: createdControl.id,
    action: 'promosi_mitigasi',
    changes: { kode: createdControl.kode, risk_library_id: riskLibraryId, risk_kode: risk.kode, tindakan: controlName },
  })
  revalidateControlPages()
  return { status: 'success', message: `${createdControl.kode} berhasil dibuat dan ditautkan ke risiko ${risk.kode}.` }
}

function failure(message: string): ControlActionResult {
  return { status: 'error', message }
}

function revalidateControlPages() {
  revalidatePath('/dashboard/ppg/pustaka')
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}
