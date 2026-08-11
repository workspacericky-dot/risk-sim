/**
 * Tahap 1 — SIKEP (.xls) → data presensi per pegawai per hari + kode pelanggaran.
 *
 * Port dari phase1 run_full_analysis.py. File SIKEP tersusun atas blok 36 baris
 * per pegawai: 3 baris identitas, 1 baris header, 31 baris tanggal, 1 baris total.
 */
import { bacaMatriks, teksSel, type BarisMentah } from './baca-excel'
import {
  CATATAN_KE_KODE, HARI_SINGKAT_KE_PENUH, isKategoriLibur,
  kodePulangCepat, kodeTerlambat,
  type KategoriKalender, type KonfigJamKerja, type HariKerja, type PetaKalender,
} from './konstanta'

export type HariSikep = {
  hari: string
  tanggal: string
  libur: KategoriKalender | null
  kegiatan: string
  jamMasuk: string
  jamSiang: string
  jamPulang: string
  jamEfektif: string
  catatan: string
  standarMasuk: string
  standarPulang: string
  menitTerlambat: number
  menitPulangCepat: number
  /** TL1–TL4 | CT | CS | DIS | TMK | '' */
  kode: string
  /** THM | THP | '' */
  tidakPresensi: string
  /** PSW1–PSW4 | '' */
  kodePsw: string
}

export type PegawaiSikep = {
  nip: string
  nama: string
  namaKoma: string
  jabatanPenuh: string
  jabatan: string
  unit: string
  bulanLabel: string
  tmt: string
  totalJam: string
  /** kunci = tanggal `DD-MM-YYYY` */
  hari: Record<string, HariSikep>
}

export type HasilSikepBulan = {
  bulan: number
  namaFile: string
  pegawai: PegawaiSikep[]
  jumlahBarisData: number
}

/** "07:30" atau pecahan hari Excel → menit sejak tengah malam. */
export function uraiJam(nilai: unknown): number | null {
  const s = String(nilai ?? '').trim()
  if (s === '' || s === 'nan' || s === 'None' || s === '0.0') return null

  if (s.includes(':')) {
    const bagian = s.split(':')
    const jamStr = bagian[0].trim()
    const menitStr = (bagian[1] ?? '').trim()
    if (/^[+-]?\d+$/.test(jamStr) && menitStr !== '' && Number.isFinite(Number(menitStr))) {
      return parseInt(jamStr, 10) * 60 + Math.trunc(Number(menitStr))
    }
  }

  const pecahan = Number(s)
  if (Number.isFinite(pecahan) && pecahan > 0 && pecahan < 1) {
    return Math.round(pecahan * 24 * 60)
  }
  return null
}

/** Catatan SIKEP → [kode, dihitung pelanggaran] atau null bila tak dikenali. */
function petakanCatatan(catatan: string): [string, boolean] | null {
  const c = catatan.trim().toLowerCase()
  if (!c || c === 'nan' || c === 'none') return null
  const cocok = CATATAN_KE_KODE[c]
  if (cocok) return cocok
  if (c.includes('izin tidak masuk')) return ['TMK', true]
  return null
}

function sederhanakanJabatan(j: string): string {
  const t = j.trim()
  return t.toLowerCase().startsWith('hakim') ? 'Hakim' : t
}

/** Sisipkan koma sebelum gelar, mengikuti format_nama_koma() di Python. */
export function formatNamaKoma(nama: string): string {
  return nama
    .trim()
    .replace(
      /(?<!,) (S\.H|M\.H|S\.E|M\.M|S\.T|S\.IP|Ph\.D|Dr|S\.Ag|M\.Ag|S\.Sos|M\.Si)/g,
      ', $1',
    )
}

