'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/utils/supabase/admin'
import { createUnlockToken, getSiwasUser, makePinHash, pinMatches } from '@/lib/siwas-access'
import { POHON_COOKIE, POHON_PUBLIC_SUBJECT, POHON_REPORT_KEY, getPohonSetting } from '@/lib/pohon-access'

export type PohonActionState = { error?: string; success?: boolean; message?: string }

export async function unlockPohonKinerja(_state: PohonActionState, formData: FormData): Promise<PohonActionState> {
  const pin = String(formData.get('pin') ?? '').trim()
  if (!/^\d{4,12}$/.test(pin)) return { error: 'PIN harus terdiri dari 4–12 angka.' }
  const setting = await getPohonSetting()
  if (!setting) return { error: 'PIN Pohon Kinerja belum ditetapkan oleh administrator.' }
  if (!pinMatches(pin, setting)) return { error: 'PIN tidak sesuai. Silakan periksa kembali.' }

  const cookieStore = await cookies()
  cookieStore.set(POHON_COOKIE, createUnlockToken(POHON_PUBLIC_SUBJECT, setting), {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 8 * 60 * 60,
  })
  return { success: true }
}

export async function lockPohonKinerja() {
  const cookieStore = await cookies()
  cookieStore.delete(POHON_COOKIE)
  revalidatePath('/dashboard/siwas')
  revalidatePath('/pohon-kinerja')
}

export async function updatePohonPin(_state: PohonActionState, formData: FormData): Promise<PohonActionState> {
  const user = await getSiwasUser()
  if (!user || user.role !== 'admin_sistem') return { error: 'Hanya Administrator Sistem yang dapat mengubah PIN.' }
  const pin = String(formData.get('new_pin') ?? '').trim()
  const confirmation = String(formData.get('confirm_pin') ?? '').trim()
  if (!/^\d{4,12}$/.test(pin)) return { error: 'PIN baru harus terdiri dari 4–12 angka.' }
  if (pin !== confirmation) return { error: 'Konfirmasi PIN tidak cocok.' }

  const { salt, hash } = makePinHash(pin)
  const admin = createAdminClient()
  const { error } = await admin.from('siwas_report_settings').upsert({
    report_key: POHON_REPORT_KEY,
    pin_salt: salt,
    pin_hash: hash,
    updated_at: new Date().toISOString(),
    updated_by: user.id,
  }, { onConflict: 'report_key' })
  if (error) return { error: `PIN gagal disimpan: ${error.message}` }

  const cookieStore = await cookies()
  cookieStore.delete(POHON_COOKIE)
  revalidatePath('/dashboard/siwas')
  revalidatePath('/pohon-kinerja')
  return { success: true, message: 'PIN Pohon Kinerja berhasil diperbarui. Akses lama telah dikunci.' }
}
