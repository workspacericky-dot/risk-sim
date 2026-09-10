'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import {
  SIWAS_COOKIE,
  SIWAS_PUBLIC_SUBJECT,
  SIWAS_REPORT_KEY,
  createUnlockToken,
  getSiwasSetting,
  getSiwasUser,
  makePinHash,
  pinMatches,
} from '@/lib/siwas-access'

export type SiwasActionState = { error?: string; success?: boolean; message?: string }

export async function unlockSiwasReport(
  _state: SiwasActionState,
  formData: FormData,
): Promise<SiwasActionState> {
  const pin = String(formData.get('pin') ?? '').trim()
  if (!/^\d{4,12}$/.test(pin)) return { error: 'PIN harus terdiri dari 4–12 angka.' }
  const setting = await getSiwasSetting()
  if (!setting) return { error: 'PIN laporan belum ditetapkan oleh administrator.' }
  if (!pinMatches(pin, setting)) return { error: 'PIN tidak sesuai. Silakan periksa kembali.' }

  const cookieStore = await cookies()
  cookieStore.set(SIWAS_COOKIE, createUnlockToken(SIWAS_PUBLIC_SUBJECT, setting), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return { success: true }
}

export async function lockSiwasReport() {
  const cookieStore = await cookies()
  cookieStore.delete(SIWAS_COOKIE)
  revalidatePath('/dashboard/siwas')
  revalidatePath('/siwas')
}

export async function updateSiwasPin(
  _state: SiwasActionState,
  formData: FormData,
): Promise<SiwasActionState> {
  const user = await getSiwasUser()
  if (!user || user.role !== 'admin_sistem') return { error: 'Hanya Administrator Sistem yang dapat mengubah PIN.' }
  const pin = String(formData.get('new_pin') ?? '').trim()
  const confirmation = String(formData.get('confirm_pin') ?? '').trim()
  if (!/^\d{4,12}$/.test(pin)) return { error: 'PIN baru harus terdiri dari 4–12 angka.' }
  if (pin !== confirmation) return { error: 'Konfirmasi PIN tidak cocok.' }

  const { salt, hash } = makePinHash(pin)
  const admin = createAdminClient()
  const { error } = await admin.from('siwas_report_settings').upsert({
    report_key: SIWAS_REPORT_KEY,
    pin_salt: salt,
    pin_hash: hash,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'report_key' })
  if (error) return { error: `PIN gagal disimpan: ${error.message}` }

  const cookieStore = await cookies()
  cookieStore.delete(SIWAS_COOKIE)
  revalidatePath('/dashboard/siwas')
  revalidatePath('/siwas')
  return { success: true, message: 'PIN laporan berhasil diperbarui. Semua akses lama telah dikunci.' }
}
