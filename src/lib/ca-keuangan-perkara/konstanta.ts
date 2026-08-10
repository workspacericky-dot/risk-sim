/**
 * CA Audit Keuangan Perkara — konstanta & tipe bersama.
 *
 * Port dari script-saldo-sisapanjar.pdf (MS Banda Aceh), Bagian A & B.
 */

// ── Jenis perkara ─────────────────────────────────────────────────────────
/** Urutan sesuai PDF A.2. HT dikecualikan (tidak punya kolom Proses Terakhir/Nomor Perkara). */
export const JENIS_PERKARA = ['Gugatan', 'Permohonan', 'GS', 'Banding', 'Kasasi', 'PK', 'Eksekusi'] as const
export type JenisPerkara = typeof JENIS_PERKARA[number]

// ── Filter A.1 ────────────────────────────────────────────────────────────
/** Proses Terakhir yang menandakan perkara sudah berakhir — sisa panjar seharusnya sudah dikembalikan. */
export const FILTERS_PROSES_TERAKHIR = [
  'Minutasi',
  'Penetapan Ikrar Talak',
  'Tidak Memenuhi Syarat Formil',
  'Perkara Tidak Memenuhi Syarat Formil',
] as const

// ── Bagian B — kepatuhan pemberitahuan ───────────────────────────────────
export const BATAS_HARI_KERJA = 3

export type Media = 'Elektronik' | 'Manual'

export type StatusKepatuhan =
  | 'Sesuai (≤3 hari kerja)'
  | 'PERLU KONFIRMASI MANUAL'
  | 'Data tanggal belum lengkap'
