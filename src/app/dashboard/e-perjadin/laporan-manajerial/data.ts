import type { SupabaseClient } from '@supabase/supabase-js'
import type { MentahPenugasan } from '@/lib/e-perjadin/manajerial'

/** Kumpulkan baris mentah penugasan (Berjalan/Selesai) untuk agregasi O4. */
export async function muatMentahPenugasan(supabase: SupabaseClient): Promise<MentahPenugasan[]> {
  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, maksud, status, provinsi, unit_tujuan_id, pka_id, tanggal_berangkat, tanggal_kembali, unit:unit_tujuan_id(nama_unit)')
    .in('status', ['Berjalan', 'Selesai']).order('tanggal_berangkat', { ascending: false })
  const penugasan = (pn ?? []) as unknown as Record<string, unknown>[]
  if (penugasan.length === 0) return []

  const ids = penugasan.map((p) => p.id as string)
  const [{ data: peserta }, { data: espj }] = await Promise.all([
    supabase.from('perjadin_peserta').select('penugasan_id, estimasi_total').in('penugasan_id', ids),
    supabase.from('perjadin_espj').select('id, penugasan_id').in('penugasan_id', ids),
  ])
  const espjIds = (espj ?? []).map((e) => e.id as string)
  const { data: lines } = espjIds.length
    ? await supabase.from('perjadin_espj_peserta').select('espj_id, selisih, selisih_final, uang_muka').in('espj_id', espjIds)
    : { data: [] as Record<string, unknown>[] }

  const espjPerPenugasan = new Map<string, string>()
  for (const e of espj ?? []) espjPerPenugasan.set(e.penugasan_id as string, e.id as string)
  const linesPerEspj = new Map<string, { selisih: number; selisih_final: number | null; uang_muka: number }[]>()
  for (const l of lines ?? []) {
    const arr = linesPerEspj.get(l.espj_id as string) ?? []
    arr.push({
      selisih: Number(l.selisih), selisih_final: l.selisih_final != null ? Number(l.selisih_final) : null,
      uang_muka: Number(l.uang_muka),
    })
    linesPerEspj.set(l.espj_id as string, arr)
  }
  const pesertaPerPenugasan = new Map<string, number[]>()
  for (const p of peserta ?? []) {
    const arr = pesertaPerPenugasan.get(p.penugasan_id as string) ?? []
    arr.push(Number(p.estimasi_total))
    pesertaPerPenugasan.set(p.penugasan_id as string, arr)
  }

  return penugasan.map((p) => {
    const est = pesertaPerPenugasan.get(p.id as string) ?? []
    const espjId = espjPerPenugasan.get(p.id as string)
    return {
      id: p.id as string, nomor: (p.nomor as string) ?? null, maksud: p.maksud as string, status: p.status as string,
      provinsi: p.provinsi as string, satker: (p.unit as { nama_unit?: string } | null)?.nama_unit ?? '—',
      unitId: (p.unit_tujuan_id as string) ?? null,
      tanggalBerangkat: p.tanggal_berangkat as string, tanggalKembali: p.tanggal_kembali as string,
      adaPka: !!p.pka_id, jumlahPeserta: est.length, estimasiTotal: est.reduce((s, n) => s + n, 0),
      espjLines: espjId ? linesPerEspj.get(espjId) ?? [] : [],
    }
  })
}
