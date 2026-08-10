/**
 * CA Bid. Kepegawaian — konstanta & tipe bersama.
 *
 * Port dari run_full_analysis.py (CA_Audit_Kepeg/). Nilai potongan mengikuti
 * 04_referensi_absensi.xlsx (Daftar Status Absensi) sebagai sumber otoritatif.
 * Dasar hukum tarif uang makan: PMK 39/2024 (SBM 2025) & SK 853/SEK/SK.KPS/III/2025.
 */

// ── Bulan ─────────────────────────────────────────────────────────────────
export const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
] as const

/** Nama bulan huruf kecil → nomor bulan (1–12), untuk deteksi dari nama file. */
export const BULAN_KE_NOMOR: Record<string, number> = Object.fromEntries(
  NAMA_BULAN.map((nama, i) => [nama.toLowerCase(), i + 1]),
)

export function namaBulan(nomor: number): string {
  return NAMA_BULAN[nomor - 1] ?? ''
}

// ── Kalender ──────────────────────────────────────────────────────────────
/**
 * `Libur Daerah` bersifat opsional dan khas per satker (mis. HUT daerah).
 * Tidak ada di run_full_analysis.py; ditambahkan agar hari tersebut tidak
 * dinilai sebagai hari kerja dan tidak memunculkan THM/THP palsu.
 */
export type KategoriKalender = 'Libur Nasional' | 'Cuti Bersama' | 'Libur Daerah' | 'Ramadhan'

/** Kategori yang membuat hari kerja dilewati sepenuhnya (tidak dinilai). */
export const KATEGORI_LIBUR: readonly KategoriKalender[] = [
  'Libur Nasional', 'Cuti Bersama', 'Libur Daerah',
]

/** Semua kategori yang sah, terurut sesuai tampilan di antarmuka. */
export const KATEGORI_KALENDER: readonly KategoriKalender[] = [
  'Libur Nasional', 'Cuti Bersama', 'Libur Daerah', 'Ramadhan',
]

export function isKategoriLibur(k: string | null | undefined): boolean {
  return k === 'Libur Nasional' || k === 'Cuti Bersama' || k === 'Libur Daerah'
}

/** Peta tanggal `DD-MM-YYYY` → kategori. Sama seperti dict holidays di Python. */
export type PetaKalender = Record<string, KategoriKalender>

// ── Jam kerja ─────────────────────────────────────────────────────────────
export type HariKerja = 'Senin' | 'Selasa' | 'Rabu' | 'Kamis' | 'Jumat'
export const HARI_KERJA: readonly HariKerja[] = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat']

export type JamHari = { masuk: string; pulang: string }
export type KonfigJamKerja = {
  biasa: Record<HariKerja, JamHari>
  ramadhan: Record<HariKerja, JamHari>
}

/** Standar jam kerja bawaan; dapat diubah pengguna di panel Setup. */
export const JAM_KERJA_DEFAULT: KonfigJamKerja = {
  biasa: {
    Senin:  { masuk: '07:30', pulang: '16:00' },
    Selasa: { masuk: '07:30', pulang: '16:00' },
    Rabu:   { masuk: '07:30', pulang: '16:00' },
    Kamis:  { masuk: '07:30', pulang: '16:00' },
    Jumat:  { masuk: '07:30', pulang: '16:30' },
  },
  ramadhan: {
    Senin:  { masuk: '08:00', pulang: '15:00' },
    Selasa: { masuk: '08:00', pulang: '15:00' },
    Rabu:   { masuk: '08:00', pulang: '15:00' },
    Kamis:  { masuk: '08:00', pulang: '15:00' },
    Jumat:  { masuk: '08:00', pulang: '15:30' },
  },
}

/** Singkatan hari di kolom pertama SIKEP → nama penuh. */
export const HARI_SINGKAT_KE_PENUH: Record<string, string> = {
  Sen: 'Senin', Sel: 'Selasa', Rab: 'Rabu',
  Kam: 'Kamis', Jum: 'Jumat', Sab: 'Sabtu', Min: 'Minggu',
}

export const HARI_DARI_INDEX = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']

