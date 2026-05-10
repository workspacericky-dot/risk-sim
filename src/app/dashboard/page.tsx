import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import ExecutiveDashboard from "./ExecutiveDashboard"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: units } = await supabase
    .from('unit_kerja')
    .select('id, nama_unit')
    .order('nama_unit', { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-serif">Executive Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">
          Ringkasan manajemen risiko Mahkamah Agung RI —{' '}
          {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
      <ExecutiveDashboard units={units ?? []} />
    </div>
  )
}
