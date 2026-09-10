import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const XLSX = require('xlsx')

const workbookPath = path.join(process.cwd(), 'ref', 'Analisis SIWAS', 'SIWASzz.xlsx')
const outputPath = path.join(process.cwd(), 'src', 'content', 'siwas-inspektorat.json')
const workbook = XLSX.readFile(workbookPath, { cellDates: true })
const rows = XLSX.utils.sheet_to_json(workbook.Sheets.Data, { defval: null, raw: true })

// Data laporan berakhir pada 4 Agustus 2026. Awal 5 Agustus dipakai untuk
// menguji apakah sebuah tahap sudah melewati tenggat setelah hari data terakhir.
const scopeStart = new Date(2024, 0, 1)
const evaluationDate = new Date(2026, 7, 5)

const groups = [
  { code: 'all', label: 'Seluruh unit' },
  { code: '110', label: 'Inspektorat Wilayah I' },
  { code: '120', label: 'Inspektorat Wilayah II' },
  { code: '130', label: 'Inspektorat Wilayah III' },
  { code: '140', label: 'Inspektorat Wilayah IV' },
  { code: '150', label: 'Inspektorat Wilayah V' },
  { code: '20', label: 'Non-Inspektorat' },
  { code: 'unassigned', label: 'Belum terklasifikasi' },
]

const stages = [
  ['S1', 'Laporan → disposisi', 'tanggal_laporan', 'tanggal_disposisi', 4, true],
  ['S2', 'Disposisi → penunjukan penelaah', 'tanggal_disposisi', 'tanggal_penunjukan_penelaah', 3, true],
  ['S3', 'Penunjukan → selesai telaah', 'tanggal_penunjukan_penelaah', 'tanggal_selesai_telaah', 15, true],
  ['S4', 'Selesai telaah → klarifikasi', 'tanggal_selesai_telaah', 'tanggal_klarifikasi', 19, false],
  ['S5', 'Selesai telaah → SK delegasi', 'tanggal_selesai_telaah', 'tanggal_sk_delegasi', 20, false],
  ['S6', 'Selesai telaah → pembentukan tim', 'tanggal_selesai_telaah', 'tanggal_pembentukan_tim', 16, false],
  ['S7', 'Pembentukan tim → pemeriksaan', 'tanggal_pembentukan_tim', 'tanggal_pemeriksaan', 10, true],
  ['S8', 'SK delegasi → pemeriksaan', 'tanggal_sk_delegasi', 'tanggal_pemeriksaan', 14, true],
  ['S9', 'Pemeriksaan → LHP', 'tanggal_pemeriksaan', 'tanggal_laporan_yang_dilakukan_pemeriksaan', 10, true],
  ['S10', 'LHP → surat jawaban', 'tanggal_laporan_yang_dilakukan_pemeriksaan', 'tanggal_jawab_surat', 23, true],
  ['S11', 'Klarifikasi → surat jawaban', 'tanggal_klarifikasi', 'tanggal_jawab_surat', 23, true],
]

function validDate(value) {
  if (!(value instanceof Date) || Number.isNaN(value.valueOf())) return null
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate())
  return date >= scopeStart && date < evaluationDate ? date : null
}

function businessDays(start, end) {
  let count = 0
  const cursor = new Date(start)
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1)
    if (cursor.getDay() !== 0 && cursor.getDay() !== 6) count += 1
  }
  return count
}

function iso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function percentile(values, probability) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const position = (sorted.length - 1) * probability
  const lower = Math.floor(position)
  const fraction = position - lower
  return sorted[lower + 1] === undefined
    ? sorted[lower]
    : sorted[lower] + fraction * (sorted[lower + 1] - sorted[lower])
}

const reports = new Map()
for (const row of rows) {
  const id = String(row.id ?? '').trim()
  if (!reports.has(id)) reports.set(id, [])
  reports.get(id).push(row)
}

const records = [...reports].map(([id, reportRows]) => {
  const codeValue = reportRows.find((row) => row.inspektur_wilayah !== null)?.inspektur_wilayah
  const code = codeValue === undefined ? 'unassigned' : String(codeValue).trim() || 'unassigned'
  const values = (column) => reportRows
    .map((row) => validDate(row[column]))
    .filter(Boolean)
    .sort((a, b) => a - b)
  return { id, code, values, reportDate: values('tanggal_laporan')[0] ?? null }
})

