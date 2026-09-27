import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SIWAS_PUBLIC_SUBJECT, getSiwasSetting, hasSiwasUnlock } from '@/lib/siwas-access'
import PublicMenuPinGate from '@/components/PublicMenuPinGate'
import PublicMenuLockButton from '@/components/PublicMenuLockButton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Laporan Analisis SIWAS - Risk-Sim',
  description: 'Portal analisis SIWAS dengan PIN khusus menu.',
}

export default async function PublicSiwasPage() {
  const setting = await getSiwasSetting()
  const unlocked = await hasSiwasUnlock(SIWAS_PUBLIC_SUBJECT, setting)

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#e4edf3_0%,#d6e8f5_45%,#cbe2f4_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between gap-3">
        <Link href="/menu-lainnya" className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/65 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition hover:bg-white">
          <ArrowLeft className="h-4 w-4" /> Menu Lainnya
        </Link>
        <div className="flex items-center gap-3">
          {unlocked && <PublicMenuLockButton kind="siwas" />}
          <div className="hidden items-center gap-3 rounded-2xl border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur-xl sm:flex">
            <Image src="/siwas-logo.png" alt="SIWAS" width={44} height={40} className="h-10 w-11 rounded-lg object-cover" priority />
            <div><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Portal Publik</p><p className="text-sm font-semibold text-slate-700">Analisis SIWAS</p></div>
          </div>
        </div>
      </div>
      {unlocked ? (
        <section className="mx-auto w-full max-w-7xl">
          <div className="mb-5"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Badan Pengawasan</p><h1 className="mt-2 font-serif text-3xl font-bold text-slate-900">Laporan Analisis SIWAS</h1></div>
          <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.14)]"><iframe title="Laporan Ketepatan Waktu SIWAS" src="/api/siwas-report" className="h-[calc(100vh-13rem)] min-h-[720px] w-full bg-white" /></div>
        </section>
      ) : <PublicMenuPinGate kind="siwas" configured={Boolean(setting)} />}
      <p className="mx-auto mt-8 max-w-7xl border-t border-slate-300/60 pt-4 text-center text-[10px] text-slate-500">&copy; 2026 Ricky Pramoedya Hermawan. All rights reserved.</p>
    </main>
  )
}
