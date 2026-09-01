import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { bisaAksesCa } from '@/lib/ca-audit-akses'
import CaLaporanKeuanganClient from './CaLaporanKeuanganClient'

export const metadata = { title: 'CA Laporan Keuangan' }

export default async function CaLaporanKeuanganPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!bisaAksesCa(profile?.role)) redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">CA Laporan Keuangan</h2>
        <p className="text-muted-foreground">
          Analisis otomatis PDF Laporan Keuangan Satker cetakan SAKTI: uji konsistensi
          antar-laporan, hitung ulang kalkulasi, cocokkan narasi CaLK dengan angka, serta
          analisis tren & rasio — hasilnya dapat diekspor ke Excel.
        </p>
      </div>

      <CaLaporanKeuanganClient />
    </div>
  )
}
