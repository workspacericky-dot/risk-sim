import * as XLSX from 'xlsx'

export type PpgRiskRegisterImportRow = {
  source_row: number
  unit_nama_raw: string
  tahun: number | null
  periode: string
  klasifikasi_risiko: string
  kategori: string
  proses_bisnis: string
  subproses_bisnis: string
  faktor_penyebab: string
  peristiwa: string
  penyebab: string
  dampak: string
  kemungkinan_inherent: number | null
  dampak_inherent: number | null
  kemungkinan_residual: number | null
  dampak_residual: number | null
  kemungkinan_treated: number | null
  dampak_treated: number | null
  control_text: string
  mitigation_text: string
  normalized_signature: string
  validation_errors: string[]
  raw_payload: Record<string, unknown>
}

export type ParsedPpgRiskRegister = {
  format: 'risk_register_2026'
  sheetName: 'Risk Register 2026'
  tahun: number | null
  periode: string
  rows: PpgRiskRegisterImportRow[]
  rejectedRows: number
}

const SHEET = 'Risk Register 2026' as const
const STOP_WORDS = new Set(['yang', 'dan', 'atau', 'dalam', 'pada', 'untuk', 'dari', 'oleh', 'dengan', 'agar', 'terjadi', 'terjadinya', 'potensi', 'proses'])

export function parsePpgRiskRegisterWorkbook(bytes: ArrayBuffer | Uint8Array): ParsedPpgRiskRegister {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  const worksheet = workbook.Sheets[SHEET]
  if (!worksheet) throw new Error(`Sheet baku "${SHEET}" tidak ditemukan.`)

  const title = cellText(worksheet, 'A1').toLocaleLowerCase('id-ID')
  const header = cellText(worksheet, 'C4').toLocaleLowerCase('id-ID')
  if (!title.includes('risk register') || !header.includes('potensi')) {
    throw new Error('Struktur sheet Risk Register 2026 tidak dikenali.')
  }

  const tahunValue = Number(worksheet.G2?.v)
  const tahun = Number.isInteger(tahunValue) && tahunValue >= 2000 && tahunValue <= 2200 ? tahunValue : null
  const periode = quarterPeriod(worksheet.E2?.v)
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:P6')
  const rows: PpgRiskRegisterImportRow[] = []
  let rejectedRows = 0
  let lastUnit = ''

  for (let rowIndex = 5; rowIndex <= range.e.r; rowIndex += 1) {
    const rowNumber = rowIndex + 1
    const value = (column: string) => worksheet[`${column}${rowNumber}`]?.v
    const explicitUnit = cleanText(value('B'))
    if (explicitUnit) lastUnit = explicitUnit
    const peristiwa = cleanText(value('C'))
    if (!peristiwa) continue

    const kemungkinan = parseRiskLevel(value('E'))
    const dampakLevel = parseRiskLevel(value('G'))
    const klasifikasi = cleanText(value('D'))
    const faktor = normalizeCauseFactor(value('J'))
    const penyebab = cleanText(value('K'))
    const dampak = cleanText(value('H'))
    const errors: string[] = []
    if (!lastUnit) errors.push('Unit kerja belum teridentifikasi')
    if (!tahun) errors.push('Tahun belum valid')
    if (!periode) errors.push('Triwulan belum valid')
    if (!klasifikasi) errors.push('Klasifikasi risiko kosong')
    if (!kemungkinan) errors.push('Probabilitas inherent belum valid')
    if (!dampakLevel) errors.push('Dampak inherent belum valid')

    const normalizedSignature = buildRiskSignature({ klasifikasi_risiko: klasifikasi, faktor_penyebab: faktor, peristiwa, penyebab, dampak })
    rows.push({
      source_row: rowNumber,
      unit_nama_raw: lastUnit,
      tahun,
      periode,
      klasifikasi_risiko: klasifikasi,
      kategori: '',
      proses_bisnis: '',
      subproses_bisnis: '',
      faktor_penyebab: faktor,
      peristiwa,
      penyebab,
      dampak,
      kemungkinan_inherent: kemungkinan,
      dampak_inherent: dampakLevel,
      // Format baku hanya menyediakan satu pasangan K/D. Residual dan treated
      // sengaja tidak direka; keduanya dilengkapi pada alur aplikasi.
      kemungkinan_residual: null,
      dampak_residual: null,
      kemungkinan_treated: null,
      dampak_treated: null,
      control_text: cleanText(value('N')),
      mitigation_text: cleanText(value('P')),
      normalized_signature: normalizedSignature,
      validation_errors: errors,
      raw_payload: {
        kemungkinan_keterangan: cleanText(value('F')),
        nomor_penyebab: cleanText(value('I')),
        nomor_kontrol: cleanText(value('M')),
        nomor_mitigasi: cleanText(value('O')),
      },
    })
    if (errors.length) rejectedRows += 1
  }

  if (!rows.length) throw new Error('Tidak ada baris risiko pada sheet Risk Register 2026.')
  return { format: 'risk_register_2026', sheetName: SHEET, tahun, periode, rows, rejectedRows }
}

