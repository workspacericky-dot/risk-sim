import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import type { SnapshotBaru } from '@/lib/e-perjadin/revisi'
import { buatRevisi } from './actions'
import RevisiForm from './RevisiForm'
import AksiRevisiPT from './AksiRevisiPT'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Revisi Penugasan' }

const LABEL_STATUS: Record<string, string> = { draf: 'draf', diajukan: 'menunggu Pemberi Tugas', disetujui: 'disetujui', ditolak: 'ditolak' }

export default async function RevisiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, maksud, status, st_status, jenis_dinas, tanggal_berangkat, tanggal_kembali, tahun_anggaran, provinsi').eq('id', id).single()
  if (!pn) notFound()

  const [{ data: revisi }, { data: pesertaAktif }, { data: users }, { data: pegawaiRows }, { data: ruteRows }, { data: espj }] = await Promise.all([
    supabase.from('perjadin_penugasan_revisi').select('*').eq('penugasan_id', id).order('nomor_revisi', { ascending: false }),
    supabase.from('perjadin_peserta').select('id, nama, peran_tim').eq('penugasan_id', id).is('ditarik_pada', null).order('created_at'),
    supabase.from('users').select('id, nip').eq('status_aktif', true).not('nip', 'is', null),
    supabase.from('perjadin_pegawai').select('nip, nama, jabatan, kategori').eq('aktif', true).order('nama'),
    supabase.from('perjadin_sbm').select('tingkat_biaya').eq('komponen', 'tiket_pesawat').eq('tahun', pn.tahun_anggaran).eq('provinsi', pn.provinsi),
    supabase.from('perjadin_espj').select('status').eq('penugasan_id', id).maybeSingle(),
  ])

  const bolehKelola = akses.isAdmin || akses.peran.includes('pengelola_kegiatan')
  const bolehPT = akses.isAdmin || akses.peran.includes('pemberi_tugas')
  const espjMasihDraf = !espj || ['draf', 'dikembalikan'].includes(espj.status)
  const aktif = (revisi ?? []).find((r) => ['draf', 'diajukan'].includes(r.status))
  const riwayat = (revisi ?? []).filter((r) => ['disetujui', 'ditolak'].includes(r.status))

  const akunByNip = new Map((users ?? []).map((u) => [u.nip as string, u.id as string]))
  const pegawai = (pegawaiRows ?? []).map((p) => ({
    nip: p.nip as string,
    nama: p.nama as string,
    jabatan: (p.jabatan as string) ?? null,
    kategori: (p.kategori as string) ?? '1',
    userId: akunByNip.get(p.nip as string) ?? null,
  }))
  const ruteOpsi = [...new Set(['-', ...(ruteRows ?? []).map((r) => r.tingkat_biaya as string)])]

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <Link href={`/dashboard/e-perjadin/penugasan/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> {pn.nomor ?? 'Penugasan'}
      </Link>
      <div>
        <h2 className="text-xl font-bold tracking-tight">Revisi Penugasan</h2>
        <p className="text-sm text-muted-foreground">{pn.maksud}</p>
      </div>

      {pn.st_status !== 'terbit' && <p className="text-sm text-slate-500">Revisi tersedia setelah Surat Tugas terbit.</p>}
      {pn.st_status === 'terbit' && !espjMasihDraf && <p className="text-sm text-red-600">E-SPJ sudah diajukan — penugasan tidak dapat direvisi lagi.</p>}

      {pn.st_status === 'terbit' && espjMasihDraf && !aktif && bolehKelola && (
        <Card>
          <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
            <CardTitle className="text-base">Buat Revisi Baru</CardTitle>
            <CardDescription>Ubah tanggal, tarik anggota, atau tambah anggota. ST lama tetap tersimpan.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={async (fd) => { 'use server'; await buatRevisi(id, fd) }} className="space-y-2">
              <textarea name="alasan" required rows={2} placeholder="Alasan revisi (mis. anggota A sakit, tiket geser 1 hari)"
                className="w-full rounded-md border border-input px-3 py-2 text-sm" />
              <Button type="submit" size="sm">Buat Revisi</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {aktif && (
        <Card>
          <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
            <CardTitle className="text-base flex items-center gap-2">
              Revisi Ke-{aktif.nomor_revisi} <Badge variant="outline">{LABEL_STATUS[aktif.status]}</Badge>
            </CardTitle>
            <CardDescription>{aktif.alasan}</CardDescription>
          </CardHeader>
          <CardContent>
            {aktif.status === 'draf' && bolehKelola ? (
              <RevisiForm penugasanId={id} awalBerangkat={pn.tanggal_berangkat} awalKembali={pn.tanggal_kembali}
                pesertaAktif={(pesertaAktif ?? []) as { id: string; nama: string; peran_tim: string }[]}
                pegawai={pegawai} ruteOpsi={ruteOpsi} luarKota={pn.jenis_dinas === 'Luar Kota'}
                snapshot={(aktif.snapshot_baru ?? { header: {}, peserta: [] }) as SnapshotBaru} />
            ) : aktif.status === 'diajukan' ? (
              <div className="space-y-3">
                <UsulanRingkas snapshot={(aktif.snapshot_baru ?? { header: {}, peserta: [] }) as SnapshotBaru} />
                {bolehPT
                  ? <AksiRevisiPT penugasanId={id} />
                  : <p className="text-sm text-slate-500">Menunggu keputusan Pemberi Tugas.</p>}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Menunggu Pengelola menyusun perubahan.</p>
            )}
          </CardContent>
        </Card>
      )}

      {riwayat.length > 0 && (
        <Card>
          <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4"><CardTitle className="text-base">Riwayat Revisi</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            {riwayat.map((r) => (
              <div key={r.id} className="border-b last:border-0 pb-2 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Rev.{r.nomor_revisi}</span>
                  <Badge variant="outline" className={r.status === 'disetujui' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>{r.status}</Badge>
                  <span className="text-xs text-slate-400">{r.disetujui_pada ? new Date(r.disetujui_pada).toLocaleString('id-ID') : ''}</span>
                </div>
                <div className="text-xs text-slate-500 whitespace-pre-wrap">{r.alasan}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function UsulanRingkas({ snapshot }: { snapshot: SnapshotBaru }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 text-sm space-y-1">
      <div className="font-semibold text-xs text-slate-500 uppercase">Perubahan yang diusulkan</div>
      {snapshot.header.tanggal_berangkat && <div>Tanggal berangkat → {snapshot.header.tanggal_berangkat}</div>}
      {snapshot.header.tanggal_kembali && <div>Tanggal kembali → {snapshot.header.tanggal_kembali}</div>}
      {snapshot.peserta.map((p, i) => (
        <div key={i}>
          {p.aksi === 'tarik' ? `Tarik: ${p.nama} (${p.alasan})`
            : p.aksi === 'tambah' ? `Tambah: ${p.nama} · ${p.peran_tim} · Kat.${p.kategori}`
            : `Ubah: ${p.nama}`}
        </div>
      ))}
      {snapshot.header.tanggal_berangkat === undefined && snapshot.header.tanggal_kembali === undefined && snapshot.peserta.length === 0 && (
        <div className="text-slate-400">(belum ada perubahan)</div>
      )}
    </div>
  )
}
