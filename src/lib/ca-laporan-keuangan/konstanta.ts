/**
 * CA Laporan Keuangan — konstanta, ambang batas & tipe bersama.
 *
 * Sumber kebutuhan: CA_Audit Lapkeu/prompt_modul_analisis_lk_satker.md
 * Modul membaca PDF Laporan Keuangan Satker cetakan SAKTI (LRA, Neraca, LO,
 * LPE, Neraca Percobaan Akrual & Kas, CaLK) lalu menjalankan uji A–H.
 */

// ── Temuan ────────────────────────────────────────────────────────────────
export type Severity = 'Kritikal' | 'Tinggi' | 'Sedang' | 'Info'

/** Kategori analisis sesuai Bagian 5 dokumen kebutuhan. */
export type Kategori = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H'

export const JUDUL_KATEGORI: Record<Kategori, string> = {
  A: 'Konsistensi Antar-Laporan',
  B: 'Kelengkapan Penjelasan CaLK',
  C: 'Validasi Kalkulasi Internal',
  D: 'Ketidaksesuaian Narasi vs Angka',
  E: 'Analisis Tren & Rasio',
  F: 'Anomali / Red Flag',
  G: 'Kepatuhan SAP/PMK',
  H: 'Metadata & Format',
}

export const URUTAN_SEVERITY: Severity[] = ['Kritikal', 'Tinggi', 'Sedang', 'Info']

export type Temuan = {
  kategori: Kategori
  severity: Severity
  /** Ringkasan temuan dalam satu kalimat. */
  deskripsi: string
  /** Pos/akun terkait, untuk penelusuran balik ke PDF. */
  pos: string
  nilaiTercetak: number | null
  nilaiHitung: number | null
  selisih: number | null
  /** Halaman PDF asal (1-based) — kolom penelusuran di sheet Temuan. */
  halaman: number | null
  rekomendasi: string
}

// ── Ambang batas (Bagian 7: dapat diubah tanpa mengubah kode) ─────────────
export type Ambang = {
  /** Toleransi selisih rupiah saat menghitung ulang subtotal/total. */
  toleransiRupiah: number
  /** Toleransi selisih persen saat menghitung ulang kolom %. */
  toleransiPersen: number
  /** Perubahan YoY di atas ini ditandai sebagai lonjakan tidak wajar (%). */
  lonjakanYoY: number
  /** Selisih Pendapatan LRA vs LO di atas ini di-highlight (rupiah). */
  selisihLraLo: number
}

export const AMBANG_BAWAAN: Ambang = {
  toleransiRupiah: 1,
  toleransiPersen: 0.01,
  lonjakanYoY: 50,
  selisihLraLo: 1,
}

// ── Kata kunci arah perubahan (Bagian 5.D) ───────────────────────────────
export const KATA_NAIK = [
  'mengalami kenaikan', 'kenaikan', 'meningkat', 'bertambah', 'bertambahnya',
  'naik', 'peningkatan', 'penambahan',
]

export const KATA_TURUN = [
  'mengalami penurunan', 'penurunan', 'menurun', 'berkurang', 'berkurangnya',
  'turun', 'pengurangan',
]

export const KATA_NIHIL = ['nihil', 'tidak terdapat', 'tidak ada']

/**
 * Fragmen regex untuk label "Surplus/Defisit" — berbeda tanda baca antar
 * varian ekspor SAKTI: "SURPLUS/DEFISIT-LO" (cetakan lengkap) vs
 * "SURPLUS (DEFISIT) LO" (cetakan semester/interim). Dipakai gabungan dengan
 * akhiran spesifik tiap baris, mis. `${POLA_SURPLUS_DEFISIT}LO$`.
 */
export const POLA_SURPLUS_DEFISIT = String.raw`SURPLUS[\s/(]*DEFISIT[\s/)-]*`

// ── Ambang kapitalisasi aset tetap (Bagian 5.G) ──────────────────────────
export const KAPITALISASI_PERALATAN_MESIN = 1_000_000
export const KAPITALISASI_GEDUNG_BANGUNAN = 25_000_000

