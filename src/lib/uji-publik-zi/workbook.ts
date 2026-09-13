import * as XLSX from 'xlsx'
import type { ZiImportRow } from './types'

const REQUIRED = ['nama', 'usia', 'kelamin', 'pekerjaan', 'unit_kerja', 'tag_list', 'pendapat', 'rating_bintang'] as const
type CanonicalHeader = (typeof REQUIRED)[number] | 'no'

const HEADER_ALIASES: Record<CanonicalHeader, string[]> = {
  no: ['no', 'nomor'],
  nama: ['nama', 'nama responden'],
  usia: ['usia', 'umur', 'kelompok usia'],
  kelamin: ['kelamin', 'jenis kelamin', 'gender'],
  pekerjaan: ['pekerjaan', 'profesi'],
  unit_kerja: ['unit kerja', 'unit_kerja', 'satker', 'satuan kerja'],
  tag_list: ['tag list', 'tag_list', 'tag', 'tags'],
  pendapat: ['pendapat', 'opini', 'ulasan', 'komentar'],
  rating_bintang: ['rating bintang', 'rating_bintang', 'jumlah bintang', 'bintang', 'rating'],
}

export type ParsedZiWorkbook = { sheetName: string; rows: ZiImportRow[]; headerRow: number }

export function parseZiWorkbook(bytes: ArrayBuffer | Uint8Array): ParsedZiWorkbook {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error('Workbook tidak memiliki sheet.')
  const sheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' })
  const headerIndex = matrix.slice(0, 20).findIndex((row) => {
    const normalized = row.map(normalizeHeader)
    return ['nama', 'unit kerja', 'pendapat'].every((header) => normalized.includes(header))
  })
  if (headerIndex < 0) throw new Error('Baris header tidak ditemukan. Pastikan kolom nama, unit kerja, dan pendapat tersedia.')

  const headers = matrix[headerIndex].map(normalizeHeader)
  const positions = new Map<CanonicalHeader, number>()
  for (const canonical of Object.keys(HEADER_ALIASES) as CanonicalHeader[]) {
    const aliases = HEADER_ALIASES[canonical].map(normalizeHeader)
    const index = headers.findIndex((header) => aliases.includes(header))
    if (index >= 0) positions.set(canonical, index)
  }
  const missing = REQUIRED.filter((header) => !positions.has(header))
  if (missing.length) throw new Error(`Kolom wajib belum tersedia: ${missing.join(', ')}.`)

  const rows: ZiImportRow[] = []
  for (let index = headerIndex + 1; index < matrix.length; index += 1) {
    const row = matrix[index]
    const text = (header: CanonicalHeader) => cleanText(row[positions.get(header) ?? -1])
    const pendapat = text('pendapat')
    const unitKerja = text('unit_kerja')
    const nama = text('nama')
    if (!pendapat && !unitKerja && !nama) continue
    const kelamin = normalizeGender(text('kelamin'))
    const rating = parseRating(text('rating_bintang'))
    const errors: string[] = []
    if (!nama) errors.push('Nama kosong')
    if (!text('usia')) errors.push('Usia kosong')
    if (!kelamin) errors.push('Kelamin harus L atau P')
    if (!text('pekerjaan')) errors.push('Pekerjaan kosong')
    if (!unitKerja) errors.push('Unit kerja kosong')
    if (!pendapat) errors.push('Pendapat kosong')
    if (!rating) errors.push('Rating bintang harus bilangan bulat 1–5')
    rows.push({
      sourceRow: index + 1,
      no: text('no') || String(index - headerIndex),
      nama,
      usia: text('usia'),
      kelamin,
      pekerjaan: text('pekerjaan'),
      unitKerja,
      sourceTags: splitTags(text('tag_list')),
      pendapat,
      ratingBintang: rating,
      errors,
    })
  }
  if (!rows.length) throw new Error('Tidak ada data respons di bawah baris header.')
  return { sheetName, rows, headerRow: headerIndex + 1 }
}

export function normalizeZiText(value: unknown) {
  return String(value ?? '').normalize('NFKD').toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function normalizeHeader(value: unknown) { return normalizeZiText(value).replaceAll(' ', '_').replace(/^_+|_+$/g, '').replaceAll('_', ' ') }
function cleanText(value: unknown) { return String(value ?? '').replace(/\s+/g, ' ').trim() }
function normalizeGender(value: string): 'L' | 'P' | '' {
  const normalized = normalizeZiText(value)
  if (['l', 'laki laki', 'pria'].includes(normalized)) return 'L'
  if (['p', 'perempuan', 'wanita'].includes(normalized)) return 'P'
  return ''
}
function parseRating(value: string) {
  const number = Number(value.replace(',', '.'))
  return Number.isInteger(number) && number >= 1 && number <= 5 ? number : null
}
function splitTags(value: string) {
  return [...new Set(value.split(/[~;,|]/).map(cleanText).filter(Boolean))]
}

