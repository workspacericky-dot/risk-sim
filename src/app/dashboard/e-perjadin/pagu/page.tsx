import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import FormPagu from './FormPagu'
import { hapusPagu } from './actions'

export const metadata = { title: 'Master Pagu' }

type BarisPagu = { id: string; tahun: number; mata_anggaran: string; uraian: string; pagu: number }

const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

export default async function PaguPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard')

  const { data } = await supabase
    .from('perjadin_pagu')
    .select('id, tahun, mata_anggaran, uraian, pagu')
    .order('tahun', { ascending: false })
    .order('mata_anggaran', { ascending: true })

  const baris = (data ?? []) as BarisPagu[]

  const perTahun = new Map<number, BarisPagu[]>()
  for (const b of baris) {
    if (!perTahun.has(b.tahun)) perTahun.set(b.tahun, [])
    perTahun.get(b.tahun)!.push(b)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master Pagu</h2>
        <p className="text-muted-foreground">
          Pagu perjalanan dinas per mata anggaran per tahun. Kolom <em>terpesan</em> dan{' '}
          <em>terealisasi</em> terisi dari komitmen penugasan mulai fase M1.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Tambah / Ubah Pagu</CardTitle>
              <CardDescription>Satu mata anggaran</CardDescription>
            </CardHeader>
            <CardContent><FormPagu /></CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {perTahun.size === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                Belum ada pagu terdaftar. Isi lewat formulir di samping.
              </CardContent>
            </Card>
          )}

          {[...perTahun.entries()].map(([tahun, isi]) => {
            const totalPagu = isi.reduce((s, b) => s + b.pagu, 0)
            return (
              <Card key={tahun}>
                <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
                  <CardTitle className="text-lg">Tahun Anggaran {tahun}</CardTitle>
                  <CardDescription>
                    {isi.length} mata anggaran · total pagu {rupiah(totalPagu)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mata Anggaran</TableHead>
                        <TableHead>Uraian</TableHead>
                        <TableHead className="text-right">Pagu</TableHead>
                        <TableHead className="text-right">Terpesan</TableHead>
                        <TableHead className="text-right">Tersedia</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isi.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono text-xs">{b.mata_anggaran}</TableCell>
                          <TableCell className="text-xs text-slate-600">{b.uraian}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{rupiah(b.pagu)}</TableCell>
                          <TableCell className="text-right font-mono text-xs text-slate-400">{rupiah(0)}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{rupiah(b.pagu)}</TableCell>
                          <TableCell>
                            <form action={async () => { 'use server'; await hapusPagu(b.id) }}>
                              <Button type="submit" variant="ghost" size="sm" title="Hapus">
                                <Trash2 className="w-3.5 h-3.5 text-slate-400" />
                              </Button>
                            </form>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}
