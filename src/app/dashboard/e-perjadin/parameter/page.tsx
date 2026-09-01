import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import FormParameter from './FormParameter'
import { seedParameterHilang } from './actions'

export const metadata = { title: 'Parameter Kontrol — E-Perjadin' }
export const dynamic = 'force-dynamic'

export default async function ParameterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard/e-perjadin')

  const { data } = await supabase.from('perjadin_parameter').select('key, nilai, keterangan').order('key', { ascending: true })
  const rows = (data ?? []) as { key: string; nilai: string; keterangan: string }[]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Parameter Kontrol</h2>
          <p className="text-muted-foreground">
            Ambang & tarif yang dapat dikonfigurasi tanpa ganti kode: geofence, akurasi GPS,
            AF-4/AF-7, koordinat kedudukan, tarif dinas dalam kota, toleransi tiket.
          </p>
        </div>
        <form action={async () => { 'use server'; await seedParameterHilang() }}>
          <Button type="submit" variant="outline" size="sm">Isi parameter bawaan yang hilang</Button>
        </form>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-lg">{rows.length} parameter</CardTitle>
          <CardDescription>Perubahan tercatat di jejak audit.</CardDescription>
        </CardHeader>
        <div className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-64">Kunci</TableHead>
                <TableHead className="w-56">Nilai</TableHead>
                <TableHead>Keterangan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 ? (
                <TableRow><TableCell colSpan={3} className="h-20 text-center text-muted-foreground">
                  Belum ada parameter. Klik &ldquo;Isi parameter bawaan&rdquo;.
                </TableCell></TableRow>
              ) : rows.map((p) => (
                <TableRow key={p.key}>
                  <TableCell className="font-mono text-xs align-top">{p.key}</TableCell>
                  <TableCell className="align-top"><FormParameter pKey={p.key} nilai={p.nilai} /></TableCell>
                  <TableCell className="text-xs text-slate-500 align-top">{p.keterangan}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
