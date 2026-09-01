/**
 * Ekspor hasil analisis jadi workbook: Reanalisis_Pivot, Reanalisis_Ringkasan
 * (blok positif + negatif/anomali), Uji_Kepatuhan, Vouching_Eksekusi_PS,
 * Efisiensi_Alokasi, Efisiensi_ATK. Setara struktur keluaran PDF
 * script-saldo-sisapanjar.pdf, ditambah checklist kelengkapan bukti
 * kwitansi Eksekusi dan analisis efisiensi biaya proses.
 *
 * Dijalankan di browser (ExcelJS memakai build browser-nya sendiri).
 */
import ExcelJS from 'exceljs'
import type { HasilAnalisisSaldo, MatriksRingkasan } from './analisis-saldo'
import type { HasilKepatuhan } from './kepatuhan'
import type { BarisKwitansi } from './kwitansi'
import type { BarisPivot } from './parse-jur'
import type { HasilAlokasi, HasilEfisiensi, HasilVariansAtk } from './efisiensi'

const ISI_HEADER = 'FF2C3E50'
const ISI_SELANG = 'FFF5F5F5'
const ISI_POSITIF = 'FFD5F5E3'
const ISI_NEGATIF = 'FFFADBD8'
const ISI_PERINGATAN = 'FFFFF3CD'

const FONT_HEADER = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 }
const FONT_TEBAL = { bold: true, size: 9 }
const FONT_BIASA = { size: 9 }

const GARIS = { style: 'thin' as const, color: { argb: 'FFAAAAAA' } }
const BINGKAI = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS }

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

/** Baris keterangan kaki: satu sel digabung selebar tabel. */
function keterangan(ws: ExcelJS.Worksheet, baris: number, kolomTerakhir: number, teks: string, tinggi: number) {
  ws.mergeCells(baris, 1, baris, kolomTerakhir)
  const c = ws.getCell(baris, 1)
  c.value = teks
  c.font = { size: 8, italic: true, color: { argb: 'FF555555' } }
  c.alignment = { vertical: 'top', wrapText: true }
  ws.getRow(baris).height = tinggi
}

// ── Sheet 1: Reanalisis_Pivot ─────────────────────────────────────────────

function tulisPivot(ws: ExcelJS.Worksheet, hasil: HasilAnalisisSaldo) {
  const judul = ['Jenis Perkara', 'Nomor Perkara', 'Tahun', 'Sum of Sisa']
  judul.forEach((h, i) => sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))

  const urut = [...hasil.pivot].sort((a, b) => a.jenis.localeCompare(b.jenis) || a.nomorPerkara.localeCompare(b.nomorPerkara))
  urut.forEach((p, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isian = p.sisa > 0 ? ISI_POSITIF : p.sisa < 0 ? ISI_NEGATIF : selang
    sel(ws, r, 1, p.jenis, { isian: selang })
    sel(ws, r, 2, p.nomorPerkara, { isian: selang })
    sel(ws, r, 3, p.tahun, { isian: selang, rata: 'tengah' })
    sel(ws, r, 4, p.sisa, { isian, rata: 'kanan', format: '#,##0' })
  })

  lebarKolom(ws, [16, 30, 10, 18])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

// ── Sheet 2: Reanalisis_Ringkasan ─────────────────────────────────────────

