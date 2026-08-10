/**
 * Kenali jenis & bulan tiap berkas dari namanya, mengikuti aturan penamaan
 * di README_run_full_analysis.md:
 *
 *   SIKEP          : .xls, nama memuat bulan (Indonesia) + tahun
 *   Daftar hadir   : prefix `01_` + bulan + tahun
 *   Jabatan & SK   : prefix `03_` + bulan + tahun
 *   Uang makan     : prefix `00_` + bulan + tahun
 *   Daftar pegawai : nama memuat "daftar_pegawai" (tanpa bulan)
 *
 * Kode satker di tengah nama berkas bebas — tidak ikut diperiksa.
 */
import { BULAN_KE_NOMOR } from './konstanta'

export type JenisBerkas =
  | 'sikep'
  | 'daftar-hadir'
  | 'jabatan'
  | 'uang-makan'
  | 'daftar-pegawai'
  | 'tidak-dipakai'
  | 'tidak-dikenali'

export const LABEL_JENIS: Record<JenisBerkas, string> = {
  'sikep': 'SIKEP (presensi)',
  'daftar-hadir': 'KOMDANAS — Daftar Hadir',
  'jabatan': 'KOMDANAS — Jabatan & SK',
  'uang-makan': 'KOMDANAS — Uang Makan',
  'daftar-pegawai': 'Daftar Pegawai (golongan)',
  'tidak-dipakai': 'Tidak dipakai analisis',
  'tidak-dikenali': 'Tidak dikenali',
}

export type HasilKlasifikasi = {
  jenis: JenisBerkas
  /** 1–12, atau null untuk berkas tanpa bulan (daftar pegawai). */
  bulan: number | null
  tahun: number | null
  catatan: string
}

function tanpaEkstensi(nama: string): string {
  return nama.replace(/\.[^.]+$/, '')
}

/** Nomor bulan pertama yang namanya muncul di teks, atau null. */
export function deteksiBulan(teks: string): number | null {
  const t = teks.toLowerCase()
  for (const [nama, nomor] of Object.entries(BULAN_KE_NOMOR)) {
    if (t.includes(nama)) return nomor
  }
  return null
}

/** Tahun 20xx terakhir yang muncul di nama berkas — dipakai sebagai usulan. */
export function deteksiTahun(nama: string): number | null {
  const cocok = tanpaEkstensi(nama).match(/20\d{2}/g)
  return cocok ? Number(cocok[cocok.length - 1]) : null
}

export function klasifikasiBerkas(nama: string, tahun: number): HasilKlasifikasi {
  const stem = tanpaEkstensi(nama)
  const rendah = stem.toLowerCase()
  const ekstensi = nama.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
  const bulan = deteksiBulan(stem)
  const tahunBerkas = deteksiTahun(nama)
  const tahunCocok = stem.includes(String(tahun))

  const hasil = (jenis: JenisBerkas, catatan = ''): HasilKlasifikasi =>
    ({ jenis, bulan, tahun: tahunBerkas, catatan })

  if (rendah.includes('daftar_pegawai') || rendah.includes('daftar pegawai')) {
    return { jenis: 'daftar-pegawai', bulan: null, tahun: tahunBerkas, catatan: '' }
  }

  // Berkas KOMDANAS yang tidak dipakai analisis ini.
  if (rendah.startsWith('02_') || rendah.startsWith('04_')) {
    return hasil('tidak-dipakai', 'Berkas ini tidak dibutuhkan oleh analisis gap.')
  }

  const prefiks: Array<[string, JenisBerkas]> = [
    ['01_', 'daftar-hadir'],
    ['03_', 'jabatan'],
    ['00_', 'uang-makan'],
  ]

  for (const [awalan, jenis] of prefiks) {
    if (!rendah.startsWith(awalan)) continue
    if (bulan === null) return hasil(jenis, 'Nama bulan tidak ditemukan di nama berkas.')
    if (!tahunCocok) return hasil(jenis, `Tahun ${tahun} tidak ada di nama berkas.`)
    return hasil(jenis)
  }

  if (ekstensi === '.xls') {
    if (bulan === null) return hasil('sikep', 'Nama bulan tidak ditemukan di nama berkas.')
    if (!tahunCocok) return hasil('sikep', `Tahun ${tahun} tidak ada di nama berkas.`)
    return hasil('sikep')
  }

  return hasil('tidak-dikenali', 'Nama berkas tidak cocok dengan pola mana pun.')
}

/** Berkas yang benar-benar dipakai mesin analisis. */
export function jenisTerpakai(jenis: JenisBerkas): boolean {
  return jenis === 'sikep' || jenis === 'daftar-hadir' || jenis === 'jabatan'
    || jenis === 'uang-makan' || jenis === 'daftar-pegawai'
}
