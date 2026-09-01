import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { LABEL_KOMPONEN, type KomponenSbm } from '@/lib/e-perjadin/konstanta'
import FormSbm from './FormSbm'
import { hapusSbm } from './actions'

export const metadata = { title: 'Master SBM' }

type BarisSbm = {
  id: string
  tahun: number
  provinsi: string
  komponen: KomponenSbm
  tingkat_biaya: string
  nilai: number
  satuan: string
}

const rupiah = (n: number) => 'Rp ' + n.toLocaleString('id-ID')

export default async function SbmPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard')

  const { data } = await supabase
    .from('perjadin_sbm')
    .select('id, tahun, provinsi, komponen, tingkat_biaya, nilai, satuan')
    .order('tahun', { ascending: false })
    .order('provinsi', { ascending: true })
    .order('tingkat_biaya', { ascending: true })
    .order('komponen', { ascending: true })

  const baris = (data ?? []) as BarisSbm[]

  const perTahun = new Map<number, BarisSbm[]>()
  for (const b of baris) {
    if (!perTahun.has(b.tahun)) perTahun.set(b.tahun, [])
    perTahun.get(b.tahun)!.push(b)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Master SBM</h2>
        <p className="text-muted-foreground">
          Standar Biaya Masukan per tahun anggaran × provinsi × komponen × tingkat biaya.
          Dipakai kalkulasi hak keuangan (F-1.2) dan pembatasan klaim (F-3.2).
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Tambah / Ubah Tarif</CardTitle>
              <CardDescription>Satu baris tarif</CardDescription>
            </CardHeader>
            <CardContent><FormSbm /></CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {perTahun.size === 0 && (
            <Card>
              <CardContent className="py-12 text-center text-sm text-slate-500">
                Belum ada tarif SBM. Isi lewat formulir di samping.
              </CardContent>
            </Card>
          )}

          {[...perTahun.entries()].map(([tahun, isi]) => (
            <Card key={tahun}>
              <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
                <CardTitle className="text-lg">Tahun Anggaran {tahun}</CardTitle>
                <CardDescription>{isi.length} baris tarif</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-[32rem] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Provinsi</TableHead>
                        <TableHead>Tingkat</TableHead>
                        <TableHead>Komponen</TableHead>
                        <TableHead className="text-right">Nilai</TableHead>
                        <TableHead className="w-16">Satuan</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isi.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell>{b.provinsi}</TableCell>
                          <TableCell className="text-xs">{b.tingkat_biaya}</TableCell>
                          <TableCell className="text-xs">{LABEL_KOMPONEN[b.komponen]}</TableCell>
                          <TableCell className="text-right font-mono text-xs">{rupiah(b.nilai)}</TableCell>
                          <TableCell className="text-xs text-slate-500">{b.satuan}</TableCell>
                          <TableCell>
                            <form action={async () => { 'use server'; await hapusSbm(b.id) }}>
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
          ))}
        </div>
      </div>
    </div>
  )
}
