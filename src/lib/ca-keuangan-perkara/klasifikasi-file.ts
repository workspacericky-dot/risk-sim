/**
 * Kenali jenis perkara tiap berkas dari namanya — beberapa berkas .xls/.xlsx
 * terpisah, satu berkas per jenis perkara (Gugatan, Permohonan, GS, Banding,
 * Kasasi, PK, Eksekusi). Sheet pertama tiap berkas dibaca apa adanya.
 *
 * Urutan pola dari yang paling spesifik ke paling umum — GS ("gugatan
 * sederhana") dan HT diperiksa lebih dulu supaya tidak salah tertangkap pola
 * "gugatan" yang lebih umum.
 */
import { JENIS_PERKARA, type JenisPerkara } from './konstanta'

export type JenisBerkas = JenisPerkara | 'tidak-dipakai' | 'tidak-dikenali'

export const LABEL_JENIS: Record<JenisBerkas, string> = {
  Gugatan: 'Gugatan',
  Permohonan: 'Permohonan',
  GS: 'GS (Gugatan Sederhana)',
  Banding: 'Banding',
  Kasasi: 'Kasasi',
  PK: 'PK',
  Eksekusi: 'Eksekusi',
  'tidak-dipakai': 'Tidak dipakai analisis (mis. HT)',
  'tidak-dikenali': 'Tidak dikenali',
}

/** Pecah nama berkas jadi token huruf saja — "jur_HT2025.xls" → ["jur","ht"]. Menghindari jebakan \b regex yang menganggap "_" sebagai bagian kata. */
function token(nama: string): string[] {
  return nama.toLowerCase().split(/[^a-z]+/).filter(Boolean)
}

export type HasilKlasifikasi = { jenis: JenisBerkas; catatan: string }

export function klasifikasiBerkas(nama: string): HasilKlasifikasi {
  const stem = nama.replace(/\.[^.]+$/, '')
  const rendah = stem.toLowerCase()
  const kata = token(stem)

  const jenis: JenisBerkas | null =
    kata.includes('ht') ? 'tidak-dipakai'
    : kata.includes('gs') || rendah.includes('sederhana') ? 'GS'
    : rendah.includes('eksekusi') ? 'Eksekusi'
    : rendah.includes('banding') ? 'Banding'
    : rendah.includes('kasasi') ? 'Kasasi'
    : kata.includes('pk') ? 'PK'
    : rendah.includes('permohonan') ? 'Permohonan'
    : rendah.includes('gugatan') ? 'Gugatan'
    : null

  if (jenis) return { jenis, catatan: '' }
  return {
    jenis: 'tidak-dikenali',
    catatan: 'Nama berkas tidak cocok dengan jenis perkara mana pun — pilih jenisnya manual.',
  }
}

/** Berkas yang benar-benar dipakai mesin analisis. */
export function jenisTerpakai(jenis: JenisBerkas): jenis is JenisPerkara {
  return (JENIS_PERKARA as readonly string[]).includes(jenis)
}