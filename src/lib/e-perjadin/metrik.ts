/**
 * E-Perjadin Bawas — metrik mingguan TDT & KR (PRD §3, §6; desain M9).
 * Fungsi murni: diberi baris mentah, menghasilkan angka snapshot satu pekan.
 * TDT = Tingkat perjalanan Dinas Tuntas-Terverifikasi.
 */

const HARI_MS = 86_400_000
const hariUtc = (iso: string) => Date.parse(`${iso.slice(0, 10)}T00:00:00Z`)
function selisihHari(a: string, b: string): number {
  return Math.round((hariUtc(a) - hariUtc(b)) / HARI_MS)
}
function median(xs: number[]): number {
  if (xs.length === 0) return 0
  const s = [...xs].sort((p, q) => p - q)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
const bagi = (a: number, b: number) => (b === 0 ? 0 : a / b)

/** Senin (ISO `YYYY-MM-DD`) dari pekan yang memuat `iso`. */
export function seninPekan(iso: string): string {
  const t = hariUtc(iso)
  const dow = new Date(t).getUTCDay() // 0=Minggu … 1=Senin
  const mundur = (dow + 6) % 7
  return new Date(t - mundur * HARI_MS).toISOString().slice(0, 10)
}

/** `n` Senin berurutan (terlama dulu), berakhir di pekan yang memuat `sampai`. */
export function pekanTerakhir(sampai: string, n: number): string[] {
  const akhir = hariUtc(seninPekan(sampai))
  return Array.from({ length: n }, (_, i) => new Date(akhir - (n - 1 - i) * 7 * HARI_MS).toISOString().slice(0, 10))
}

export type MentahMetrikPenugasan = {
  id: string
  tanggalKembali: string
  jenisAlur: string                   // 'Non-Rampung' | 'Rampung'
  adaNomorSt: boolean
  titikWajibBelum: number
  presensiBelumDiputus: number         // baris status_verifikasi ∈ {anomali, pernyataan_pending}
  presensiDiputusManual: number        // baris yang pernah diputus PPK (diputus_pada not null)
  laporanFinal: boolean
  espjDisetujuiPada: string | null
  siklusRevisi: number
}

export type MentahMetrik = {
  /** Kumulatif: penugasan dengan tanggal kembali ≤ akhir pekan evaluasi (semua alur). */
  penugasan: MentahMetrikPenugasan[]
  /** Kejadian dalam rentang pekan itu saja. */
  antiMetrik: { fallback: number; atasSbm: number; rampung: number; totalPenugasanMinggu: number }
  heart: { presensiPercobaanPertama: number; totalPresensiPwa: number; durasiRekamDetik: number[] }
}

export type HasilMetrik = {
  tdt_pembilang: number
  tdt_penyebut: number
  kr: Record<string, number>
  anti_metrik: Record<string, number>
  heart: Record<string, number>
}

/** Satu penugasan tuntas-terverifikasi (TDT) bila ketiga syarat PRD §3 terpenuhi. */
export function penugasanTdt(p: MentahMetrikPenugasan): boolean {
  const presensiOtomatisPenuh =
    p.titikWajibBelum === 0 && p.presensiBelumDiputus === 0 && p.presensiDiputusManual === 0
  const espjTepatWaktu = !!p.espjDisetujuiPada && selisihHari(p.espjDisetujuiPada, p.tanggalKembali) <= 14
  return p.adaNomorSt && presensiOtomatisPenuh && p.laporanFinal && espjTepatWaktu
}

export function hitungMetrikMingguan(m: MentahMetrik): HasilMetrik {
  // Populasi TDT: penugasan Non-Rampung yang sudah seharusnya tuntas (§1.1).
  const pop = m.penugasan.filter((p) => p.jenisAlur === 'Non-Rampung')
  const tdtPembilang = pop.filter(penugasanTdt).length

  const disetujui = pop.filter((p) => p.espjDisetujuiPada)
  const lamaSelesai = disetujui.map((p) => selisihHari(p.espjDisetujuiPada!, p.tanggalKembali))

  const kr = {
    kr1_1_zero_off_system: bagi(m.penugasan.filter((p) => p.adaNomorSt).length, Math.max(1, m.penugasan.length)),
    kr1_3_presensi_otomatis: bagi(
      pop.filter((p) => p.titikWajibBelum === 0 && p.presensiBelumDiputus === 0 && p.presensiDiputusManual === 0).length,
      Math.max(1, pop.length),
    ),
    kr2_1_median_hari_espj: median(lamaSelesai),
    kr2_2_maks_satu_revisi: bagi(disetujui.filter((p) => p.siklusRevisi <= 1).length, Math.max(1, disetujui.length)),
  }

  const anti_metrik = {
    presensi_fallback: m.antiMetrik.fallback,
    klaim_atas_sbm_disetujui: m.antiMetrik.atasSbm,
    rasio_rampung: bagi(m.antiMetrik.rampung, Math.max(1, m.antiMetrik.totalPenugasanMinggu)),
  }

  const heart = {
    presensi_berhasil_pertama: bagi(m.heart.presensiPercobaanPertama, Math.max(1, m.heart.totalPresensiPwa)),
    median_durasi_rekam_detik: median(m.heart.durasiRekamDetik),
  }

  return { tdt_pembilang: tdtPembilang, tdt_penyebut: pop.length, kr, anti_metrik, heart }
}

export const TDT_TARGET = 0.85

export const LABEL_KR: Record<string, string> = {
  kr1_1_zero_off_system: 'KR1.1 — penugasan ber-ST (zero off-system)',
  kr1_3_presensi_otomatis: 'KR1.3 — presensi lolos otomatis',
  kr2_1_median_hari_espj: 'KR2.1 — median hari kembali→E-SPJ disetujui',
  kr2_2_maks_satu_revisi: 'KR2.2 — E-SPJ ≤ 1 siklus revisi',
}

export const LABEL_ANTI: Record<string, string> = {
  presensi_fallback: 'Presensi jalur fallback',
  klaim_atas_sbm_disetujui: 'Klaim di atas SBM disetujui PPK',
  rasio_rampung: 'Rasio penugasan alur Rampung',
}
