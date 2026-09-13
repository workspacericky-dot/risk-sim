import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { UjiPublikZiLogo } from '@/components/UjiPublikZiLogo'
import { UjiPublikNav } from './UjiPublikNav'

export const dynamic = 'force-dynamic'

export default async function UjiPublikZiLayout({ children }: { children: React.ReactNode }) {
  const access = await requireZiAccess()
  return <section className="space-y-5">
    <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-emerald-950 to-teal-800 p-6 text-white shadow-xl">
      <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-emerald-300/15 blur-2xl"/>
      <div className="relative flex items-start gap-4">
        <span className="rounded-2xl bg-white/10 p-2 ring-1 ring-white/20"><UjiPublikZiLogo size={56} priority className="shadow-lg" /></span>
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-200">Evaluasi APIP</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Uji Publik Zona Integritas</h1><p className="mt-1 max-w-3xl text-sm text-emerald-50">Analisis rating, opini publik, demografi, dan profil risiko layanan seluruh satuan kerja.</p><p className="mt-2 text-xs text-emerald-200">Akses aktif: {access.role === 'admin_sistem' ? 'Administrator Sistem' : 'Evaluator APIP'}</p></div>
      </div>
    </header>
    <UjiPublikNav/>
    {children}
  </section>
}
