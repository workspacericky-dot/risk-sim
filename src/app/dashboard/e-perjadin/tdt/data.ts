import type { SupabaseClient } from '@supabase/supabase-js'
import { hitungTitikWajib, titikBelumTerekam } from '@/lib/e-perjadin/presensi'
import { hitungMetrikMingguan, pekanTerakhir, type MentahMetrik, type MentahMetrikPenugasan } from '@/lib/e-perjadin/metrik'

const HARI_MS = 86_400_000
const tambahHari = (iso: string, n: number) =>
  new Date(Date.parse(`${iso}T00:00:00Z`) + n * HARI_MS).toISOString().slice(0, 10)

/** Baris mentah untuk satu pekan (Senin `mingguMulai`). Populasi TDT kumulatif s/d akhir pekan. */
export async function muatMentahMetrik(supabase: SupabaseClient, mingguMulai: string): Promise<MentahMetrik> {
  const mingguSelesai = tambahHari(mingguMulai, 6)
  const awalTs = `${mingguMulai}T00:00:00`
  const akhirTs = `${mingguSelesai}T23:59:59`

  const { data: pnRows } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, jenis_alur, tanggal_berangkat, tanggal_kembali')
    .not('status', 'in', '("Draf","Dibatalkan")')
    .lte('tanggal_kembali', mingguSelesai)
  const penugasanRows = (pnRows ?? []) as {
    id: string; nomor: string | null; jenis_alur: string; tanggal_berangkat: string; tanggal_kembali: string
  }[]
  const ids = penugasanRows.map((p) => p.id)

  const [{ data: presensi }, { data: laporan }, { data: espj }] = ids.length
    ? await Promise.all([
        supabase.from('perjadin_presensi').select('penugasan_id, jenis, tanggal, status_verifikasi, diputus_pada').in('penugasan_id', ids),
        supabase.from('perjadin_laporan').select('penugasan_id, status').in('penugasan_id', ids),
        supabase.from('perjadin_espj').select('penugasan_id, disetujui_pada, siklus_revisi').in('penugasan_id', ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }]

  const presPer = new Map<string, { jenis: string; tanggal: string; status_verifikasi: string; diputus_pada: string | null }[]>()
  for (const r of (presensi ?? []) as Record<string, unknown>[]) {
    const k = r.penugasan_id as string
    const arr = presPer.get(k) ?? []
    arr.push({ jenis: r.jenis as string, tanggal: r.tanggal as string, status_verifikasi: r.status_verifikasi as string, diputus_pada: (r.diputus_pada as string) ?? null })
    presPer.set(k, arr)
  }
  const laporanPer = new Map((laporan ?? []).map((l) => [l.penugasan_id as string, l.status as string]))
  const espjPer = new Map((espj ?? []).map((e) => [e.penugasan_id as string, e as { disetujui_pada: string | null; siklus_revisi: number }]))

  const penugasan: MentahMetrikPenugasan[] = penugasanRows.map((p) => {
    const rekam = presPer.get(p.id) ?? []
    const wajib = hitungTitikWajib(p.tanggal_berangkat, p.tanggal_kembali)
    const e = espjPer.get(p.id)
    return {
      id: p.id,
      tanggalKembali: p.tanggal_kembali,
      jenisAlur: p.jenis_alur,
      adaNomorSt: !!p.nomor,
      titikWajibBelum: titikBelumTerekam(wajib, rekam).length,
      presensiBelumDiputus: rekam.filter((r) => r.status_verifikasi === 'anomali' || r.status_verifikasi === 'pernyataan_pending').length,
      presensiDiputusManual: rekam.filter((r) => r.diputus_pada != null).length,
      laporanFinal: laporanPer.get(p.id) === 'final',
      espjDisetujuiPada: e?.disetujui_pada ?? null,
      siklusRevisi: e?.siklus_revisi ?? 0,
    }
  })

  // Anti-metrik & HEART: kejadian dalam rentang pekan.
  const [{ data: presMinggu }, { count: nRampung }, { count: nTotalMinggu }, { count: nAtasSbm }] = await Promise.all([
    supabase.from('perjadin_presensi').select('sumber, percobaan_ke, durasi_rekam_detik').gte('created_at', awalTs).lte('created_at', akhirTs),
    supabase.from('perjadin_penugasan').select('id', { count: 'exact', head: true }).eq('jenis_alur', 'Rampung').gte('tanggal_berangkat', mingguMulai).lte('tanggal_berangkat', mingguSelesai),
    supabase.from('perjadin_penugasan').select('id', { count: 'exact', head: true }).neq('status', 'Dibatalkan').gte('tanggal_berangkat', mingguMulai).lte('tanggal_berangkat', mingguSelesai),
    supabase.from('perjadin_biaya').select('id', { count: 'exact', head: true }).eq('disetujui_ppk', true).gte('updated_at', awalTs).lte('updated_at', akhirTs),
  ])
  const pm = (presMinggu ?? []) as { sumber: string; percobaan_ke: number | null; durasi_rekam_detik: number | null }[]
  const pwaTercatat = pm.filter((r) => r.sumber === 'pwa' && r.percobaan_ke != null)

  return {
    penugasan,
    antiMetrik: {
      fallback: pm.filter((r) => r.sumber === 'fallback').length,
      atasSbm: nAtasSbm ?? 0,
      rampung: nRampung ?? 0,
      totalPenugasanMinggu: nTotalMinggu ?? 0,
    },
    heart: {
      presensiPercobaanPertama: pwaTercatat.filter((r) => r.percobaan_ke === 1).length,
      totalPresensiPwa: pwaTercatat.length,
      durasiRekamDetik: pm.map((r) => r.durasi_rekam_detik).filter((n): n is number => n != null),
    },
  }
}

export type SnapshotMetrik = {
  minggu_mulai: string
  tdt_pembilang: number
  tdt_penyebut: number
  kr: Record<string, number>
  anti_metrik: Record<string, number>
  heart: Record<string, number>
  dihitung_pada: string
}

/** Snapshot tersimpan sejak `sejak` (ISO Senin), terlama dulu. */
export async function muatSnapshotMetrik(supabase: SupabaseClient, sejak: string): Promise<SnapshotMetrik[]> {
  const { data } = await supabase.from('perjadin_metrik_mingguan')
    .select('minggu_mulai, tdt_pembilang, tdt_penyebut, kr, anti_metrik, heart, dihitung_pada')
    .gte('minggu_mulai', sejak).order('minggu_mulai', { ascending: true })
  return (data ?? []) as SnapshotMetrik[]
}

export type BarisDeret = {
  mingguMulai: string
  ada: boolean
  berjalan: boolean
  tdt: number | null
  tdtPembilang: number
  tdtPenyebut: number
  kr: Record<string, number>
  antiMetrik: Record<string, number>
  heart: Record<string, number>
  dihitungPada: string | null
}

/**
 * Deret 12 pekan untuk dasbor & ekspor: snapshot tersimpan + pekan berjalan
 * (dihitung on-demand, tidak disimpan sampai pekan tutup — §2).
 */
export async function muatDeretMetrik(supabase: SupabaseClient, hariIni: string): Promise<BarisDeret[]> {
  const pekan = pekanTerakhir(hariIni, 12)
  const berjalanMulai = pekan[pekan.length - 1]
  const [snapshot, mentahBerjalan] = await Promise.all([
    muatSnapshotMetrik(supabase, pekan[0]),
    muatMentahMetrik(supabase, berjalanMulai),
  ])
  const snapMap = new Map(snapshot.map((s) => [s.minggu_mulai, s]))
  const berjalan = hitungMetrikMingguan(mentahBerjalan)

  return pekan.map((mingguMulai) => {
    const isBerjalan = mingguMulai === berjalanMulai
    const s = isBerjalan
      ? { tdt_pembilang: berjalan.tdt_pembilang, tdt_penyebut: berjalan.tdt_penyebut, kr: berjalan.kr, anti_metrik: berjalan.anti_metrik, heart: berjalan.heart, dihitung_pada: null }
      : snapMap.get(mingguMulai)
    if (!s) {
      return { mingguMulai, ada: false, berjalan: false, tdt: null, tdtPembilang: 0, tdtPenyebut: 0, kr: {}, antiMetrik: {}, heart: {}, dihitungPada: null }
    }
    return {
      mingguMulai, ada: true, berjalan: isBerjalan,
      tdt: s.tdt_penyebut > 0 ? s.tdt_pembilang / s.tdt_penyebut : null,
      tdtPembilang: s.tdt_pembilang, tdtPenyebut: s.tdt_penyebut,
      kr: s.kr ?? {}, antiMetrik: s.anti_metrik ?? {}, heart: s.heart ?? {},
      dihitungPada: s.dihitung_pada ?? null,
    }
  })
}
