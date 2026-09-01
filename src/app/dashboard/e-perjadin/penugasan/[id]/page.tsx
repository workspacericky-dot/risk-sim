import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2, Printer, FileText, MapPin, Wallet, Package } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { hitungSaldoPagu } from '@/lib/e-perjadin/penugasan'
import { LABEL_JENIS_DINAS, LABEL_KATEGORI, type JenisDinas, type KategoriPelaksana } from '@/lib/e-perjadin/konstanta'
import type { RincianDanom } from '@/lib/e-perjadin/sbm'
import TambahPeserta from './TambahPeserta'
import PetaPagu from './PetaPagu'
import DetailAksi from './DetailAksi'
import RampungStUpload from './RampungStUpload'
import { hapusPeserta } from '../actions'

const rp = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const WARNA_STATUS: Record<string, string> = {
  Draf: 'bg-slate-100 text-slate-700 border-slate-200',
  Berjalan: 'bg-sky-50 text-sky-700 border-sky-200',
  Selesai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dibatalkan: 'bg-red-50 text-red-700 border-red-200',
}
const LABEL_ST: Record<string, string> = { draf: 'draf', diajukan: 'menunggu Pemberi Tugas', terbit: 'terbit' }
const LABEL_DANOM: Record<string, string> = {
  draf: 'draf', diajukan_ppk: 'menunggu PPK', diajukan_kpa: 'menunggu KPA', disetujui: 'disetujui',
}

