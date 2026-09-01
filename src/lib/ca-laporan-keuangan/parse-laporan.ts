/**
 * Parser laporan muka: LRA, Neraca, Laporan Operasional, Laporan Perubahan
 * Ekuitas, dan Neraca Percobaan (basis akrual & kas), beserta metadata dokumen.
 *
 * Halaman dikenali dari nama laporan internal SAKTI (mis. "lap_lra_face_..."),
 * dengan cadangan pencocokan judul bila nama internal tidak dicetak. Kolom
 * angka tidak di-hardcode melainkan diturunkan dari tepi kanan sel (lihat
 * anchorKolom di teks-pdf.ts), supaya tabel dengan lebar/urutan kolom berbeda
 * antar satker tetap terbaca.
 *
 * Kegagalan parsing satu laporan dicatat di `bagianTidakLengkap` dan tidak
 * menghentikan laporan lain (fail gracefully, Bagian 7).
 */
import { adalahAngka, parseAngka, type GayaAngka } from './angka'
import {
  anchorKolom, gabungBarisYatim, keBaris, labelBaris, nilaiKolom, teksBaris,
  type Baris, type HalamanTeks,
} from './teks-pdf'
import { ada, type BarisLo, type BarisLra, type BarisNeraca, type BarisNp, type MetadataLk } from './konstanta'

/**
 * Sebagian varian ekspor SAKTI (mis. cetakan semester/interim) mencetak angka
 * pada halaman muka dengan gaya CaLK ("2.500.000,00"), bukan gaya muka
 * ("2,500,000") yang dipakai cetakan "Unaudited Lengkap" tahunan. Coba gaya
 * muka dulu; bila tak ada satu kolom pun ditemukan, jatuh ke gaya CaLK.
 */
function deteksiGaya(baris: Baris[]): { gaya: GayaAngka; anchor: number[] } {
  const anchorMuka = anchorKolom(baris, (t) => adalahAngka(t, 'muka'))
  if (anchorMuka.length > 0) return { gaya: 'muka', anchor: anchorMuka }
  return { gaya: 'calk', anchor: anchorKolom(baris, (t) => adalahAngka(t, 'calk')) }
}

/** Sel di kiri batas ini dianggap label, bukan angka kolom. */
const BATAS_LABEL = 260

export type JenisLaporan = 'lra' | 'neraca' | 'lo' | 'lpe' | 'npAkrual' | 'npKas'

/** Nama laporan internal SAKTI → jenis. Dicetak kecil di pojok kanan atas. */
const POLA_ID_LAPORAN: [RegExp, JenisLaporan][] = [
  [/lap_lra_face/i, 'lra'],
  [/lap_neraca_percobaan_akrual/i, 'npAkrual'],
  [/lap_neraca_percobaan_kas/i, 'npKas'],
  [/lap_neraca_satker/i, 'neraca'],
  [/lap_lo_satker/i, 'lo'],
  [/lap_lpe_satker/i, 'lpe'],
]

/**
 * Cadangan: cocokkan judul laporan pada halaman muka. Dianchor agar cocok
 * hanya bila SATU baris berisi persis judul tersebut — bukan bila judul
 * itu cuma disebut di tengah kalimat CaLK (mis. "B. PENJELASAN ATAS
 * POS-POS LAPORAN REALISASI ANGGARAN"). Sebagian varian ekspor (mis.
 * cetakan semester) mencetak kop "LAPORAN KEUANGAN ... TAHUN ..." bahkan
 * di halaman laporan muka sendiri, jadi kop itu tidak bisa dipakai sebagai
 * sinyal "halaman ini pasti CaLK" — pencocokan baris-persis inilah yang
 * membedakan keduanya.
 */
const POLA_JUDUL: [RegExp, JenisLaporan][] = [
  [/^LAPORAN REALISASI ANGGARAN$/i, 'lra'],
  [/^NERACA PERCOBAAN\s*\(BASIS AKRUAL\)$/i, 'npAkrual'],
  [/^NERACA PERCOBAAN\s*\(BASIS KAS\)$/i, 'npKas'],
  [/^LAPORAN OPERASIONAL$/i, 'lo'],
  [/^LAPORAN PERUBAHAN EKUITAS$/i, 'lpe'],
  [/^NERACA$/i, 'neraca'],
]