export function buildRiskSignature(risk: Pick<PpgRiskRegisterImportRow, 'klasifikasi_risiko' | 'faktor_penyebab' | 'peristiwa' | 'penyebab' | 'dampak'>) {
  return [risk.klasifikasi_risiko, risk.faktor_penyebab, risk.peristiwa, risk.penyebab, risk.dampak]
    .map(normalizeRiskText).join('|')
}

export function riskSimilarity(a: Pick<PpgRiskRegisterImportRow, 'klasifikasi_risiko' | 'faktor_penyebab' | 'peristiwa' | 'penyebab' | 'dampak'>, b: typeof a) {
  const event = tokenSimilarity(a.peristiwa, b.peristiwa)
  const cause = tokenSimilarity(a.penyebab, b.penyebab)
  const impact = tokenSimilarity(a.dampak, b.dampak)
  const classification = normalizeRiskText(a.klasifikasi_risiko) === normalizeRiskText(b.klasifikasi_risiko) ? 1 : 0
  const factor = normalizeRiskText(a.faktor_penyebab) === normalizeRiskText(b.faktor_penyebab) ? 1 : 0
  let score = event * 0.7 + cause * 0.1 + impact * 0.05 + classification * 0.1 + factor * 0.05
  // Format baku sering menaruh uraian panjang setelah nama kegiatan. Nama
  // kegiatan yang sama merupakan sinyal kuat, tetapi detail satker tetap
  // dipertahankan sebagai anggota kandidat untuk diperiksa manusia.
  const leftActivity = activityKey(a.peristiwa); const rightActivity = activityKey(b.peristiwa)
  if (leftActivity.length >= 6 && leftActivity === rightActivity) score = Math.max(score, 0.92)
  return Math.round(score * 1000) / 10
}

export function normalizeRiskText(value: unknown) {
  return String(value ?? '').normalize('NFKD').toLocaleLowerCase('id-ID')
    .replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ')
}

function tokenSimilarity(left: unknown, right: unknown) {
  const tokens = (value: unknown) => new Set(normalizeRiskText(value).split(' ').filter((token) => token.length > 2 && !STOP_WORDS.has(token)))
  const a = tokens(left); const b = tokens(right)
  if (!a.size || !b.size) return 0
  const intersection = [...a].filter((token) => b.has(token)).length
  return intersection / (a.size + b.size - intersection)
}

function activityKey(value: unknown) {
  return normalizeRiskText(String(value ?? '').split(/[–—:]/, 1)[0])
}

function normalizeCauseFactor(value: unknown) {
  const raw = cleanText(value)
  if (!raw) return ''
  const normalized = normalizeRiskText(raw)
  if (normalized.includes('penegakan')) return 'Penegakan Aturan'
  if (normalized.includes('pemeriksaan')) return 'Pemeriksaan'
  if (normalized.includes('pemahaman')) return 'Pemahaman'
  if (normalized.includes('sistem')) return 'Sistem'
  return 'Lain-lain'
}

function parseRiskLevel(value: unknown) {
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5) return value
  const match = cleanText(value).match(/(?:level\s*)?([1-5])\b/i)
  return match ? Number(match[1]) : null
}

function quarterPeriod(value: unknown) {
  const match = cleanText(value).match(/[1-4]/)
  return match ? `Triwulan ${['I', 'II', 'III', 'IV'][Number(match[0]) - 1]}` : ''
}

function cellText(worksheet: XLSX.WorkSheet, address: string) { return cleanText(worksheet[address]?.v) }
function cleanText(value: unknown) { return String(value ?? '').replace(/\s+/g, ' ').trim() }
