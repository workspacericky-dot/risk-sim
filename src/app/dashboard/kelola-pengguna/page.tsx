import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import KelolaUsersClient from './KelolaUsersClient'

export default async function KelolaPenggunaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin_sistem') redirect('/dashboard')

  const [{ data: users }, { data: units }] = await Promise.all([
    supabase
      .from('users')
      .select('id, email, nama_lengkap, role, status_aktif, unit:unit_kerja_id(nama_unit)')
      .order('created_at', { ascending: false }),
    supabase
      .from('unit_kerja')
      .select('id, nama_unit')
      .order('nama_unit'),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-serif">Kelola Pengguna</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Tambah atau hapus pengguna sistem manajemen risiko.
        </p>
      </div>
      <KelolaUsersClient
        users={(users ?? []) as any}
        units={units ?? []}
        currentUserId={user.id}
      />
    </div>
  )
}