/** Tentukan jenis laporan sebuah halaman dari ID internal SAKTI atau judul baris-persis. */
export function jenisHalaman(baris: Baris[]): JenisLaporan | null {
  const kepala = baris.slice(0, 16).map(teksBaris)
  const gabung = kepala.join('\n')

  for (const [pola, jenis] of POLA_ID_LAPORAN) {
    if (pola.test(gabung)) return jenis
  }

  for (const baris of kepala) {
    const bersih = baris.trim()
    for (const [pola, jenis] of POLA_JUDUL) {
      if (pola.test(bersih)) return jenis
    }
  }
  return null
}

// ── Metadata ─────────────────────────────────────────────────────────────
/**
 * Blok kanan atas ("Tgl Data", "Tgl Cetak", "Halaman", nama laporan internal)
 * kadang jatuh di klaster baris yang sama dengan label kiri — pada halaman LRA
 * yang dicetak landscape jaraknya di bawah toleransi baris. Sel-sel ini
 * menandai akhir nilai header di sebelah kirinya.
 */
const POLA_BLOK_KANAN = /^(Tgl\b|Halaman\b|lap_)/i
const POLA_TANGGAL = /\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s+[\d:]+\s*[AP]M)?/i

/**
 * Nilai sebuah baris header: sel-sel setelah label, berhenti saat menyentuh
 * blok kanan atas. Menghindari nama satker tercampur "Tgl Data ... Halaman ...".
 */
function nilaiHeader(b: Baris, polaLabel: RegExp): string | null {
  const i = b.sel.findIndex((s) => polaLabel.test(s.teks.trim()))
  if (i < 0) return null

  const bagian: string[] = []
  for (const s of b.sel.slice(i + 1)) {
    const t = s.teks.trim()
    if (POLA_BLOK_KANAN.test(t)) break
    bagian.push(t)
  }
  const teks = bagian.join(' ').replace(/\s+/g, ' ').trim()
  return teks || null
}

/**
 * Header laporan muka punya dua varian penulisan:
 *   "SATUAN KERJA : PENGADILAN AGAMA JOMBANG 401272"   (LRA)
 *   "SATUAN KERJA : ( 401272 ) PENGADILAN AGAMA JOMBANG" (Neraca/LO/LPE)
 */
function uraikanEntitas(teks: string): { nama: string; kode: string | null } {
  const kurung = teks.match(/^:?\s*\(\s*(\d+)\s*\)\s*(.+)$/)
  if (kurung) return { kode: kurung[1], nama: kurung[2].trim() }

  const belakang = teks.match(/^:?\s*(.+?)\s+(\d{2,6})\s*$/)
  if (belakang) return { nama: belakang[1].trim(), kode: belakang[2] }

  return { nama: teks.replace(/^:\s*/, '').trim(), kode: null }
}

/** Tanggal pada sel pertama di kanan label "Tgl Data"/"Tgl Cetak". */
function tanggalHeader(b: Baris, polaLabel: RegExp): string | null {
  const i = b.sel.findIndex((s) => polaLabel.test(s.teks.trim()))
  if (i < 0) return null
  for (const s of b.sel.slice(i + 1)) {
    const m = s.teks.match(POLA_TANGGAL)
    if (m) return m[0].replace(/\s+/g, ' ').trim()
  }
  return null
}

/**
 * Kop berulang pada varian tanpa header identitas standar, mis.
 * "LAPORAN KEUANGAN PENGADILAN AGAMA JOMBANG (401272) SEMESTER I TAHUN 2025"
 * atau "LAPORAN KEUANGAN BADAN URUSAN ADMINISTRASI UNAUDITED TAHUN 2025".
 */
const POLA_KOP_IDENTITAS =
  /^LAPORAN KEUANGAN\s+(.+?)(?:\s*\((\d{3,6})\))?\s+(?:SEMESTER\s+\S+\s+)?(?:UNAUDITED\s+|AUDITED\s+)?TAHUN\s+(\d{4})\b/i

