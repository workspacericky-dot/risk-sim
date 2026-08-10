/**
 * Cek kelengkapan bukti kwitansi untuk perkara jenis Eksekusi — checklist
 * ada/belum bukti kwitansi pengembalian sisa panjar, plus catatan bebas.
 */
import type { BarisPivot } from './parse-jur'

export type BarisKwitansi = {
  nomorPerkara: string
  tahun: number | null
  sisa: number
  adaKwitansi: boolean
  catatan: string
}

export function kosongKwitansi(p: Pick<BarisPivot, 'nomorPerkara' | 'tahun' | 'sisa'>): BarisKwitansi {
  return { nomorPerkara: p.nomorPerkara, tahun: p.tahun, sisa: p.sisa, adaKwitansi: false, catatan: '' }
}

/** Seluruh Nomor Perkara jenis Eksekusi dari hasil Bagian A, terurut. */
export function filterEksekusi(pivot: BarisPivot[]): BarisPivot[] {
  return pivot
    .filter((p) => p.jenis === 'Eksekusi')
    .sort((a, b) => a.nomorPerkara.localeCompare(b.nomorPerkara))
}
