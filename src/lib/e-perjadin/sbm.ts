import type { KategoriPelaksana, PenginapanMode } from './konstanta'

export type TarifSbm = {
  tahun: number
  provinsi: string
  komponen: string          // 'uang_harian' | 'penginapan' | 'tiket_pesawat' | …
  tingkat_biaya: string     // '-' | '1' | '2' | label sub-rute pesawat
  nilai: number
  satuan: string
}

export type JenisDinas = 'Luar Kota' | 'Dalam Kota > Ambang' | 'Dalam Kota <= Ambang'

export type ParamDanom = {
  tarifDalamKotaHarian: number
  tarifTransportLokalDalamKota: number
  toleransiOverbudgetTiket: number
  faktorPenginapan30: number
  tarifRepresentasiLuarKota: number
  faktorHarianTransportRiil: number
}

export type InputDanom = {
  jenisDinas: JenisDinas
  tanggalBerangkat: string  // 'YYYY-MM-DD'
  tanggalKembali: string
  provinsi: string
  tahun: number
  kategori: KategoriPelaksana
  penginapanMode: PenginapanMode
  homebaseJabodetabek: boolean
  berhakRepresentasi: boolean   // uang representasi luar kota (mis. Eselon II)
  transportLokalRiil: boolean   // transport lokal dibayar riil / >1 obrik → uang harian 60%
  pakaiKendaraanDinas: boolean  // memakai kendaraan dinas → tanpa transport lokal
  estimasiPesawat: number   // at cost, dari Pengelola (moda antarkota: pesawat/kereta/kapal/bus)
  estimasiDpr: number       // transport lokal lumpsum, dari Pengelola
  ruteSubLabel?: string      // pilih plafon sub-rute pesawat, jika ada
  param: ParamDanom
}

/** Rincian DANOM satu peserta (disimpan sebagai perjadin_peserta.estimasi_rincian). */
export type RincianDanom = {
  hari: number
  malam: number
  tarifHarian: number
  faktorHarian: number    // 1 normal; 0.6 bila transport lokal riil
  harian: number
  tarifRepresentasi: number
  representasi: number
  tarifPenginapan: number
  penginapanMode: PenginapanMode
  penginapan: number
  plafonPesawat: number
  pesawatDiajukan: number
  pesawat: number
  pesawatBebanPribadi: number
  dpr: number
  spj: number            // harian + representasi + dpr (komponen lumpsum)
  kwitansi: number        // penginapan + pesawat + spj  → estimasi_total
}

const HARI_MS = 24 * 60 * 60 * 1000

/**
 * Selisih hari inklusif tanggal berangkat s.d. kembali. Sabtu, Minggu, dan
 * hari libur TETAP dihitung sebagai hari sah tanpa surat pernyataan (PRD F-1.2).
 */
