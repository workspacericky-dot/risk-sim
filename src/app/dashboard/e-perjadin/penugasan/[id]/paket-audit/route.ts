import { NextResponse } from 'next/server'
import JSZip from 'jszip'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { catatLog } from '@/lib/e-perjadin/log'
import { keCsv } from '@/lib/e-perjadin/csv'
import { asalSitus } from '@/lib/e-perjadin/qr'

// Paket audit satu penugasan (PRD F-6.3): dokumen, metadata presensi lengkap,
// dan seluruh jejak persetujuan dalam satu arsip ZIP.
export const dynamic = 'force-dynamic'

const rp = (n: unknown) => (n == null ? '' : 'Rp ' + Number(n).toLocaleString('id-ID'))
const esc = (s: unknown) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })
  // Paket audit termasuk jejak audit penuh — hanya Auditor Perjadin & Admin Sistem
  // (sejalan RLS perjadin_log dan RACI PRD Lampiran B).
  if (!akses.isAdmin && !akses.peran.includes('auditor_perjadin')) {
    return NextResponse.json({ error: 'Hanya Auditor Perjadin / Admin Sistem.' }, { status: 403 })
  }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('*, unit:unit_tujuan_id(nama_unit, kode_unit)').eq('id', id).single()
  if (!pn) return NextResponse.json({ error: 'Tidak ditemukan.' }, { status: 404 })

  // Tautan PKA opsional — tabel/FK program_kerja_audit mungkin belum ada di DB ini.
  let pka: { no_kka?: string; uraian?: string } | null = null
  if (pn.pka_id) {
    const { data: pkaRow } = await supabase
      .from('program_kerja_audit').select('no_kka, uraian').eq('id', pn.pka_id).maybeSingle()
    pka = pkaRow
  }

  const [
    { data: peserta }, { data: komitmen }, { data: presensi },
    { data: biaya }, { data: espj }, { data: laporan }, { data: dokumen }, { data: temuan },
  ] = await Promise.all([
    supabase.from('perjadin_peserta').select('*').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_komitmen').select('*').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_presensi').select('*').eq('penugasan_id', id).order('waktu_server'),
    supabase.from('perjadin_biaya').select('*').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_espj').select('*').eq('penugasan_id', id).maybeSingle(),
    supabase.from('perjadin_laporan').select('id, status, difinalkan_pada').eq('penugasan_id', id).maybeSingle(),
    supabase.from('perjadin_dokumen').select('*').eq('penugasan_id', id).order('diterbitkan_pada'),
    supabase.from('perjadin_temuan').select('*').eq('penugasan_id', id).order('created_at'),
  ])

  const espjPeserta = espj
    ? (await supabase.from('perjadin_espj_peserta').select('*').eq('espj_id', espj.id)).data ?? []
    : []
  const segmen = laporan
    ? (await supabase.from('perjadin_laporan_segmen').select('kunci, isi, versi, updated_at').eq('laporan_id', laporan.id)).data ?? []
    : []

  const namaPeserta = new Map((peserta ?? []).map((p) => [p.id as string, p.nama as string]))

  // Jejak audit: berdasarkan penugasan_id langsung + entitas turunannya.
  const ids = [
    id,
    ...(peserta ?? []).map((r) => r.id), ...(presensi ?? []).map((r) => r.id),
    ...(biaya ?? []).map((r) => r.id), ...(dokumen ?? []).map((r) => r.id),
    ...(temuan ?? []).map((r) => r.id), ...(komitmen ?? []).map((r) => r.id),
    ...espjPeserta.map((r) => r.id), ...(espj ? [espj.id] : []), ...(laporan ? [laporan.id] : []),
  ].slice(0, 500)
  const { data: logByEntitas } = await supabase.from('perjadin_log')
    .select('*').in('entitas_id', ids).order('waktu_server')
  const { data: logByPenugasan } = await supabase.from('perjadin_log')
    .select('*').eq('penugasan_id', id).order('waktu_server')
  const logMap = new Map<string, Record<string, unknown>>()
  for (const l of [...(logByEntitas ?? []), ...(logByPenugasan ?? [])]) logMap.set(l.id as string, l)
  const log = [...logMap.values()].sort((a, b) => String(a.waktu_server).localeCompare(String(b.waktu_server)))

  // ── Susun arsip ──
  const zip = new JSZip()
  const situs = await asalSitus()
  const unit = pn.unit as { nama_unit?: string; kode_unit?: string } | null

  zip.file('manifest.json', JSON.stringify({
    dokumen: 'Paket Audit E-Perjadin Bawas',
    penugasan: pn.nomor ?? `(draf ${id})`,
    dihasilkan_pada: new Date().toISOString(),
    dihasilkan_oleh: akses.userId,
    isi: {
      peserta: (peserta ?? []).length, presensi: (presensi ?? []).length, biaya: (biaya ?? []).length,
      dokumen: (dokumen ?? []).length, temuan: (temuan ?? []).length, baris_jejak_audit: log.length,
    },
  }, null, 2))

  zip.file('jejak-audit.csv', keCsv(
    ['waktu_server', 'aktor_id', 'aksi', 'entitas', 'entitas_id', 'nilai_lama', 'nilai_baru'],
    log.map((l) => [
      l.waktu_server as string, l.aktor_id as string, l.aksi as string, (l.entitas as string) ?? '',
      (l.entitas_id as string) ?? '', JSON.stringify(l.nilai_lama ?? null), JSON.stringify(l.nilai_baru ?? null),
    ]),
  ))

  zip.file('presensi-metadata.csv', keCsv(
    ['peserta', 'jenis', 'tanggal', 'waktu_server', 'waktu_perangkat', 'selisih_waktu_detik', 'lintang', 'bujur',
      'akurasi_m', 'jarak_m', 'dalam_geofence', 'device_id', 'mode_berbagi', 'pemilik_perangkat', 'sumber',
      'status_verifikasi', 'catatan_verifikasi', 'path_foto'],
    (presensi ?? []).map((p) => [
      namaPeserta.get(p.peserta_id as string) ?? '', p.jenis as string, p.tanggal as string,
      p.waktu_server as string, (p.waktu_perangkat as string) ?? '', p.selisih_waktu_detik as number,
      p.lintang as number, p.bujur as number, p.akurasi_m as number, p.jarak_m as number,
      String(p.dalam_geofence), (p.device_id as string) ?? '', String(p.mode_berbagi),
      (p.pemilik_perangkat as string) ?? '', p.sumber as string, p.status_verifikasi as string,
      (p.catatan_verifikasi as string) ?? '', (p.path_foto as string) ?? '',
    ]),
  ))

  zip.file('biaya-metadata.csv', keCsv(
    ['peserta', 'komponen', 'uraian', 'tanggal', 'jumlah_diajukan', 'jumlah_diakui', 'melebihi_sbm', 'batas_sbm',
      'disetujui_ppk', 'tanpa_bukti', 'hash_bukti', 'status_verifikasi', 'catatan_verifikasi', 'path_bukti'],
    (biaya ?? []).map((b) => [
      namaPeserta.get(b.peserta_id as string) ?? '', b.komponen as string, b.uraian as string,
      (b.tanggal as string) ?? '', b.jumlah_diajukan as number, b.jumlah_diakui as number, String(b.melebihi_sbm),
      b.batas_sbm as number, String(b.disetujui_ppk), String(b.tanpa_bukti), (b.hash_bukti as string) ?? '',
      b.status_verifikasi as string, (b.catatan_verifikasi as string) ?? '', (b.path_bukti as string) ?? '',
    ]),
  ))

  zip.file('dokumen.csv', keCsv(
    ['jenis', 'nomor', 'diterbitkan_pada', 'token_qr', 'url_verifikasi'],
    (dokumen ?? []).map((d) => [
      d.jenis as string, d.nomor as string, d.diterbitkan_pada as string, d.token_qr as string,
      `${situs}/verifikasi/${d.token_qr}`,
    ]),
  ))

  // Berkas foto presensi & bukti biaya.
  const admin = createAdminClient()
  const fPres = zip.folder('presensi')!
  for (const p of presensi ?? []) {
    if (!p.path_foto) continue
    const { data } = await admin.storage.from('perjadin-presensi').download(p.path_foto as string)
    if (data) fPres.file((p.path_foto as string).split('/').pop() ?? `${p.id}.jpg`, await data.arrayBuffer())
  }
  const fBukti = zip.folder('bukti')!
  for (const b of biaya ?? []) {
    if (!b.path_bukti) continue
    const { data } = await admin.storage.from('perjadin-bukti').download(b.path_bukti as string)
    if (data) fBukti.file((b.path_bukti as string).split('/').pop() ?? `${b.id}.bin`, await data.arrayBuffer())
  }

  // Ringkasan rekonstruksi (HTML mandiri).
  const barisPeserta = (peserta ?? []).map((p, i) => `<tr><td>${i + 1}</td><td>${esc(p.nama)}</td><td>${esc(p.nip)}</td><td>${esc(p.peran_tim)}</td><td>${esc(p.tingkat_biaya)}</td><td style="text-align:right">${rp(p.estimasi_total)}</td></tr>`).join('')
  const barisKomitmen = (komitmen ?? []).map((k) => `<tr><td>${esc(k.created_at)}</td><td>${esc(k.jenis)}</td><td style="text-align:right">${rp(k.jumlah)}</td><td>${esc(k.keterangan)}</td></tr>`).join('')
  const barisTemuan = (temuan ?? []).map((t) => `<tr><td>${esc(t.kode)}</td><td>${esc(t.keparahan)}</td><td>${esc(t.ringkasan)}</td><td>${esc(t.status)}${t.keputusan ? ` — ${esc(t.keputusan)}: ${esc(t.alasan)}` : ''}</td></tr>`).join('')
  const barisEspj = espjPeserta.map((l) => `<tr><td>${esc(namaPeserta.get(l.peserta_id as string))}</td><td style="text-align:right">${rp(l.hak_sbm)}</td><td style="text-align:right">${rp(l.biaya_riil)}</td><td style="text-align:right">${rp(l.uang_muka)}</td><td style="text-align:right">${rp(l.selisih_final ?? l.selisih)}</td><td>${esc(l.status_bayar)}</td></tr>`).join('')
  const segHtml = segmen.map((s) => `<h3>${esc(s.kunci)}</h3><p style="white-space:pre-wrap">${esc(s.isi)}</p>`).join('')

  zip.file('ringkasan.html', `<!DOCTYPE html><html lang="id"><head><meta charset="utf-8"><title>Paket Audit ${esc(pn.nomor ?? id)}</title>
<style>body{font:13px/1.5 system-ui,sans-serif;margin:24px;color:#111}h1{font-size:18px}h2{font-size:15px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:28px}table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px}td,th{border:1px solid #ccc;padding:4px 6px;text-align:left}</style></head><body>
<h1>Paket Audit — ${esc(pn.nomor ?? `Draf ${id}`)}</h1>
<p>Dihasilkan ${new Date().toLocaleString('id-ID')} · status penugasan: <b>${esc(pn.status)}</b></p>
<h2>Penugasan</h2>
<table><tr><td>Maksud</td><td>${esc(pn.maksud)}</td></tr>
<tr><td>Satker tujuan</td><td>${esc(unit?.nama_unit)} (${esc(unit?.kode_unit)}) — ${esc(pn.provinsi)}</td></tr>
<tr><td>Program Kerja Audit</td><td>${esc(pka?.no_kka ?? pka?.uraian ?? 'tidak ditautkan')}</td></tr>
<tr><td>Alur / jenis dinas</td><td>${esc(pn.jenis_alur)} / ${esc(pn.jenis_dinas)}</td></tr>
<tr><td>Tanggal</td><td>${esc(pn.tanggal_berangkat)} s.d. ${esc(pn.tanggal_kembali)} · TA ${esc(pn.tahun_anggaran)}</td></tr>
<tr><td>Uang muka</td><td>${esc(pn.uang_muka_persen)}%</td></tr>
<tr><td>Disetujui</td><td>${esc(pn.disetujui_pada ?? '—')}</td></tr>
${pn.alasan_batal ? `<tr><td>Alasan pembatalan</td><td>${esc(pn.alasan_batal)}</td></tr>` : ''}</table>
<h2>Tim (${(peserta ?? []).length})</h2>
<table><tr><th>#</th><th>Nama</th><th>NIP</th><th>Peran Tim</th><th>Tingkat</th><th>Estimasi</th></tr>${barisPeserta}</table>
<h2>Buku Besar Komitmen Pagu</h2>
<table><tr><th>Waktu</th><th>Jenis</th><th>Jumlah</th><th>Keterangan</th></tr>${barisKomitmen || '<tr><td colspan="4">—</td></tr>'}</table>
<h2>Presensi (${(presensi ?? []).length} titik)</h2>
<p>Metadata lengkap ada di <code>presensi-metadata.csv</code>; foto di folder <code>presensi/</code>.</p>
<h2>Biaya Riil (${(biaya ?? []).length} entri)</h2>
<p>Rincian di <code>biaya-metadata.csv</code>; bukti di folder <code>bukti/</code>.</p>
<h2>E-SPJ ${espj ? `— status ${esc(espj.status)}` : '(belum dibuka)'}</h2>
${espjPeserta.length ? `<table><tr><th>Peserta</th><th>Hak SBM</th><th>Biaya Riil</th><th>Uang Muka</th><th>Kurang/(Lebih)</th><th>Bayar</th></tr>${barisEspj}</table>` : '<p>Belum ada baris penyelesaian.</p>'}
<h2>Temuan Anti-Fraud (${(temuan ?? []).length})</h2>
<table><tr><th>Kode</th><th>Keparahan</th><th>Ringkasan</th><th>Status / Keputusan</th></tr>${barisTemuan || '<tr><td colspan="4">—</td></tr>'}</table>
<h2>Laporan Hasil Dinas ${laporan ? `— ${esc(laporan.status)}` : '(belum disusun)'}</h2>
${segHtml || '<p>—</p>'}
<h2>Dokumen Terbit</h2>
<p>Daftar & tautan verifikasi di <code>dokumen.csv</code>.</p>
<h2>Jejak Audit</h2>
<p>${log.length} baris di <code>jejak-audit.csv</code> (append-only, RLS insert-only).</p>
</body></html>`)

  const buf = await zip.generateAsync({ type: 'nodebuffer' })

  await catatLog(supabase, {
    aktorId: akses.userId, aksi: 'ekspor_paket_audit', entitas: 'perjadin_penugasan', entitasId: id, penugasanId: id,
  })

  const nama = `paket-audit-${(pn.nomor ?? id).replace(/[\\/]/g, '-')}.zip`
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${nama}"`,
    },
  })
}
