/**
 * Kalender hari libur, cuti bersama, dan Ramadhan.
 *
 * Sumber impor: tabel Markdown `ref_kalender.md` (kolom Tanggal | Kategori |
 * Keterangan). Rentang Ramadhan ditulis `YYYY-MM-DD s.d YYYY-MM-DD` dan
 * diekspansi jadi entri harian saat impor.
 *
 * Aturan prioritas (sama seperti run_full_analysis.py): baris individual
 * Libur Nasional / Cuti Bersama selalu mengalahkan rentang Ramadhan.
 */
import { KATEGORI_KALENDER, type KategoriKalender, type PetaKalender } from './konstanta'

export type EntriKalender = {
  /** `YYYY-MM-DD` */
  tanggal: string
  kategori: KategoriKalender
  keterangan: string
}

/** Cocokkan kategori tanpa peduli huruf besar/kecil, kembalikan bentuk bakunya. */
function bakukanKategori(teks: string): KategoriKalender | null {
  const t = teks.trim().toLowerCase()
  return KATEGORI_KALENDER.find((k) => k.toLowerCase() === t) ?? null
}

/** Terima ragam penulisan pemisah rentang: `s.d`, `s.d.`, `s/d`, `s/d.`. */
const RE_RENTANG = /(\d{4}-\d{2}-\d{2})\s+s\s*[./]\s*d\.?\s+(\d{4}-\d{2}-\d{2})/i
const RE_TANGGAL = /^\s*(\d{4}-\d{2}-\d{2})\s*$/

/** `YYYY-MM-DD` → `DD-MM-YYYY` (kunci peta kalender). */
export function keKunciTanggal(iso: string): string {
  const [y, m, d] = iso.split('-')
  return `${d}-${m}-${y}`
}

function tambahHari(iso: string, jumlah: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + jumlah))
  return dt.toISOString().slice(0, 10)
}

/** Ekspansi rentang Ramadhan jadi daftar tanggal harian (inklusif). */
function ekspansiRentang(mulai: string, selesai: string, keterangan: string): EntriKalender[] {
  const hasil: EntriKalender[] = []
  let kini = mulai
  // Batas aman 400 hari agar rentang salah ketik tidak membuat loop tak berujung.
  for (let i = 0; kini <= selesai && i < 400; i++) {
    hasil.push({ tanggal: kini, kategori: 'Ramadhan', keterangan })
    kini = tambahHari(kini, 1)
  }
  return hasil
}

export type BarisDitolak = { baris: string; alasan: string }

export type HasilUraiKalender = {
  entri: EntriKalender[]
  /**
   * Baris yang terlihat seperti data tapi tidak dapat dibaca. Wajib ditampilkan
   * ke pengguna: rentang yang gagal terbaca menciut jadi satu hari secara diam-
   * diam, dan hilangnya hari Ramadhan menggeser standar jam kerja tanpa gejala.
   */
  ditolak: BarisDitolak[]
}

/**
 * Urai tabel Markdown jadi entri kalender, terurut sesuai dokumen.
 * Entri belakangan menimpa entri terdahulu pada tanggal yang sama.
 */
export function uraiKalenderMarkdown(teks: string): HasilUraiKalender {
  const entri: EntriKalender[] = []
  const ditolak: BarisDitolak[] = []

  for (const barisMentah of teks.split(/\r?\n/)) {
    const baris = barisMentah.trim()
    if (!baris.startsWith('|') || baris.includes('---')) continue

    const kolom = baris.split('|').map((c) => c.trim())
    if (kolom.length < 3) continue

    const teksTanggal = kolom[1]
    const teksKategori = kolom[2]
    const keterangan = kolom[3] ?? ''

    // Lewati baris judul tabel tanpa melaporkannya sebagai kesalahan.
    if (teksTanggal.toLowerCase() === 'tanggal') continue
    if (teksTanggal === '' && teksKategori === '') continue

    const kategori = bakukanKategori(teksKategori)
    if (!kategori) {
      ditolak.push({
        baris,
        alasan: `Kategori "${teksKategori}" tidak dikenali — harus salah satu dari: ${KATEGORI_KALENDER.join(', ')}.`,
      })
      continue
    }

    const rentang = RE_RENTANG.exec(teksTanggal)
    if (rentang) {
      if (rentang[2] < rentang[1]) {
        ditolak.push({ baris, alasan: 'Tanggal akhir rentang mendahului tanggal awal.' })
        continue
      }
      entri.push(...ekspansiRentang(rentang[1], rentang[2], keterangan))
      continue
    }

    const tunggal = RE_TANGGAL.exec(teksTanggal)
    if (!tunggal) {
      ditolak.push({
        baris,
        alasan: `Tanggal "${teksTanggal}" tidak dikenali — pakai YYYY-MM-DD, atau YYYY-MM-DD s.d YYYY-MM-DD untuk rentang.`,
      })
      continue
    }

    entri.push({ tanggal: tunggal[1], kategori, keterangan })
  }

  return { entri, ditolak }
}

/**
 * Ratakan entri jadi satu baris per tanggal.
 * Entri belakangan menang, kecuali Ramadhan yang tidak boleh menimpa
 * Libur Nasional / Cuti Bersama yang sudah tercatat.
 */
export function ratakanEntri(entri: EntriKalender[]): EntriKalender[] {
  const peta = new Map<string, EntriKalender>()

  for (const e of entri) {
    const sudahAda = peta.get(e.tanggal)
    if (e.kategori === 'Ramadhan' && sudahAda && sudahAda.kategori !== 'Ramadhan') continue
    peta.set(e.tanggal, e)
  }

  return [...peta.values()].sort((a, b) => a.tanggal.localeCompare(b.tanggal))
}

/** Entri kalender (sudah rata) → peta `DD-MM-YYYY` → kategori. */
export function bangunPetaKalender(entri: EntriKalender[]): PetaKalender {
  const peta: PetaKalender = {}
  for (const e of entri) peta[keKunciTanggal(e.tanggal)] = e.kategori
  return peta
}

export type RingkasanKalender = {
  /** Libur Nasional + Cuti Bersama — pembanding langsung dengan keluaran Python. */
  libur: number
  /** Libur Daerah dihitung terpisah karena opsional dan khas per satker. */
  liburDaerah: number
  ramadhan: number
  total: number
}

export function ringkasKalender(entri: EntriKalender[]): RingkasanKalender {
  let libur = 0, liburDaerah = 0, ramadhan = 0
  for (const e of entri) {
    if (e.kategori === 'Ramadhan') ramadhan++
    else if (e.kategori === 'Libur Daerah') liburDaerah++
    else libur++
  }
  return { libur, liburDaerah, ramadhan, total: entri.length }
}
