import * as XLSX from 'xlsx'

export type PpgImportedReport = {
  source_row: number
  nomor_laporan: string
  jabatan_penerima: string
  unit_nama: string
  jenis_penerimaan: string
  tanggal_penerimaan: string | null
  objek: string
  nilai_penetapan: number | null
  tanggal_pelaporan: string | null
  status_penetapan: string
  nomor_sk: string
  kategori_objek: string
  label_skenario: string
  tipe_pemberi: string
  kegiatan: string
  dugaan_momen: string
}

export type ParsedPpgWorkbook = {
  format: 'rekapitulasi_kpk' | 'worksheet_gol'
  sheetName: string
  headerRow: number
  totalRows: number
  rejectedRows: number
  rows: PpgImportedReport[]
}

type DetectedSheet = Pick<ParsedPpgWorkbook, 'format' | 'sheetName' | 'headerRow'> & {
  matrix: unknown[][]
}

const REKAPITULASI_ANCHORS = [
  'tanggal submit ke kpk',
  'no sig',
  'jabatan penerima gratifikasi yang dilaporkan',
  'klasifikasi laporan',
  'jenis objek gratifikasi',
  'tanggal penerimaan penolakan',
]

const WORKSHEET_GOL_ANCHORS = [
  'jabatan',
  'satker',
  'jenis penerimaan',
  'tanggal penerimaan',
  'uraian jenis objek gratifikasi',
]

export function parsePpgWorkbook(bytes: ArrayBuffer | Uint8Array): ParsedPpgWorkbook {
  const workbook = XLSX.read(bytes, { type: 'array', cellDates: true })
  const detected = detectReportSheet(workbook)
  if (!detected) {
    throw new Error('Workbook tidak memuat format Rekapitulasi Pelaporan KPK atau Worksheet (GOL) yang dikenali.')
  }

  const headers = new Map<string, number>()
  detected.matrix[detected.headerRow - 1].forEach((header, index) => {
    const key = normalizeHeader(header)
    if (key && !headers.has(key)) headers.set(key, index)
  })

  const rows: PpgImportedReport[] = []
  let totalRows = 0
  for (let rowIndex = detected.headerRow; rowIndex < detected.matrix.length; rowIndex += 1) {
    const source = detected.matrix[rowIndex]
    if (!source.some((value) => !isBlank(value))) continue
    totalRows += 1

    const value = (...aliases: string[]) => getValue(source, headers, aliases)
    const unitNama = firstText(
      value('sub unit kerja'),
      value('satker', 'satuan kerja'),
      value('unit instansi penerima gratifikasi yang dilaporkan'),
      value('instansi penerima gratifikasi yang dilaporkan'),
    )
    const nomorLaporan = firstText(value('no sig'), value('nomor laporan', 'no laporan'))
    const jabatan = firstText(value('jabatan penerima gratifikasi yang dilaporkan'), value('jabatan'))
    const objek = firstText(
      value('jenis objek gratifikasi'),
      value('uraian jenis objek gratifikasi', 'objek gratifikasi'),
      value('keterangan'),
    )

    if (!nomorLaporan && !objek && !jabatan) continue

    rows.push({
      source_row: rowIndex + 1,
      nomor_laporan: nomorLaporan,
      jabatan_penerima: jabatan,
      unit_nama: unitNama,
      jenis_penerimaan: firstText(value('klasifikasi laporan'), value('jenis penerimaan')),
      tanggal_penerimaan: parseDate(value('tanggal penerimaan penolakan', 'tanggal penerimaan', 'tanggal kejadian', 'tanggal menerima')),
      objek,
      nilai_penetapan: firstMoney(
        value('nominal penetapan mn'),
        value('nominal penetapan milik negara'),
        value('nominal penetapan milik penerima non sk'),
        value('nilai eq'),
        value('nilai penetapan'),
        value('nominal pelaporan'),
      ),
      tanggal_pelaporan: parseDate(value('tanggal submit ke kpk', 'tanggal lapor kpk', 'tanggal pelaporan', 'tanggal lapor')),
      status_penetapan: firstText(value('status penetapan laporan'), value('status penetapan')),
      nomor_sk: firstText(value('nomor sk', 'no sk')),
      kategori_objek: firstText(value('klasifikasi jenis objek gratifikasi'), value('kategori objek')),
      label_skenario: firstText(value('skenario gratifikasi')),
      // Ekspor KPK tidak menyediakan klasifikasi tipe pemberi. Kolom Hubungan
      // adalah atribut relasional non-identitas yang paling dekat maknanya.
      tipe_pemberi: firstText(value('tipe pemberi'), value('hubungan')),
      kegiatan: firstText(value('kegiatan dari uraian'), value('peristiwa')),
      dugaan_momen: firstText(value('dugaan kegiatan momen final', 'dugaan dari relasi momen')),
    })
  }

  return {
    format: detected.format,
    sheetName: detected.sheetName,
    headerRow: detected.headerRow,
    totalRows,
    rejectedRows: totalRows - rows.length,
    rows,
  }
}

