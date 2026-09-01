/**
 * Parser Catatan atas Laporan Keuangan (CaLK).
 *
 * Halaman CaLK memakai dua kolom: kolom sempit di kiri berisi "gloss" (kata
 * kunci pos + nilainya) dan kolom lebar di kanan berisi narasi. Keduanya harus
 * dipisah — kalau digabung, kata gloss menyelip ke tengah kalimat dan angka
 * yang sama tercatat dua kali, sehingga uji narasi-vs-angka (Bagian 5.D) jadi
 * salah tuduh.
 *
 * Keluaran: daftar seksi ber-kode catatan ("B.1", "C.1.1", "D.6") beserta
 * narasi dan nilai yang disebut di dalamnya, plus daftar tabel yang
 * direferensikan vs yang benar-benar muncul.
 */
import { nilaiDalamNarasi } from './angka'
import { gabungBarisYatim, gabungSel, keBaris, teksBaris, type Baris, type HalamanTeks } from './teks-pdf'
import type { SeksiCalk } from './konstanta'

/** "B.1", "C.1.1", "E.4.4" — kode catatan bertingkat. */
const POLA_KODE_SUB = /^([A-H](?:\.\d+){1,3})\.?\s+(.{2,120})$/
/** "B. PENJELASAN ATAS POS-POS LAPORAN REALISASI ANGGARAN" — bab utama. */
const POLA_KODE_BAB = /^([A-H])\.\s+([A-Z][A-Z\s/-]{6,120})$/
/**
 * "Tabel 12. Rincian Belanja Barang" — tidak dijangkar di awal baris karena
 * judul tabel kerap didahului kata dari kolom gloss di margin kiri.
 */
const POLA_TABEL = /\bTabel\s+(\d+)\.\s*(.+)$/
/** Titik-titik penuntun pada Daftar Isi / Daftar Tabel. */
const POLA_PENUNTUN = /\.{4,}/
/** Judul blok daftar di depan dokumen. */
const POLA_MULAI_DAFTAR = /^DAFTAR\s+(ISI|TABEL|GRAFIK|LAMPIRAN)\b/i
/** Judul yang menandai daftar sudah berakhir dan masuk isi laporan. */
const POLA_AKHIR_DAFTAR = /^(RINGKASAN|KATA PENGANTAR|PERNYATAAN|LAPORAN REALISASI|NERACA|LAPORAN OPERASIONAL|LAPORAN PERUBAHAN)\b/i

/** Halaman CaLK diawali kop "LAPORAN KEUANGAN <satker> ... TAHUN <n>". */
const POLA_KOP_CALK = /^LAPORAN KEUANGAN .+TAHUN\s+\d{4}/i
/** Kaki halaman: "CATATAN ATAS LAPORAN KEUANGAN | PENJELASAN ATAS POS-POS LRA 13". */
const POLA_KAKI_CALK = /^CATATAN ATAS LAPORAN KEUANGAN\b/i

export type HasilCalk = {
  seksi: SeksiCalk[]
  /** Nomor tabel → judul, dari Daftar Tabel di depan dokumen. */
  tabelTerdaftar: Map<number, string>
  /** Nomor tabel → halaman, dari judul tabel di badan dokumen. */
  tabelMuncul: Map<number, number>
}

/** Apakah halaman ini bagian CaLK (bukan laporan muka / bukan lampiran tabel). */
function halamanCalk(baris: Baris[]): boolean {
  return baris.slice(0, 4).some((b) => POLA_KOP_CALK.test(teksBaris(b)))
}

export function parseCalk(halaman: HalamanTeks[], halamanLaporan: Set<number>): HasilCalk {
  const seksi: SeksiCalk[] = []
  const tabelTerdaftar = new Map<number, string>()
  const tabelMuncul = new Map<number, number>()

  let aktif: SeksiCalk | null = null
  /** Sedang berada di blok Daftar Isi/Daftar Tabel di depan dokumen. */
  let dalamDaftar = false
  const potongan: string[] = []

  const tutup = () => {
    if (!aktif) return
    aktif.narasi = potongan.join(' ').replace(/\s+/g, ' ').trim()
    aktif.nilai = nilaiDalamNarasi(aktif.narasi)
    seksi.push(aktif)
    potongan.length = 0
  }

  for (const h of halaman) {
    if (halamanLaporan.has(h.nomor)) continue
    const baris = gabungBarisYatim(keBaris(h))
    if (!halamanCalk(baris)) continue

    for (const b of baris) {
      // Seluruh sel diambil, termasuk kolom gloss sempit di kiri. Menyaring
      // kolom secara geometris sempat membuang kata di awal baris narasi
      // (mis. kata "penurunan") pada halaman yang didominasi tabel — risiko
      // itu jauh lebih berbahaya daripada ikut terbawanya kata gloss.
      const teks = gabungSel(b.sel)
      if (!teks || POLA_KOP_CALK.test(teks) || POLA_KAKI_CALK.test(teks)) continue

      if (POLA_MULAI_DAFTAR.test(teks)) { dalamDaftar = true; continue }
      if (dalamDaftar && POLA_AKHIR_DAFTAR.test(teks)) dalamDaftar = false

      const tabel = teks.match(POLA_TABEL)
      if (tabel) {
        const nomor = Number(tabel[1])
        // Entri daftar dikenali dari posisinya di blok daftar, bukan dari titik
        // penuntun: judul yang panjang membungkus baris dan kehilangan titiknya.
        if (dalamDaftar || POLA_PENUNTUN.test(teks)) {
          tabelTerdaftar.set(nomor, tabel[2].replace(POLA_PENUNTUN, '').replace(/\s*\d+\s*$/, '').trim())
        } else if (!tabelMuncul.has(nomor)) {
          tabelMuncul.set(nomor, h.nomor)
        }
        continue
      }

      // Baris Daftar Isi tidak pernah jadi seksi maupun narasi.
      if (dalamDaftar || POLA_PENUNTUN.test(teks)) continue

      const sub = teks.match(POLA_KODE_SUB)
      const bab = teks.match(POLA_KODE_BAB)
      const kepala = sub ?? bab

      if (kepala) {
        tutup()
        aktif = {
          kode: kepala[1],
          judul: kepala[2].replace(/\s+/g, ' ').trim(),
          narasi: '',
          nilai: [],
          halaman: h.nomor,
        }
        continue
      }

      if (aktif) potongan.push(teks)
    }
  }

  tutup()
  return { seksi, tabelTerdaftar, tabelMuncul }
}

/** Cari seksi CaLK berdasarkan kode catatan, mis. "B.1". */
export function seksiByKode(seksi: SeksiCalk[], kode: string): SeksiCalk | undefined {
  return seksi.find((s) => s.kode.toUpperCase() === kode.toUpperCase())
}
