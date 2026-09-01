/**
 * Analisis tren & rasio (Bagian 5.E): horizontal (pertumbuhan YoY), vertikal
 * (proporsi terhadap total), rasio realisasi anggaran, dan likuiditas.
 *
 * Rasio dengan penyebut nol dikembalikan sebagai null disertai catatan — bukan
 * 0 atau "buruk" — supaya satker tanpa saldo akhir tidak terbaca menyesatkan.
 */
import { POLA_SURPLUS_DEFISIT, ada, type BarisLo, type BarisLra, type BarisNeraca, type DataLk } from './konstanta'

const POLA_SURPLUS_DEFISIT_LO = new RegExp(`^${POLA_SURPLUS_DEFISIT}LO$`, 'i')
const POLA_SURPLUS_DEFISIT_OPERASIONAL = new RegExp(`^${POLA_SURPLUS_DEFISIT}DARI KEGIATAN OPERASIONAL$`, 'i')

export type KelompokRasio = 'Horizontal' | 'Vertikal' | 'Realisasi Anggaran' | 'Likuiditas & Efisiensi'

export type BarisRasio = {
  kelompok: KelompokRasio
  nama: string
  nilai: number | null
  satuan: '%' | 'x'
  catatan: string
}

function bagi(pembilang: number | null, penyebut: number | null): { nilai: number | null; catatan: string } {
  if (!ada(pembilang) || !ada(penyebut)) return { nilai: null, catatan: 'Data tidak lengkap' }
  if (penyebut === 0) return { nilai: null, catatan: 'Tidak terdefinisi (penyebut nol)' }
  return { nilai: (pembilang / penyebut) * 100, catatan: '' }
}

const cari = <T extends { uraian: string }>(baris: T[], pola: RegExp): T | undefined =>
  baris.find((r) => pola.test(r.uraian))

/** Pertumbuhan YoY sebuah pos: (TA berjalan − TA lalu) / TA lalu. */
function horizontal(nama: string, baris: BarisNeraca | BarisLo | undefined): BarisRasio {
  const { nilai, catatan } = bagi(
    ada(baris?.nilai) && ada(baris?.nilaiLalu) ? baris.nilai - baris.nilaiLalu : null,
    baris?.nilaiLalu ?? null,
  )
  return { kelompok: 'Horizontal', nama, nilai, satuan: '%', catatan }
}

export function hitungRasio(data: DataLk): BarisRasio[] {
  const { neraca, lo, lra } = data
  const hasil: BarisRasio[] = []

  // ── Horizontal: pertumbuhan pos utama ──────────────────────────────────
  hasil.push(
    horizontal('Pendapatan-LO', cari(lo, /^Jumlah Pendapatan$/i)),
    horizontal('Jumlah Beban', cari(lo, /^JUMLAH BEBAN$/i)),
    horizontal('Surplus/Defisit-LO', cari(lo, POLA_SURPLUS_DEFISIT_LO)),
    horizontal('Jumlah Aset', cari(neraca, /^JUMLAH ASET$/i)),
    horizontal('Jumlah Kewajiban', cari(neraca, /^JUMLAH KEWAJIBAN$/i)),
    horizontal('Jumlah Ekuitas', cari(neraca, /^JUMLAH EKUITAS$/i)),
  )

  for (const b of lo.filter((r) => /^Beban /i.test(r.uraian) && (r.nilai || r.nilaiLalu))) {
    hasil.push(horizontal(b.uraian, b))
  }

  // ── Vertikal: proporsi tiap beban terhadap total beban ─────────────────
  const totalBeban = cari(lo, /^JUMLAH BEBAN$/i)?.nilai ?? null
  for (const b of lo.filter((r) => /^Beban /i.test(r.uraian) && r.nilai)) {
    const { nilai, catatan } = bagi(b.nilai, totalBeban)
    hasil.push({ kelompok: 'Vertikal', nama: `${b.uraian} / Jumlah Beban`, nilai, satuan: '%', catatan })
  }

  // ── Rasio realisasi anggaran per jenis belanja ─────────────────────────
  const jenisBelanja = lra.filter((r) => /^\d+\.\s*Belanja /i.test(r.uraian) && (r.anggaran || r.realisasi))
  for (const b of jenisBelanja) {
    const { nilai, catatan } = bagi(b.realisasi, b.anggaran)
    hasil.push({
      kelompok: 'Realisasi Anggaran',
      nama: `${b.uraian.replace(/^\d+\.\s*/, '')} (realisasi / pagu)`,
      nilai, satuan: '%', catatan,
    })
  }

  const totalBelanja = cari(lra, /^Jumlah Belanja( Negara)?\b/i)
  if (totalBelanja) {
    const { nilai, catatan } = bagi(totalBelanja.realisasi, totalBelanja.anggaran)
    hasil.push({ kelompok: 'Realisasi Anggaran', nama: 'Total Belanja (realisasi / pagu)', nilai, satuan: '%', catatan })
  }

  // ── Likuiditas & efisiensi ─────────────────────────────────────────────
  const asetLancar = cari(neraca, /^JUMLAH ASET LANCAR$/i)?.nilai ?? null
  const kewajibanPendek = cari(neraca, /^JUMLAH KEWAJIBAN JANGKA PENDEK$/i)?.nilai ?? null
  const likuiditas = bagi(asetLancar, kewajibanPendek)
  hasil.push({
    kelompok: 'Likuiditas & Efisiensi',
    nama: 'Rasio Lancar (Aset Lancar / Kewajiban Jangka Pendek)',
    nilai: likuiditas.nilai,
    satuan: '%',
    catatan: likuiditas.catatan,
  })

  const pendapatanLo = cari(lo, /^Jumlah Pendapatan$/i)?.nilai ?? null
  const efisiensi = bagi(cari(lo, /^JUMLAH BEBAN$/i)?.nilai ?? null, pendapatanLo)
  hasil.push({
    kelompok: 'Likuiditas & Efisiensi',
    nama: 'Rasio Beban terhadap Pendapatan-LO',
    nilai: efisiensi.nilai,
    satuan: '%',
    catatan: efisiensi.catatan,
  })

  const surplus = bagi(cari(lo, POLA_SURPLUS_DEFISIT_OPERASIONAL)?.nilai ?? null, pendapatanLo)
  hasil.push({
    kelompok: 'Likuiditas & Efisiensi',
    nama: 'Marjin Surplus Operasional',
    nilai: surplus.nilai,
    satuan: '%',
    catatan: surplus.catatan,
  })

  return hasil
}

/** Baris LRA per jenis belanja — dipakai bersama oleh sheet & panel UI. */
export function jenisBelanjaLra(lra: BarisLra[]): BarisLra[] {
  return lra.filter((r) => /^\d+\.\s*Belanja /i.test(r.uraian))
}
