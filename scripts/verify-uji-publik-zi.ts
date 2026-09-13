import assert from 'node:assert/strict'
import * as XLSX from 'xlsx'
import { analyzeZiResponse, calculateZiCri, DEFAULT_CRI_WEIGHTS } from '../src/lib/uji-publik-zi/analytics.ts'
import { parseZiWorkbook } from '../src/lib/uji-publik-zi/workbook.ts'

const rows = [
  ['no','nama','usia','kelamin','pekerjaan','unit kerja','tag_list','pendapat','rating_bintang'],
  [1,'Responden Satu','25-34','L','PNS','PENGADILAN NEGERI NAMLEA','Kualitas Layanan~Integritas Pimpinan','Pelayanan baik dan cepat',5],
  [2,'Responden Dua','35-44','P','Wiraswasta','PENGADILAN NEGERI NAMLEA','Pungutan Liar','Pelayanan lambat dan ada pungli',1],
]
const sheet = XLSX.utils.aoa_to_sheet(rows)
const workbook = XLSX.utils.book_new()
XLSX.utils.book_append_sheet(workbook, sheet, 'Data Uji Publik')
const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
const parsed = parseZiWorkbook(bytes)
assert.equal(parsed.rows.length, 2)
assert.deepEqual(parsed.rows[0].sourceTags, ['Kualitas Layanan','Integritas Pimpinan'])
assert.equal(parsed.rows[1].ratingBintang, 1)
assert.equal(parsed.rows[1].errors.length, 0)

const negative = analyzeZiResponse({ unitId: 'unit-1', unitName: 'Unit A', sourceTags: ['Pungutan Liar'], opinion: 'Pelayanan sangat lambat dan ada pungli', starRating: 5 })
assert.equal(negative.sentimentLabel, 'negatif')
assert.equal(negative.mismatch, true)
assert.deepEqual(negative.highRiskTags, ['Pungutan Liar'])

const cri = calculateZiCri([
  { starRating: 1, sentimentScore: -1, highRiskTags: ['Pungutan Liar'] },
  { starRating: 5, sentimentScore: 1, highRiskTags: [] },
], DEFAULT_CRI_WEIGHTS)
assert.equal(cri.lowRatingPct, 50)
assert.equal(cri.highRiskTagPct, 50)
assert.equal(cri.negativeSentimentIntensity, 50)
assert.equal(cri.criScore, 50)
assert.equal(cri.riskLevel, 'menengah')

console.log('Verifikasi Uji Publik ZI berhasil.')

