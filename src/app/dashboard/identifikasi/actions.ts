'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

// ── Official 5x5 Risk Matrix [kemungkinan][dampak] → besaran ───────────────
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getBesaran(k: number, d: number): number {
  return RISK_MATRIX[k]?.[d] ?? (k * d)
}

// ── Konversi besaran → level 1-5 (sesuai Tabel Konversi Lampiran 3) ────────
function getLevelFromBesaran(besaran: number): number {
  if (besaran >= 20) return 5
  if (besaran >= 16) return 4
  if (besaran >= 11) return 3
  if (besaran >= 6)  return 2
  return 1
}

// ── Lookup: kategori_risiko → kode angka ─────────────────────────────────
const KATEGORI_KODE: Record<string, number> = {
  'Risiko Strategis':  1,
  'Risiko Kebijakan':  2,
  'Risiko Kecurangan': 3,
  'Risiko Bencana':    4,
  'Risiko Kepatuhan':  5,
  'Risiko Operasional':6,
  'Risiko Kemitraan':  7,
}

// ── Tambah Risiko (Lampiran 5 — IDENTIFIKASI saja) ────────────────────────
export async function addRisiko(formData: FormData) {
  const supabase = await createClient()

  const konteks_id           = formData.get('konteks_id') as string
  const indikator_konteks    = (formData.get('indikator_konteks') as string) || null
  const pernyataan_risiko    = formData.get('pernyataan_risiko') as string
  const kategori_risiko      = (formData.get('kategori_risiko') as string) || null
  const dampak_potensial     = (formData.get('dampak_potensial') as string) || null
  const metode_pencapaian_spip = (formData.get('metode_pencapaian_spip') as string) || null
  const sumber_risiko        = (formData.get('sumber_risiko') as string) || null
  const penyebab_risiko      = (formData.get('penyebab_risiko') as string) || null

  if (!konteks_id || !pernyataan_risiko) {
    return { error: 'Pernyataan risiko wajib diisi' }
  }

  // ── Auto-generate kode_risiko: [kode_unit].[kat_kode].[nomor_urut] ───────
  let kode_risiko: string | null = null
  try {
    // Fetch kode_unit via konteks → unit_kerja
    const { data: konteks } = await supabase
      .from('penetapan_konteks')
      .select('unit_kerja_id, unit:unit_kerja_id(kode_unit)')
      .eq('id', konteks_id)
      .single()

    // @ts-ignore
    const kodeUnit: string = konteks?.unit?.kode_unit ?? 'UNKN'
    const katKode: number  = kategori_risiko ? (KATEGORI_KODE[kategori_risiko] ?? 0) : 0

    if (katKode > 0) {
      // Count existing risks of same category in this konteks
      const { count } = await supabase
        .from('risiko')
        .select('id', { count: 'exact', head: true })
        .eq('konteks_id', konteks_id)
        .eq('kategori_risiko', kategori_risiko)
      const nomor = (count ?? 0) + 1
      kode_risiko = `${kodeUnit}.${katKode}.${nomor}`
    }
  } catch {
    // Non-fatal: fallback to null
  }
  // ─────────────────────────────────────────────────────────────────────────

  const { error } = await supabase.from('risiko').insert([{
    konteks_id,
    kode_risiko,
    indikator_konteks,
    pernyataan_risiko,
    kategori_risiko,
    dampak_potensial,
    metode_pencapaian_spip,
    sumber_risiko,
    penyebab_risiko,
    status: 'Teridentifikasi',
  }])

  if (error) return { error: error.message }

  revalidatePath('/dashboard/identifikasi')
  return { success: true }
}

// ── Hapus Risiko ──────────────────────────────────────────────────────────
export async function deleteRisiko(risikoId: string, _konteksId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('risiko').delete().eq('id', risikoId)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/identifikasi')
  return { success: true }
}

// ── Simpan Analisis Risiko (Lampiran 6) ───────────────────────────────────
export async function saveAnalisis(formData: FormData) {
  const supabase = await createClient()

  const risiko_id = formData.get('risiko_id') as string
  const konteks_id = formData.get('konteks_id') as string
  const level_kemungkinan = parseInt(formData.get('level_kemungkinan') as string)
  const level_dampak = parseInt(formData.get('level_dampak') as string)
  const ada_pengendalian = formData.get('ada_pengendalian') === 'true'
  const existing_control = (formData.get('existing_control') as string) || null
  const efektivitas_control = formData.get('efektivitas_control') === 'true'
  // Residual fields are optional — default to null if not provided
  const residual_kemungkinan_raw = formData.get('residual_kemungkinan') as string
  const residual_dampak_raw = formData.get('residual_dampak') as string
  const residual_kemungkinan = residual_kemungkinan_raw ? parseInt(residual_kemungkinan_raw) : null
  const residual_dampak = residual_dampak_raw ? parseInt(residual_dampak_raw) : null

  // Only level_kemungkinan and level_dampak are mandatory
  if (!risiko_id || isNaN(level_kemungkinan) || isNaN(level_dampak)) {
    return { error: 'Data analisis tidak lengkap: kemungkinan dan dampak melekat wajib diisi' }
  }

  const status_risiko = getBesaran(level_kemungkinan, level_dampak)

  // Fetch selera_risiko dari konteks
  const { data: konteks } = await supabase
    .from('penetapan_konteks').select('selera_risiko').eq('id', konteks_id).single()
  const selera_risiko = konteks?.selera_risiko || 3

  // Compute residual values only when both fields are present
  const residual_besaran =
    residual_kemungkinan != null && residual_dampak != null
      ? getBesaran(residual_kemungkinan, residual_dampak)
      : null
  const residual_level =
    residual_besaran != null ? getLevelFromBesaran(residual_besaran) : null
  const di_atas_selera_risiko =
    residual_level != null ? residual_level > selera_risiko : false

  // Upsert analisis_risiko
  const { error } = await supabase.from('analisis_risiko').upsert([{
    risiko_id,
    level_kemungkinan,
    level_dampak,
    status_risiko,
    ada_pengendalian,
    existing_control,
    efektivitas_control,
    residual_kemungkinan,
    residual_dampak,
    residual_level,
    di_atas_selera_risiko,
  }], { onConflict: 'risiko_id' })

  if (error) return { error: error.message }

  // Update status risiko → Dianalisis
  await supabase.from('risiko').update({ status: 'Dianalisis' }).eq('id', risiko_id)

  revalidatePath('/dashboard/analisis')
  revalidatePath('/dashboard/evaluasi')
  return { success: true }
}

// ── BACKWARD COMPAT: alias (digunakan laporan/rtp lama) ──────────────────
export async function addRisikoAnalisis(formData: FormData) {
  return addRisiko(formData)
}
