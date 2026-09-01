import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'

export const metadata = { title: 'Penugasan — E-Perjadin' }

const WARNA_STATUS: Record<string, string> = {
  Draf: 'bg-slate-100 text-slate-700 border-slate-200',
  Berjalan: 'bg-sky-50 text-sky-700 border-sky-200',
  Selesai: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Dibatalkan: 'bg-red-50 text-red-700 border-red-200',
}
const LST: Record<string, string> = { draf: 'draf', diajukan: 'menunggu PT', terbit: 'terbit' }
const LDANOM: Record<string, string> = { draf: 'draf', diajukan_ppk: 'menunggu PPK', diajukan_kpa: 'menunggu KPA', disetujui: 'disetujui' }

type Baris = {
  id: string
  nomor: string | null
  maksud: string
  status: string
  st_status: string
  danom_status: string
  jenis_alur: string
  tanggal_berangkat: string
  tanggal_kembali: string
  provinsi: string
  unit: { nama_unit: string } | null
}

export default async function DaftarPenugasanPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data } = await supabase
    .from('perjadin_penugasan')
    .select('id, nomor, maksud, status, st_status, danom_status, jenis_alur, tanggal_berangkat, tanggal_kembali, provinsi, unit:unit_tujuan_id(nama_unit)')
    .order('created_at', { ascending: false })

  const baris = (data ?? []) as unknown as Baris[]
  const bolehBuat = akses.isAdmin || akses.peran.includes('pengelola_kegiatan')

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Penugasan Perjalanan Dinas</h2>
          <p className="text-muted-foreground">
            Perencanaan, komitmen anggaran, dan penerbitan Surat Tugas / SPD.
          </p>
        </div>
        {bolehBuat && (
          <Link
            href="/dashboard/e-perjadin/penugasan/baru"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="w-4 h-4" /> Buat Penugasan
          </Link>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nomor / Maksud</TableHead>
                <TableHead>Tujuan</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead>Alur</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Belum ada penugasan.
                  </TableCell>
                </TableRow>
              ) : (
                baris.map((b) => (
                  <TableRow key={b.id} className="cursor-default">
                    <TableCell>
                      <Link href={`/dashboard/e-perjadin/penugasan/${b.id}`} className="font-medium hover:underline">
                        {b.nomor ?? <span className="italic text-slate-400">Draf tanpa nomor</span>}
                      </Link>
                      <div className="text-xs text-muted-foreground line-clamp-1">{b.maksud}</div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {b.unit?.nama_unit ?? '—'}
                      <div className="text-xs text-slate-400">{b.provinsi}</div>
                    </TableCell>
                    <TableCell className="text-xs font-mono whitespace-nowrap">
                      {b.tanggal_berangkat} → {b.tanggal_kembali}
                    </TableCell>
                    <TableCell className="text-xs">{b.jenis_alur}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={WARNA_STATUS[b.status] ?? ''}>{b.status}</Badge>
                      {b.status === 'Draf' && (
                        <div className="mt-1 text-[10px] text-slate-400 leading-tight">
                          ST: {LST[b.st_status] ?? b.st_status}<br />DANOM: {LDANOM[b.danom_status] ?? b.danom_status}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