function summarize(group) {
  const selected = group.code === 'all' ? records : records.filter((record) => record.code === group.code)
  const stageResults = stages.map(([code, label, startColumn, endColumn, sla, trackOpen]) => {
    let onTime = 0
    let late = 0
    let overdueOpen = 0
    const closedDurations = []
    const extremes = []

    for (const report of selected) {
      const startDates = report.values(startColumn)
      if (!startDates.length) continue
      const start = startDates[0]
      const allEndDates = report.values(endColumn)
      const end = allEndDates.find((candidate) => candidate >= start)

      if (end) {
        const duration = businessDays(start, end)
        closedDurations.push(duration)
        if (duration <= sla) onTime += 1
        else {
          late += 1
          extremes.push({ id: report.id, stage: code, label, start: iso(start), end: iso(end), duration, overBy: duration - sla })
        }
      } else if (!allEndDates.length && trackOpen && businessDays(start, evaluationDate) > sla) {
        overdueOpen += 1
      }
    }

    const assessable = onTime + late + overdueOpen
    return {
      code,
      label,
      sla,
      assessable,
      onTime,
      late,
      overdueOpen,
      compliance: assessable ? onTime / assessable : null,
      median: percentile(closedDurations, 0.5),
      p90: percentile(closedDurations, 0.9),
      extremes,
    }
  })

  const totals = stageResults.reduce((sum, stage) => ({
    assessable: sum.assessable + stage.assessable,
    onTime: sum.onTime + stage.onTime,
    late: sum.late + stage.late,
    overdueOpen: sum.overdueOpen + stage.overdueOpen,
  }), { assessable: 0, onTime: 0, late: 0, overdueOpen: 0 })

  const quarterMap = new Map()
  for (const report of selected) {
    if (!report.reportDate) continue
    const quarter = `${report.reportDate.getFullYear()} Q${Math.floor(report.reportDate.getMonth() / 3) + 1}`
    if (!quarterMap.has(quarter)) quarterMap.set(quarter, { quarter, reports: 0, assessable: 0, onTime: 0 })
    quarterMap.get(quarter).reports += 1
  }
  for (const stage of stageResults) {
    for (const report of selected) {
      if (!report.reportDate) continue
      const startColumn = stages.find(([code]) => code === stage.code)[2]
      const endColumn = stages.find(([code]) => code === stage.code)[3]
      const trackOpen = stages.find(([code]) => code === stage.code)[5]
      const startDates = report.values(startColumn)
      if (!startDates.length) continue
      const start = startDates[0]
      const allEndDates = report.values(endColumn)
      const end = allEndDates.find((candidate) => candidate >= start)
      const isOpenOverdue = !end && !allEndDates.length && trackOpen && businessDays(start, evaluationDate) > stage.sla
      if (!end && !isOpenOverdue) continue
      const quarter = `${report.reportDate.getFullYear()} Q${Math.floor(report.reportDate.getMonth() / 3) + 1}`
      const item = quarterMap.get(quarter)
      item.assessable += 1
      if (end && businessDays(start, end) <= stage.sla) item.onTime += 1
    }
  }

  const cleanedStages = stageResults.map((stage) => {
    const cleaned = { ...stage }
    Reflect.deleteProperty(cleaned, 'extremes')
    return cleaned
  })
  const extremes = stageResults.flatMap((stage) => stage.extremes).sort((a, b) => b.overBy - a.overBy).slice(0, 10)
  const ranked = cleanedStages.filter((stage) => stage.assessable > 0 && stage.compliance !== null).sort((a, b) => a.compliance - b.compliance)
  const overdueRanked = cleanedStages.filter((stage) => stage.overdueOpen > 0).sort((a, b) => b.overdueOpen - a.overdueOpen)

  return {
    code: group.code,
    label: group.label,
    reports: selected.filter((record) => record.reportDate).length,
    ...totals,
    compliance: totals.assessable ? totals.onTime / totals.assessable : null,
    weakest: ranked[0] ?? null,
    strongest: ranked.at(-1) ?? null,
    largestOverdue: overdueRanked[0] ?? null,
    stages: cleanedStages,
    quarters: [...quarterMap.values()].map((quarter) => ({
      ...quarter,
      compliance: quarter.assessable ? quarter.onTime / quarter.assessable : null,
    })),
    extremes,
  }
}

const payload = {
  generatedFrom: 'SIWASzz.xlsx',
  dataThrough: '2026-08-04',
  groups: Object.fromEntries(groups.map((group) => [group.code, summarize(group)])),
}

const overall = payload.groups.all
if (overall.reports !== 15460 || overall.assessable !== 49778 || overall.onTime !== 28819 || overall.late !== 12605 || overall.overdueOpen !== 8354) {
  throw new Error(`Rekonsiliasi agregat gagal: ${JSON.stringify({ reports: overall.reports, assessable: overall.assessable, onTime: overall.onTime, late: overall.late, overdueOpen: overall.overdueOpen })}`)
}

fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`)
console.log(`Generated ${path.relative(process.cwd(), outputPath)} from ${rows.length.toLocaleString('id-ID')} rows.`)