function detectReportSheet(workbook: XLSX.WorkBook): DetectedSheet | null {
  const candidates: DetectedSheet[] = []
  for (const sheetName of workbook.SheetNames) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: true,
    })
    for (let rowIndex = 0; rowIndex < Math.min(matrix.length, 20); rowIndex += 1) {
      const headerSet = new Set(matrix[rowIndex].map(normalizeHeader).filter(Boolean))
      if (REKAPITULASI_ANCHORS.every((header) => headerSet.has(header))) {
        candidates.unshift({ format: 'rekapitulasi_kpk', sheetName, headerRow: rowIndex + 1, matrix })
        break
      }
      if (WORKSHEET_GOL_ANCHORS.every((header) => headerSet.has(header))) {
        candidates.push({ format: 'worksheet_gol', sheetName, headerRow: rowIndex + 1, matrix })
        break
      }
    }
  }
  return candidates[0] ?? null
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function getValue(row: unknown[], headers: Map<string, number>, aliases: string[]) {
  for (const alias of aliases) {
    const index = headers.get(normalizeHeader(alias))
    if (index !== undefined && !isBlank(row[index])) return row[index]
  }
  return ''
}

function isBlank(value: unknown) {
  return value === null || value === undefined || String(value).trim() === ''
}

function firstText(...values: unknown[]) {
  const value = values.find((item) => !isBlank(item))
  return value === undefined ? '' : String(value).trim()
}

function firstMoney(...values: unknown[]) {
  let zeroFallback: number | null = null
  for (const value of values) {
    if (isBlank(value)) continue
    const amount = parseMoney(value)
    if (amount !== null && amount > 0) return amount
    if (amount === 0) zeroFallback = 0
  }
  return zeroFallback
}

export function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10)
  const source = String(value ?? '').trim()
  if (!source) return null
  const iso = source.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`
  const local = source.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/)
  return local ? `${local[3]}-${local[2].padStart(2, '0')}-${local[1].padStart(2, '0')}` : null
}

export function parseMoney(value: unknown) {
  if (typeof value === 'number') return Number.isFinite(value) && value >= 0 ? value : null
  const source = String(value ?? '').replace(/[^0-9,.-]/g, '').trim()
  if (!source) return null

  const lastComma = source.lastIndexOf(',')
  const lastDot = source.lastIndexOf('.')
  let normalized = source
  if (lastComma >= 0 && lastDot >= 0) {
    normalized = lastComma > lastDot
      ? source.replace(/\./g, '').replace(',', '.')
      : source.replace(/,/g, '')
  } else if (lastComma >= 0) {
    const decimalDigits = source.length - lastComma - 1
    normalized = decimalDigits === 3 ? source.replace(/,/g, '') : source.replace(',', '.')
  } else if (lastDot >= 0) {
    const decimalDigits = source.length - lastDot - 1
    normalized = decimalDigits === 3 ? source.replace(/\./g, '') : source
  }

  const amount = Number(normalized)
  return Number.isFinite(amount) && amount >= 0 ? amount : null
}
