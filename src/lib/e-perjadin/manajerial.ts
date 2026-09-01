import { realisasiPenugasan } from './espj'

/** Baris mentah yang dikumpulkan dari beberapa tabel untuk agregasi O4. */
export type MentahPenugasan = {
  id: string
  nomor: string | null
  maksud: string
  status: string
  provinsi: string
  satker: string
  unitId: string | null
  tanggalBerangkat: string
  tanggalKembali: string
  adaPka: boolean
  jumlahPeserta: number
  estimasiTotal: number
  espjLines: { selisih: number; selisih_final: number | null; uang_muka: number }[]
}

export type BarisBiayaPenugasan = MentahPenugasan & { realisasi: number; costPerPenugasan: number }

/** Laporan biaya per penugasan (O4 / KR4.2). */
export function biayaPerPenugasan(rows: readonly MentahPenugasan[]): BarisBiayaPenugasan[] {
  return rows.map((r) => {
    const realisasi = realisasiPenugasan(r.espjLines)
    return { ...r, realisasi, costPerPenugasan: realisasi || r.estimasiTotal }
  })
}

export type BarisCakupanSatker = {
  unitId: string | null
  satker: string
  provinsi: string
  kunjungan: number
  penugasanTertautPka: number
  totalEstimasi: number
  totalRealisasi: number
}

/** Laporan cakupan satker (O4 / KR4.2): satker mana yang benar-benar diuji di lapangan. */
export function cakupanSatker(rows: readonly MentahPenugasan[]): BarisCakupanSatker[] {
  const map = new Map<string, BarisCakupanSatker>()
  for (const r of rows) {
    const kunci = r.unitId ?? `teks:${r.satker}`
    const cur = map.get(kunci) ?? {
      unitId: r.unitId, satker: r.satker, provinsi: r.provinsi,
      kunjungan: 0, penugasanTertautPka: 0, totalEstimasi: 0, totalRealisasi: 0,
    }
    cur.kunjungan += 1
    if (r.adaPka) cur.penugasanTertautPka += 1
    cur.totalEstimasi += r.estimasiTotal
    cur.totalRealisasi += realisasiPenugasan(r.espjLines)
    map.set(kunci, cur)
  }
  return [...map.values()].sort((a, b) => b.kunjungan - a.kunjungan)
}
