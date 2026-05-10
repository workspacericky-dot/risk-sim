'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// ── Upsert (draft save per section or final submit) ───────────────────────
export async function upsertKonteksDraft(
  formData: FormData
): Promise<{ konteks_id?: string; error?: string }> {
  const supabase = await createClient()

  const konteks_id      = (formData.get('konteks_id')      as string) || null
  const unit_kerja_id   = formData.get('unit_kerja_id')    as string
  const tahun_str       = formData.get('tahun_penerapan')  as string
  const tahun_penerapan = parseInt(tahun_str)

  if (!unit_kerja_id || isNaN(tahun_penerapan)) {
    return { error: 'Unit kerja dan tahun penerapan wajib diisi sebelum menyimpan.' }
  }

  const periode_mulai            = (formData.get('periode_mulai')            as string) || null
  const periode_selesai          = (formData.get('periode_selesai')          as string) || null

  type SasaranItem = { sasaran: string; indikator: string[] }
  let sasaranItems: SasaranItem[] = []
  try { sasaranItems = JSON.parse((formData.get('sasaran_json') as string) || '[]') } catch {}

  let prosesItems: object[] = []
  try { prosesItems = JSON.parse((formData.get('proses_json') as string) || '[]') } catch {}

  let pemangkuItems: object[] = []
  try { pemangkuItems = JSON.parse((formData.get('pemangku_json') as string) || '[]') } catch {}

  const validSasaran = sasaranItems.filter(s => s.sasaran?.trim())
  const sasaran_strategis = JSON.stringify(validSasaran.map(s => s.sasaran))

  const payload: Record<string, unknown> = {
    unit_kerja_id,
    tahun_penerapan,
    sasaran_strategis,
    periode_mulai,
    periode_selesai,
    proses_bisnis_json:   prosesItems,
    pemangku_kepentingan: pemangkuItems,
    proses_bisnis: (prosesItems as any[]).map((p: any) => p.kode).join(', '),
    status: 'Draft',
  }

  if (konteks_id) {
    const { error } = await supabase
      .from('penetapan_konteks')
      .update(payload)
      .eq('id', konteks_id)
    if (error) return { error: error.message }
    revalidatePath('/dashboard/konteks')
    return { konteks_id }
  } else {
    const { data, error } = await supabase
      .from('penetapan_konteks')
      .insert([payload])
      .select('id')
      .single()
    if (error) return { error: error.message }
    revalidatePath('/dashboard/konteks')
    return { konteks_id: data.id }
  }
}

export async function addKonteks(formData: FormData) {
  const supabase = await createClient()

  const unit_kerja_id           = formData.get('unit_kerja_id')           as string
  const tahun_penerapan         = parseInt(formData.get('tahun_penerapan') as string)
  const nama_pemilik_risiko     = (formData.get('nama_pemilik_risiko')     as string) ?? ''
  const jabatan_pemilik_risiko  = (formData.get('jabatan_pemilik_risiko')  as string) ?? ''
  const nama_pengelola_risiko   = (formData.get('nama_pengelola_risiko')   as string) ?? ''
  const jabatan_pengelola_risiko= (formData.get('jabatan_pengelola_risiko')as string) ?? ''
  const periode_mulai           = (formData.get('periode_mulai')           as string) || null
  const periode_selesai         = (formData.get('periode_selesai')         as string) || null

  // New rich JSON fields
  const sasaranRaw  = formData.get('sasaran_json')  as string
  const prosesRaw   = formData.get('proses_json')   as string
  const pemangkuRaw = formData.get('pemangku_json') as string

  type SasaranItem = { sasaran: string; indikator: string[] }
  let sasaranItems: SasaranItem[] = []
  try { sasaranItems = JSON.parse(sasaranRaw || '[]') } catch {}

  let prosesItems: object[] = []
  try { prosesItems = JSON.parse(prosesRaw || '[]') } catch {}

  let pemangkuItems: object[] = []
  try { pemangkuItems = JSON.parse(pemangkuRaw || '[]') } catch {}

  const validSasaran = sasaranItems.filter(s => s.sasaran?.trim())

  if (!unit_kerja_id || isNaN(tahun_penerapan) || validSasaran.length === 0) {
    return { error: 'Unit kerja, tahun penerapan, dan minimal satu sasaran strategis wajib diisi.' }
  }

  // Keep backward-compat: sasaran_strategis = string[] of sasaran names (used by identifikasi page)
  const sasaran_strategis = JSON.stringify(validSasaran.map(s => s.sasaran))

  const { error } = await supabase.from('penetapan_konteks').insert([{
    unit_kerja_id,
    tahun_penerapan,
    sasaran_strategis,              // backward-compat string[] for identifikasi page
    // new columns (from migration_konteks_v2.sql)
    nama_pemilik_risiko,
    jabatan_pemilik_risiko,
    nama_pengelola_risiko,
    jabatan_pengelola_risiko,
    periode_mulai,
    periode_selesai,
    proses_bisnis_json:   prosesItems,
    pemangku_kepentingan: pemangkuItems,
    // legacy fields kept for compatibility
    proses_bisnis: prosesItems.map((p: any) => p.kode).join(', '),
    status: 'Draft',
  }])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/konteks')
  return { success: true }
}

export async function deleteKonteks(id: string): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin_sistem') return { error: 'Hanya admin yang dapat menghapus dokumen konteks.' }

  const { error } = await supabase.from('penetapan_konteks').delete().eq('id', id)
  if (error) return { error: error.message }

  revalidatePath('/dashboard/konteks')
  return { success: true }
}
