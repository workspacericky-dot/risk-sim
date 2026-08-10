import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { bisaAksesCa } from '@/lib/ca-audit-akses'
import type { EntriKalender } from '@/lib/ca-kepeg/kalender'
import CaKepegClient from './CaKepegClient'

export const metadata = { title: 'CA Bid. Kepegawaian' }

export default async function CaKepegawaianPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!bisaAksesCa(profile?.role)) redirect('/dashboard')

  const { data } = await supabase
    .from('kalender_libur')
    .select('tanggal, kategori, keterangan')
    .order('tanggal', { ascending: true })

  const kalender = (data ?? []) as EntriKalender[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">CA Bid. Kepegawaian</h2>
        <p className="text-muted-foreground">
          Analisis kesenjangan presensi SIKEP terhadap KOMDANAS, beserta estimasi
          potongan tunjangan kinerja dan uang makan.
        </p>
      </div>

      {kalender.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <CalendarDays className="w-5 h-5" />
            Kalender libur belum tersedia
          </div>
          <p className="text-sm text-amber-800">
            Analisis membutuhkan daftar hari libur nasional, cuti bersama, dan rentang
            Ramadhan untuk menentukan hari kerja efektif. Minta Admin Sistem mengimpor
            berkas <code className="bg-amber-100 px-1 rounded">ref_kalender.md</code> lebih dulu.
          </p>
          {profile?.role === 'admin_sistem' && (
            <Link
              href="/dashboard/master-data/kalender-libur"
              className="inline-flex items-center gap-2 text-sm font-semibold text-amber-900 underline underline-offset-4"
            >
              Buka Master Kalender Libur
            </Link>
          )}
        </div>
      ) : (
        <CaKepegClient kalender={kalender} />
      )}
    </div>
  )
}
