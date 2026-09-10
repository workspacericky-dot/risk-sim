'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Home, Settings, Database, Users, LogOut, Briefcase,
  BarChart2, GaugeCircle, Map, ShieldCheck, ClipboardList, BookOpen, GraduationCap,
  UserCheck, CalendarDays, Wallet, FileSpreadsheet, Plane, X,
  FolderLock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { bisaAksesCa } from '@/lib/ca-audit-akses'
import { PetaRisikoSidebarModal } from './peta-risiko/PetaRisikoSidebarModal'
import { useMobileNav } from './MobileNav'

// Kelas dasar aside: drawer melayang di < md, kolom statis di md+.
const asideBase =
  'bg-white border-r border-slate-200 text-slate-800 flex flex-col transition-all duration-300 ease-in-out no-print ' +
  'fixed inset-y-0 left-0 z-40 w-72 shrink-0 md:static md:z-20 md:translate-x-0 md:shadow-none'

export default function Sidebar({ userRole, bisaEPerjadin = false }: { userRole: string | null; bisaEPerjadin?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [petaOpen,   setPetaOpen]   = useState(false)
  const { open, setOpen } = useMobileNav()

  const tampilLabel = isExpanded || open
  const closeNav = () => setOpen(false)

  // Read current page's ?konteks= so contextual links carry it forward
  const searchParams     = useSearchParams()
  const currentKonteksId = searchParams.get('konteks')

  function withKonteks(base: string) {
    return currentKonteksId ? `${base}?konteks=${currentKonteksId}` : base
  }

  const overlay = open ? (
    <button
      aria-label="Tutup menu"
      onClick={closeNav}
      className="fixed inset-0 z-30 bg-slate-900/40 backdrop-blur-sm md:hidden no-print"
    />
  ) : null

  const logo = (nama: string) => (
    <div className={cn('p-4 flex items-center h-16 border-b border-slate-100 transition-all', tampilLabel ? 'px-5 justify-between' : 'justify-center')}>
      <div className="flex items-center gap-3 truncate">
        <div className="w-9 h-9 shrink-0 relative">
          <Image src="/risk-sim-logo.png" alt={nama} fill sizes="36px" className="object-contain" priority />
        </div>
        {tampilLabel && (
          <h2 className="font-serif font-bold text-base tracking-tight leading-tight whitespace-nowrap text-slate-800">
            {nama}
          </h2>
        )}
      </div>
      <button onClick={closeNav} className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500" aria-label="Tutup menu">
        <X className="w-5 h-5" />
      </button>
    </div>
  )

  // Peserta consulting only ever see RALS — one menu item, no other MR modules.
  if (userRole === 'peserta_consulting') {
    return (
      <>
        {overlay}
        <aside
          className={cn(asideBase, open ? 'translate-x-0 shadow-2xl' : '-translate-x-full', isExpanded ? 'md:w-64' : 'md:w-[72px]')}
          onMouseEnter={() => setIsExpanded(true)}
          onMouseLeave={() => setIsExpanded(false)}
        >
          {logo('RALS')}

          <nav onClick={closeNav} className="flex-1 px-3 space-y-1 mt-6 text-sm font-medium overflow-hidden overflow-y-auto">
            <NavItem href="/dashboard/rals" icon={<GraduationCap className="w-5 h-5 shrink-0" />} label="RALS" isExpanded={tampilLabel} active />
          </nav>

          <div className="p-3 border-t border-slate-100 mb-2">
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-sm"
                title="Keluar (Logout)"
              >
                <LogOut className="w-5 h-5 shrink-0" />
                {tampilLabel && <span className="whitespace-nowrap transition-opacity">Logout</span>}
              </button>
            </form>
          </div>
        </aside>
      </>
    )
  }

  if (userRole === 'upg_pusat' || userRole === 'upg_satker') {
    return <>{overlay}<aside className={cn(asideBase, open ? 'translate-x-0 shadow-2xl' : '-translate-x-full', isExpanded ? 'md:w-64' : 'md:w-[72px]')} onMouseEnter={() => setIsExpanded(true)} onMouseLeave={() => setIsExpanded(false)}>{logo('Risk Management Sim.')}<nav onClick={closeNav} className="mt-6 flex-1 space-y-1 overflow-hidden overflow-y-auto px-3 text-sm font-medium"><NavItem href="/dashboard/ppg" icon={<Image src="/upg-logo.png" alt="UPG" width={22} height={22} className="shrink-0 rounded-md object-contain" />} label="Khusus PPG" isExpanded={tampilLabel} active /></nav><div className="mb-2 border-t border-slate-100 p-3"><form action="/auth/signout" method="post"><button type="submit" className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800" title="Keluar (Logout)"><LogOut className="h-5 w-5 shrink-0" />{tampilLabel && <span className="whitespace-nowrap">Logout</span>}</button></form></div></aside></>
  }

  return (
    <>
      {overlay}
      <aside
        className={cn(asideBase, open ? 'translate-x-0 shadow-2xl' : '-translate-x-full', isExpanded ? 'md:w-64' : 'md:w-[72px]')}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {logo('Risk Management Sim.')}

        <nav onClick={closeNav} className="flex-1 px-3 space-y-1 mt-6 text-sm font-medium overflow-hidden overflow-y-auto">

          {/* Beranda */}
          <NavItem href="/dashboard" icon={<Home className="w-5 h-5 shrink-0" />} label="Beranda" isExpanded={tampilLabel} />
          <NavItem href="/dashboard/rals" icon={<GraduationCap className="w-5 h-5 shrink-0" />} label="RALS" isExpanded={tampilLabel} />
          {userRole === 'admin_sistem' && (
            <NavItem href="/dashboard/siwas" icon={<FolderLock className="w-5 h-5 shrink-0" />} label="Laporan Analisis SIWAS" isExpanded={tampilLabel} />
          )}

          {/* ── MANAJEMEN RISIKO ────────────────────── */}
          <SectionLabel label="Manajemen Risiko" isExpanded={tampilLabel} />

          <NavItem href="/dashboard/konteks" icon={<Settings className="w-5 h-5 shrink-0" />} label="Mulai" isExpanded={tampilLabel} />
          <NavItem
            href="/dashboard/smap"
            icon={<Image src="/smap-logo.png" alt="SMAP" width={22} height={22} className="rounded-full object-contain shrink-0" />}
            label="Khusus SMAP"
            isExpanded={tampilLabel}
          />
          {['admin_sistem', 'upg_pusat', 'upg_satker'].includes(userRole ?? '') && (
            <NavItem
              href="/dashboard/ppg"
              icon={<Image src="/upg-logo.png" alt="UPG" width={22} height={22} className="rounded-md object-contain shrink-0" />}
              label="Khusus PPG"
              isExpanded={tampilLabel}
            />
          )}

          {/* Peta Risiko — opens modal */}
          <button
            onClick={() => setPetaOpen(true)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left',
              'hover:bg-slate-50 text-slate-500 hover:text-slate-900',
              tampilLabel ? 'justify-start' : 'justify-center',
            )}
            title="Peta Risiko"
          >
            <Map className="w-5 h-5 shrink-0" />
            {tampilLabel && <span className="whitespace-nowrap font-semibold tracking-tight">Peta Risiko</span>}
          </button>

          <NavItem href="/dashboard/rtp" icon={<Briefcase className="w-5 h-5 shrink-0" />} label="Monitoring Risiko" isExpanded={tampilLabel} />
          <NavItem href="/dashboard/laporan" icon={<BarChart2 className="w-5 h-5 shrink-0" />} label="Laporan Eksekutif" isExpanded={tampilLabel} />

          {/* ── AUDIT ATAS MR ──────────────────────── */}
          <SectionLabel label="Audit atas MR" isExpanded={tampilLabel} />

          <NavItem href="/dashboard/maturitas" icon={<GaugeCircle className="w-5 h-5 shrink-0" />} label="Maturitas MR" isExpanded={tampilLabel} />
          <NavItem
            href={withKonteks('/dashboard/evaluasi-pengendalian')}
            icon={<ShieldCheck className="w-5 h-5 shrink-0" />}
            label="Evaluasi Pengendalian Utama"
            isExpanded={tampilLabel}
          />
          <NavItem
            href={withKonteks('/dashboard/program-kerja-audit')}
            icon={<ClipboardList className="w-5 h-5 shrink-0" />}
            label="Program Kerja Audit"
            isExpanded={tampilLabel}
          />
          {bisaAksesCa(userRole) && (
            <>
              <NavItem
                href="/dashboard/ca-kepegawaian"
                icon={<UserCheck className="w-5 h-5 shrink-0" />}
                label="CA Bid. Kepegawaian"
                isExpanded={tampilLabel}
              />
              <NavItem
                href="/dashboard/ca-keuangan-perkara"
                icon={<Wallet className="w-5 h-5 shrink-0" />}
                label="CA Audit Keuangan Perkara"
                isExpanded={tampilLabel}
              />
              <NavItem
                href="/dashboard/ca-laporan-keuangan"
                icon={<FileSpreadsheet className="w-5 h-5 shrink-0" />}
                label="CA Laporan Keuangan"
                isExpanded={tampilLabel}
              />
            </>
          )}

          {/* ── PERJALANAN DINAS ───────────────────── */}
          {bisaEPerjadin && (
            <>
              <SectionLabel label="Perjalanan Dinas" isExpanded={tampilLabel} />
              <NavItem
                href="/dashboard/e-perjadin"
                icon={<Plane className="w-5 h-5 shrink-0" />}
                label="E-Perjadin Bawas"
                isExpanded={tampilLabel}
              />
            </>
          )}

          {/* ── ADMINISTRASI ───────────────────────── */}
          <SectionLabel label="Administrasi" isExpanded={tampilLabel} />

          <NavItem href="/dashboard/master-data/unit-kerja" icon={<Database className="w-5 h-5 shrink-0" />} label="Master Unit Kerja" isExpanded={tampilLabel} />
          <NavItem href="/dashboard/master-data/users" icon={<Users className="w-5 h-5 shrink-0" />} label="Manajemen Pengguna" isExpanded={tampilLabel} />
          <NavItem href="/dashboard/master-data/kalender-libur" icon={<CalendarDays className="w-5 h-5 shrink-0" />} label="Master Kalender Libur" isExpanded={tampilLabel} />

          {/* ── LAINNYA ────────────────────────────── */}
          <SectionLabel label="Lainnya" isExpanded={tampilLabel} />

          <NavItem href="/dashboard/knowledge" icon={<BookOpen className="w-5 h-5 shrink-0" />} label="Knowledge" isExpanded={tampilLabel} />
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-slate-100 mb-2">
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors text-sm"
              title="Keluar (Logout)"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {tampilLabel && <span className="whitespace-nowrap transition-opacity">Logout</span>}
            </button>
          </form>
        </div>
      </aside>

      <PetaRisikoSidebarModal open={petaOpen} onClose={() => setPetaOpen(false)} />
    </>
  )
}

// ── Section label ─────────────────────────────────────────────────────────
function SectionLabel({ label, isExpanded }: { label: string; isExpanded: boolean }) {
  return isExpanded ? (
    <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-slate-400 font-bold tracking-wider whitespace-nowrap">
      {label}
    </div>
  ) : (
    <div className="h-6" />
  )
}

// ── Nav item ──────────────────────────────────────────────────────────────
function NavItem({
  href,
  icon,
  label,
  isExpanded,
  active = false,
}: {
  href: string
  icon: React.ReactNode
  label: string
  isExpanded: boolean
  active?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group',
        active ? 'bg-green-50 text-green-700' : 'hover:bg-slate-50 text-slate-500 hover:text-slate-900',
        isExpanded ? 'justify-start' : 'justify-center',
      )}
      title={label}
    >
      <div className="relative">
        {icon}
        {active && !isExpanded && (
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full border-2 border-white bg-green-500" />
        )}
      </div>
      {isExpanded && <span className="whitespace-nowrap font-semibold tracking-tight">{label}</span>}
    </Link>
  )
}
