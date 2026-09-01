/**
 * Ekspor hasil analisis LK jadi workbook multi-sheet: Ringkasan Eksekutif,
 * Temuan (berwarna menurut severity), sheet mentah tiap laporan, CaLK Index,
 * dan Rasio & Tren — sesuai Bagian 6 dokumen kebutuhan.
 *
 * Sheet laporan mentah memakai formula Excel hidup untuk kolom selisih dan %,
 * supaya verifikator bisa mengaudit ulang angkanya langsung di workbook.
 *
 * Dijalankan di browser (ExcelJS memakai build browser-nya sendiri).
 */
import ExcelJS from 'exceljs'
import { ringkasKategori, ringkasSeverity } from './analisis'
import { JUDUL_KATEGORI, type BarisLo, type BarisLra, type BarisNeraca, type BarisNp, type DataLk, type Severity, type Temuan } from './konstanta'
import type { BarisRasio } from './rasio'

const ISI_HEADER = 'FF2C3E50'
const ISI_SELANG = 'FFF5F5F5'
const ISI_SEVERITY: Record<Severity, string> = {
  Kritikal: 'FFF5B7B1',
  Tinggi: 'FFFADBD8',
  Sedang: 'FFFFF3CD',
  Info: 'FFD6EAF8',
}

const FONT_HEADER = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 }
const FONT_TEBAL = { bold: true, size: 9 }
const FONT_BIASA = { size: 9 }

const GARIS = { style: 'thin' as const, color: { argb: 'FFAAAAAA' } }
const BINGKAI = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS }

const RP = '#,##0;[Red](#,##0)'
const PERSEN = '#,##0.00'

type Perataan = 'kiri' | 'tengah' | 'kanan'
const RATA: Record<Perataan, Partial<ExcelJS.Alignment>> = {
  kiri: { horizontal: 'left', vertical: 'middle', wrapText: true },
  tengah: { horizontal: 'center', vertical: 'middle', wrapText: true },
  kanan: { horizontal: 'right', vertical: 'middle', wrapText: true },
}

type OpsiSel = { font?: Partial<ExcelJS.Font>; isian?: string; rata?: Perataan; format?: string }

function sel(ws: ExcelJS.Worksheet, baris: number, kolom: number, nilai: ExcelJS.CellValue, opsi: OpsiSel = {}) {
  const c = ws.getCell(baris, kolom)
  c.value = nilai ?? null
  c.font = opsi.font ?? FONT_BIASA
  if (opsi.isian) c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opsi.isian } }
  c.alignment = RATA[opsi.rata ?? 'kiri']
  if (opsi.format) c.numFmt = opsi.format
  c.border = BINGKAI
  return c
}

