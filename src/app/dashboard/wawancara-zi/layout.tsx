import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { UjiPublikZiLogo } from '@/components/UjiPublikZiLogo'
import { WawancaraZiNav } from './WawancaraZiNav'

export const dynamic = 'force-dynamic'

export default async function WawancaraZiLayout({ children }: { children: React.ReactNode }) {
  const access = await requireZiAccess()
  return <section className="space-y-5">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-teal-950 to-cyan-800 p-6 text-white shadow-xl">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-300/15 blur-2xl"/>
      <div className="relative flex items-start gap-4">
        <span className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/20"><UjiPublikZiLogo size={56} priority className="shadow-lg"/></span>
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Zona Integritas</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Wawancara ZI</h1><p className="mt-1 max-w-3xl text-sm text-cyan-50">Persiapan, probing, pencatatan bukti, dan rekonsiliasi assessment dalam satu ruang kerja.</p><p className="mt-2 text-xs text-cyan-200">Akses aktif: {access.role === 'admin_sistem' ? 'Administrator Sistem' : 'Evaluator APIP'}</p></div>
      </div>
    </header>
    <WawancaraZiNav/>
    {children}
  </section>
}
