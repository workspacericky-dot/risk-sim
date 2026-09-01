import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import FormHeaderPenugasan from '../FormHeaderPenugasan'

export const metadata = { title: 'Buat Penugasan' }

export default async function BuatPenugasanPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')
  if (!akses.isAdmin && !akses.peran.includes('pengelola_kegiatan')) redirect('/dashboard/e-perjadin/penugasan')

  const [{ data: unit }, { data: pka }] = await Promise.all([
    supabase.from('unit_kerja').select('id, kode_unit, nama_unit').order('nama_unit', { ascending: true }),
    supabase.from('program_kerja_audit').select('id, no_kka, uraian').order('created_at', { ascending: false }),
  ])

  const unitKerja = (unit ?? []).map((u) => ({ id: u.id, label: `${u.kode_unit} — ${u.nama_unit}` }))
  const pkaList = (pka ?? []).map((p) => ({
    id: p.id,
    label: p.no_kka ?? (p.uraian ? String(p.uraian).slice(0, 70) : 'PKA tanpa nomor'),
  }))

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href="/dashboard/e-perjadin/penugasan" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
      </Link>
      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-lg">Buat Penugasan Baru</CardTitle>
        </CardHeader>
        <CardContent>
          <FormHeaderPenugasan mode="baru" unitKerja={unitKerja} pkaList={pkaList} />
        </CardContent>
      </Card>
    </div>
  )
}