/** Penilaian satu hari terhadap standar jam kerja. */
function nilaiHari(
  hariPenuh: string,
  tanggal: string,
  kegiatan: string,
  jamMasuk: string,
  jamPulang: string,
  catatan: string,
  kalender: PetaKalender,
  jamKerja: KonfigJamKerja,
): Pick<
  HariSikep,
  'libur' | 'standarMasuk' | 'standarPulang' | 'menitTerlambat' | 'menitPulangCepat'
  | 'kode' | 'tidakPresensi' | 'kodePsw'
> {
  const kategori = kalender[tanggal] ?? null
  const kosong = {
    libur: kategori, standarMasuk: '', standarPulang: '',
    menitTerlambat: 0, menitPulangCepat: 0,
    kode: '', tidakPresensi: '', kodePsw: '',
  }

  // Akhir pekan tidak dinilai sama sekali.
  if (hariPenuh === 'Sabtu' || hariPenuh === 'Minggu') return kosong

  const tabel = kategori === 'Ramadhan' ? jamKerja.ramadhan : jamKerja.biasa
  const std = tabel[hariPenuh as HariKerja]
  const dasar = { ...kosong, standarMasuk: std?.masuk ?? '', standarPulang: std?.pulang ?? '' }

  // Libur nasional / cuti bersama: tidak ada kewajiban presensi.
  if (isKategoriLibur(kategori)) return dasar

  // Catatan resmi (cuti/dinas luar/izin) mengesampingkan perhitungan jam.
  const dariCatatan = petakanCatatan(catatan)
  if (dariCatatan) return { ...dasar, kode: dariCatatan[0] }

  // Hanya WFO yang dinilai jam masuk/pulangnya.
  if (kegiatan !== 'Work From Office') return dasar

  const masuk = uraiJam(jamMasuk)
  const pulang = uraiJam(jamPulang)
  const stdMasuk = uraiJam(std?.masuk)
  const stdPulang = uraiJam(std?.pulang)

  const hasil = { ...dasar }

  if (masuk === null) {
    hasil.tidakPresensi = 'THM'
  } else if (pulang === null) {
    hasil.tidakPresensi = 'THP'
  }

  if (masuk !== null && stdMasuk !== null) {
    const telat = masuk - stdMasuk
    if (telat > 0) {
      hasil.kode = kodeTerlambat(telat)
      hasil.menitTerlambat = telat
    }
  }

  if (pulang !== null && stdPulang !== null) {
    const cepat = stdPulang - pulang
    if (cepat > 0) {
      hasil.kodePsw = kodePulangCepat(cepat)
      hasil.menitPulangCepat = cepat
    }
  }

  return hasil
}

/** Pecah sheet SIKEP menjadi blok 36 baris × 8 kolom per pegawai. */
function pecahBlok(baris: BarisMentah[]): string[][][] {
  const blok: string[][][] = []
  let r = 0
  while (r < baris.length) {
    if (teksSel(baris[r]?.[0]) === 'Bulan') {
      const b: string[][] = []
      for (let i = 0; i < 36; i++) {
        const src = baris[r + i]
        b.push(Array.from({ length: 8 }, (_, c) => teksSel(src?.[c])))
      }
      blok.push(b)
      r += 36
    } else {
      r += 1
    }
  }
  return blok
}