// ── Kode pelanggaran SIKEP ────────────────────────────────────────────────
/** Ambang menit keterlambatan → kode TL. */
export function kodeTerlambat(menit: number): string {
  if (menit <= 30) return 'TL1'
  if (menit <= 60) return 'TL2'
  if (menit <= 90) return 'TL3'
  return 'TL4'
}

/** Ambang menit pulang cepat → kode PSW. */
export function kodePulangCepat(menit: number): string {
  if (menit <= 30) return 'PSW1'
  if (menit <= 60) return 'PSW2'
  if (menit <= 90) return 'PSW3'
  return 'PSW4'
}

/** Catatan SIKEP (huruf kecil, cocok persis) → [kode, dihitung sebagai pelanggaran]. */
export const CATATAN_KE_KODE: Record<string, [string, boolean]> = {
  'cuti tahunan': ['CT', false],
  'cuti sakit':   ['CS', false],
  'dinas luar':   ['DIS', false],
}

// ── Kode KOMDANAS ─────────────────────────────────────────────────────────
export const KODE_HADIR = new Set(['v', 'wfh', 'wfa', 'ik', 'tkd'])
export const KODE_TL    = new Set(['tl1', 'tl2', 'tl3', 'tl4'])
export const KODE_PSW   = new Set(['psw1', 'psw2', 'psw3', 'psw4'])
/**
 * Kode cuti/tugas yang membebaskan dari kewajiban presensi.
 * Catatan: `cb3` ada di 04_referensi_absensi.xlsx tetapi terlewat di
 * run_full_analysis.py — disertakan di sini agar hari ber-kode cb3 tidak
 * salah terbaca sebagai HADIR.
 */
export const KODE_CUTI = new Set([
  'ct', 'ctl', 'cs1', 'cs14', 'cm1', 'cm2', 'cm3', 'cm41', 'cm42', 'cm43',
  'cap1', 'cap10', 'cb1', 'cb2', 'cb3', 'cpp', 'clt', 'tb', 'ld',
])
export const KODE_DLS   = new Set(['dls'])
export const KODE_IZIN  = new Set(['i', 'tmk', 'bmt', 'ib'])
/** `tk` = belum ada data; tidak tercantum di 04_referensi_absensi.xlsx. */
export const KODE_BELUM = new Set(['tk'])
/**
 * KOMDANAS dapat menuliskan thm/thp secara eksplisit sebagai status hari
 * (ada di 04_referensi_absensi.xlsx, masing-masing 1,5%), bukan hanya
 * menyisakan sel kosong. run_full_analysis.py hanya menurunkannya dari sel
 * kosong, sehingga penulisan eksplisit terbaca sebagai hadir bersih.
 */
export const KODE_THM   = new Set(['thm'])
export const KODE_THP   = new Set(['thp'])

/**
 * Seluruh kode KOMDANAS yang punya arti bagi mesin. Kode di luar daftar ini
 * jatuh ke cabang HADIR dan dapat menerbitkan temuan palsu, karena itu
 * kemunculannya dikumpulkan saat parsing lalu diperingatkan ke pengguna.
 */
export const KODE_KOMDANAS_DIKENAL: ReadonlySet<string> = new Set([
  ...KODE_HADIR, ...KODE_TL, ...KODE_PSW, ...KODE_CUTI,
  ...KODE_DLS, ...KODE_IZIN, ...KODE_BELUM, ...KODE_THM, ...KODE_THP,
])

export type MarkKomdanas =
  | 'HADIR' | 'HADIR_TL' | 'HADIR_PSW' | 'HADIR_TLP'
  | 'THM' | 'THP' | 'CUTI' | 'DLS' | 'IZN' | 'BELUM' | 'LIBUR'

/** Mark yang dihitung sebagai hari hadir untuk pembanding uang makan. */
export const MARK_HADIR: readonly MarkKomdanas[] = [
  'HADIR', 'HADIR_TL', 'HADIR_PSW', 'HADIR_TLP', 'THM', 'THP',
]

