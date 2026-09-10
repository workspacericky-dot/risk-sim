import 'server-only'

import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'

export const SIWAS_REPORT_KEY = 'ketepatan_waktu'
export const SIWAS_COOKIE = 'risk_sim_siwas_access'
export const SIWAS_PUBLIC_SUBJECT = 'public-siwas-visitor'

type Setting = { pin_salt: string; pin_hash: string; updated_at: string }

export async function getSiwasUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('users')
    .select('role, status_aktif')
    .eq('id', user.id)
    .single()
  if (!profile?.status_aktif || profile.role !== 'admin_sistem') return null
  return { id: user.id, role: profile.role as string }
}

export async function getSiwasSetting(): Promise<Setting | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('siwas_report_settings')
    .select('pin_salt, pin_hash, updated_at')
    .eq('report_key', SIWAS_REPORT_KEY)
    .maybeSingle()
  return data as Setting | null
}

export function makePinHash(pin: string, salt = randomBytes(16).toString('hex')) {
  return { salt, hash: scryptSync(pin, salt, 64).toString('hex') }
}

export function pinMatches(pin: string, setting: Setting) {
  const supplied = Buffer.from(makePinHash(pin, setting.pin_salt).hash, 'hex')
  const expected = Buffer.from(setting.pin_hash, 'hex')
  return supplied.length === expected.length && timingSafeEqual(supplied, expected)
}

function signingKey() {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di .env.local')
  return secret
}

export function createUnlockToken(userId: string, setting: Setting) {
  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    version: setting.updated_at,
    exp: Date.now() + 8 * 60 * 60 * 1000,
  })).toString('base64url')
  const signature = createHmac('sha256', signingKey()).update(payload).digest('base64url')
  return `${payload}.${signature}`
}

export function isUnlockTokenValid(token: string | undefined, userId: string, setting: Setting) {
  if (!token) return false
  const [payload, signature] = token.split('.')
  if (!payload || !signature) return false
  const expected = createHmac('sha256', signingKey()).update(payload).digest()
  const supplied = Buffer.from(signature, 'base64url')
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return false
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      sub?: string
      version?: string
      exp?: number
    }
    return value.sub === userId && value.version === setting.updated_at &&
      typeof value.exp === 'number' && value.exp > Date.now()
  } catch {
    return false
  }
}

export async function hasSiwasUnlock(userId: string, setting: Setting | null) {
  if (!setting) return false
  const cookieStore = await cookies()
  return isUnlockTokenValid(cookieStore.get(SIWAS_COOKIE)?.value, userId, setting)
}
