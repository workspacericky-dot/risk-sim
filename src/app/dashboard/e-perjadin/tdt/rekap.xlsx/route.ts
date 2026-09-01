import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { muatDeretMetrik } from '../data'

export const dynamic = 'force-dynamic'
const PENGAWAS = ['pengelola_kegiatan', 'pemberi_tugas', 'staf_ppk', 'ppk', 'ppspm', 'bendahara', 'auditor_perjadin', 'kpa']
const persen = (n: number | undefined) => (n == null ? '' : Math.round(n * 1000) / 10)

export async function GET() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const deret = await muatDeretMetrik(supabase, new Date().toISOString().slice(0, 10))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-Perjadin Bawas'
  const ws = wb.addWorksheet('Deret Metrik Mingguan')
  ws.columns = [
    { header: 'Pekan (Senin)', key: 'pekan', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'TDT %', key: 'tdt', width: 10 },
    { header: 'Pembilang', key: 'pem', width: 11 },
    { header: 'Penyebut', key: 'pen', width: 11 },
    { header: 'KR1.1 ber-ST %', key: 'kr11', width: 15 },
    { header: 'KR1.3 presensi otomatis %', key: 'kr13', width: 24 },
    { header: 'KR2.1 median hari E-SPJ', key: 'kr21', width: 22 },
    { header: 'KR2.2 ≤1 revisi %', key: 'kr22', width: 18 },
    { header: 'Anti: fallback', key: 'af', width: 14 },
    { header: 'Anti: klaim >SBM disetujui', key: 'as', width: 24 },
    { header: 'Anti: rasio Rampung %', key: 'ar', width: 20 },
    { header: 'HEART: berhasil pertama %', key: 'h1', width: 24 },
    { header: 'HEART: median rekam (dtk)', key: 'h2', width: 24 },
  ]
  for (const d of deret) {
    ws.addRow({
      pekan: d.mingguMulai,
      status: !d.ada ? '—' : d.berjalan ? 'berjalan' : 'final',
      tdt: d.tdt == null ? '' : persen(d.tdt),
      pem: d.tdtPembilang, pen: d.tdtPenyebut,
      kr11: persen(d.kr.kr1_1_zero_off_system),
      kr13: persen(d.kr.kr1_3_presensi_otomatis),
      kr21: d.kr.kr2_1_median_hari_espj ?? '',
      kr22: persen(d.kr.kr2_2_maks_satu_revisi),
      af: d.antiMetrik.presensi_fallback ?? '',
      as: d.antiMetrik.klaim_atas_sbm_disetujui ?? '',
      ar: persen(d.antiMetrik.rasio_rampung),
      h1: persen(d.heart.presensi_berhasil_pertama),
      h2: d.heart.median_durasi_rekam_detik ?? '',
    })
  }
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="tdt-metrik-mingguan.xlsx"`,
    },
  })
}
