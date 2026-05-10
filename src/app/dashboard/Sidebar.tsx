'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Home, Settings, Database, Users, LogOut, Briefcase,
  BarChart2, GaugeCircle, Map, ShieldCheck, ClipboardList, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PetaRisikoSidebarModal } from './peta-risiko/PetaRisikoSidebarModal'

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [petaOpen,   setPetaOpen]   = useState(false)

  // Read current page's ?konteks= so contextual links carry it forward
  const searchParams     = useSearchParams()
  const currentKonteksId = searchParams.get('konteks')

  function withKonteks(base: string) {
    return currentKonteksId ? `${base}?konteks=${currentKonteksId}` : base
  }

  return (
    <>
      <aside
        className={cn(
          'bg-white border-r border-slate-200 text-slate-800 flex flex-col transition-all duration-300 ease-in-out relative z-20 shrink-0',
          isExpanded ? 'w-64' : 'w-[72px]',
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo */}
        <div className={cn('p-4 flex items-center h-16 border-b border-slate-100 transition-all', isExpanded ? 'px-5' : 'justify-center')}>
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 shrink-0 relative">
              <Image src="/risk-sim-logo.png" alt="Risk Management Sim" fill className="object-contain" priority />
            </div>
            {isExpanded && (
              <h2 className="font-serif font-bold text-base tracking-tight leading-tight whitespace-nowrap text-slate-800 opacity-100 transition-opacity duration-300 delay-100">
                Risk Management Sim.
              </h2>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-6 text-sm font-medium overflow-hidden overflow-y-auto">

          {/* Beranda */}
          <NavItem href="/dashboard" icon={<Home className="w-5 h-5 shrink-0" />} label="Beranda" isExpanded={isExpanded} />

          {/* ── MANAJEMEN RISIKO ────────────────────── */}
          <SectionLabel label="Manajemen Risiko" isExpanded={isExpanded} />

          <NavItem href="/dashboard/konteks" icon={<Settings className="w-5 h-5 shrink-0" />} label="Mulai" isExpanded={isExpanded} />
          <NavItem
            href="/dashboard/smap"
            icon={<Image src="/smap-logo.png" alt="SMAP" width={22} height={22} className="rounded-full object-contain shrink-0" />}
            label="Khusus SMAP"
            isExpanded={isExpanded}
          />

          {/* Peta Risiko — opens modal */}
          <button
            onClick={() => setPetaOpen(true)}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left',
              'hover:bg-slate-50 text-slate-500 hover:text-slate-900',
              isExpanded ? 'justify-start' : 'justify-center',
            )}
            title="Peta Risiko"
          >
            <Map className="w-5 h-5 shrink-0" />
            {isExpanded && <span className="whitespace-nowrap font-semibold tracking-tight">Peta Risiko</span>}
          </button>

          <NavItem href="/dashboard/rtp" icon={<Briefcase className="w-5 h-5 shrink-0" />} label="Monitoring Risiko" isExpanded={isExpanded} />
          <NavItem href="/dashboard/laporan" icon={<BarChart2 className="w-5 h-5 shrink-0" />} label="Laporan Eksekutif" isExpanded={isExpanded} />

          {/* ── AUDIT ATAS MR ──────────────────────── */}
          <SectionLabel label="Audit atas MR" isExpanded={isExpanded} />

          <NavItem href="/dashboard/maturitas" icon={<GaugeCircle className="w-5 h-5 shrink-0" />} label="Maturitas MR" isExpanded={isExpanded} />
          <NavItem
            href={withKonteks('/dashboard/evaluasi-pengendalian')}
            icon={<ShieldCheck className="w-5 h-5 shrink-0" />}
            label="Evaluasi Pengendalian Utama"
            isExpanded={isExpanded}
          />
          <NavItem
            href={withKonteks('/dashboard/program-kerja-audit')}
            icon={<ClipboardList className="w-5 h-5 shrink-0" />}
            label="Program Kerja Audit"
            isExpanded={isExpanded}
          />

          {/* ── ADMINISTRASI ───────────────────────── */}
          <SectionLabel label="Administrasi" isExpanded={isExpanded} />

          <NavItem href="/dashboard/master-data/unit-kerja" icon={<Database className="w-5 h-5 shrink-0" />} label="Master Unit Kerja" isExpanded={isExpanded} />
          <NavItem href="/dashboard/master-data/users" icon={<Users className="w-5 h-5 shrink-0" />} label="Manajemen Pengguna" isExpanded={isExpanded} />

          {/* ── LAINNYA ────────────────────────────── */}
          <SectionLabel label="Lainnya" isExpanded={isExpanded} />

          <NavItem href="/dashboard/knowledge" icon={<BookOpen className="w-5 h-5 shrink-0" />} label="Knowledge" isExpanded={isExpanded} />
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
              {isExpanded && <span className="whitespace-nowrap transition-opacity">Logout</span>}
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
