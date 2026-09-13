import Link from 'next/link'
import { Upload } from 'lucide-react'
import { getZiDashboardData } from '@/lib/uji-publik-zi/data'
import { DashboardClient } from './DashboardClient'

export default async function UjiPublikZiPage() {
  const data = await getZiDashboardData()
  if (!data.ready) return <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950"><h2 className="font-bold">Database Uji Publik ZI belum disiapkan</h2><p className="mt-2 text-sm">Jalankan <code>supabase/migration_uji_publik_zi.sql</code>, kemudian buka halaman Impor XLSX.</p></section>
  if (!data.rows.length) return <section className="rounded-2xl border border-dashed border-emerald-300 bg-white p-10 text-center shadow-sm"><Upload className="mx-auto h-10 w-10 text-emerald-600"/><h2 className="mt-4 text-xl font-bold text-slate-900">Belum ada respons uji publik</h2><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">Impor workbook berisi rating, demografi, unit kerja, tag, dan pendapat untuk mulai membentuk profil risiko layanan.</p><Link href="/dashboard/uji-publik-zi/impor" className="mt-5 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white">Impor XLSX pertama</Link></section>
  return <DashboardClient rows={data.rows} anova={data.anova ?? null}/>
}
