import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import FormKoordinat from './FormKoordinat'

export const metadata = { title: 'Koordinat Satker — E-Perjadin' }
export const dynamic = 'force-dynamic'

type Unit = { id: string; kode_unit: string; nama_unit: string; lokasi: string | null; lintang: number | null; bujur: number | null; radius_geofence: number | null }

export default async function KoordinatSatkerPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard/e-perjadin')

  const { data: berkoordinat } = await supabase.from('unit_kerja')
    .select('id, kode_unit, nama_unit, lokasi, lintang, bujur, radius_geofence')
    .not('lintang', 'is', null).order('nama_unit', { ascending: true })

  let hasilCari: Unit[] = []
  if (q && q.trim().length >= 2) {
    const term = q.trim()
    const { data } = await supabase.from('unit_kerja')
      .select('id, kode_unit, nama_unit, lokasi, lintang, bujur, radius_geofence')
      .or(`nama_unit.ilike.%${term}%,kode_unit.ilike.%${term}%`)
      .order('nama_unit', { ascending: true }).limit(50)
    hasilCari = (data ?? []) as Unit[]
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Koordinat Satker (Geofence)</h2>
        <p className="text-muted-foreground">
          Lintang, bujur, dan radius geofence per satker tujuan. Satker tanpa koordinat →
          presensi tetap tercatat, geofence dilewati (verifikasi manual di E-SPJ).
        </p>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-lg">Cari &amp; Isi</CardTitle>
          <CardDescription>Mulai dari satker yang benar-benar jadi tujuan penugasan (R-3).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form className="flex gap-2">
            <input name="q" defaultValue={q ?? ''} placeholder="nama / kode satker (≥ 2 huruf)…"
              className="h-9 flex-1 rounded-md border border-input px-3 text-sm" />
            <button className="h-9 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">Cari</button>
          </form>
          {q && hasilCari.length === 0 && <p className="text-sm text-slate-400">Tidak ada satker cocok.</p>}
          {hasilCari.length > 0 && (
            <Table>
              <TableHeader><TableRow><TableHead>Satker</TableHead><TableHead>Koordinat / Radius</TableHead></TableRow></TableHeader>
              <TableBody>
                {hasilCari.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="font-medium">{u.nama_unit}</div>
                      <div className="text-xs text-slate-400">{u.kode_unit}{u.lokasi ? ` · ${u.lokasi}` : ''}</div>
                    </TableCell>
                    <TableCell><FormKoordinat unitId={u.id} lintang={u.lintang} bujur={u.bujur} radius={u.radius_geofence} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-lg">Sudah Berkoordinat ({(berkoordinat ?? []).length})</CardTitle>
        </CardHeader>
        <div className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow><TableHead>Satker</TableHead><TableHead>Koordinat / Radius</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {(berkoordinat ?? []).length === 0 ? (
                <TableRow><TableCell colSpan={2} className="h-20 text-center text-muted-foreground">Belum ada.</TableCell></TableRow>
              ) : (berkoordinat as Unit[]).map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium">{u.nama_unit}</div>
                    <div className="text-xs text-slate-400">{u.kode_unit}</div>
                  </TableCell>
                  <TableCell><FormKoordinat unitId={u.id} lintang={u.lintang} bujur={u.bujur} radius={u.radius_geofence} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <p className="text-xs text-slate-400">
        Butuh koordinat massal? <Link href="/dashboard/master-data/unit-kerja" className="underline">Master Unit Kerja</Link> mengelola data satker inti.
      </p>
    </div>
  )
}
