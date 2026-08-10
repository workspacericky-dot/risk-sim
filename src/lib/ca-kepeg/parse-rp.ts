/**
 * Berkas pendukung remunerasi & kepegawaian:
 *   03_jabatan_dan_SK_*.xlsx  → kelas jabatan (grade) + nilai grade per NIP
 *   00_uang_makan_*.xlsx      → jumlah hari uang makan dibayar per NIP
 *   daftar_pegawai.xlsx       → golongan per NIP (dasar tarif uang makan)
 */
import { bacaMatriks, bersihkanNip, isNipValid, teksSel } from './baca-excel'

/** Data 03_ dan 00_ dimulai di baris 12 (1-indeks); daftar pegawai di baris 9. */
const BARIS_AWAL_RP = 11
const BARIS_AWAL_PEGAWAI = 8

export type InfoGrade = { grade: string; nilai: number }

/** Nomor urut pada kolom A menandai baris data yang sah (baris antara kosong). */
function adaNomorUrut(sel: unknown): boolean {
  return typeof sel === 'number' && Number.isInteger(sel)
}

/** 03_jabatan_dan_SK → NIP → kelas jabatan & nilai grade. */
export function parseGrade(data: ArrayBuffer): Record<string, InfoGrade> {
  const baris = bacaMatriks(data, false)
  const hasil: Record<string, InfoGrade> = {}

  for (let r = BARIS_AWAL_RP; r < baris.length; r++) {
    const row = baris[r] ?? []
    if (!adaNomorUrut(row[0])) continue

    const nip = teksSel(row[2])
    if (nip.length !== 18) continue

    const nilaiSel = row[11]
    hasil[nip] = {
      grade: teksSel(row[10]),
      nilai: typeof nilaiSel === 'number' ? Math.trunc(nilaiSel) : 0,
    }
  }

  return hasil
}

/** 00_uang_makan → NIP → jumlah hari dibayar (satu baris = satu hari). */
export function parseUangMakan(data: ArrayBuffer): Record<string, number> {
  const baris = bacaMatriks(data, false)
  const hasil: Record<string, number> = {}

  for (let r = BARIS_AWAL_RP; r < baris.length; r++) {
    const row = baris[r] ?? []
    if (!adaNomorUrut(row[0])) continue

    const nip = bersihkanNip(row[2])
    if (!isNipValid(nip)) continue
    hasil[nip] = (hasil[nip] ?? 0) + 1
  }

  return hasil
}

/** daftar_pegawai.xlsx (Sheet1) → NIP → golongan mentah, mis. "IV/b". */
export function parseGolongan(data: ArrayBuffer): Record<string, string> {
  const baris = bacaMatriks(data, false, 'Sheet1')
  const hasil: Record<string, string> = {}

  for (let r = BARIS_AWAL_PEGAWAI; r < baris.length; r++) {
    const row = baris[r] ?? []
    if (row[2] == null) continue

    const nip = teksSel(row[2])
    if (!isNipValid(nip)) continue
    hasil[nip] = teksSel(row[10])
  }

  return hasil
}