export default async function DetailPenugasanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase
    .from('perjadin_penugasan')
    .select('*, unit:unit_tujuan_id(nama_unit, kode_unit)')
    .eq('id', id).single()
  if (!pn) notFound()

  // Tautan PKA opsional (F-1.1): tabel program_kerja_audit / FK-nya mungkin belum ada
  // di basis data ini — ambil terpisah dan toleran terhadap galat.
  let pka: { no_kka?: string; uraian?: string } | null = null
  if (pn.pka_id) {
    const { data: pkaRow } = await supabase
      .from('program_kerja_audit').select('no_kka, uraian').eq('id', pn.pka_id).maybeSingle()
    pka = pkaRow
  }

  const [{ data: peserta }, { data: mapPagu }, { data: dokumen }, { data: temuan }, { data: users }, { data: pegawai }, { data: ruteRows }] = await Promise.all([
    supabase.from('perjadin_peserta').select('*').eq('penugasan_id', id).order('created_at', { ascending: true }),
    supabase.from('perjadin_penugasan_pagu').select('pagu_id, urutan').eq('penugasan_id', id).order('urutan', { ascending: true }),
    supabase.from('perjadin_dokumen').select('*').eq('penugasan_id', id).order('jenis', { ascending: true }),
    supabase.from('perjadin_temuan').select('*').eq('penugasan_id', id).eq('status', 'terbuka').order('created_at', { ascending: false }),
    supabase.from('users').select('id, nip').eq('status_aktif', true).not('nip', 'is', null),
    supabase.from('perjadin_pegawai').select('nip, nama, jabatan, kategori').eq('aktif', true).order('nama', { ascending: true }),
    supabase.from('perjadin_sbm').select('tingkat_biaya').eq('komponen', 'tiket_pesawat').eq('tahun', pn.tahun_anggaran).eq('provinsi', pn.provinsi),
  ])
  // Dropdown peserta bersumber dari master pegawai (219 nama impor); userId terisi
  // hanya bila NIP-nya cocok dengan akun login (→ bisa presensi sendiri).
  const akunByNip = new Map((users ?? []).map((u) => [u.nip as string, u.id as string]))
  const pegawaiOpsi = (pegawai ?? []).map((p) => ({
    nip: p.nip as string,
    nama: p.nama as string,
    jabatan: (p.jabatan as string) ?? null,
    kategori: (p.kategori as string) ?? '1',
    userId: akunByNip.get(p.nip as string) ?? null,
  }))
  const ruteOpsi = [...new Set(['-', ...(ruteRows ?? []).map((r) => r.tingkat_biaya as string)])]
  const [{ data: paguTahun }, { data: komitmen }] = await Promise.all([
    supabase.from('perjadin_pagu').select('id, mata_anggaran, uraian, pagu').eq('tahun', pn.tahun_anggaran).order('mata_anggaran', { ascending: true }),
    supabase.from('perjadin_komitmen').select('pagu_id, jenis, jumlah'),
  ])

  const pesertaRows = (peserta ?? []) as Record<string, unknown>[]
  const estimasiTotal = pesertaRows.reduce((s, p) => s + Number(p.estimasi_total ?? 0), 0)
  const mappedIds = new Set((mapPagu ?? []).map((m) => m.pagu_id as string))
  const paguOpsi = (paguTahun ?? []).map((pg) => {
    const kom = (komitmen ?? []).filter((k) => k.pagu_id === pg.id).map((k) => ({ jenis: k.jenis as 'pesan' | 'lepas', jumlah: Number(k.jumlah) }))
    return { id: pg.id as string, label: `${pg.mata_anggaran}${pg.uraian ? ` — ${pg.uraian}` : ''}`, tersedia: hitungSaldoPagu(Number(pg.pagu), kom).tersedia, dipilih: mappedIds.has(pg.id as string) }
  })

  const bolehKelola = akses.isAdmin || akses.peran.includes('pengelola_kegiatan')
  const bolehPetakan = bolehKelola || akses.peran.includes('staf_ppk')
  const bolehPaketAudit = akses.isAdmin || akses.peran.includes('auditor_perjadin')
  const stDraf = pn.st_status === 'draf'

  let rampungUrl: string | null = null
  if (pn.jenis_alur === 'Rampung' && pn.st_rampung_path) {
    const { data } = await createAdminClient().storage.from('perjadin-dokumen').createSignedUrl(pn.st_rampung_path as string, 3600)
    rampungUrl = data?.signedUrl ?? null
  }
  const unit = pn.unit as { nama_unit?: string; kode_unit?: string } | null

  const cetakHref = (d: Record<string, unknown>) =>
    d.jenis === 'ST' ? `/dashboard/e-perjadin/penugasan/${id}/cetak/st`
      : d.jenis === 'DANOM' ? `/dashboard/e-perjadin/penugasan/${id}/cetak/danom`
      : `/dashboard/e-perjadin/penugasan/${id}/cetak/spd/${d.peserta_id}`

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link href="/dashboard/e-perjadin/penugasan" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
        </Link>
        {bolehPaketAudit && pn.status !== 'Draf' && (
          <a href={`/dashboard/e-perjadin/penugasan/${id}/paket-audit`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
            <Package className="w-3.5 h-3.5" /> Unduh Paket Audit
          </a>
        )}
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight">{pn.nomor ?? 'Draf Penugasan'}</h2>
            <Badge variant="outline" className={WARNA_STATUS[pn.status] ?? ''}>{pn.status}</Badge>
            <Badge variant="outline" className="bg-white text-slate-600">ST: {LABEL_ST[pn.st_status] ?? pn.st_status}</Badge>
            <Badge variant="outline" className="bg-white text-slate-600">DANOM: {LABEL_DANOM[pn.danom_status] ?? pn.danom_status}</Badge>
          </div>
          <p className="text-muted-foreground mt-1">{pn.maksud}</p>
        </div>
        {stDraf && bolehKelola && (
          <Link href={`/dashboard/e-perjadin/penugasan/${id}/ubah`}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50">
            Ubah Header
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 py-5 text-sm">
          <Info label="Alur" value={pn.jenis_alur} />
          <Info label="Jenis Dinas" value={LABEL_JENIS_DINAS[pn.jenis_dinas as JenisDinas] ?? pn.jenis_dinas} />
          <Info label="Tujuan" value={unit?.nama_unit ?? '—'} sub={pn.provinsi} />
          <Info label="Tanggal" value={`${pn.tanggal_berangkat} → ${pn.tanggal_kembali}`} />
          <Info label="Tahun Anggaran" value={String(pn.tahun_anggaran)} />
          <Info label="Uang Muka" value={`${pn.uang_muka_persen}%${pn.uang_muka_dibayar_pada ? ' · dibayar' : ''}`} />
          <Info label="Program Kerja Audit" value={pka?.no_kka ?? (pka?.uraian ? String(pka.uraian).slice(0, 40) : 'Tidak ditautkan')} />
          <Info label="Total Kwitansi (DANOM)" value={rp(estimasiTotal)} />
        </CardContent>
      </Card>

      {pn.status === 'Dibatalkan' && pn.alasan_batal && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <strong>Alasan pembatalan:</strong> {pn.alasan_batal}
        </div>
      )}

      {pn.jenis_alur === 'Rampung' && (
        <RampungStUpload penugasanId={id} adaBerkas={!!pn.st_rampung_path} unduhUrl={rampungUrl}
          bolehUnggah={stDraf && bolehKelola} />
      )}

      {pn.status === 'Berjalan' && (
        <Link href={`/dashboard/e-perjadin/penugasan/${id}/presensi`}
          className="flex items-center justify-between gap-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-800 hover:bg-sky-100">
          <span className="inline-flex items-center gap-2"><MapPin className="w-4 h-4" /> Presensi Lapangan (pola 212 + geotagging)</span>
          <span>Buka →</span>
        </Link>
      )}
      {pn.st_status === 'terbit' && !['Selesai', 'Dibatalkan'].includes(pn.status) && (bolehKelola || akses.peran.includes('pemberi_tugas')) && (
        <Link href={`/dashboard/e-perjadin/penugasan/${id}/revisi`}
          className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Revisi Penugasan (ganti tim / tanggal — bernomor)</span>
          <span>Buka →</span>
        </Link>
      )}

      {['Berjalan', 'Selesai'].includes(pn.status) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href={`/dashboard/e-perjadin/penugasan/${id}/laporan`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <span className="inline-flex items-center gap-2"><FileText className="w-4 h-4" /> Laporan Hasil Dinas</span><span>Buka →</span>
          </Link>
          <Link href={`/dashboard/e-perjadin/penugasan/${id}/espj`}
            className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
            <span className="inline-flex items-center gap-2"><Wallet className="w-4 h-4" /> E-SPJ &amp; Biaya Riil</span><span>Buka →</span>
          </Link>
        </div>
      )}

      {(temuan ?? []).length > 0 && (
        <Card>
          <CardHeader className="bg-red-50/50 border-b pb-4 mb-4">
            <CardTitle className="text-base text-red-800">Temuan Anti-Fraud Terbuka</CardTitle>
            <CardDescription>Temuan <em>blocking</em> menghentikan persetujuan sampai diselesaikan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {(temuan ?? []).map((t) => (
              <div key={t.id as string} className="flex items-start gap-2 text-sm">
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 shrink-0">{t.kode as string}</Badge>
                <span className="text-slate-700">{t.ringkasan as string}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-base">Tim / DANOM ({pesertaRows.length})</CardTitle>
          <CardDescription>Satu peserta = satu SPD. Nilai per komponen dihitung otomatis dari tarif SBM (plafon_danom).</CardDescription>
        </CardHeader>
        <div className="p-0 overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Kat.</TableHead>
                <TableHead className="text-right">Harian</TableHead>
                <TableHead className="text-right">Represen&shy;tasi</TableHead>
                <TableHead className="text-right">Penginapan</TableHead>
                <TableHead className="text-right">Transpor</TableHead>
                <TableHead className="text-right">DPR</TableHead>
                <TableHead className="text-right">Kwitansi</TableHead>
                {stDraf && bolehKelola && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {pesertaRows.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="h-20 text-center text-muted-foreground">Belum ada peserta.</TableCell></TableRow>
              ) : pesertaRows.map((p) => {
                const r = (p.estimasi_rincian ?? {}) as Partial<RincianDanom>
                return (
                  <TableRow key={p.id as string}>
                    <TableCell className="font-medium">
                      {p.nama as string}
                      {(p.eksternal as boolean) && <Badge variant="secondary" className="ml-2 text-[10px]">eksternal</Badge>}
                      <div className="text-xs text-slate-400">{p.peran_tim as string}{p.nip ? ` · NIP ${p.nip as string}` : ''}</div>
                    </TableCell>
                    <TableCell className="text-xs" title={LABEL_KATEGORI[(p.tingkat_biaya as KategoriPelaksana)] ?? ''}>
                      {p.tingkat_biaya as string}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {rp(Number(r.harian ?? 0))}
                      {Number(r.faktorHarian ?? 1) !== 1 && (
                        <div className="text-[10px] text-amber-600">×{r.faktorHarian}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{rp(Number(r.representasi ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-xs">{rp(Number(r.penginapan ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {rp(Number(r.pesawat ?? 0))}
                      {Number(r.pesawatBebanPribadi ?? 0) > 0 && (
                        <div className="text-[10px] text-red-500">−{rp(Number(r.pesawatBebanPribadi))} pribadi</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">{rp(Number(r.dpr ?? 0))}</TableCell>
                    <TableCell className="text-right font-mono text-xs font-semibold">{rp(Number(p.estimasi_total ?? 0))}</TableCell>
                    {stDraf && bolehKelola && (
                      <TableCell>
                        <form action={async () => { 'use server'; await hapusPeserta(p.id as string) }}>
                          <Button type="submit" variant="ghost" size="sm" title="Hapus peserta">
                            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                          </Button>
                        </form>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
        {stDraf && bolehKelola && (
          <CardContent className="border-t pt-4">
            <TambahPeserta penugasanId={id} pegawai={pegawaiOpsi} ruteOpsi={ruteOpsi}
              luarKota={pn.jenis_dinas === 'Luar Kota'} />
          </CardContent>
        )}
      </Card>

      {['draf', 'diajukan_ppk'].includes(pn.danom_status) && bolehPetakan && (
        <Card>
          <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
            <CardTitle className="text-base">Pemetaan Pagu (TA {pn.tahun_anggaran})</CardTitle>
            <CardDescription>Komitmen dipesan saat PPK menyetujui DANOM. AF-6 memblokir bila melampaui pagu tersedia.</CardDescription>
          </CardHeader>
          <CardContent>
            {paguOpsi.length === 0
              ? <p className="text-sm text-slate-500">Belum ada pagu untuk tahun anggaran ini. Minta Admin mengisi Master Pagu.</p>
              : <PetaPagu penugasanId={id} opsi={paguOpsi} />}
          </CardContent>
        </Card>
      )}

      {(dokumen ?? []).length > 0 && (
        <Card>
          <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4"><CardTitle className="text-base">Dokumen Terbit</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(dokumen ?? []).map((d) => (
              <div key={d.id as string} className="flex items-center justify-between gap-4 text-sm border-b last:border-0 pb-2 last:pb-0">
                <span className="inline-flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" />
                  <span className="font-medium">{d.jenis as string}</span>
                  <span className="font-mono text-xs text-slate-500">{d.nomor as string}</span>
                </span>
                <Link href={cetakHref(d)} className="inline-flex items-center gap-1.5 text-slate-600 hover:text-slate-900 text-xs font-semibold">
                  <Printer className="w-3.5 h-3.5" /> Cetak
                </Link>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <DetailAksi
        penugasanId={id}
        stStatus={pn.st_status}
        danomStatus={pn.danom_status}
        overallStatus={pn.status}
        boleh={{
          kelola: bolehKelola,
          pemberiTugas: akses.isAdmin || akses.peran.includes('pemberi_tugas'),
          ppk: akses.isAdmin || akses.peran.includes('ppk'),
          kpa: akses.isAdmin || akses.peran.includes('kpa'),
          bendahara: akses.isAdmin || akses.peran.includes('bendahara'),
        }}
        siapAjukanST={pesertaRows.length > 0}
        siapAjukanDanom={pesertaRows.length > 0 && estimasiTotal > 0 && mappedIds.size > 0}
        uangMukaPersen={Number(pn.uang_muka_persen ?? 0)}
        uangMukaDibayar={!!pn.uang_muka_dibayar_pada}
      />
    </div>
  )
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="font-medium text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400">{sub}</div>}
    </div>
  )
}
