/**
 * Parser angka sadar-konteks.
 *
 * PDF cetakan SAKTI memakai DUA format angka dalam satu dokumen:
 *
 *   gaya 'muka' — halaman muka LRA/Neraca/LO/LPE/Neraca Percobaan
 *     "396,599,500"  "(36,593,000)"  "112.52"   → koma = ribuan, titik = desimal
 *
 *   gaya 'calk' — narasi & tabel di Catatan atas Laporan Keuangan
 *     "Rp.396.599.500,00"  "112,52"  "(16.827.400,00)" → titik = ribuan, koma = desimal
 *
 * Memakai satu parser global untuk keduanya akan salah membaca
 * "155.100.000,00" sebagai 155,1 — karena itu gaya wajib eksplisit.
 */
import type { NilaiNarasi } from './konstanta'

export type GayaAngka = 'muka' | 'calk'

/** Angka bergaya muka: 1.234.567 dikelompokkan koma, desimal titik. */
const POLA_MUKA = /^\(?\s*-?\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*\)?$/
/** Angka bergaya CaLK: dikelompokkan titik, desimal koma. */
const POLA_CALK = /^\(?\s*-?\s*(?:\d{1,3}(?:\.\d{3})+|\d+)(?:,\d+)?\s*\)?$/

/** Buang "Rp"/"Rp." di depan, simbol %, spasi, dan titik akhir kalimat. */
function bersihkan(teks: string, gaya: GayaAngka): string {
  let s = teks.trim().replace(/^rp\.?\s*/i, '').replace(/%/g, '').replace(/\s+/g, '')
  // Titik penutup kalimat pada narasi CaLK ("...Rp.155.100.000,00.").
  if (gaya === 'calk') s = s.replace(/\.+$/, '')
  return s
}

/**
 * Ubah teks jadi number. Mengembalikan null bila teks bukan angka yang sah —
 * pemanggil harus memperlakukan null sebagai "sel kosong / gagal parse",
 * bukan sebagai nol.
 */
export function parseAngka(teks: string, gaya: GayaAngka): number | null {
  const s = bersihkan(teks, gaya)
  if (s === '' || s === '()' || s === '-') return null

  const pola = gaya === 'muka' ? POLA_MUKA : POLA_CALK
  if (!pola.test(s)) return null

  const negatif = /^\(.*\)$/.test(s) || s.startsWith('-')
  const inti = s.replace(/[()\-]/g, '')

  const normal = gaya === 'muka'
    ? inti.replace(/,/g, '')
    : inti.replace(/\./g, '').replace(',', '.')

  const n = Number(normal)
  if (!Number.isFinite(n)) return null
  return negatif ? -n : n
}

export function adalahAngka(teks: string, gaya: GayaAngka): boolean {
  return parseAngka(teks, gaya) !== null
}

/**
 * Gabungkan pecahan angka yang terpotong lebar kolom saat dicetak.
 * Contoh nyata: "3" + "52.482.000,00" → "352.482.000,00", "112.5" + "2" → "112.52".
 */
export function gabungPecahan(potongan: string[]): string {
  return potongan.map((p) => p.trim()).join('')
}

// ── Nilai yang disebut di dalam narasi CaLK ──────────────────────────────
/** "Rp.45.149.500,00", "Rp 45.149.500", "Rp45.149.500,00" */
const POLA_RUPIAH_NARASI = /Rp\.?\s?(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/gi
/** "12,85%", "112,52 %" */
const POLA_PERSEN_NARASI = /(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s?%/g

/**
 * Tarik seluruh nilai rupiah & persen yang disebut dalam sebuah narasi CaLK,
 * untuk dicocokkan dengan angka pada tabel laporan (Bagian 5.B & 5.D).
 */
export function nilaiDalamNarasi(narasi: string): NilaiNarasi[] {
  const hasil: NilaiNarasi[] = []

  for (const m of narasi.matchAll(POLA_RUPIAH_NARASI)) {
    const nilai = parseAngka(m[1], 'calk')
    if (nilai !== null) hasil.push({ jenis: 'rupiah', nilai, teks: m[0] })
  }

  for (const m of narasi.matchAll(POLA_PERSEN_NARASI)) {
    const nilai = parseAngka(m[1], 'calk')
    // Hindari mencatat ulang angka rupiah yang kebetulan diikuti '%'.
    if (nilai !== null) hasil.push({ jenis: 'persen', nilai, teks: m[0] })
  }

  return hasil
}
