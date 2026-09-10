import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SIWAS_PUBLIC_SUBJECT, getSiwasSetting, hasSiwasUnlock } from '@/lib/siwas-access'
import SiwasReportPortal from '@/app/dashboard/siwas/SiwasReportPortal'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Laporan Analisis SIWAS — Risk-Sim',
  description: 'Portal laporan analisis SIWAS dengan akses PIN.',
}

export default async function PublicSiwasPage() {
  const setting = await getSiwasSetting()
  const unlocked = await hasSiwasUnlock(SIWAS_PUBLIC_SUBJECT, setting)

  return (
    <main className="min-h-screen bg-[linear-gradient(160deg,#e4edf3_0%,#d6e8f5_45%,#cbe2f4_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto mb-6 flex w-full max-w-7xl items-center justify-between">
        <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/70 bg-white/65 px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition hover:-translate-y-0.5 hover:bg-white hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="flex items-center gap-3 rounded-2xl border border-white/70 bg-white/65 px-3 py-2 shadow-sm backdrop-blur-xl">
          <Image src="/siwas-logo.png" alt="SIWAS" width={44} height={40} className="h-10 w-11 rounded-lg object-cover" priority />
          <div className="hidden sm:block"><p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Portal Publik</p><p className="text-sm font-semibold text-slate-700">Analisis SIWAS</p></div>
        </div>
      </div>
      <div className="mx-auto w-full max-w-7xl">
        <SiwasReportPortal initiallyUnlocked={unlocked} isAdmin={false} pinConfigured={Boolean(setting)} />
      </div>
      <p className="mx-auto mt-8 max-w-7xl border-t border-slate-300/60 pt-4 text-center text-[10px] text-slate-500">© 2026 Ricky Pramoedya Hermawan. All rights reserved.</p>
    </main>
  )
}
