/**
 * Baca satu berkas per jenis perkara (Tabel: No, Nomor Perkara, Klasifikasi
 * Perkara, Penggugat, Tergugat, Proses Terakhir, Penerimaan, Pengeluaran,
 * Sisa, Link) dan agregasi saldo Sisa per Nomor Perkara untuk perkara yang
 * sudah berakhir.
 *
 * Setara PDF A.2–A.4: PivotTable rows=Nomor Perkara, values=Sum of Sisa,
 * filter=Proses Terakhir ∈ Filters, ditambah kolom Tahun dari Nomor Perkara.
 */
import * as XLSX from 'xlsx'
import { bacaMatriks, teksSel } from '../ca-kepeg/baca-excel'
import { FILTERS_PROSES_TERAKHIR, type JenisPerkara } from './konstanta'

export type BarisPivot = {
  jenis: JenisPerkara
  nomorPerkara: string
  sisa: number
  tahun: number | null
}

export type HasilParseBerkas = {
  jenis: JenisPerkara
  namaBerkas: string
  jumlahBarisData: number
  jumlahBarisTerfilter: number
  pivot: BarisPivot[]
  /** Kolom wajib yang tidak ditemukan di header — kosong bila berkas terbaca sepenuhnya. */
  kolomHilang: string[]
}

const KOLOM_WAJIB = ['Nomor Perkara', 'Proses Terakhir', 'Sisa']

function cariKolom(header: string[], nama: string): number {
  const target = nama.trim().toLowerCase()
  return header.findIndex((h) => h.trim().toLowerCase() === target)
}

/** Tahun dari Nomor Perkara, mis. "10/Pdt.G/2024/MS.Bna" → 2024. Setara A.4. */
export function ekstrakTahun(nomorPerkara: string): number | null {
  const cocok = nomorPerkara.match(/\/([12]\d{3})\//)
  return cocok ? Number(cocok[1]) : null
}

function angka(v: unknown): number {
  if (typeof v === 'number') return v
  const n = Number(String(v ?? '').replace(/[^\d.-]/g, ''))
  return Number.isFinite(n) ? n : 0
}

const FILTER_SET = new Set(FILTERS_PROSES_TERAKHIR.map((f) => f.toLowerCase()))

export function parseBerkasJur(buf: ArrayBuffer, jenis: JenisPerkara, namaBerkas: string): HasilParseBerkas {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
  const namaSheet = wb.SheetNames[0]
  const matriks = namaSheet ? bacaMatriks(buf, false, namaSheet) : []

  const kosong = (kolomHilang: string[]): HasilParseBerkas =>
    ({ jenis, namaBerkas, jumlahBarisData: 0, jumlahBarisTerfilter: 0, pivot: [], kolomHilang })

  if (matriks.length === 0) return kosong(['(berkas atau sheet pertama kosong)'])

  const header = matriks[0].map((c) => teksSel(c))
  const idxNomor = cariKolom(header, 'Nomor Perkara')
  const idxProses = cariKolom(header, 'Proses Terakhir')
  const idxSisa = cariKolom(header, 'Sisa')

  const kolomHilang = KOLOM_WAJIB.filter((_, i) => [idxNomor, idxProses, idxSisa][i] === -1)
  if (kolomHilang.length > 0) return kosong(kolomHilang)

  // Agregasi Sum of Sisa per Nomor Perkara terfilter (setara SUMIFS A.3).
  const agregat = new Map<string, number>()
  let jumlahBarisData = 0
  let jumlahBarisTerfilter = 0

  for (const baris of matriks.slice(1)) {
    const nomorPerkara = teksSel(baris[idxNomor])
    if (nomorPerkara === '') continue
    jumlahBarisData++

    const prosesTerakhir = teksSel(baris[idxProses])
    if (!FILTER_SET.has(prosesTerakhir.toLowerCase())) continue
    jumlahBarisTerfilter++

    const sisa = angka(baris[idxSisa])
    agregat.set(nomorPerkara, (agregat.get(nomorPerkara) ?? 0) + sisa)
  }

  const pivot: BarisPivot[] = [...agregat].map(([nomorPerkara, sisa]) => ({
    jenis, nomorPerkara, sisa, tahun: ekstrakTahun(nomorPerkara),
  }))

  return { jenis, namaBerkas, jumlahBarisData, jumlahBarisTerfilter, pivot, kolomHilang: [] }
}