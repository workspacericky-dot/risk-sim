import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { KOMBINASI_TERLARANG, LABEL_PERAN } from '@/lib/e-perjadin/konstanta'
import FormPeranPengguna from './FormPeranPengguna'

export const metadata = { title: 'Peran Perjadin' }

type BarisUser = { id: string; nama_lengkap: string; email: string }

export default async function PeranPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard')

  const [{ data: users }, { data: peranRows }] = await Promise.all([
    supabase.from('users').select('id, nama_lengkap, email').eq('status_aktif', true)
      .order('nama_lengkap', { ascending: true }),
    supabase.from('perjadin_peran').select('user_id, peran').eq('aktif', true),
  ])

  const peranPerUser = new Map<string, string[]>()
  for (const r of (peranRows ?? []) as { user_id: string; peran: string }[]) {
    if (!peranPerUser.has(r.user_id)) peranPerUser.set(r.user_id, [])
    peranPerUser.get(r.user_id)!.push(r.peran)
  }

  const baris = (users ?? []) as BarisUser[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Peran Perjadin &amp; Segregation of Duties</h2>
        <p className="text-muted-foreground">
          Peran ini terpisah dari peran manajemen risiko (<code>users.role</code>). Satu
          pengguna boleh memegang lebih dari satu peran perjadin.
        </p>
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">Kombinasi terlarang</CardTitle>
          <CardDescription>Ditolak sistem saat menyimpan.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm text-slate-600 space-y-1">
            {KOMBINASI_TERLARANG.map(([a, b]) => (
              <li key={`${a}-${b}`}>
                {LABEL_PERAN[a]} <span className="text-slate-400">+</span> {LABEL_PERAN[b]}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-base">Pengguna Aktif</CardTitle>
          <CardDescription>{baris.length} pengguna</CardDescription>
        </CardHeader>
        <div className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-64">Pengguna</TableHead>
                <TableHead>Peran Perjadin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baris.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                    Belum ada pengguna aktif.
                  </TableCell>
                </TableRow>
              ) : (
                baris.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="align-top">
                      <div className="font-medium">{u.nama_lengkap}</div>
                      <div className="text-xs text-muted-foreground">{u.email}</div>
                    </TableCell>
                    <TableCell>
                      <FormPeranPengguna userId={u.id} peranAwal={peranPerUser.get(u.id) ?? []} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
