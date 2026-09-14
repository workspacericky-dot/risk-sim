import Link from 'next/link'
import { ArrowRight, Clock3, DatabaseZap } from 'lucide-react'
import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { UjiPublikZiLogo } from '@/components/UjiPublikZiLogo'
import type { InterviewSessionRow } from '@/lib/wawancara-zi/types'
import { NewSessionForm } from './NewSessionForm'

const statusStyle: Record<string, string> = { persiapan: 'bg-amber-50 text-amber-800', berlangsung: 'bg-cyan-50 text-cyan-800', rekonsiliasi: 'bg-violet-50 text-violet-800', selesai: 'bg-emerald-50 text-emerald-800' }

export default async function WawancaraZiPage() {
  const { supabase } = await requireZiAccess()
  const { data, error } = await supabase.from('zi_interview_sessions').select('*').order('updated_at', { ascending: false }).limit(60)
  const missing = error?.code === '42P01' || error?.code === 'PGRST205'
  const sessions = (data ?? []) as InterviewSessionRow[]
  return <div className="space-y-5">
    {missing && <section className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950"><DatabaseZap className="mt-0.5 h-5 w-5 shrink-0"/><div><h2 className="font-bold">Database Wawancara ZI belum disiapkan</h2><p className="mt-1 text-sm">Jalankan <code>supabase/migration_wawancara_zi.sql</code>, lalu muat ulang halaman ini.</p></div></section>}
    {error && !missing && <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-900">Sesi tidak dapat dimuat: {error.message}</section>}
    {!missing && <NewSessionForm/>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold text-slate-900">Sesi wawancara</h2><p className="mt-1 text-sm text-slate-500">Lanjutkan persiapan, wawancara, atau rekonsiliasi tim.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{sessions.length} sesi</span></div>
      {!sessions.length ? <div className="mt-5 rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center"><UjiPublikZiLogo size={42} className="mx-auto opacity-60"/><p className="mt-3 font-semibold text-slate-700">Belum ada sesi wawancara</p><p className="mt-1 text-sm text-slate-500">Buat sesi pertama untuk mulai memetakan ANDOK dan menyiapkan probing.</p></div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{sessions.map((session) => {
        const responses = Object.values(session.snapshot?.responses ?? {})
        const done = responses.filter((r) => r.asked || r.consistency === 'na').length
        return <Link key={session.id} href={`/dashboard/wawancara-zi/${session.id}`} className="group rounded-2xl border border-slate-200 p-4 transition hover:border-teal-300 hover:bg-teal-50/40 hover:shadow-sm">
          <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-slate-900 group-hover:text-teal-900">{session.unit_name}</h3><p className="mt-1 text-xs text-slate-500">{session.candidate_stage || 'Tahap belum diisi'} · {session.team_name}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusStyle[session.status] ?? statusStyle.persiapan}`}>{session.status}</span></div>
          <div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span className="flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>{session.interview_date || 'Tanggal belum ditetapkan'}</span><span className="flex items-center gap-1 font-bold text-teal-700">{done}/28 butir <ArrowRight className="h-3.5 w-3.5"/></span></div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.round(done / 28 * 100)}%` }}/></div>
        </Link>
      })}</div>}
    </section>
  </div>
}
