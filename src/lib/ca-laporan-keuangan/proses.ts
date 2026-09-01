/**
 * Pipeline utuh: PDF → ekstraksi → parsing → analisis → hasil.
 *
 * Satu-satunya pintu masuk modul, dipakai bersama oleh UI dan script
 * verifikasi supaya keduanya menguji jalur kode yang sama persis.
 */
import { jalankanAnalisis } from './analisis'
import { AMBANG_BAWAAN, type Ambang, type DataLk, type Temuan } from './konstanta'
import { parseCalk } from './parse-calk'
import {
  barisLaporan, klasifikasiHalaman, parseLo, parseLpe, parseLra, parseMetadata,
  parseNeraca, parseNeracaPercobaan, totalNeracaPercobaan,
} from './parse-laporan'
import { hitungRasio, type BarisRasio } from './rasio'
import { bacaPdf, teksBaris } from './teks-pdf'

export type HasilProses = {
  data: DataLk
  temuan: Temuan[]
  rasio: BarisRasio[]
  ambang: Ambang
  jumlahHalaman: number
}

/** Kumpulkan nilai berbeda sebuah field metadata antar halaman laporan muka. */
function metadataPerHalaman(
  halaman: { baris: { sel: { x: number; lebar: number; teks: string }[] }[] }[],
): Record<string, string[]> {
  const kode = new Set<string>()
  const status = new Set<string>()

  for (const h of halaman) {
    for (const b of h.baris) {
      const t = teksBaris(b as Parameters<typeof teksBaris>[0])
      const k = t.match(/SATUAN KERJA\s*:?\s*\(?\s*(\d{4,6})\s*\)?/i)
      if (k) kode.add(k[1])
      const s = t.match(/\b(UNAUDITED|AUDITED)\b/i)
      if (s) status.add(s[1].toUpperCase())
    }
  }

  const hasil: Record<string, string[]> = {}
  if (kode.size > 1) hasil['Kode satker'] = [...kode]
  if (status.size > 1) hasil['Status laporan'] = [...status]
  return hasil
}

export async function prosesPdf(pdf: ArrayBuffer, ambang: Ambang = AMBANG_BAWAAN): Promise<HasilProses> {
  const halaman = await bacaPdf(pdf)
  const terklasifikasi = klasifikasiHalaman(halaman)

  const lra = parseLra(barisLaporan(terklasifikasi, 'lra'))
  const neraca = parseNeraca(barisLaporan(terklasifikasi, 'neraca'))
  const lo = parseLo(barisLaporan(terklasifikasi, 'lo'))
  const lpe = parseLpe(barisLaporan(terklasifikasi, 'lpe'))
  const npAkrual = parseNeracaPercobaan(barisLaporan(terklasifikasi, 'npAkrual'), 'Neraca Percobaan Akrual')
  const npKas = parseNeracaPercobaan(barisLaporan(terklasifikasi, 'npKas'), 'Neraca Percobaan Kas')

  const calk = parseCalk(halaman, new Set(terklasifikasi.map((h) => h.halaman)))

  const bagianTidakLengkap = [lra.galat, neraca.galat, lo.galat, lpe.galat, npAkrual.galat, npKas.galat]
    .filter((g): g is string => g !== null)

  if (calk.seksi.length === 0) {
    bagianTidakLengkap.push('Catatan atas Laporan Keuangan tidak terbaca — uji narasi vs angka dilewati.')
  }

  const data: DataLk = {
    metadata: parseMetadata(terklasifikasi, halaman),
    lra: lra.data,
    neraca: neraca.data,
    lo: lo.data,
    lpe: lpe.data,
    npAkrual: npAkrual.data,
    npKas: npKas.data,
    totalNpAkrual: totalNeracaPercobaan(barisLaporan(terklasifikasi, 'npAkrual')),
    totalNpKas: totalNeracaPercobaan(barisLaporan(terklasifikasi, 'npKas')),
    calk: calk.seksi,
    tabelTerdaftar: calk.tabelTerdaftar,
    tabelMuncul: calk.tabelMuncul,
    metaPerHalaman: metadataPerHalaman(terklasifikasi),
    bagianTidakLengkap,
  }

  return {
    data,
    temuan: jalankanAnalisis(data, ambang),
    rasio: hitungRasio(data),
    ambang,
    jumlahHalaman: halaman.length,
  }
}
