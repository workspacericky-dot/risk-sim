'use server'

import { revalidatePath } from 'next/cache'
import { requirePpgAccess } from '@/lib/ppg/access'
import { PPG_APPETITE_CATEGORIES } from '@/lib/ppg/risk-appetite'

export type AppetiteActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function savePpgRiskAppetite(_previous: AppetiteActionState, formData: FormData): Promise<AppetiteActionState> {
  const access = await requirePpgAccess()
  if (!access.isSatker && !access.isAdmin) return failure('Selera risiko ditetapkan oleh UPG Satker; UPG Pusat memiliki akses pemantauan.')
  const unitId = access.isSatker ? access.unitId : String(formData.get('unit_kerja_id') || '')
  const year = Number(formData.get('tahun'))
  if (!unitId || !isUuid(unitId) || !Number.isInteger(year) || year < 2000 || year > 2200) return failure('Satker atau tahun penetapan tidak valid.')

  const values: Record<string, number> = {}
  for (const category of PPG_APPETITE_CATEGORIES) {
    const value = Number(formData.get(category.key))
    if (!Number.isInteger(value) || value < 1 || value > 25) return failure(`Nilai ${category.label} harus berupa bilangan 1–25.`)
    values[category.key] = value
  }
  const notes = String(formData.get('catatan') || '').trim()
  if (notes.length > 1500) return failure('Catatan/justifikasi maksimum 1.500 karakter.')

  const { error } = await access.supabase.from('ppg_risk_appetites').upsert({
    scenario_id: access.scenarioId,
    unit_kerja_id: unitId,
    tahun: year,
    ...values,
    catatan: notes,
    ditetapkan_by: access.user.id,
    ditetapkan_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'scenario_id,unit_kerja_id,tahun' })
  if (error) return failure(`Selera risiko gagal disimpan: ${error.message}. Pastikan migration_ppg.sql terbaru sudah dijalankan.`)
  revalidatePath('/dashboard/ppg', 'layout')
  return { status: 'success', message: `Selera risiko PPG tahun ${year} berhasil ditetapkan.` }
}

function failure(message: string): AppetiteActionState { return { status: 'error', message } }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
