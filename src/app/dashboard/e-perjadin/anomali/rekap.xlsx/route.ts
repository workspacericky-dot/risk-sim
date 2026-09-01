import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'

export const dynamic = 'force-dynamic'
const PENGAWAS = ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas', 'ppspm', 'bendahara']

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const s = req.nextUrl.searchParams
  let q = supabase.from('perjadin_temuan')
    .select('kode, keparahan, ringkasan, status, keputusan, alasan, created_at, penugasan:penugasan_id(nomor, maksud, provinsi, unit_tujuan_id, jenis_alur, unit:unit_tujuan_id(nama_unit)), peserta:peserta_id(nama)')
    .order('created_at', { ascending: false })
  if (s.get('kode')) q = q.eq('kode', s.get('kode')!)
  const status = s.get('status')
  if (status && status !== 'all') q = q.eq('status', status)
  else if (!status) q = q.eq('status', 'terbuka')
  if (s.get('dari')) q = q.gte('created_at', s.get('dari')!)
  if (s.get('sampai')) q = q.lte('created_at', `${s.get('sampai')}T23:59:59`)
  const { data } = await q

  let rows = (data ?? []) as unknown as Record<string, unknown>[]
  if (s.get('satker')) rows = rows.filter((r) => (r.penugasan as { unit_tujuan_id?: string } | null)?.unit_tujuan_id === s.get('satker'))
  if (s.get('peserta')) {
    const term = s.get('peserta')!.toLowerCase()
    rows = rows.filter((r) => String((r.peserta as { nama?: string } | null)?.nama ?? '').toLowerCase().includes(term))
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-Perjadin Bawas'
  const ws = wb.addWorksheet('Anomali')
  ws.columns = [
    { header: 'Kode', key: 'kode', width: 8 }, { header: 'Keparahan', key: 'kep', width: 14 },
    { header: 'Status', key: 'st', width: 10 }, { header: 'Ringkasan', key: 'ring', width: 60 },
    { header: 'Keputusan', key: 'kep2', width: 12 }, { header: 'Alasan', key: 'al', width: 40 },
    { header: 'ST', key: 'nomor', width: 22 }, { header: 'Satker', key: 'satker', width: 28 },
    { header: 'Provinsi', key: 'prov', width: 18 }, { header: 'Peserta', key: 'pes', width: 24 },
    { header: 'Tanggal', key: 'tgl', width: 20 },
  ]
  for (const r of rows) {
    const pg = r.penugasan as { nomor?: string; provinsi?: string; unit?: { nama_unit?: string } } | null
    ws.addRow({
      kode: r.kode, kep: r.keparahan, st: r.status, ring: r.ringkasan, kep2: r.keputusan ?? '', al: r.alasan ?? '',
      nomor: pg?.nomor ?? '', satker: pg?.unit?.nama_unit ?? '', prov: pg?.provinsi ?? '',
      pes: (r.peserta as { nama?: string } | null)?.nama ?? '', tgl: new Date(r.created_at as string).toLocaleString('id-ID'),
    })
  }
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="anomali-e-perjadin.xlsx"`,
    },
  })
}