export function parseSikep(
  data: ArrayBuffer,
  namaFile: string,
  bulan: number,
  kalender: PetaKalender,
  jamKerja: KonfigJamKerja,
): HasilSikepBulan {
  const blok = pecahBlok(bacaMatriks(data, true))
  const pegawai: PegawaiSikep[] = []
  let jumlahBarisData = 0

  for (const b of blok) {
    const nip = b[1][1].trim()
    const jabatanPenuh = b[1][5]
    const nama = b[2][1]

    const p: PegawaiSikep = {
      nip,
      nama: nama.trim(),
      namaKoma: formatNamaKoma(nama),
      jabatanPenuh,
      jabatan: sederhanakanJabatan(jabatanPenuh),
      unit: b[2][5],
      bulanLabel: b[0][1],
      tmt: b[0][5],
      totalJam: b[35][6],
      hari: {},
    }

    for (const baris of b.slice(4, 35)) {
      const hariPenuh = HARI_SINGKAT_KE_PENUH[baris[0]] ?? baris[0]
      const tanggal = baris[1]
      if (!tanggal) continue

      const penilaian = nilaiHari(
        hariPenuh, tanggal, baris[2], baris[3], baris[5], baris[7], kalender, jamKerja,
      )

      p.hari[tanggal] = {
        hari: hariPenuh,
        tanggal,
        kegiatan: baris[2],
        jamMasuk: baris[3],
        jamSiang: baris[4],
        jamPulang: baris[5],
        jamEfektif: baris[6],
        catatan: baris[7],
        ...penilaian,
      }
      jumlahBarisData++
    }

    pegawai.push(p)
  }

  return { bulan, namaFile, pegawai, jumlahBarisData }
}

// ── Ringkasan tahap 1 ─────────────────────────────────────────────────────

export type RingkasanSikep = {
  jumlahPegawai: number
  jumlahBarisData: number
  /** kode TL/CT/CS/DIS/TMK → jumlah hari */
  kode: Record<string, number>
  kodePsw: Record<string, number>
  tidakPresensi: Record<string, number>
}

export function ringkasSikep(hasil: HasilSikepBulan): RingkasanSikep {
  const kode: Record<string, number> = {}
  const kodePsw: Record<string, number> = {}
  const tidakPresensi: Record<string, number> = {}

  for (const p of hasil.pegawai) {
    for (const h of Object.values(p.hari)) {
      if (h.kode) kode[h.kode] = (kode[h.kode] ?? 0) + 1
      if (h.kodePsw) kodePsw[h.kodePsw] = (kodePsw[h.kodePsw] ?? 0) + 1
      if (h.tidakPresensi) tidakPresensi[h.tidakPresensi] = (tidakPresensi[h.tidakPresensi] ?? 0) + 1
    }
  }

  return {
    jumlahPegawai: hasil.pegawai.length,
    jumlahBarisData: hasil.jumlahBarisData,
    kode, kodePsw, tidakPresensi,
  }
}

export type PelanggaranPegawai = {
  nip: string
  nama: string
  tl: number
  psw: number
  tidakPresensi: number
  tmk: number
  total: number
}

/** Agregasi per pegawai untuk bagan pelanggaran tahap 1. */
export function pelanggaranPerPegawai(hasil: HasilSikepBulan): PelanggaranPegawai[] {
  const keluaran: PelanggaranPegawai[] = []

  for (const p of hasil.pegawai) {
    let tl = 0, psw = 0, tp = 0, tmk = 0
    for (const h of Object.values(p.hari)) {
      if (h.kode.startsWith('TL')) tl++
      if (h.kode === 'TMK') tmk++
      if (h.kodePsw) psw++
      if (h.tidakPresensi) tp++
    }
    const total = tl + psw + tp + tmk
    if (total > 0) {
      keluaran.push({ nip: p.nip, nama: p.nama, tl, psw, tidakPresensi: tp, tmk, total })
    }
  }

  return keluaran.sort((a, b) => b.total - a.total)
}

// ── Peringkat indisipliner lintas bulan ───────────────────────────────────

export type BarisPeringkat = {
  peringkat: number
  nip: string
  nama: string
  jabatan: string
  /** Rincian per kode, mis. { TL1: 4, TL2: 1 }. */
  rincianTl: Record<string, number>
  rincianPsw: Record<string, number>
  tl: number
  psw: number
  thm: number
  thp: number
  tmk: number
  total: number
  menitTerlambat: number
  menitPulangCepat: number
  /** Jumlah bulan yang memuat sedikitnya satu pelanggaran. */
  bulanTerdampak: number
  /** Jumlah bulan pegawai ini muncul di berkas SIKEP. */
  bulanTerdata: number
}