function tulisMatriks(ws: ExcelJS.Worksheet, baris0: number, judul: string, matriks: MatriksRingkasan, isian: string): number {
  let r = baris0
  sel(ws, r, 1, judul, { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'kiri' })
  ws.mergeCells(r, 1, r, matriks.jenisList.length + 2)
  ws.getCell(r, 1).font = FONT_HEADER
  r++

  sel(ws, r, 1, 'Tahun', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  matriks.jenisList.forEach((j, i) => sel(ws, r, i + 2, j, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))
  sel(ws, r, matriks.jenisList.length + 2, 'Total', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  r++

  for (const t of matriks.tahunList) {
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    sel(ws, r, 1, t, { isian: selang, rata: 'tengah' })
    matriks.jenisList.forEach((j, i) => {
      const v = matriks.sel[t][j]
      sel(ws, r, i + 2, v === 0 ? null : v, { isian: v !== 0 ? isian : selang, rata: 'kanan', format: '#,##0' })
    })
    sel(ws, r, matriks.jenisList.length + 2, matriks.totalPerTahun[t], { font: FONT_TEBAL, isian: selang, rata: 'kanan', format: '#,##0' })
    r++
  }

  sel(ws, r, 1, 'Total', { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'tengah' })
  matriks.jenisList.forEach((j, i) => {
    sel(ws, r, i + 2, matriks.totalPerJenis[j], { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'kanan', format: '#,##0' })
  })
  sel(ws, r, matriks.jenisList.length + 2, matriks.totalKeseluruhan, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'kanan', format: '#,##0' })
  r += 2
  return r
}

function tulisRingkasan(ws: ExcelJS.Worksheet, hasil: HasilAnalisisSaldo) {
  let r = tulisMatriks(ws, 1, 'SALDO POSITIF (panjar belum dikembalikan)', hasil.ringkasanPositif, ISI_POSITIF)
  r = tulisMatriks(ws, r, 'SALDO NEGATIF / ANOMALI (pengeluaran > penerimaan)', hasil.ringkasanNegatif, ISI_NEGATIF)

  sel(ws, r, 1, 'DAFTAR ANOMALI SALDO NEGATIF', { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'kiri' })
  ws.mergeCells(r, 1, r, 4)
  ws.getCell(r, 1).font = FONT_HEADER
  r++
  ;['Nomor Perkara', 'Jenis', 'Tahun', 'Sum of Sisa'].forEach((h, i) => {
    sel(ws, r, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })
  r++
  for (const a of hasil.daftarAnomali) {
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    sel(ws, r, 1, a.nomorPerkara, { isian: selang })
    sel(ws, r, 2, a.jenis, { isian: selang })
    sel(ws, r, 3, a.tahun, { isian: selang, rata: 'tengah' })
    sel(ws, r, 4, a.sisa, { isian: ISI_NEGATIF, rata: 'kanan', format: '#,##0' })
    r++
  }

  lebarKolom(ws, [30, 16, 10, 18])
}

// ── Sheet 3: Uji_Kepatuhan ────────────────────────────────────────────────

function tulisKepatuhan(ws: ExcelJS.Worksheet, kepatuhan: HasilKepatuhan[], daftarSaldoPositif: BarisPivot[]) {
  const petaSisa = new Map(daftarSaldoPositif.map((p) => [p.nomorPerkara, p.sisa]))
  const judul = [
    'Nomor Perkara', 'Sisa Panjar', 'Media', 'Tgl Putusan', 'Tgl Unggah e-Court',
    'Tgl Mulai Acuan', 'Tgl Diberitahukan', 'Lama Hari Kerja', 'Status',
  ]
  judul.forEach((h, i) => sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))

  kepatuhan.forEach((k, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isian = k.status === 'PERLU KONFIRMASI MANUAL' ? ISI_NEGATIF
      : k.status === 'Sesuai (≤3 hari kerja)' ? ISI_POSITIF : selang
    sel(ws, r, 1, k.nomorPerkara, { isian: selang })
    sel(ws, r, 2, petaSisa.get(k.nomorPerkara) ?? null, { isian: selang, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 3, k.media, { isian: selang, rata: 'tengah' })
    sel(ws, r, 4, k.tglPutusan, { isian: selang, rata: 'tengah' })
    sel(ws, r, 5, k.tglUnggahECourt, { isian: selang, rata: 'tengah' })
    sel(ws, r, 6, k.tanggalMulaiAcuan, { isian: selang, rata: 'tengah' })
    sel(ws, r, 7, k.tglDiberitahukan, { isian: selang, rata: 'tengah' })
    sel(ws, r, 8, k.lamaHariKerja, { isian: selang, rata: 'tengah' })
    sel(ws, r, 9, k.status, { font: FONT_TEBAL, isian, rata: 'kiri' })
  })

  lebarKolom(ws, [28, 16, 12, 14, 16, 16, 16, 12, 26])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

// ── Sheet 4: Vouching_Eksekusi_PS ─────────────────────────────────────────

function tulisKwitansi(ws: ExcelJS.Worksheet, data: BarisKwitansi[]) {
  const judul = ['Nomor Perkara', 'Tahun', 'Bukti Kwitansi', 'Keterangan']
  judul.forEach((h, i) => sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))

  data.forEach((k, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    sel(ws, r, 1, k.nomorPerkara, { isian: selang })
    sel(ws, r, 2, k.tahun, { isian: selang, rata: 'tengah' })
    sel(ws, r, 3, k.adaKwitansi ? 'Sudah ada' : 'Belum ada', {
      font: FONT_TEBAL, isian: k.adaKwitansi ? ISI_POSITIF : ISI_NEGATIF, rata: 'tengah',
    })
    sel(ws, r, 4, k.catatan || null, { isian: selang })
  })

  lebarKolom(ws, [28, 10, 16, 44])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
}

// ── Sheet 5: Efisiensi_Alokasi ────────────────────────────────────────────

function tulisAlokasi(ws: ExcelJS.Worksheet, data: HasilAlokasi[]) {
  const judul = ['Tahun', 'Tarif / Perkara', 'Jumlah Perkara Diterima', 'Total Alokasi', 'Pengeluaran Riil', 'Selisih', 'Status']
  judul.forEach((h, i) => sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))

  data.forEach((a, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isian = a.selisih > 0 ? ISI_NEGATIF : a.selisih < 0 ? ISI_PERINGATAN : ISI_POSITIF
    sel(ws, r, 1, a.tahun, { isian: selang, rata: 'tengah' })
    sel(ws, r, 2, a.tarifPerPerkara, { isian: selang, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 3, a.jumlahPerkaraDiterima, { isian: selang, rata: 'tengah' })
    sel(ws, r, 4, a.totalAlokasi, { isian: selang, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 5, a.pengeluaranRiil, { isian: selang, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 6, a.selisih, { font: FONT_TEBAL, isian, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 7, a.status, { isian: selang })
  })

  lebarKolom(ws, [10, 16, 20, 18, 18, 18, 34])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  keterangan(ws, data.length + 3, 7,
    'Selisih > 0 = Overallocated (tarif terlalu mahal). Selisih < 0 = Underallocated (tarif terlalu rendah).', 16)
}

// ── Sheet 6: Efisiensi_ATK ─────────────────────────────────────────────────

function tulisVariansAtk(ws: ExcelJS.Worksheet, data: HasilVariansAtk[]) {
  const judul = [
    'Tahun', 'Nama Item', 'Standar / Perkara', 'Jumlah Perkara Diputus',
    'Kuantitas Standar', 'Saldo Awal', 'Pembelian', 'Saldo Akhir (Opname)',
    'Kuantitas Aktual', 'Harga Standar / Unit', 'Varians Efisiensi', 'Status',
  ]
  judul.forEach((h, i) => sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' }))

  data.forEach((v, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isian = v.variansEfisiensi > 0 ? ISI_NEGATIF : v.variansEfisiensi < 0 ? ISI_POSITIF : selang
    sel(ws, r, 1, v.tahun, { isian: selang, rata: 'tengah' })
    sel(ws, r, 2, v.namaItem, { isian: selang })
    sel(ws, r, 3, v.standarPerPerkara, { isian: selang, rata: 'kanan' })
    sel(ws, r, 4, v.jumlahPerkaraDiputus, { isian: selang, rata: 'tengah' })
    sel(ws, r, 5, v.kuantitasStandar, { isian: selang, rata: 'kanan' })
    sel(ws, r, 6, v.saldoAwal, { isian: selang, rata: 'kanan' })
    sel(ws, r, 7, v.pembelian, { isian: selang, rata: 'kanan' })
    sel(ws, r, 8, v.saldoAkhirOpname, { isian: selang, rata: 'kanan' })
    sel(ws, r, 9, v.kuantitasAktual, { isian: selang, rata: 'kanan' })
    sel(ws, r, 10, v.hargaStandar, { isian: selang, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 11, v.variansEfisiensi, { font: FONT_TEBAL, isian, rata: 'kanan', format: '#,##0' })
    sel(ws, r, 12, v.status, { isian: selang })
  })

  lebarKolom(ws, [10, 16, 14, 18, 14, 12, 12, 16, 14, 16, 18, 30])
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  keterangan(ws, data.length + 3, 12,
    'Varians > 0 = Unfavorable (boros/tidak efisien). Varians < 0 = Favorable (hemat).', 16)
}

// ── Perakit ───────────────────────────────────────────────────────────────

export async function bangunWorkbook(
  namaSatker: string,
  hasil: HasilAnalisisSaldo,
  kepatuhan: HasilKepatuhan[],
  kwitansiEksekusi: BarisKwitansi[] = [],
  efisiensi: HasilEfisiensi = { alokasi: [], variansAtk: [] },
): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Risk-Sim — CA Audit Keuangan Perkara'
  wb.created = new Date()

  tulisPivot(wb.addWorksheet('Reanalisis_Pivot'), hasil)
  tulisRingkasan(wb.addWorksheet('Reanalisis_Ringkasan'), hasil)
  if (kepatuhan.length > 0) tulisKepatuhan(wb.addWorksheet('Uji_Kepatuhan'), kepatuhan, hasil.daftarSaldoPositif)
  if (kwitansiEksekusi.length > 0) tulisKwitansi(wb.addWorksheet('Vouching_Eksekusi_PS'), kwitansiEksekusi)
  if (efisiensi.alokasi.length > 0) tulisAlokasi(wb.addWorksheet('Efisiensi_Alokasi'), efisiensi.alokasi)
  if (efisiensi.variansAtk.length > 0) tulisVariansAtk(wb.addWorksheet('Efisiensi_ATK'), efisiensi.variansAtk)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function namaBerkasEkspor(namaSatker: string): string {
  const slug = namaSatker.trim().replace(/\s+/g, '_') || 'Satker'
  const tanggal = new Date().toISOString().slice(0, 10)
  return `reanalisis_sisapanjar_${slug}_${tanggal}.xlsx`
}