// ── Tabel potongan ────────────────────────────────────────────────────────
/** kode → [persen potongan remunerasi, hari potongan uang makan]. */
export const POTONGAN_REF: Record<string, [number, number]> = {
  v: [0, 0], wfh: [0, 0], wfa: [0, 0], ik: [0, 0], tkd: [0, 0],
  tl1: [0.5, 0], tl2: [1.0, 0], tl3: [1.25, 0], tl4: [1.5, 0],
  thm: [1.5, 0], thp: [1.5, 0],
  psw1: [0.5, 0], psw2: [1.0, 0], psw3: [1.25, 0], psw4: [1.5, 0],
  ct: [0, 1], ctl: [0, 1], cs1: [0, 1],
  cm1: [0, 1], cm2: [0, 1], cm3: [0, 1],
  cap1: [0, 1], tb: [0, 1], ld: [0, 1],
  cs14: [2.0, 1], cm41: [2.0, 1], cap10: [2.0, 1], cb1: [2.0, 1],
  cm42: [3.0, 1], cb2: [3.0, 1], cm43: [4.0, 1], cb3: [4.0, 1],
  cpp: [5.0, 1], clt: [5.0, 1], bmt: [5.0, 1], ib: [5.0, 1],
  dls: [0, 1], i: [5.0, 1], tmk: [5.0, 1],
}

/** Kode SIKEP (huruf besar) → kunci di POTONGAN_REF. */
export const SIKEP_KE_REF: Record<string, string> = {
  TL1: 'tl1', TL2: 'tl2', TL3: 'tl3', TL4: 'tl4',
  PSW1: 'psw1', PSW2: 'psw2', PSW3: 'psw3', PSW4: 'psw4',
  THM: 'thm', THP: 'thp', TMK: 'tmk',
  CT: 'ct', CS: 'cs1', DIS: 'dls',
}

// ── Tarif ─────────────────────────────────────────────────────────────────
/** Tambahan transportasi harian bagi Hakim (SK 853/SEK/SK.KPS/III/2025). */
export const TARIF_TRANSPORTASI_HAKIM = 56_000

const JABATAN_HAKIM = new Set(['hakim', 'ketua pengadilan', 'wakil ketua pengadilan'])

/** Hakim/Ketua/Wakil Ketua: tidak dikenakan potongan tukin, dapat tambahan transportasi. */
export function isJabatanHakim(jabatan: string): boolean {
  return JABATAN_HAKIM.has(jabatan.trim().toLowerCase())
}

/** Golongan ("IV/b", "III/c", …) → tarif uang makan per hari (PMK 39/2024). */
export function tarifUangMakan(golongan: string): number {
  const g = golongan.trim().toUpperCase()
  if (g.startsWith('IV')) return 41_000
  if (g.startsWith('III')) return 37_000
  if (g.startsWith('II')) return 35_000
  if (g.startsWith('I/')) return 35_000
  return 0
}

// ── Jenis gap ─────────────────────────────────────────────────────────────
export type JenisGap = 'PL' | 'CK' | 'WK' | 'TK'
export const JENIS_GAP: readonly JenisGap[] = ['PL', 'CK', 'WK', 'TK']

export const LABEL_GAP: Record<JenisGap, string> = {
  PL: 'PELANGGAR_HADIR',
  CK: 'CUTI_KOMDANAS_WFO_SIKEP',
  WK: 'WFO_KOMDANAS_CUTI_SIKEP',
  TK: 'TL_KOMDANAS_HADIR_SIKEP',
}

export const URAIAN_GAP: Record<JenisGap, string> = {
  PL: 'SIKEP mencatat pelanggaran (TL/PSW/THM/THP/TMK), KOMDANAS mencatat hadir bersih',
  CK: 'KOMDANAS mencatat cuti/izin/dinas luar, SIKEP mencatat WFO',
  WK: 'KOMDANAS mencatat hadir, SIKEP mencatat cuti/dinas',
  TK: 'KOMDANAS mencatat TL/PSW, SIKEP mencatat hadir bersih (restitusi)',
}

export const WARNA_GAP: Record<JenisGap, string> = {
  PL: '#E74C3C', CK: '#2ECC71', WK: '#3498DB', TK: '#F39C12',
}

/** Warna latar sel Excel (ARGB) per jenis gap — senada dengan bagan. */
export const ISIAN_GAP: Record<JenisGap, string> = {
  PL: 'FFFADBD8', CK: 'FFD5F5E3', WK: 'FFD6EAF8', TK: 'FFFEF9E7',
}
