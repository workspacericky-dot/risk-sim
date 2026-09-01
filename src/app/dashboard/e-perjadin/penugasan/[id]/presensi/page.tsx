import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { hitungTitikWajib } from '@/lib/e-perjadin/presensi'
import PresensiClient from './PresensiClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Presensi Lapangan' }

export type TitikTerekam = {
  id: string
  jenis: string
  tanggal: string
  waktu_server: string
  sumber: string
  status_verifikasi: string
  jarak_m: number | null
  dalam_geofence: boolean | null
  keterangan: string
  catatan_verifikasi: string | null
  fotoUrl: string | null
  peserta_nama?: string
  dari_tempat_sah?: boolean
  tempat_sah_jenis?: string | null
  tempat_sah_keterangan?: string | null
}

export default async function PresensiPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, maksud, status, tanggal_berangkat, tanggal_kembali, unit:unit_tujuan_id(nama_unit)')
    .eq('id', id).single()
  if (!pn) notFound()

  const { data: pesertaSaya } = await supabase.from('perjadin_peserta')
    .select('id, nama').eq('penugasan_id', id).eq('user_id', akses.userId).maybeSingle()

  const pengawas = akses.isAdmin || akses.peran.some((p) => ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas'].includes(p))
  if (!pesertaSaya && !pengawas) redirect(`/dashboard/e-perjadin/penugasan/${id}`)

  // Peserta: hanya titik miliknya. Pengawas: seluruh titik penugasan.
  let q = supabase.from('perjadin_presensi')
    .select('id, jenis, tanggal, waktu_server, sumber, status_verifikasi, jarak_m, dalam_geofence, keterangan, catatan_verifikasi, path_foto, dari_tempat_sah, tempat_sah_jenis, tempat_sah_keterangan, peserta:peserta_id(nama)')
    .eq('penugasan_id', id).order('waktu_server', { ascending: true })
  if (pesertaSaya && !pengawas) q = q.eq('peserta_id', pesertaSaya.id)
  const { data: rows } = await q

  const admin = createAdminClient()
  const terekam: TitikTerekam[] = await Promise.all(
    ((rows ?? []) as Record<string, unknown>[]).map(async (r) => {
      let fotoUrl: string | null = null
      if (r.path_foto) {
        const { data } = await admin.storage.from('perjadin-presensi').createSignedUrl(r.path_foto as string, 3600)
        fotoUrl = data?.signedUrl ?? null
      }
      return {
        id: r.id as string, jenis: r.jenis as string, tanggal: r.tanggal as string,
        waktu_server: r.waktu_server as string, sumber: r.sumber as string,
        status_verifikasi: r.status_verifikasi as string,
        jarak_m: r.jarak_m as number | null, dalam_geofence: r.dalam_geofence as boolean | null,
        keterangan: r.keterangan as string, catatan_verifikasi: r.catatan_verifikasi as string | null,
        fotoUrl, peserta_nama: (r.peserta as { nama?: string } | null)?.nama,
        dari_tempat_sah: r.dari_tempat_sah as boolean | undefined,
        tempat_sah_jenis: r.tempat_sah_jenis as string | null,
        tempat_sah_keterangan: r.tempat_sah_keterangan as string | null,
      }
    }),
  )

  const titikWajib = hitungTitikWajib(pn.tanggal_berangkat, pn.tanggal_kembali)

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <Link href={`/dashboard/e-perjadin/penugasan/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> {pn.nomor ?? 'Penugasan'}
      </Link>

      <PresensiClient
        penugasanId={id}
        berjalan={pn.status === 'Berjalan'}
        pesertaId={pesertaSaya?.id ?? null}
        pesertaNama={pesertaSaya?.nama ?? null}
        pengawas={pengawas}
        bisaPutus={akses.isAdmin || akses.peran.includes('ppk')}
        maksud={pn.maksud}
        tujuan={(pn.unit as { nama_unit?: string } | null)?.nama_unit ?? '—'}
        titikWajib={titikWajib}
        terekam={terekam}
      />
    </div>
  )
}
