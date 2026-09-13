import fs from 'node:fs'
import path from 'node:path'
import * as XLSX from 'xlsx'

const workbook = XLSX.utils.book_new()
const headers = ['no','nama','usia','kelamin','pekerjaan','unit kerja','tag_list','pendapat','rating_bintang']
const dataSheet = XLSX.utils.aoa_to_sheet([headers])
dataSheet['!cols'] = [
  { wch: 8 }, { wch: 28 }, { wch: 14 }, { wch: 12 }, { wch: 22 },
  { wch: 42 }, { wch: 42 }, { wch: 72 }, { wch: 18 },
]
dataSheet['!autofilter'] = { ref: 'A1:I1' }
XLSX.utils.book_append_sheet(workbook, dataSheet, 'Data Uji Publik')

const instructions = XLSX.utils.aoa_to_sheet([
  ['Panduan pengisian Uji Publik ZI'],
  ['Kolom','Ketentuan'],
  ['no','Nomor urut respons.'],
  ['nama','Nama responden; hanya terlihat pada detail terbatas.'],
  ['usia','Kelompok usia, misalnya 25-34.'],
  ['kelamin','Isi L atau P.'],
  ['pekerjaan','Pekerjaan/profesi responden.'],
  ['unit kerja','Nama satuan kerja sesuai master data Risk-Sim.'],
  ['tag_list','Pisahkan beberapa tag dengan tanda ~.'],
  ['pendapat','Pendapat lengkap responden.'],
  ['rating_bintang','Bilangan bulat 1 sampai 5.'],
])
instructions['!cols'] = [{ wch: 24 }, { wch: 72 }]
XLSX.utils.book_append_sheet(workbook, instructions, 'Petunjuk')

const outputDir = path.resolve('public', 'templates')
fs.mkdirSync(outputDir, { recursive: true })
const output = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true })
fs.writeFileSync(path.join(outputDir, 'Template_Uji_Publik_ZI.xlsx'), output)
console.log('Template Uji Publik ZI berhasil dibuat.')
