import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { LABEL_KOMPONEN_BIAYA, type KomponenBiaya } from '@/lib/e-perjadin/espj'

// Ekspor rekap E-SPJ (F-5.4). Isi identik dengan data yang disetujui — tanpa hitung ulang.
export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId || !akses.bisaAkses) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('nomor, maksud, provinsi, tahun_anggaran').eq('id', id).single()
  if (!pn) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })

  const { data: espj } = await supabase.from('perjadin_espj').select('id, status').eq('penugasan_id', id).maybeSingle()
  if (!espj || !['disetujui', 'selesai'].includes(espj.status)) {
    return NextResponse.json({ error: 'E-SPJ belum disetujui.' }, { status: 409 })
  }

  const [{ data: lines }, { data: peserta }, { data: biaya }] = await Promise.all([
    supabase.from('perjadin_espj_peserta').select('*').eq('espj_id', espj.id),
    supabase.from('perjadin_peserta').select('id, nama, nip').eq('penugasan_id', id),
    supabase.from('perjadin_biaya').select('peserta_id, komponen, uraian, tanggal, jumlah_diajukan, jumlah_diakui, melebihi_sbm, status_verifikasi, tanpa_bukti').eq('penugasan_id', id),
  ])
  const namaMap = new Map((peserta ?? []).map((p) => [p.id, p]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'E-Perjadin Bawas'
  wb.created = new Date()

  const ws1 = wb.addWorksheet('Rekap')
  ws1.columns = [
    { header: 'Peserta', key: 'nama', width: 28 }, { header: 'NIP', key: 'nip', width: 22 },
    { header: 'Hak SBM', key: 'hak', width: 16 }, { header: 'Biaya Riil Diakui', key: 'riil', width: 18 },
    { header: 'Uang Muka', key: 'um', width: 16 }, { header: 'Kurang/(Lebih) Bayar', key: 'selisih', width: 20 },
    { header: 'Status Bayar', key: 'bayar', width: 14 },
  ]
  for (const l of lines ?? []) {
    const pes = namaMap.get(l.peserta_id)
    ws1.addRow({
      nama: pes?.nama ?? '', nip: pes?.nip ?? '', hak: Number(l.hak_sbm), riil: Number(l.biaya_riil),
      um: Number(l.uang_muka), selisih: l.selisih_final != null ? Number(l.selisih_final) : Number(l.selisih),
      bayar: l.status_bayar,
    })
  }

  const ws2 = wb.addWorksheet('Biaya Riil')
  ws2.columns = [
    { header: 'Peserta', key: 'nama', width: 28 }, { header: 'Komponen', key: 'komp', width: 20 },
    { header: 'Uraian', key: 'uraian', width: 40 }, { header: 'Tanggal', key: 'tgl', width: 14 },
    { header: 'Diajukan', key: 'aju', width: 16 }, { header: 'Diakui', key: 'aku', width: 16 },
    { header: 'Melebihi SBM', key: 'lebih', width: 14 }, { header: 'Verifikasi', key: 'verif', width: 12 },
    { header: 'Tanpa Bukti', key: 'tb', width: 12 },
  ]
  for (const b of biaya ?? []) {
    ws2.addRow({
      nama: namaMap.get(b.peserta_id)?.nama ?? '', komp: LABEL_KOMPONEN_BIAYA[b.komponen as KomponenBiaya],
      uraian: b.uraian, tgl: b.tanggal ?? '', aju: Number(b.jumlah_diajukan), aku: Number(b.jumlah_diakui),
      lebih: b.melebihi_sbm ? 'ya' : '', verif: b.status_verifikasi, tb: b.tanpa_bukti ? 'ya' : '',
    })
  }

  for (const ws of [ws1, ws2]) {
    ws.getRow(1).font = { bold: true }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }
    ws.views = [{ state: 'frozen', ySplit: 1 }]
  }

  const buffer = await wb.xlsx.writeBuffer()
  const nama = `RekapSPJ-${(pn.nomor ?? id).replace(/[\\/]/g, '-')}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${nama}"`,
    },
  })
}