/** Kategori aset yang tidak boleh disusutkan. */
export const TIDAK_DISUSUTKAN = ['tanah', 'konstruksi dalam pengerjaan', 'kdp']

// ── Metadata dokumen ─────────────────────────────────────────────────────
export type MetadataLk = {
  namaSatker: string | null
  kodeSatker: string | null
  kementerian: string | null
  eselon1: string | null
  wilayah: string | null
  /** Tahun anggaran pelaporan, mis. 2025. */
  tahun: number | null
  tahunLalu: number | null
  /** UNAUDITED / AUDITED / null bila tidak terbaca. */
  status: string | null
  tglData: string | null
  tglCetak: string | null
  penanggungJawab: string | null
  nip: string | null
}

// ── Baris laporan ────────────────────────────────────────────────────────
/** Baris apa pun dari laporan muka; `halaman` untuk penelusuran temuan. */
type BarisDasar = {
  uraian: string
  /** Posisi x label — proksi tingkat indentasi/hierarki. */
  indent: number
  /** Baris subtotal/total (diawali "Jumlah"/"JUMLAH"/"Total"). */
  adalahJumlah: boolean
  halaman: number
}

export type BarisLra = BarisDasar & {
  anggaran: number | null
  realisasi: number | null
  selisih: number | null
  persen: number | null
  anggaranLalu: number | null
  realisasiLalu: number | null
  selisihLalu: number | null
  persenLalu: number | null
}

export type BarisNeraca = BarisDasar & {
  nilai: number | null
  nilaiLalu: number | null
  kenaikan: number | null
  persen: number | null
}

/** Dipakai bersama oleh Laporan Operasional dan Laporan Perubahan Ekuitas. */
export type BarisLo = BarisDasar & {
  nilai: number | null
  nilaiLalu: number | null
  kenaikan: number | null
  persen: number | null
}

export type BarisNp = {
  kodeTrn: string
  kodeAkun: string
  namaAkun: string
  debet: number | null
  kredit: number | null
  halaman: number
}

// ── CaLK ─────────────────────────────────────────────────────────────────
export type NilaiNarasi = {
  jenis: 'rupiah' | 'persen'
  /** Nilai rupiah/persen yang disebut di dalam kalimat. */
  nilai: number
  /** Potongan teks asli, mis. "Rp.45.149.500,00". */
  teks: string
}

export type SeksiCalk = {
  /** Kode catatan, mis. "B.1", "C.1.1", "D.6". */
  kode: string
  judul: string
  narasi: string
  nilai: NilaiNarasi[]
  halaman: number
}

// ── Hasil ekstraksi & analisis ───────────────────────────────────────────
export type TotalNp = { debet: number | null; kredit: number | null }

export type DataLk = {
  metadata: MetadataLk
  lra: BarisLra[]
  neraca: BarisNeraca[]
  lo: BarisLo[]
  lpe: BarisLo[]
  npAkrual: BarisNp[]
  npKas: BarisNp[]
  /** Total debet/kredit sebagaimana tercetak di kaki Neraca Percobaan. */
  totalNpAkrual: TotalNp
  totalNpKas: TotalNp
  calk: SeksiCalk[]
  /** Nomor tabel → judul, dari Daftar Tabel. */
  tabelTerdaftar: Map<number, string>
  /** Nomor tabel → halaman tempat tabel muncul di badan dokumen. */
  tabelMuncul: Map<number, number>
  /** Nilai berbeda sebuah field metadata yang ditemukan antar halaman. */
  metaPerHalaman: Record<string, string[]>
  /** Bagian yang gagal diparse — dilaporkan, bukan digagalkan diam-diam. */
  bagianTidakLengkap: string[]
}

// ── Util kecil ───────────────────────────────────────────────────────────
export function samaDenganToleransi(a: number, b: number, toleransi: number): boolean {
  return Math.abs(a - b) <= toleransi
}

/** Nol dianggap terisi; hanya null/undefined yang dianggap kosong. */
export function ada(n: number | null | undefined): n is number {
  return n !== null && n !== undefined && Number.isFinite(n)
}
