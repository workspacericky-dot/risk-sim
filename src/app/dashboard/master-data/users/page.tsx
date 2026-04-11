import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default async function UsersPage() {
  const supabase = await createClient()
  
  // Fetch users with their unit kerja if it exists
  const { data: users } = await supabase
    .from('users')
    .select(`
      id,
      email,
      nama_lengkap,
      role,
      status_aktif,
      unit:unit_kerja_id(nama_unit)
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Manajemen Pengguna</h2>
          <p className="text-muted-foreground">Daftar pengguna terintegrasi dalam sistem.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b pb-4 mb-0">
          <CardTitle className="text-lg">Daftar Pengguna</CardTitle>
          <CardDescription>Catatan: Pembuatan user baru saat ini dilakukan via Dashboard Auth Supabase.</CardDescription>
        </CardHeader>
        <div className="p-0 border-0 shadow-none rounded-none">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nama Lengkap</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role / Hak Akses</TableHead>
                <TableHead>Unit Kerja</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nama_lengkap}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="bg-slate-100 uppercase text-xs tracking-wider">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {/* @ts-ignore */}
                      {user.unit?.nama_unit || <span className="text-slate-400 italic">Pusat/Belum diset</span>}
                    </TableCell>
                    <TableCell>
                      {user.status_aktif ? (
                        <Badge className="bg-green-100 text-green-800 border-green-200">Aktif</Badge>
                      ) : (
                        <Badge variant="secondary">Nonaktif</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                    Belum ada data pengguna yang tersinkronisasi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
