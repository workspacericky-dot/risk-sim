/**
 * Vouching Transport Eksekusi/PS — checklist ada/belum bukti kwitansi biaya
 * transport eksekusi/peninjauan setempat, plus catatan bebas.
 *
 * Sumber datanya SELURUH Nomor Perkara pada berkas Eksekusi apa adanya
 * (lihat parseBerkasJur().semuaNomorPerkara), bukan hasil analisis sisa
 * panjar (pivot) — keduanya menjawab pertanyaan yang berbeda.
 */
import type { NomorPerkaraMentah } from './parse-jur'

export type BarisKwitansi = {
  nomorPerkara: string
  tahun: number | null
  adaKwitansi: boolean
  catatan: string
}

export function kosongKwitansi(p: Pick<NomorPerkaraMentah, 'nomorPerkara' | 'tahun'>): BarisKwitansi {
  return { nomorPerkara: p.nomorPerkara, tahun: p.tahun, adaKwitansi: false, catatan: '' }
}
