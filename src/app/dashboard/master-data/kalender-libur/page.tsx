import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import ImporKalender from './ImporKalender'
import FormTambahTanggal from './FormTambahTanggal'
import { hapusTanggal, hapusTahun } from './actions'

type BarisKalender = {
  id: string
  tanggal: string
  kategori: string
  keterangan: string
}

const WARNA_KATEGORI: Record<string, string> = {
  'Libur Nasional': 'bg-red-50 text-red-700 border-red-200',
  'Cuti Bersama': 'bg-amber-50 text-amber-700 border-amber-200',
  'Libur Daerah': 'bg-sky-50 text-sky-700 border-sky-200',
  'Ramadhan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export default async function KalenderLiburPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard')

  const { data } = await supabase
    .from('kalender_libur')
    .select('id, tanggal, kategori, keterangan')
    .order('tanggal', { ascending: true })

  const baris = (data ?? []) as BarisKalender[]

  // Kelompokkan per tahun untuk memudahkan peninjauan & penghapusan massal.
  const perTahun = new Map<string, BarisKalender[]>()
  for (const b of baris) {
    const tahun = b.tanggal.slice(0, 4)
    if (!perTahun.has(tahun)) perTahun.set(tahun, [])
    perTahun.get(tahun)!.push(b)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master Kalender Libur</h2>
        <p className="text-muted-foreground">
          Hari libur nasional, cuti bersama, dan rentang Ramadhan. Dipakai modul
          CA Bid. Kepegawaian untuk menentukan hari kerja efektif.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Impor dari Berkas</CardTitle>
              <CardDescription>Unggah ref_kalender.md</CardDescription>
            </CardHeader>
            <CardContent>
              <ImporKalender />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Tambah Satu Tanggal</CardTitle>
              <CardDescription>Untuk koreksi atau libur daerah</CardDescription>
            </CardHeader>
            <CardContent>
              <FormTambahTanggal />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {perTahun.size === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                Belum ada data kalender. Impor <code>ref_kalender.md</code> untuk memulai.
              </CardContent>
            </Card>
          )}

          {[...perTahun.entries()].map(([tahun, isi]) => {
            const jumlahRamadhan = isi.filter((b) => b.kategori === 'Ramadhan').length
            const jumlahDaerah = isi.filter((b) => b.kategori === 'Libur Daerah').length
            const jumlahLibur = isi.length - jumlahRamadhan - jumlahDaerah

            return (
              <Card key={tahun}>
                <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg">Tahun {tahun}</CardTitle>
                      <CardDescription>
                        {jumlahLibur} libur / cuti bersama
                        {jumlahDaerah > 0 && ` · ${jumlahDaerah} libur daerah`}
                        {' · '}{jumlahRamadhan} hari Ramadhan
                      </CardDescription>
                    </div>
                    <form action={async () => { 'use server'; await hapusTahun(Number(tahun)) }}>
                      <Button type="submit" variant="destructive" size="sm">
                        Hapus tahun {tahun}
                      </Button>
                    </form>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-32">Tanggal</TableHead>
                          <TableHead className="w-40">Kategori</TableHead>
                          <TableHead>Keterangan</TableHead>
                          <TableHead className="w-12" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isi.map((b) => (
                          <TableRow key={b.id}>
                            <TableCell className="font-mono text-xs">{b.tanggal}</TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={WARNA_KATEGORI[b.kategori] ?? ''}
                              >
                                {b.kategori}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-slate-600">{b.keterangan}</TableCell>
                            <TableCell>
                              <form action={async () => { 'use server'; await hapusTanggal(b.id) }}>
                                <Button type="submit" variant="ghost" size="sm" title="Hapus">
                                  <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                                </Button>
                              </form>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