function lebarKolom(ws: ExcelJS.Worksheet, lebar: number[]) {
  lebar.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

function tulisJudul(ws: ExcelJS.Worksheet, baris: number, judul: string[]) {
  judul.forEach((h, i) => sel(ws, baris, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))
  ws.views = [{ state: 'frozen', ySplit: baris }]
}

/** Kolom Excel ke-n (1 → "A"). Dipakai menyusun formula hidup. */
function kolomExcel(n: number): string {
  let s = ''
  while (n > 0) {
    const sisa = (n - 1) % 26
    s = String.fromCharCode(65 + sisa) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

// ── Sheet 1: Ringkasan Eksekutif ─────────────────────────────────────────
function tulisRingkasan(ws: ExcelJS.Worksheet, data: DataLk, temuan: Temuan[]) {
  const m = data.metadata
  let r = 1

  sel(ws, r, 1, 'RINGKASAN EKSEKUTIF ANALISIS LAPORAN KEUANGAN', { font: FONT_HEADER, isian: ISI_HEADER })
  ws.mergeCells(r, 1, r, 4)
  r += 2

  const identitas: [string, string | number | null][] = [
    ['Satuan Kerja', m.namaSatker], ['Kode Satker', m.kodeSatker],
    ['Kementerian/Lembaga', m.kementerian], ['Eselon I', m.eselon1],
    ['Wilayah/Provinsi', m.wilayah], ['Tahun Anggaran', m.tahun],
    ['Status Laporan', m.status], ['Tanggal Data', m.tglData],
    ['Tanggal Cetak', m.tglCetak], ['Penanggung Jawab', m.penanggungJawab],
    ['NIP', m.nip],
  ]
  for (const [nama, nilai] of identitas) {
    sel(ws, r, 1, nama, { font: FONT_TEBAL })
    sel(ws, r, 2, nilai ?? '(tidak terbaca)')
    r++
  }

  r++
  sel(ws, r, 1, 'Statistik Utama', { font: FONT_HEADER, isian: ISI_HEADER })
  ws.mergeCells(r, 1, r, 2)
  r++

  const cari = <T extends { uraian: string }>(b: T[], p: RegExp) => b.find((x) => p.test(x.uraian))
  const statistik: [string, number | null | undefined][] = [
    ['Total Aset', cari(data.neraca, /^JUMLAH ASET$/i)?.nilai],
    ['Total Kewajiban', cari(data.neraca, /^JUMLAH KEWAJIBAN$/i)?.nilai],
    ['Total Ekuitas', cari(data.neraca, /^JUMLAH EKUITAS$/i)?.nilai],
    ['Pagu Belanja (LRA)', cari(data.lra, /^Jumlah Belanja Negara/i)?.anggaran],
    ['Realisasi Belanja (LRA)', cari(data.lra, /^Jumlah Belanja Negara/i)?.realisasi],
    ['Realisasi Pendapatan (LRA)', cari(data.lra, /^Jumlah Pendapatan Negara dan Hibah/i)?.realisasi],
    ['Pendapatan-LO', cari(data.lo, /^Jumlah Pendapatan$/i)?.nilai],
    ['Jumlah Beban', cari(data.lo, /^JUMLAH BEBAN$/i)?.nilai],
    ['Surplus/Defisit-LO', cari(data.lo, /^SURPLUS\/DEFISIT\s*-\s*LO$/i)?.nilai],
  ]
  for (const [nama, nilai] of statistik) {
    sel(ws, r, 1, nama, { font: FONT_TEBAL })
    sel(ws, r, 2, nilai ?? null, { rata: 'kanan', format: RP })
    r++
  }

  r++
  sel(ws, r, 1, 'Temuan per Severity', { font: FONT_HEADER, isian: ISI_HEADER })
  ws.mergeCells(r, 1, r, 2)
  r++
  const severity = ringkasSeverity(temuan)
  for (const s of Object.keys(severity) as Severity[]) {
    sel(ws, r, 1, s, { font: FONT_TEBAL, isian: ISI_SEVERITY[s] })
    sel(ws, r, 2, severity[s], { rata: 'tengah' })
    r++
  }

  r++
  sel(ws, r, 1, 'Temuan per Kategori', { font: FONT_HEADER, isian: ISI_HEADER })
  ws.mergeCells(r, 1, r, 3)
  r++
  for (const k of ringkasKategori(temuan)) {
    sel(ws, r, 1, k.kategori, { font: FONT_TEBAL, rata: 'tengah' })
    sel(ws, r, 2, k.judul)
    sel(ws, r, 3, k.jumlah, { rata: 'tengah' })
    r++
  }

  if (data.bagianTidakLengkap.length > 0) {
    r++
    sel(ws, r, 1, 'Bagian Tidak Lengkap', { font: FONT_HEADER, isian: ISI_HEADER })
    ws.mergeCells(r, 1, r, 3)
    r++
    for (const b of data.bagianTidakLengkap) {
      sel(ws, r, 1, b)
      ws.mergeCells(r, 1, r, 3)
      r++
    }
  }

  lebarKolom(ws, [30, 34, 12, 12])
}

// ── Sheet 2: Temuan ──────────────────────────────────────────────────────
function tulisTemuan(ws: ExcelJS.Worksheet, temuan: Temuan[]) {
  tulisJudul(ws, 1, [
    'No', 'Kategori', 'Uraian Kategori', 'Severity', 'Deskripsi Temuan', 'Pos/Akun Terkait',
    'Nilai Tercetak', 'Nilai Hitung Ulang', 'Selisih', 'Halaman', 'Rekomendasi Tindak Lanjut',
  ])

  temuan.forEach((t, i) => {
    const r = i + 2
    const isian = ISI_SEVERITY[t.severity]
    sel(ws, r, 1, i + 1, { rata: 'tengah', isian })
    sel(ws, r, 2, t.kategori, { rata: 'tengah', isian, font: FONT_TEBAL })
    sel(ws, r, 3, JUDUL_KATEGORI[t.kategori], { isian })
    sel(ws, r, 4, t.severity, { rata: 'tengah', isian, font: FONT_TEBAL })
    sel(ws, r, 5, t.deskripsi, { isian })
    sel(ws, r, 6, t.pos, { isian })
    sel(ws, r, 7, t.nilaiTercetak, { rata: 'kanan', format: RP, isian })
    sel(ws, r, 8, t.nilaiHitung, { rata: 'kanan', format: RP, isian })
    sel(ws, r, 9, t.selisih, { rata: 'kanan', format: RP, isian })
    sel(ws, r, 10, t.halaman, { rata: 'tengah', isian })
    sel(ws, r, 11, t.rekomendasi, { isian })
  })

  if (temuan.length === 0) {
    sel(ws, 2, 1, 'Tidak ada temuan.', { font: FONT_TEBAL })
    ws.mergeCells(2, 1, 2, 11)
  }

  lebarKolom(ws, [5, 9, 24, 10, 60, 32, 16, 16, 14, 9, 46])
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(temuan.length + 1, 2), column: 11 } }
}

// ── Sheet 3: laporan mentah ──────────────────────────────────────────────
function tulisLra(ws: ExcelJS.Worksheet, baris: BarisLra[], tahun: number | null) {
  const ti = tahun ?? 0
  tulisJudul(ws, 1, [
    'Uraian', `Anggaran ${ti}`, `Realisasi ${ti}`, 'Realisasi di Atas/(Bawah)', '% Realisasi',
    `Anggaran ${ti - 1}`, `Realisasi ${ti - 1}`, 'Realisasi di Atas/(Bawah)', '% Realisasi', 'Halaman',
  ])

  baris.forEach((b, i) => {
    const r = i + 2
    const isian = b.adalahJumlah ? ISI_SELANG : undefined
    const font = b.adalahJumlah ? FONT_TEBAL : FONT_BIASA
    sel(ws, r, 1, b.uraian, { isian, font })
    sel(ws, r, 2, b.anggaran, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 3, b.realisasi, { rata: 'kanan', format: RP, isian, font })
    // Formula hidup: selisih dan % dihitung ulang di dalam workbook.
    sel(ws, r, 4, { formula: `C${r}-B${r}` }, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 5, { formula: `IF(B${r}=0,"",C${r}/B${r}*100)` }, { rata: 'kanan', format: PERSEN, isian, font })
    sel(ws, r, 6, b.anggaranLalu, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 7, b.realisasiLalu, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 8, { formula: `G${r}-F${r}` }, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 9, { formula: `IF(F${r}=0,"",G${r}/F${r}*100)` }, { rata: 'kanan', format: PERSEN, isian, font })
    sel(ws, r, 10, b.halaman, { rata: 'tengah', isian, font })
  })

  lebarKolom(ws, [46, 17, 17, 17, 12, 17, 17, 17, 12, 9])
}

function tulisEmpatKolom(
  ws: ExcelJS.Worksheet, baris: (BarisNeraca | BarisLo)[], tahun: number | null, labelPos: string,
) {
  const ti = tahun ?? 0
  tulisJudul(ws, 1, [labelPos, `${ti}`, `${ti - 1}`, 'Kenaikan/(Penurunan)', '%', 'Halaman'])

  baris.forEach((b, i) => {
    const r = i + 2
    const isian = b.adalahJumlah ? ISI_SELANG : undefined
    const font = b.adalahJumlah ? FONT_TEBAL : FONT_BIASA
    sel(ws, r, 1, b.uraian, { isian, font })
    sel(ws, r, 2, b.nilai, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 3, b.nilaiLalu, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 4, { formula: `B${r}-C${r}` }, { rata: 'kanan', format: RP, isian, font })
    sel(ws, r, 5, { formula: `IF(C${r}=0,"",(B${r}-C${r})/C${r}*100)` }, { rata: 'kanan', format: PERSEN, isian, font })
    sel(ws, r, 6, b.halaman, { rata: 'tengah', isian, font })
  })

  lebarKolom(ws, [52, 19, 19, 20, 12, 9])
}

function tulisNeracaPercobaan(ws: ExcelJS.Worksheet, baris: BarisNp[]) {
  tulisJudul(ws, 1, ['Kode TRN', 'Kode Akun', 'Nama Akun', 'Debet', 'Kredit', 'Halaman'])

  baris.forEach((b, i) => {
    const r = i + 2
    sel(ws, r, 1, b.kodeTrn, { rata: 'tengah' })
    sel(ws, r, 2, b.kodeAkun, { rata: 'tengah' })
    sel(ws, r, 3, b.namaAkun)
    sel(ws, r, 4, b.debet, { rata: 'kanan', format: RP })
    sel(ws, r, 5, b.kredit, { rata: 'kanan', format: RP })
    sel(ws, r, 6, b.halaman, { rata: 'tengah' })
  })

  const r = baris.length + 2
  const k = kolomExcel(4)
  const l = kolomExcel(5)
  sel(ws, r, 1, 'JUMLAH', { font: FONT_TEBAL, isian: ISI_SELANG })
  ws.mergeCells(r, 1, r, 3)
  sel(ws, r, 4, { formula: `SUM(${k}2:${k}${r - 1})` }, { rata: 'kanan', format: RP, font: FONT_TEBAL, isian: ISI_SELANG })
  sel(ws, r, 5, { formula: `SUM(${l}2:${l}${r - 1})` }, { rata: 'kanan', format: RP, font: FONT_TEBAL, isian: ISI_SELANG })
  sel(ws, r, 6, null, { isian: ISI_SELANG })

  lebarKolom(ws, [10, 12, 56, 19, 19, 9])
}

// ── Sheet 4: CaLK Index ──────────────────────────────────────────────────
function tulisCalk(ws: ExcelJS.Worksheet, data: DataLk, temuan: Temuan[]) {
  tulisJudul(ws, 1, ['Kode Catatan', 'Judul Pos', 'Halaman', 'Status', 'Jumlah Nilai Disebut', 'Cuplikan Narasi'])

  data.calk.forEach((s, i) => {
    const r = i + 2
    const bermasalah = temuan.some((t) => t.pos.includes(`CaLK ${s.kode} `))
    const status = bermasalah ? 'Perlu Ditinjau' : s.narasi.trim() === '' ? 'Narasi Kosong' : 'Lengkap'
    const isian = bermasalah ? ISI_SEVERITY.Tinggi : s.narasi.trim() === '' ? ISI_SEVERITY.Sedang : undefined

    sel(ws, r, 1, s.kode, { rata: 'tengah', font: FONT_TEBAL, isian })
    sel(ws, r, 2, s.judul, { isian })
    sel(ws, r, 3, s.halaman, { rata: 'tengah', isian })
    sel(ws, r, 4, status, { rata: 'tengah', isian })
    sel(ws, r, 5, s.nilai.length, { rata: 'tengah', isian })
    sel(ws, r, 6, s.narasi.slice(0, 300), { isian })
  })

  let r = data.calk.length + 3
  sel(ws, r, 1, 'Daftar Tabel', { font: FONT_HEADER, isian: ISI_HEADER })
  ws.mergeCells(r, 1, r, 6)
  r++
  sel(ws, r, 1, 'No Tabel', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  sel(ws, r, 2, 'Judul', { font: FONT_HEADER, isian: ISI_HEADER })
  sel(ws, r, 3, 'Halaman Muncul', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  sel(ws, r, 4, 'Status', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  r++

  const semua = new Set([...data.tabelTerdaftar.keys(), ...data.tabelMuncul.keys()])
  for (const nomor of [...semua].sort((a, b) => a - b)) {
    const terdaftar = data.tabelTerdaftar.has(nomor)
    const muncul = data.tabelMuncul.get(nomor)
    const status = terdaftar && muncul ? 'Lengkap' : terdaftar ? 'Tidak Ditemukan' : 'Tidak Terdaftar'
    const isian = status === 'Lengkap' ? undefined : ISI_SEVERITY.Sedang
    sel(ws, r, 1, nomor, { rata: 'tengah', isian })
    sel(ws, r, 2, data.tabelTerdaftar.get(nomor) ?? '(tidak terdaftar)', { isian })
    sel(ws, r, 3, muncul ?? null, { rata: 'tengah', isian })
    sel(ws, r, 4, status, { rata: 'tengah', isian })
    r++
  }

  lebarKolom(ws, [14, 52, 16, 18, 22, 70])
}

// ── Sheet 5: Rasio & Tren ────────────────────────────────────────────────
function tulisRasio(ws: ExcelJS.Worksheet, rasio: BarisRasio[]) {
  tulisJudul(ws, 1, ['Kelompok', 'Rasio / Pos', 'Nilai', 'Satuan', 'Catatan'])

  rasio.forEach((b, i) => {
    const r = i + 2
    const isian = b.nilai === null ? ISI_SEVERITY.Info : undefined
    sel(ws, r, 1, b.kelompok, { isian })
    sel(ws, r, 2, b.nama, { isian })
    sel(ws, r, 3, b.nilai, { rata: 'kanan', format: PERSEN, isian })
    sel(ws, r, 4, b.satuan, { rata: 'tengah', isian })
    sel(ws, r, 5, b.catatan, { isian })
  })

  lebarKolom(ws, [22, 56, 14, 9, 32])
}

// ── Workbook ─────────────────────────────────────────────────────────────
export async function bangunWorkbook(data: DataLk, temuan: Temuan[], rasio: BarisRasio[]): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Risk-Sim — CA Laporan Keuangan'
  wb.created = new Date()

  const tahun = data.metadata.tahun

  tulisRingkasan(wb.addWorksheet('Ringkasan Eksekutif'), data, temuan)
  tulisTemuan(wb.addWorksheet('Temuan'), temuan)
  if (data.lra.length > 0) tulisLra(wb.addWorksheet('LRA'), data.lra, tahun)
  if (data.neraca.length > 0) tulisEmpatKolom(wb.addWorksheet('Neraca'), data.neraca, tahun, 'Nama Perkiraan')
  if (data.lo.length > 0) tulisEmpatKolom(wb.addWorksheet('Laporan Operasional'), data.lo, tahun, 'Uraian')
  if (data.lpe.length > 0) tulisEmpatKolom(wb.addWorksheet('Laporan Perubahan Ekuitas'), data.lpe, tahun, 'Uraian')
  if (data.npAkrual.length > 0) tulisNeracaPercobaan(wb.addWorksheet('Neraca Percobaan Akrual'), data.npAkrual)
  if (data.npKas.length > 0) tulisNeracaPercobaan(wb.addWorksheet('Neraca Percobaan Kas'), data.npKas)
  if (data.calk.length > 0) tulisCalk(wb.addWorksheet('CaLK Index'), data, temuan)
  if (rasio.length > 0) tulisRasio(wb.addWorksheet('Rasio & Tren'), rasio)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function namaBerkasEkspor(namaSatker: string | null): string {
  const slug = (namaSatker ?? '').trim().replace(/\s+/g, '_') || 'Satker'
  const tanggal = new Date().toISOString().slice(0, 10)
  return `analisis_lk_${slug}_${tanggal}.xlsx`
}
