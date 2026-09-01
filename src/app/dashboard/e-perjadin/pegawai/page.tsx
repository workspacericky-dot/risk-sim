import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'

export const metadata = { title: 'Master Pegawai — E-Perjadin' }
export const dynamic = 'force-dynamic'

export default async function PegawaiPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.isAdmin && !akses.peran.includes('pengelola_kegiatan')) redirect('/dashboard/e-perjadin')

  let query = supabase.from('perjadin_pegawai')
    .select('nip, nama, jabatan, golongan, kategori, satker, wilayah, aktif')
    .order('nama', { ascending: true }).limit(300)
  if (q && q.trim().length >= 2) query = query.or(`nama.ilike.%${q.trim()}%,nip.ilike.%${q.trim()}%,jabatan.ilike.%${q.trim()}%`)
  const { data } = await query
  const rows = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master Pegawai Bawas</h2>
        <p className="text-muted-foreground">
          Referensi NIP, jabatan, golongan, dan kategori pelaksana. Diimpor dari berkas
          kepegawaian; perbarui via <code>npx tsx scripts/impor-pegawai-bawas.ts</code>.
        </p>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-lg">{rows.length} baris{rows.length === 300 ? ' (dibatasi 300)' : ''}</CardTitle>
          <CardDescription>Kategori 1 = Eselon II/III &amp; Gol. IV · Kategori 2 = selebihnya.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="mb-3 flex gap-2">
            <input name="q" defaultValue={q ?? ''} placeholder="nama / NIP / jabatan…"
              className="h-9 flex-1 rounded-md border border-input px-3 text-sm" />
            <button className="h-9 rounded-md bg-slate-900 px-4 text-sm font-semibold text-white">Cari</button>
          </form>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Nama / NIP</TableHead>
                  <TableHead>Jabatan</TableHead>
                  <TableHead>Gol.</TableHead>
                  <TableHead>Kat.</TableHead>
                  <TableHead>Wilayah</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    Belum ada data. Jalankan skrip impor.
                  </TableCell></TableRow>
                ) : rows.map((p) => (
                  <TableRow key={p.nip as string}>
                    <TableCell>
                      <div className="font-medium">{p.nama as string}</div>
                      <div className="text-xs font-mono text-slate-400">{p.nip as string}</div>
                    </TableCell>
                    <TableCell className="text-xs">{(p.jabatan as string) || '—'}</TableCell>
                    <TableCell className="text-xs">{(p.golongan as string) || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={p.kategori === '1' ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-slate-100 text-slate-600'}>
                        {p.kategori as string}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">{(p.wilayah as string) || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
