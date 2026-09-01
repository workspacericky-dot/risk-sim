import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { keCsv } from '@/lib/e-perjadin/csv'
import { LABEL_KOMPONEN_BIAYA, type KomponenBiaya } from '@/lib/e-perjadin/espj'

// Arsip seluruh berkas bukti E-SPJ satu penugasan (F-5.4).
export const dynamic = 'force-dynamic'
const PENGAWAS = ['ppk', 'staf_ppk', 'bendahara', 'pengelola_kegiatan', 'auditor_perjadin']

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const { data: pn } = await supabase.from('perjadin_penugasan').select('nomor, uang_muka_bukti_path').eq('id', id).single()
  if (!pn) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })
  const { data: espj } = await supabase.from('perjadin_espj').select('id').eq('penugasan_id', id).maybeSingle()
  if (!espj) return NextResponse.json({ error: 'E-SPJ belum dibuka.' }, { status: 409 })

  const [{ data: biaya }, { data: lines }, { data: peserta }] = await Promise.all([
    supabase.from('perjadin_biaya').select('id, peserta_id, komponen, uraian, tanggal, jumlah_diakui, tanpa_bukti, path_bukti').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_espj_peserta').select('peserta_id, bukti_bayar_path, tanggal_bayar, status_bayar').eq('espj_id', espj.id),
    supabase.from('perjadin_peserta').select('id, nama').eq('penugasan_id', id),
  ])
  const nama = new Map((peserta ?? []).map((p) => [p.id, p.nama as string]))

  const zip = new JSZip()
  const admin = createAdminClient()
  const fBukti = zip.folder('bukti-biaya')!
  const fBayar = zip.folder('bukti-pembayaran')!

  for (const b of biaya ?? []) {
    if (!b.path_bukti) continue
    const { data } = await admin.storage.from('perjadin-bukti').download(b.path_bukti as string)
    if (data) fBukti.file(`${nama.get(b.peserta_id) ?? 'x'}-${b.komponen}-${(b.path_bukti as string).split('/').pop()}`, await data.arrayBuffer())
  }
  for (const l of lines ?? []) {
    if (!l.bukti_bayar_path) continue
    const { data } = await admin.storage.from('perjadin-bukti').download(l.bukti_bayar_path as string)
    if (data) fBayar.file(`${nama.get(l.peserta_id) ?? 'x'}-${(l.bukti_bayar_path as string).split('/').pop()}`, await data.arrayBuffer())
  }
  if (pn.uang_muka_bukti_path) {
    const { data } = await admin.storage.from('perjadin-bukti').download(pn.uang_muka_bukti_path as string)
    if (data) zip.file(`uang-muka-${(pn.uang_muka_bukti_path as string).split('/').pop()}`, await data.arrayBuffer())
  }

  zip.file('daftar-biaya.csv', keCsv(
    ['peserta', 'komponen', 'uraian', 'tanggal', 'jumlah_diakui', 'tanpa_bukti', 'berkas'],
    (biaya ?? []).map((b) => [
      nama.get(b.peserta_id) ?? '', LABEL_KOMPONEN_BIAYA[b.komponen as KomponenBiaya], b.uraian, b.tanggal ?? '',
      b.jumlah_diakui as number, b.tanpa_bukti ? 'ya' : '', (b.path_bukti as string)?.split('/').pop() ?? '',
    ]),
  ))

  const buf = await zip.generateAsync({ type: 'nodebuffer' })
  const namaFile = `arsip-espj-${(pn.nomor ?? id).replace(/[\\/]/g, '-')}.zip`
  return new NextResponse(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="${namaFile}"` },
  })
}
