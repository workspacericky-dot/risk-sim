import { redirect } from 'next/navigation'
import Link from 'next/link'
import { CalendarDays } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import type { EntriKalender } from '@/lib/ca-kepeg/kalender'
import CaKeuanganPerkaraClient from './CaKeuanganPerkaraClient'

export const metadata = { title: 'CA Audit Keuangan Perkara' }

export default async function CaKeuanganPerkaraPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role === 'peserta_consulting') redirect('/dashboard')

  const { data } = await supabase
    .from('kalender_libur')
    .select('tanggal, kategori, keterangan')
    .order('tanggal', { ascending: true })

  const kalender = (data ?? []) as EntriKalender[]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">CA Audit Keuangan Perkara</h2>
        <p className="text-muted-foreground">
          Reanalisis saldo sisa panjar perkara yang sudah berakhir, beserta uji
          kepatuhan pemberitahuan sisa panjar ke para pihak (≤ 3 hari kerja).
        </p>
      </div>

      {kalender.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 space-y-3">
          <div className="flex items-center gap-2 font-semibold text-amber-900">
            <CalendarDays className="w-5 h-5" />
            Kalender libur belum tersedia
          </div>
          <p className="text-sm text-amber-800">
            Uji kepatuhan Bagian B membutuhkan daftar hari libur nasional dan
            cuti bersama untuk menentukan hari kerja efektif. Minta Admin
            Sistem mengimpor kalender libur lebih dulu.
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
        <CaKeuanganPerkaraClient kalender={kalender} />
      )}
    </div>
  )
}