/**
 * Peringkat pelanggaran disiplin presensi seluruh pegawai, diakumulasi dari
 * seluruh bulan SIKEP yang diproses.
 *
 * Sumbernya murni hasil penilaian ulang SIKEP (jam scan vs standar jam kerja),
 * bukan hasil silang dengan KOMDANAS — jadi angkanya berdiri sendiri terhadap
 * temuan gap.
 */
export function peringkatIndisipliner(bulanan: HasilSikepBulan[]): BarisPeringkat[] {
  type Akumulasi = Omit<BarisPeringkat, 'peringkat'> & { bulanBerpelanggaran: Set<number> }
  const perNip = new Map<string, Akumulasi>()

  for (const bulan of bulanan) {
    for (const p of bulan.pegawai) {
      if (!p.nip) continue

      let a = perNip.get(p.nip)
      if (!a) {
        a = {
          nip: p.nip, nama: p.nama, jabatan: p.jabatan,
          rincianTl: {}, rincianPsw: {},
          tl: 0, psw: 0, thm: 0, thp: 0, tmk: 0, total: 0,
          menitTerlambat: 0, menitPulangCepat: 0,
          bulanTerdampak: 0, bulanTerdata: 0,
          bulanBerpelanggaran: new Set<number>(),
        }
        perNip.set(p.nip, a)
      }
      // Identitas terbaru menang: jabatan pegawai dapat berubah sepanjang tahun.
      if (p.nama) a.nama = p.nama
      if (p.jabatan) a.jabatan = p.jabatan
      a.bulanTerdata++

      for (const h of Object.values(p.hari)) {
        let adaPelanggaran = false

        if (h.kode.startsWith('TL')) {
          a.tl++
          a.rincianTl[h.kode] = (a.rincianTl[h.kode] ?? 0) + 1
          a.menitTerlambat += h.menitTerlambat
          adaPelanggaran = true
        }
        if (h.kode === 'TMK') {
          a.tmk++
          adaPelanggaran = true
        }
        if (h.kodePsw) {
          a.psw++
          a.rincianPsw[h.kodePsw] = (a.rincianPsw[h.kodePsw] ?? 0) + 1
          a.menitPulangCepat += h.menitPulangCepat
          adaPelanggaran = true
        }
        if (h.tidakPresensi === 'THM') {
          a.thm++
          adaPelanggaran = true
        }
        if (h.tidakPresensi === 'THP') {
          a.thp++
          adaPelanggaran = true
        }

        if (adaPelanggaran) a.bulanBerpelanggaran.add(bulan.bulan)
      }
    }
  }

  const baris = [...perNip.values()].map((a) => ({
    ...a,
    total: a.tl + a.psw + a.thm + a.thp + a.tmk,
    bulanTerdampak: a.bulanBerpelanggaran.size,
  }))

  // Terbanyak lebih dulu; seri dipecah oleh bobot menit, lalu nama.
  baris.sort((x, y) =>
    y.total - x.total
    || (y.menitTerlambat + y.menitPulangCepat) - (x.menitTerlambat + x.menitPulangCepat)
    || x.nama.localeCompare(y.nama, 'id'))

  // Peringkat kompetisi ("1224"): nilai yang sama berbagi nomor yang sama, dan
  // nomor berikutnya melompat. Tanpa ini, puluhan pegawai tanpa pelanggaran
  // akan tampak berurutan padahal seri sempurna.
  let nomor = 0
  let kunciSebelum: string | null = null

  return baris.map((b, i) => {
    const { bulanBerpelanggaran, ...sisa } = b
    void bulanBerpelanggaran

    const kunci = `${b.total}|${b.menitTerlambat + b.menitPulangCepat}`
    if (kunci !== kunciSebelum) {
      nomor = i + 1
      kunciSebelum = kunci
    }
    return { peringkat: nomor, ...sisa }
  })
}
