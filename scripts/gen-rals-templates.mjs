// Generate blank Excel templates (satu file per tahap RALS) ke templates/rals-excel/.
// Sumber kolom: src/lib/rals-export-columns.json — file yang SAMA dipakai ekspor live,
// jadi template tidak akan drift. Regenerate kapan pun kolom berubah:
//   node scripts/gen-rals-templates.mjs
import { createRequire } from 'module'
import fs from 'fs'
import path from 'path'

const require = createRequire(import.meta.url)
const ExcelJS = require('exceljs')

const defs = JSON.parse(fs.readFileSync('src/lib/rals-export-columns.json', 'utf8'))
const ORDER = ['konteks', 'identifikasi', 'analisis', 'evaluasi', 'penanganan']
const outDir = 'templates/rals-excel'
fs.mkdirSync(outDir, { recursive: true })

for (const [i, stage] of ORDER.entries()) {
  const def = defs[stage]
  const wb = new ExcelJS.Workbook()
  wb.creator = 'RALS — Risk Assessment Live Simulator (template)'
  const ws = wb.addWorksheet(def.title)
  ws.columns = def.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))

  const header = ws.getRow(1)
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } } // indigo-600
  header.alignment = { vertical: 'middle' }
  header.height = 20

  const fileName = `${i + 1}-${stage}.xlsx`
  await wb.xlsx.writeFile(path.join(outDir, fileName))
  console.log(`✓ ${fileName} (${def.columns.length} kolom)`)
}
