import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { biayaPerPenugasan, cakupanSatker } from '@/lib/e-perjadin/manajerial'
import { muatMentahPenugasan } from '../data'

export const dynamic = 'force-dynamic'
const PENGAWAS = ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas']

export async function GET() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const mentah = await muatMentahPenugasan(supabase)
  const biaya = biayaPerPenugasan(mentah)
  const cakupan = cakupanSatker(mentah)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-Perjadin Bawas'

  const ws1 = wb.addWorksheet('Biaya per Penugasan')
  ws1.columns = [
    { header: 'ST', key: 'nomor', width: 22 }, { header: 'Maksud', key: 'maksud', width: 44 },
    { header: 'Satker', key: 'satker', width: 28 }, { header: 'Provinsi', key: 'prov', width: 18 },
    { header: 'Status', key: 'st', width: 12 }, { header: 'Tertaut PKA', key: 'pka', width: 12 },
    { header: 'Peserta', key: 'pes', width: 10 }, { header: 'Estimasi', key: 'est', width: 16 },
    { header: 'Realisasi', key: 'real', width: 16 }, { header: 'Biaya/Penugasan', key: 'cpp', width: 18 },
  ]
  for (const b of biaya) {
    ws1.addRow({
      nomor: b.nomor ?? '', maksud: b.maksud, satker: b.satker, prov: b.provinsi, st: b.status,
      pka: b.adaPka ? 'ya' : '', pes: b.jumlahPeserta, est: b.estimasiTotal, real: b.realisasi || '', cpp: b.costPerPenugasan,
    })
  }

  const ws2 = wb.addWorksheet('Cakupan Satker')
  ws2.columns = [
    { header: 'Satker', key: 'satker', width: 30 }, { header: 'Provinsi', key: 'prov', width: 18 },
    { header: 'Kunjungan', key: 'kunj', width: 12 }, { header: 'Tertaut PKA', key: 'pka', width: 12 },
    { header: 'Total Estimasi', key: 'est', width: 18 }, { header: 'Total Realisasi', key: 'real', width: 18 },
  ]
  for (const c of cakupan) {
    ws2.addRow({ satker: c.satker, prov: c.provinsi, kunj: c.kunjungan, pka: c.penugasanTertautPka, est: c.totalEstimasi, real: c.totalRealisasi || '' })
  }

  for (const ws of [ws1, ws2]) {
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan-manajerial-e-perjadin.xlsx"`,
    },
  })
}
