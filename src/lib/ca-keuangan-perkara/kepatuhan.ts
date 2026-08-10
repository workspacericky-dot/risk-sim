/**
 * Bagian B — uji kepatuhan pemberitahuan sisa panjar (≤ 3 hari kerja).
 * Setara PDF B.3–B.6: tanggal mulai acuan → hari kerja berlalu (padanan
 * NETWORKDAYS.INTL − 1) → status.
 */
import * as XLSX from 'xlsx'
import { bacaMatriks, teksSel, type SelMentah } from '../ca-kepeg/baca-excel'
import { keKunciTanggal } from '../ca-kepeg/kalender'
import { isKategoriLibur, type PetaKalender } from '../ca-kepeg/konstanta'
import { BATAS_HARI_KERJA, type Media, type StatusKepatuhan } from './konstanta'

export type InputKepatuhan = {
  nomorPerkara: string
  media: Media | null
  tglPutusan: string | null
  tglUnggahECourt: string | null
  tglDiberitahukan: string | null
}

export type HasilKepatuhan = InputKepatuhan & {
  tanggalMulaiAcuan: string | null
  lamaHariKerja: number | null
  status: StatusKepatuhan
}

function tambahHari(iso: string, jumlah: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d + jumlah)).toISOString().slice(0, 10)
}

function akhirPekan(iso: string): boolean {
  const hari = new Date(`${iso}T00:00:00Z`).getUTCDay()
  return hari === 0 || hari === 6
}

/** Padanan NETWORKDAYS.INTL(mulai; sampai; 1; Hari_Libur) − 1 — B.4. */
export function hitungHariKerjaBerlalu(mulai: string, sampai: string, peta: PetaKalender): number {
  let n = 0
  for (let kini = mulai; kini <= sampai; kini = tambahHari(kini, 1)) {
    if (akhirPekan(kini)) continue
    if (isKategoriLibur(peta[keKunciTanggal(kini)])) continue
    n++
  }
  return n - 1
}

/** Tanggal mulai acuan — B.3. */
export function tentukanTanggalMulaiAcuan(input: InputKepatuhan): string | null {
  if (input.media === 'Elektronik') return input.tglUnggahECourt
  if (input.media === 'Manual') return input.tglPutusan
  return null
}

/** Status — B.5–B.6. */
export function hitungStatus(input: InputKepatuhan, peta: PetaKalender): HasilKepatuhan {
  const tanggalMulaiAcuan = tentukanTanggalMulaiAcuan(input)

  let lamaHariKerja: number | null = null
  if (tanggalMulaiAcuan && input.tglDiberitahukan) {
    lamaHariKerja = hitungHariKerjaBerlalu(tanggalMulaiAcuan, input.tglDiberitahukan, peta)
  }

  const status: StatusKepatuhan = lamaHariKerja === null
    ? 'Data tanggal belum lengkap'
    : lamaHariKerja <= BATAS_HARI_KERJA
      ? 'Sesuai (≤3 hari kerja)'
      : 'PERLU KONFIRMASI MANUAL'

  return { ...input, tanggalMulaiAcuan, lamaHariKerja, status }
}

// ── File kedua opsional (B.2) ─────────────────────────────────────────────

const KANDIDAT_HEADER = {
  nomorPerkara: ['nomor perkara'],
  media: ['media', 'media perkara'],
  tglPutusan: ['tgl putusan', 'tanggal putusan'],
  tglUnggahECourt: [
    'tgl unggah e-court', 'tgl unggah ecourt', 'tgl unggah salinan putusan ke e-court',
  ],
  tglDiberitahukan: ['tgl diberitahukan', 'tanggal diberitahukan'],
} as const

function cariKolom(header: string[], kandidat: readonly string[]): number {
  const rendah = header.map((h) => h.trim().toLowerCase())
  for (const k of kandidat) {
    const i = rendah.indexOf(k)
    if (i !== -1) return i
  }
  return -1
}

function selKeTanggalIso(v: SelMentah): string | null {
  if (v == null || v === '') return null
  if (typeof v === 'number') {
    return new Date(Math.round((v - 25569) * 86400 * 1000)).toISOString().slice(0, 10)
  }
  const s = String(v).trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
  if (m) {
    const [, d, mo, y] = m
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return null
}

function selKeMedia(v: SelMentah): Media | null {
  const s = teksSel(v).toLowerCase()
  if (s.includes('elektronik')) return 'Elektronik'
  if (s.includes('manual')) return 'Manual'
  return null
}

export type HasilParseFileKepatuhan = {
  data: Record<string, InputKepatuhan>
  kolomHilang: string[]
}

/** Baca file kedua opsional (rekap tanggal per perkara), cocokkan by Nomor Perkara. */
export function parseFileKepatuhan(buf: ArrayBuffer): HasilParseFileKepatuhan {
  const wb = XLSX.read(new Uint8Array(buf), { type: 'array' })
  const matriks = bacaMatriks(buf, false, wb.SheetNames[0])
  if (matriks.length === 0) return { data: {}, kolomHilang: ['(sheet kosong)'] }

  const header = matriks[0].map((c) => teksSel(c))
  const idx = {
    nomorPerkara: cariKolom(header, KANDIDAT_HEADER.nomorPerkara),
    media: cariKolom(header, KANDIDAT_HEADER.media),
    tglPutusan: cariKolom(header, KANDIDAT_HEADER.tglPutusan),
    tglUnggahECourt: cariKolom(header, KANDIDAT_HEADER.tglUnggahECourt),
    tglDiberitahukan: cariKolom(header, KANDIDAT_HEADER.tglDiberitahukan),
  }

  const kolomHilang = (Object.keys(idx) as (keyof typeof idx)[]).filter((k) => idx[k] === -1)
  if (idx.nomorPerkara === -1) return { data: {}, kolomHilang }

  const data: Record<string, InputKepatuhan> = {}
  for (const baris of matriks.slice(1)) {
    const nomorPerkara = teksSel(baris[idx.nomorPerkara])
    if (nomorPerkara === '') continue
    data[nomorPerkara] = {
      nomorPerkara,
      media: idx.media === -1 ? null : selKeMedia(baris[idx.media]),
      tglPutusan: idx.tglPutusan === -1 ? null : selKeTanggalIso(baris[idx.tglPutusan]),
      tglUnggahECourt: idx.tglUnggahECourt === -1 ? null : selKeTanggalIso(baris[idx.tglUnggahECourt]),
      tglDiberitahukan: idx.tglDiberitahukan === -1 ? null : selKeTanggalIso(baris[idx.tglDiberitahukan]),
    }
  }

  return { data, kolomHilang }
}
