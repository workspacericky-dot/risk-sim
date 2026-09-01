import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { pastikanLaporan } from './actions'
import LaporanEditor from './LaporanEditor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan Hasil Dinas' }

export type SegmenRow = {
  id: string
  kunci: string
  isi: string
  versi: number
  ditugaskan_ke: string | null
  disunting_oleh: string | null
  disunting_pada: string | null
  updated_at: string
}

export default async function LaporanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, maksud, status').eq('id', id).single()
  if (!pn) notFound()

  if (!['Berjalan', 'Selesai'].includes(pn.status)) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Link href={`/dashboard/e-perjadin/penugasan/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Link>
        <p className="text-sm text-slate-500">Laporan hasil dinas tersedia setelah Surat Tugas terbit.</p>
      </div>
    )
  }

  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, user_id, nama, peran_tim').eq('penugasan_id', id).order('created_at', { ascending: true })
  const sayaPeserta = (peserta ?? []).find((p) => p.user_id === akses.userId) ?? null
  const bolehSunting = !!sayaPeserta || akses.isAdmin || akses.peran.includes('pengelola_kegiatan')
  const bolehKetua = akses.isAdmin || akses.peran.includes('pengelola_kegiatan') || sayaPeserta?.peran_tim === 'Ketua Tim'

  const { data: laporan } = await supabase.from('perjadin_laporan')
    .select('id, status, difinalkan_pada, diteruskan_pada').eq('penugasan_id', id).maybeSingle()

  const { data: dokLaporan } = await supabase.from('perjadin_dokumen')
    .select('nomor').eq('penugasan_id', id).eq('jenis', 'Laporan').maybeSingle()

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <Link href={`/dashboard/e-perjadin/penugasan/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
          <ArrowLeft className="w-4 h-4" /> {pn.nomor ?? 'Penugasan'}
        </Link>
        <h2 className="text-xl font-bold tracking-tight mt-1">Laporan Hasil Perjalanan Dinas</h2>
        <p className="text-sm text-muted-foreground">{pn.maksud}</p>
      </div>
    </div>
  )

  if (!laporan) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {header}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
          <FileText className="w-8 h-8 text-slate-300 mx-auto" />
          <p className="text-sm text-slate-600">Laporan belum disusun untuk penugasan ini.</p>
          {bolehSunting ? (
            <form action={async () => { 'use server'; await pastikanLaporan(id) }}>
              <Button type="submit">Mulai susun laporan</Button>
            </form>
          ) : (
            <p className="text-xs text-slate-400">Menunggu tim menyusun laporan.</p>
          )}
        </div>
      </div>
    )
  }

  const { data: segmen } = await supabase.from('perjadin_laporan_segmen')
    .select('id, kunci, isi, versi, ditugaskan_ke, disunting_oleh, disunting_pada, updated_at')
    .eq('laporan_id', laporan.id)

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {header}
      <LaporanEditor
        penugasanId={id}
        laporanStatus={laporan.status}
        diteruskanPada={laporan.diteruskan_pada}
        nomorDokumen={dokLaporan?.nomor ?? null}
        sayaUserId={akses.userId}
        bolehSunting={bolehSunting}
        bolehKetua={bolehKetua}
        anggota={(peserta ?? []).filter((p) => p.user_id).map((p) => ({ userId: p.user_id as string, nama: p.nama }))}
        segmen={(segmen ?? []) as SegmenRow[]}
      />
    </div>
  )
}
