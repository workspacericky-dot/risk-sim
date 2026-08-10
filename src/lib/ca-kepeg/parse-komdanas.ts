/**
 * KOMDANAS `01_daftar_hadir_*.xlsx` → klasifikasi kehadiran per pegawai per hari.
 *
 * Tata letak: header di baris 8, data mulai baris 12. Tiap pegawai menempati
 * dua baris — DATANG lalu PULANG — dengan kolom F..AJ berisi kode hari 1..31.
 * Baris tanda tangan di kaki sheet ikut mengisi kolom hari, karena itu baris
 * disaring lewat kolom KEHADIRAN, bukan lewat isi kolom tanggal.
 */
import { bacaMatriks, normalSel, teksSel } from './baca-excel'
import {
  KODE_BELUM, KODE_CUTI, KODE_DLS, KODE_IZIN, KODE_KOMDANAS_DIKENAL,
  KODE_PSW, KODE_THM, KODE_THP, KODE_TL,
  type MarkKomdanas,
} from './konstanta'

/** Baris pertama data (1-indeks 12) dan kolom hari pertama (1-indeks F = 6). */
const BARIS_AWAL = 11
const KOLOM_HARI_AWAL = 5

export type HariKomdanas = { mark: MarkKomdanas; detail: string }

export type PegawaiKomdanas = {
  nip: string
  nama: string
  jabatan: string
  /** kunci = nomor hari 1..31 */
  hari: Record<number, HariKomdanas>
}

export type HasilKomdanas = {
  pegawai: Record<string, PegawaiKomdanas>
  /**
   * Kode di luar daftar yang dikenal, beserta jumlah kemunculannya. Kode
   * semacam ini terbaca sebagai hadir bersih, sehingga wajib diperlihatkan
   * kepada pengguna — bukan diabaikan.
   */
  kodeAsing: Record<string, number>
}

/** Pasangan kode datang & pulang → jenis kehadiran. */
export function klasifikasiHari(datang: string, pulang: string): HariKomdanas {
  const d = datang
  const p = pulang

  if (KODE_BELUM.has(d) || KODE_BELUM.has(p)) {
    return { mark: 'BELUM', detail: `datang=${d} pulang=${p}` }
  }
  if (!d && !p) return { mark: 'LIBUR', detail: '' }
  if (KODE_CUTI.has(d) || KODE_CUTI.has(p)) {
    return { mark: 'CUTI', detail: KODE_CUTI.has(d) ? d : p }
  }
  if (KODE_DLS.has(d) || KODE_DLS.has(p)) return { mark: 'DLS', detail: 'dls' }
  if (KODE_IZIN.has(d) || KODE_IZIN.has(p)) {
    return { mark: 'IZN', detail: KODE_IZIN.has(d) ? d : p }
  }

  // thm/thp yang ditulis eksplisit. Diperiksa sebelum TL/PSW, mengikuti
  // urutan yang sama dengan versi turunannya di bawah (sel kosong menang atas
  // keterlambatan). Detail sengaja memuat kode pelanggarannya sendiri agar
  // pencarian tarif menemukan 1,5% — berbeda dengan versi turunan yang hanya
  // punya sisi yang terisi untuk dilaporkan.
  if (KODE_THM.has(d) || KODE_THM.has(p)) return { mark: 'THM', detail: 'datang=thm' }
  if (KODE_THP.has(d) || KODE_THP.has(p)) return { mark: 'THP', detail: 'pulang=thp' }

  const adaTl = KODE_TL.has(d)
  const adaPsw = KODE_PSW.has(p)
  const adaDatang = Boolean(d) && !KODE_BELUM.has(d)
  const adaPulang = Boolean(p) && !KODE_BELUM.has(p)

  if (!adaDatang && adaPulang) return { mark: 'THM', detail: `pulang=${p}` }
  if (adaDatang && !adaPulang) return { mark: 'THP', detail: `datang=${d}` }
  if (adaTl && adaPsw) return { mark: 'HADIR_TLP', detail: `datang=${d} pulang=${p}` }
  if (adaTl) return { mark: 'HADIR_TL', detail: `datang=${d}` }
  if (adaPsw) return { mark: 'HADIR_PSW', detail: `pulang=${p}` }
  return { mark: 'HADIR', detail: `datang=${d} pulang=${p}` }
}

export function parseKomdanas(data: ArrayBuffer): HasilKomdanas {
  const baris = bacaMatriks(data, false)
  const hasil: Record<string, PegawaiKomdanas> = {}
  const tertunda: Record<string, Record<number, string>> = {}
  const kodeAsing: Record<string, number> = {}

  const catatJikaAsing = (kode: string) => {
    if (kode && !KODE_KOMDANAS_DIKENAL.has(kode)) {
      kodeAsing[kode] = (kodeAsing[kode] ?? 0) + 1
    }
  }

  let nipKini: string | null = null
  let namaKini = ''
  let jabatanKini = ''

  for (let r = BARIS_AWAL; r < baris.length; r++) {
    const row = baris[r] ?? []
    const kehadiran = teksSel(row[4])

    if (kehadiran === 'DATANG') {
      nipKini = teksSel(row[2]) || null
      namaKini = teksSel(row[1]) || namaKini
      jabatanKini = teksSel(row[3]) || jabatanKini
      if (!nipKini) continue

      const sudahAda = hasil[nipKini]
      if (!sudahAda) {
        hasil[nipKini] = { nip: nipKini, nama: namaKini, jabatan: jabatanKini, hari: {} }
      } else {
        if (namaKini) sudahAda.nama = namaKini
        if (jabatanKini) sudahAda.jabatan = jabatanKini
      }

      // Berhenti pada sel kosong pertama: menandai akhir hari pada bulan pendek.
      const datang: Record<number, string> = {}
      for (let hari = 1; hari <= 31; hari++) {
        const sel = row[KOLOM_HARI_AWAL + hari - 1]
        if (sel == null) break
        datang[hari] = normalSel(sel)
        catatJikaAsing(datang[hari])
      }
      tertunda[nipKini] = datang
      continue
    }

    if (kehadiran === 'PULANG' && nipKini) {
      const datang = tertunda[nipKini] ?? {}
      delete tertunda[nipKini]

      for (let hari = 1; hari <= 31; hari++) {
        const nilaiPulang = normalSel(row[KOLOM_HARI_AWAL + hari - 1])
        const nilaiDatang = datang[hari] ?? ''
        catatJikaAsing(nilaiPulang)
        if (!nilaiDatang && !nilaiPulang) continue

        const klasifikasi = klasifikasiHari(nilaiDatang, nilaiPulang)
        if (klasifikasi.mark !== 'LIBUR') {
          hasil[nipKini].hari[hari] = klasifikasi
        }
      }
    }
  }

  return { pegawai: hasil, kodeAsing }
}