export function hitungJumlahHari(berangkat: string, kembali: string): number {
  const a = Date.parse(`${berangkat}T00:00:00Z`)
  const b = Date.parse(`${kembali}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) throw new Error('Tanggal tidak sah.')
  if (b < a) throw new Error('Tanggal kembali mendahului tanggal berangkat.')
  return Math.round((b - a) / HARI_MS) + 1
}

/**
 * Hitung DANOM satu peserta dari tabel SBM aktif (plafon_danom.md). Melempar
 * Error yang menyebut kombinasi yang hilang bila tarif wajib tidak ditemukan —
 * tidak memakai nilai default diam-diam (PRD F-1.2).
 */
export function hitungHakKeuangan(input: InputDanom, tarif: readonly TarifSbm[]): RincianDanom {
  const hari = hitungJumlahHari(input.tanggalBerangkat, input.tanggalKembali)
  const luarKota = input.jenisDinas === 'Luar Kota'
  const dalamKotaBesar = input.jenisDinas === 'Dalam Kota > Ambang'
  const malam = luarKota ? Math.max(0, hari - 1) : 0

  const cari = (komponen: string, tingkat: string): number => {
    const t = tarif.find((r) =>
      r.tahun === input.tahun && r.provinsi === input.provinsi &&
      r.komponen === komponen && r.tingkat_biaya === tingkat)
    if (!t) {
      throw new Error(`Tarif SBM tidak ditemukan: ${komponen} · ${input.provinsi} · tingkat "${tingkat}" · TA ${input.tahun}.`)
    }
    return t.nilai
  }
  const cariOpsional = (komponen: string, tingkat: string): number =>
    tarif.find((r) => r.tahun === input.tahun && r.provinsi === input.provinsi &&
      r.komponen === komponen && r.tingkat_biaya === tingkat)?.nilai ?? 0

  // ── Harian (× faktor 60% bila transport lokal riil / >1 obrik) ──
  let tarifHarian = 0
  const faktorHarian = input.transportLokalRiil ? input.param.faktorHarianTransportRiil : 1
  if (luarKota) {
    tarifHarian = cari('uang_harian', '-')
  } else if (dalamKotaBesar) {
    tarifHarian = input.param.tarifDalamKotaHarian
  }
  const harian = Math.round(tarifHarian * hari * faktorHarian)

  // ── Uang representasi (lumpsum, luar kota, hanya peserta yang berhak) ──
  const tarifRepresentasi = luarKota && input.berhakRepresentasi ? Math.max(0, Math.round(input.param.tarifRepresentasiLuarKota)) : 0
  const representasi = tarifRepresentasi * hari

  // ── Penginapan ──
  let tarifPenginapan = 0
  let penginapan = 0
  const boleh30 = luarKota && !input.homebaseJabodetabek
  if (luarKota && input.penginapanMode !== 'tidak' && !(input.penginapanMode === '30persen' && !boleh30)) {
    tarifPenginapan = cari('penginapan', input.kategori)
    const faktor = input.penginapanMode === '30persen' ? input.param.faktorPenginapan30 : 1
    penginapan = Math.round(tarifPenginapan * faktor) * malam
  }

  // ── Pesawat (at cost, plafon rute + toleransi) ──
  let plafonPesawat = 0
  let pesawatDiajukan = 0
  let pesawat = 0
  let pesawatBebanPribadi = 0
  if (luarKota) {
    plafonPesawat = input.ruteSubLabel
      ? cariOpsional('tiket_pesawat', input.ruteSubLabel) || cariOpsional('tiket_pesawat', '-')
      : cariOpsional('tiket_pesawat', '-')
    pesawatDiajukan = Math.max(0, Math.round(input.estimasiPesawat))
    const batas = plafonPesawat > 0 ? plafonPesawat + input.param.toleransiOverbudgetTiket : pesawatDiajukan
    pesawat = Math.min(pesawatDiajukan, batas)
    pesawatBebanPribadi = pesawatDiajukan - pesawat
  }

  // ── DPR / transport lokal lumpsum (nol bila memakai kendaraan dinas) ──
  const dpr = input.pakaiKendaraanDinas
    ? 0
    : luarKota
      ? Math.max(0, Math.round(input.estimasiDpr))
      : input.param.tarifTransportLokalDalamKota * hari

  const spj = harian + representasi + dpr
  const kwitansi = penginapan + pesawat + spj

  return {
    hari, malam, tarifHarian, faktorHarian, harian, tarifRepresentasi, representasi,
    tarifPenginapan, penginapanMode: input.penginapanMode, penginapan,
    plafonPesawat, pesawatDiajukan, pesawat, pesawatBebanPribadi, dpr, spj, kwitansi,
  }
}

// ── AF-4: durasi di lokasi penugasan (durasi_dinas.md) ────────────────
/** Menit In→Out di lokasi penugasan; null bila salah satu titik tidak ada. */
export function durasiLokasiMenit(inISO: string | null, outISO: string | null): number | null {
  if (!inISO || !outISO) return null
  const d = (Date.parse(outISO) - Date.parse(inISO)) / 60_000
  return Number.isFinite(d) && d >= 0 ? d : null
}

/**
 * AF-4 — apakah dinas dalam kota berhak "> 8 jam" (uang harian diakui).
 * Durasi di lokasi harus ≥ ambang (minimal 360 menit; unit boleh menaikkan).
 * Bila durasi tidak terukur → gugur (konservatif).
 */
export function dinasDalamKotaDiakuiBesar(durasiMenit: number | null, ambangMenit: number): boolean {
  return durasiMenit != null && durasiMenit >= Math.max(360, ambangMenit)
}
