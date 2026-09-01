import type { SupabaseClient } from '@supabase/supabase-js'
import { hitungHakKeuangan, type TarifSbm, type ParamDanom, type InputDanom, type JenisDinas } from './sbm'
import { cekTumpangTindih, type KonflikKandidat } from './penugasan'
import { KOMPONEN_SBM, JENIS_DINAS } from './konstanta'

/** Helper DANOM dipakai bersama server action penugasan & revisi (bukan 'use server'). */

export async function paramDanom(supabase: SupabaseClient): Promise<ParamDanom & { dprDefault: number }> {
  const { data } = await supabase.from('perjadin_parameter').select('key, nilai').in('key', [
    'tarif_dalam_kota_harian', 'tarif_transport_lokal_dalam_kota', 'toleransi_overbudget_tiket',
    'faktor_penginapan_30persen', 'tarif_dpr_default',
    'tarif_representasi_luar_kota', 'faktor_harian_transport_riil',
  ])
  const m = Object.fromEntries(((data ?? []) as { key: string; nilai: string }[]).map((r) => [r.key, r.nilai]))
  return {
    tarifDalamKotaHarian: Number(m.tarif_dalam_kota_harian || 210_000),
    tarifTransportLokalDalamKota: Number(m.tarif_transport_lokal_dalam_kota || 170_000),
    toleransiOverbudgetTiket: Number(m.toleransi_overbudget_tiket || 500_000),
    faktorPenginapan30: Number(m.faktor_penginapan_30persen || 0.3),
    tarifRepresentasiLuarKota: Number(m.tarif_representasi_luar_kota || 150_000),
    faktorHarianTransportRiil: Number(m.faktor_harian_transport_riil || 0.6),
    dprDefault: Number(m.tarif_dpr_default || 300_000),
  }
}

export async function tarifSbmUntuk(supabase: SupabaseClient, tahun: number, provinsi: string): Promise<TarifSbm[]> {
  const { data } = await supabase.from('perjadin_sbm')
    .select('tahun, provinsi, komponen, tingkat_biaya, nilai, satuan')
    .eq('tahun', tahun).eq('provinsi', provinsi)
  return ((data ?? []) as TarifSbm[]).filter((t) => (KOMPONEN_SBM as readonly string[]).includes(t.komponen))
}

export type HeaderPn = { jenis_dinas: string; tanggal_berangkat: string; tanggal_kembali: string; provinsi: string; tahun_anggaran: number }
export type PesertaDanom = {
  tingkat_biaya: string; penginapan_mode: string; homebase_jabodetabek: boolean
  berhak_representasi?: boolean; transport_lokal_riil?: boolean; pakai_kendaraan_dinas?: boolean
  estimasi_pesawat: number; estimasi_dpr: number; rute_pesawat?: string | null
}

export function inputDanom(pn: HeaderPn, p: PesertaDanom, param: ParamDanom): InputDanom {
  return {
    jenisDinas: (JENIS_DINAS as readonly string[]).includes(pn.jenis_dinas) ? (pn.jenis_dinas as JenisDinas) : 'Luar Kota',
    tanggalBerangkat: pn.tanggal_berangkat, tanggalKembali: pn.tanggal_kembali,
    provinsi: pn.provinsi, tahun: pn.tahun_anggaran,
    kategori: p.tingkat_biaya === '2' ? '2' : '1',
    penginapanMode: (['hotel', '30persen', 'tidak'].includes(p.penginapan_mode) ? p.penginapan_mode : 'hotel') as InputDanom['penginapanMode'],
    homebaseJabodetabek: !!p.homebase_jabodetabek,
    berhakRepresentasi: !!p.berhak_representasi,
    transportLokalRiil: !!p.transport_lokal_riil,
    pakaiKendaraanDinas: !!p.pakai_kendaraan_dinas,
    estimasiPesawat: Number(p.estimasi_pesawat ?? 0),
    estimasiDpr: Number(p.estimasi_dpr ?? 0),
    ruteSubLabel: p.rute_pesawat && p.rute_pesawat !== '-' ? p.rute_pesawat : undefined,
    param,
  }
}

/** Hitung ulang estimasi DANOM seluruh peserta aktif (tidak ditarik). */
export async function recomputeEstimasi(supabase: SupabaseClient, penugasanId: string): Promise<string | null> {
  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('jenis_dinas, tanggal_berangkat, tanggal_kembali, provinsi, tahun_anggaran').eq('id', penugasanId).single()
  if (!pn) return 'Penugasan tidak ditemukan.'
  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, tingkat_biaya, penginapan_mode, homebase_jabodetabek, berhak_representasi, transport_lokal_riil, pakai_kendaraan_dinas, estimasi_pesawat, estimasi_dpr, rute_pesawat')
    .eq('penugasan_id', penugasanId).is('ditarik_pada', null)
  if (!peserta || peserta.length === 0) return null

  const param = await paramDanom(supabase)
  const tarif = await tarifSbmUntuk(supabase, pn.tahun_anggaran, pn.provinsi)
  for (const p of peserta as (PesertaDanom & { id: string })[]) {
    let rincian
    try {
      rincian = hitungHakKeuangan(inputDanom(pn as HeaderPn, p, param), tarif)
    } catch (e) {
      return e instanceof Error ? e.message : 'Kalkulasi DANOM gagal.'
    }
    await supabase.from('perjadin_peserta')
      .update({ estimasi_rincian: rincian, estimasi_total: rincian.kwitansi, updated_at: new Date().toISOString() })
      .eq('id', p.id)
  }
  return null
}

export type PesertaRingkas = { user_id: string | null; nip: string | null; nama: string }

/** Kumpulkan penugasan lain (Berjalan/Selesai) yang beririsan untuk peserta terkait — AF-1. */
export async function kumpulkanKandidatIrisan(
  supabase: SupabaseClient, penugasanIdIni: string, peserta: PesertaRingkas[],
): Promise<KonflikKandidat[]> {
  const userIds = peserta.map((p) => p.user_id).filter((v): v is string => !!v)
  const nips = peserta.map((p) => p.nip).filter((v): v is string => !!v)
  if (userIds.length === 0 && nips.length === 0) return []
  const or: string[] = []
  if (userIds.length) or.push(`user_id.in.(${userIds.join(',')})`)
  if (nips.length) or.push(`nip.in.(${nips.map((n) => `"${n}"`).join(',')})`)

  const { data } = await supabase.from('perjadin_peserta')
    .select('user_id, nip, nama, penugasan:penugasan_id(id, nomor, status, tanggal_berangkat, tanggal_kembali)').or(or.join(','))
  if (!data) return []
  const hasil: KonflikKandidat[] = []
  for (const row of data as unknown as {
    user_id: string | null; nip: string | null; nama: string
    penugasan: { id: string; nomor: string | null; status: string; tanggal_berangkat: string; tanggal_kembali: string } | null
  }[]) {
    const pg = row.penugasan
    if (!pg || pg.id === penugasanIdIni) continue
    if (!['Berjalan', 'Selesai'].includes(pg.status)) continue
    hasil.push({ namaPeserta: row.nama, nomorPenugasan: pg.nomor, berangkat: pg.tanggal_berangkat, kembali: pg.tanggal_kembali })
  }
  return hasil
}

export async function tulisTemuan(
  supabase: SupabaseClient, penugasanId: string, pesertaId: string | null,
  kode: string, keparahan: 'blocking' | 'warning' | 'informational', ringkasan: string,
) {
  await supabase.from('perjadin_temuan').insert({ penugasan_id: penugasanId, peserta_id: pesertaId, kode, keparahan, ringkasan })
}

export { cekTumpangTindih }