/** Nilai yang paling sering muncul — meredam kop entitas lain yang sesekali disebut (mis. eselon di atasnya). */
function modus<T>(nilai: T[]): T | null {
  if (nilai.length === 0) return null
  const hitung = new Map<T, number>()
  for (const v of nilai) hitung.set(v, (hitung.get(v) ?? 0) + 1)
  let terbaik: T | null = null
  let maks = 0
  for (const [v, n] of hitung) if (n > maks) { maks = n; terbaik = v }
  return terbaik
}

/**
 * Sumber cadangan untuk dokumen tanpa blok header identitas standar (mis.
 * cetakan CaLK semester yang hanya mencetak kop judul & tanda tangan kata
 * pengantar, bukan blok "SATUAN KERJA :"). Dipanggil hanya bila jalur utama
 * gagal, dan menyisir seluruh halaman — bukan hanya halaman laporan muka.
 */
function metadataCadangan(semuaHalaman: HalamanTeks[]): Partial<MetadataLk> {
  const baris = semuaHalaman.flatMap((h) => gabungBarisYatim(keBaris(h)))
  const teksBarisan = baris.map(teksBaris)

  const namaList: string[] = []
  const kodeList: string[] = []
  const tahunList: number[] = []
  for (const t of teksBarisan) {
    const m = t.match(POLA_KOP_IDENTITAS)
    if (!m) continue
    namaList.push(m[1].trim())
    if (m[2]) kodeList.push(m[2])
    if (m[3]) tahunList.push(Number(m[3]))
  }

  let penanggungJawab: string | null = null
  let nip: string | null = null
  const iNip = teksBarisan.findIndex((t) => /^NIP\.?\s*\d{8,}$/i.test(t.trim()))
  if (iNip > 0) {
    nip = teksBarisan[iNip].match(/(\d{8,})/)?.[1] ?? null
    const kandidat = teksBarisan[iNip - 1].trim()
    if (/^[A-Z][A-Za-z.,\s'-]{3,}$/.test(kandidat)) penanggungJawab = kandidat
  }

  return {
    namaSatker: modus(namaList), kodeSatker: modus(kodeList), tahun: modus(tahunList),
    penanggungJawab, nip,
  }
}

export function parseMetadata(
  halaman: { jenis: JenisLaporan; baris: Baris[] }[],
  semuaHalaman: HalamanTeks[] = [],
): MetadataLk {
  const meta: MetadataLk = {
    namaSatker: null, kodeSatker: null, kementerian: null, eselon1: null,
    wilayah: null, tahun: null, tahunLalu: null, status: null,
    tglData: null, tglCetak: null, penanggungJawab: null, nip: null,
  }

  for (const { baris } of halaman) {
    for (const b of baris) {
      if (!meta.namaSatker) {
        const v = nilaiHeader(b, /^SATUAN KERJA$|^SATUAN KERJA\s*:/i)
        if (v) {
          const e = uraikanEntitas(v)
          meta.namaSatker = e.nama
          meta.kodeSatker = e.kode
        }
      }
      if (!meta.kementerian) {
        const v = nilaiHeader(b, /^KEMENTERIAN(\s+NEGARA)?\/LEMBAGA/i)
        if (v) meta.kementerian = uraikanEntitas(v).nama
      }
      if (!meta.eselon1) {
        const v = nilaiHeader(b, /^(ESELON I|UNIT ORGANISASI)$|^(ESELON I|UNIT ORGANISASI)\s*:/i)
        if (v) meta.eselon1 = uraikanEntitas(v).nama
      }
      if (!meta.wilayah) {
        const v = nilaiHeader(b, /^WILAYAH\/PROVINSI/i)
        if (v) meta.wilayah = uraikanEntitas(v).nama
      }

      meta.tglData ??= tanggalHeader(b, /^Tgl Data/i)
      meta.tglCetak ??= tanggalHeader(b, /^Tgl Cetak/i)

      const t = teksBaris(b)
      // "PER 31 DESEMBER 2025 - UNAUDITED" / "UNTUK PERIODE YANG BERAKHIR 31
      // DESEMBER 2025 ...". Diikat ke awal frasa tanggal (bukan pencarian
      // bebas "31 DESEMBER \d{4}" di mana pun) — varian semester menulis
      // "PER 30 JUNI 2025 DAN 31 DESEMBER 2024" pada Neraca, dan "2024" di
      // situ adalah tahun pembanding, bukan TA berjalan.
      if (!meta.tahun) {
        const th = t.match(/^(?:PER|UNTUK PERIODE YANG BERAKHIR)\s+31 DESEMBER (\d{4})/i)
        if (th) { meta.tahun = Number(th[1]); meta.tahunLalu = Number(th[1]) - 1 }
      }
      if (!meta.status) {
        const st = t.match(/\b(UNAUDITED|AUDITED)\b/i)
        if (st) meta.status = st[1].toUpperCase()
      }
      if (!meta.nip) {
        const nip = t.match(/NIP\.?\s*(\d{8,})/i)
        if (nip) meta.nip = nip[1]
      }
    }

    // Nama penanggung jawab: baris tepat sebelum baris NIP.
    if (!meta.penanggungJawab) {
      const teks = baris.map(teksBaris)
      const i = teks.findIndex((t) => /^NIP\.?\s*\d{8,}$/i.test(t.trim()))
      if (i > 0) {
        const kandidat = teks[i - 1].trim()
        if (/^[A-Z][A-Za-z.,\s'-]{3,}$/.test(kandidat)) meta.penanggungJawab = kandidat
      }
    }
  }

  if (!meta.namaSatker || !meta.tahun || !meta.penanggungJawab || !meta.nip) {
    const cadangan = metadataCadangan(semuaHalaman)
    meta.namaSatker ??= cadangan.namaSatker ?? null
    meta.kodeSatker ??= cadangan.kodeSatker ?? null
    meta.tahun ??= cadangan.tahun ?? null
    meta.tahunLalu ??= meta.tahun !== null ? meta.tahun - 1 : null
    meta.penanggungJawab ??= cadangan.penanggungJawab ?? null
    meta.nip ??= cadangan.nip ?? null
  }

  return meta
}

// ── Baris tabel generik ──────────────────────────────────────────────────
const POLA_JUMLAH = /^(jumlah|total)\b/i

/** Buang penomoran kolom & label hierarki di depan uraian ("4. ", "II. ", "A. "). */
function rapikanUraian(teks: string): string {
  return teks.replace(/\s+/g, ' ').trim()
}

type BarisGenerik = {
  uraian: string
  indent: number
  adalahJumlah: boolean
  halaman: number
  nilai: (number | null)[]
}

/**
 * Ubah kumpulan baris jadi baris tabel berlabel + nilai per kolom.
 * Baris tanpa label atau tanpa satu pun nilai dibuang (header, garis, kaki).
 */
function barisTabel(baris: Baris[]): { anchor: number[]; data: BarisGenerik[] } {
  const { gaya, anchor } = deteksiGaya(baris)
  if (anchor.length === 0) return { anchor, data: [] }

  const batasLabel = Math.min(BATAS_LABEL, anchor[0] - 50)
  const data: BarisGenerik[] = []

  for (const b of baris) {
    const nilai = nilaiKolom(b, anchor, (t) => parseAngka(t, gaya))
    if (nilai.every((v) => v === null)) continue

    const label = rapikanUraian(labelBaris(b, batasLabel))
    if (!label || !/[A-Za-z]/.test(label)) continue

    const selLabel = b.sel.find((s) => s.x < batasLabel && /[A-Za-z]/.test(s.teks))
    data.push({
      uraian: label,
      indent: selLabel?.x ?? 0,
      adalahJumlah: POLA_JUMLAH.test(label),
      halaman: b.halaman,
      nilai,
    })
  }

  return { anchor, data }
}

// ── Parser per laporan ───────────────────────────────────────────────────
/**
 * LRA: umumnya 8 kolom — anggaran/realisasi/selisih/% untuk TA berjalan & TA
 * lalu. Sebagian varian (mis. cetakan semester) tidak mencetak kolom selisih
 * Rp secara eksplisit, hanya 6 kolom (anggaran/realisasi/% × 2 tahun) —
 * selisihnya dihitung sendiri dari anggaran & realisasi.
 */
export function parseLra(baris: Baris[]): { data: BarisLra[]; galat: string | null } {
  const { anchor, data } = barisTabel(baris)
  if (data.length === 0) return { data: [], galat: 'Tabel LRA tidak terbaca.' }

  if (anchor.length === 8) {
    return {
      data: data.map((d) => ({
        uraian: d.uraian, indent: d.indent, adalahJumlah: d.adalahJumlah, halaman: d.halaman,
        anggaran: d.nilai[0], realisasi: d.nilai[1], selisih: d.nilai[2], persen: d.nilai[3],
        anggaranLalu: d.nilai[4], realisasiLalu: d.nilai[5], selisihLalu: d.nilai[6], persenLalu: d.nilai[7],
      })),
      galat: null,
    }
  }

  if (anchor.length === 6) {
    return {
      data: data.map((d) => {
        const [anggaran, realisasi, persen, anggaranLalu, realisasiLalu, persenLalu] = d.nilai
        return {
          uraian: d.uraian, indent: d.indent, adalahJumlah: d.adalahJumlah, halaman: d.halaman,
          anggaran, realisasi, persen, anggaranLalu, realisasiLalu, persenLalu,
          selisih: ada(realisasi) && ada(anggaran) ? realisasi - anggaran : null,
          selisihLalu: ada(realisasiLalu) && ada(anggaranLalu) ? realisasiLalu - anggaranLalu : null,
        }
      }),
      galat: null,
    }
  }

  return { data: [], galat: `LRA: terbaca ${anchor.length} kolom angka, diharapkan 6 atau 8.` }
}

/**
 * Neraca / LO / LPE: umumnya 4 kolom — TA berjalan, TA lalu, kenaikan, %.
 * Sebagian varian hanya mencetak 2 kolom (TA berjalan, TA lalu) tanpa kolom
 * kenaikan/% — keduanya dihitung sendiri dari selisih dua kolom nilai.
 */
function parseEmpatKolom(baris: Baris[], nama: string) {
  const { anchor, data } = barisTabel(baris)
  if (data.length === 0) return { data: [], galat: `Tabel ${nama} tidak terbaca.` }

  if (anchor.length === 4) {
    return {
      data: data.map((d) => ({
        uraian: d.uraian, indent: d.indent, adalahJumlah: d.adalahJumlah, halaman: d.halaman,
        nilai: d.nilai[0], nilaiLalu: d.nilai[1], kenaikan: d.nilai[2], persen: d.nilai[3],
      })),
      galat: null,
    }
  }

  if (anchor.length === 2) {
    return {
      data: data.map((d) => {
        const [nilai, nilaiLalu] = d.nilai
        const kenaikan = ada(nilai) && ada(nilaiLalu) ? nilai - nilaiLalu : null
        const persen = ada(kenaikan) && ada(nilaiLalu) && nilaiLalu !== 0 ? (kenaikan / nilaiLalu) * 100 : null
        return {
          uraian: d.uraian, indent: d.indent, adalahJumlah: d.adalahJumlah, halaman: d.halaman,
          nilai, nilaiLalu, kenaikan, persen,
        }
      }),
      galat: null,
    }
  }

  return { data: [], galat: `${nama}: terbaca ${anchor.length} kolom angka, diharapkan 2 atau 4.` }
}

export function parseNeraca(baris: Baris[]): { data: BarisNeraca[]; galat: string | null } {
  return parseEmpatKolom(baris, 'Neraca')
}

export function parseLo(baris: Baris[]): { data: BarisLo[]; galat: string | null } {
  return parseEmpatKolom(baris, 'Laporan Operasional')
}

export function parseLpe(baris: Baris[]): { data: BarisLo[]; galat: string | null } {
  return parseEmpatKolom(baris, 'Laporan Perubahan Ekuitas')
}

const POLA_KODE_TRN = /^\d\.\d$/
const POLA_KODE_AKUN = /^\d{6}$/

/**
 * Neraca Percobaan: kode transaksi, kode akun, nama akun, debet, kredit.
 * Nama akun yang melebihi lebar kolom disambung dari baris berikutnya.
 */
export function parseNeracaPercobaan(
  baris: Baris[],
  nama: string,
): { data: BarisNp[]; galat: string | null } {
  const { gaya, anchor } = deteksiGaya(baris)
  if (anchor.length < 2) return { data: [], galat: `${nama}: kolom debet/kredit tidak terbaca.` }

  // Dua kolom paling kanan adalah debet & kredit; kolom kiri berisi kode.
  const [aDebet, aKredit] = anchor.slice(-2)
  const data: BarisNp[] = []
  /** Posisi X kolom nama akun, dipakai menyaring baris sambungan. */
  let xNama: number | null = null

  for (const b of baris) {
    const sel = b.sel.map((s) => s.teks.trim()).filter(Boolean)
    const kodeAkun = sel.find((t) => POLA_KODE_AKUN.test(t))

    if (!kodeAkun) {
      // Sambungan nama akun: teks murni, sejajar kolom nama. Baris kaki
      // ("Keterangan :", tanda tangan) berada di margin kiri sehingga ditolak.
      const akhir = data[data.length - 1]
      const selNama = b.sel.filter((s) => xNama !== null && Math.abs(s.x - xNama) <= 20)
      const sambungan = selNama.map((s) => s.teks.trim()).join(' ').trim()
      if (akhir && sambungan && sel.every((t) => !adalahAngka(t, gaya))) {
        akhir.namaAkun = `${akhir.namaAkun} ${sambungan}`.replace(/\s+/g, ' ')
      }
      continue
    }

    const [debet, kredit] = nilaiKolom(b, [aDebet, aKredit], (t) => parseAngka(t, gaya))
    const kodeTrn = sel.find((t) => POLA_KODE_TRN.test(t)) ?? ''

    const selNama = b.sel.filter((s) => {
      const t = s.teks.trim()
      return t !== kodeAkun && t !== kodeTrn && !adalahAngka(t, gaya)
    })
    xNama ??= selNama[0]?.x ?? null

    const namaAkun = selNama.map((s) => s.teks.trim()).join(' ').replace(/\s+/g, ' ').trim()
    data.push({ kodeTrn, kodeAkun, namaAkun, debet, kredit, halaman: b.halaman })
  }

  if (data.length === 0) return { data: [], galat: `${nama}: tidak ada baris akun terbaca.` }
  return { data, galat: null }
}

/** Total debet/kredit dari baris "JUMLAH" di kaki Neraca Percobaan. */
export function totalNeracaPercobaan(baris: Baris[]): { debet: number | null; kredit: number | null } {
  const { gaya, anchor } = deteksiGaya(baris)
  if (anchor.length < 2) return { debet: null, kredit: null }
  const [aDebet, aKredit] = anchor.slice(-2)

  for (const b of baris) {
    const teks = teksBaris(b)
    if (!/^JUMLAH\b/i.test(teks)) continue
    const [debet, kredit] = nilaiKolom(b, [aDebet, aKredit], (t) => parseAngka(t, gaya))
    if (debet !== null || kredit !== null) return { debet, kredit }
  }
  return { debet: null, kredit: null }
}

// ── Orkestrasi ───────────────────────────────────────────────────────────
export type HalamanTerklasifikasi = { jenis: JenisLaporan; baris: Baris[]; halaman: number }

/** Kelompokkan halaman PDF menurut laporan yang dimuatnya. */
export function klasifikasiHalaman(halaman: HalamanTeks[]): HalamanTerklasifikasi[] {
  const mentah: HalamanTerklasifikasi[] = []
  for (const h of halaman) {
    const baris = gabungBarisYatim(keBaris(h))
    const jenis = jenisHalaman(baris)
    if (jenis) mentah.push({ jenis, baris, halaman: h.nomor })
  }

  // Sebagian dokumen menyajikan ulang tabel yang sama menjelang bagian CaLK
  // (rekap ringkas dengan tata letak kolom berbeda dari versi utamanya).
  // Hanya blok kemunculan PERTAMA tiap jenis yang dipakai, agar kolom dari
  // dua presentasi berbeda tidak tercampur saat dianalisis.
  const sudahDitutup = new Set<JenisLaporan>()
  const hasil: HalamanTerklasifikasi[] = []
  let jenisAktif: JenisLaporan | null = null

  for (const r of mentah) {
    if (r.jenis !== jenisAktif) {
      if (jenisAktif) sudahDitutup.add(jenisAktif)
      jenisAktif = r.jenis
    }
    if (!sudahDitutup.has(r.jenis)) hasil.push(r)
  }

  return hasil
}

export function barisLaporan(hal: HalamanTerklasifikasi[], jenis: JenisLaporan): Baris[] {
  return hal.filter((h) => h.jenis === jenis).flatMap((h) => h.baris)
}
