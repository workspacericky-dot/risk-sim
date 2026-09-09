import Image from 'next/image'
import { requirePpgAccess } from '@/lib/ppg/access'
import { PpgModuleNav } from './PpgModuleNav'
import { PpgScenarioSwitcher } from './PpgScenarioSwitcher'

export const dynamic = 'force-dynamic'

export default async function PpgLayout({ children }: { children: React.ReactNode }) {
  const access = await requirePpgAccess()
  return (
    <section className="space-y-5">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-indigo-800 p-6 text-white shadow-xl">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-cyan-300/15 blur-2xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-white/10 p-1.5 ring-1 ring-white/20">
              <Image src="/upg-logo.png" alt="Logo UPG Mahkamah Agung Republik Indonesia" fill sizes="56px" className="object-contain p-1.5" priority />
            </div>
            <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-200">Program Pengendalian Gratifikasi</p><h1 className="mt-1 text-2xl font-bold tracking-tight">Khusus PPG</h1><p className="mt-1 max-w-3xl text-sm text-indigo-100">Sistem aplikasi terintegrasi untuk pengelolaan risiko gratifikasi dan program pengendaliannya pada lingkungan Mahkamah Agung RI dan badan peradilan di bawahnya.</p></div>
          </div>
          <PpgScenarioSwitcher active={access.scenarioKey} isAdmin={access.isAdmin} />
        </div>
      </header>
      {access.isDemo && <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
        <p><strong>MODE SIMULASI AKTIF.</strong> Semua angka, isian, analitik, dan perubahan di modul PPG ini adalah data dummy serta terpisah dari Data Riil.</p>
        <span className="rounded-full bg-amber-200 px-3 py-1 text-xs font-extrabold tracking-wide">TIDAK UNTUK PELAPORAN RESMI</span>
      </div>}
      <PpgModuleNav isSatker={access.isSatker} />
      {children}
    </section>
  )
}
