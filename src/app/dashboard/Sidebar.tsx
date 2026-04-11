'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Home, Settings, Database, Users, LogOut, Briefcase, BarChart2, GaugeCircle, Map } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PetaRisikoSidebarModal } from './peta-risiko/PetaRisikoSidebarModal'

export default function Sidebar({ userEmail }: { userEmail: string }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [petaOpen, setPetaOpen] = useState(false)

  return (
    <>
      <aside
        className={cn(
          "bg-white border-r border-slate-200 text-slate-800 flex flex-col transition-all duration-300 ease-in-out relative z-20 shrink-0",
          isExpanded ? "w-64" : "w-[72px]"
        )}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        {/* Logo area */}
        <div className={cn("p-4 flex items-center h-16 border-b border-slate-100 transition-all", isExpanded ? "px-5" : "justify-center")}>
          <div className="flex items-center gap-3 truncate">
            <div className="w-9 h-9 shrink-0 relative">
              <Image
                src="/risk-sim-logo.png"
                alt="Risk Management Sim"
                fill
                className="object-contain"
                priority
              />
            </div>
            {isExpanded && (
              <h2 className="font-serif font-bold text-base tracking-tight leading-tight whitespace-nowrap text-slate-800 opacity-100 transition-opacity duration-300 delay-100">
                Risk Management Sim.
              </h2>
            )}
          </div>
        </div>

        <nav className="flex-1 px-3 space-y-1 mt-6 text-sm font-medium overflow-hidden">
          <NavItem href="/dashboard" icon={<Home className="w-5 h-5 shrink-0" />} label="Beranda" isExpanded={isExpanded} />

          {isExpanded && (
            <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-slate-400 font-bold tracking-wider whitespace-nowrap">
              Manajemen Risiko
            </div>
          )}
          {!isExpanded && <div className="h-6" />}

          <NavItem href="/dashboard/konteks" icon={<Settings className="w-5 h-5 shrink-0" />} label="Penetapan Konteks" isExpanded={isExpanded} />

          {/* Peta Risiko — opens modal instead of navigating */}
          <button
            onClick={() => setPetaOpen(true)}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all w-full text-left",
              "hover:bg-slate-50 text-slate-500 hover:text-slate-900",
              isExpanded ? "justify-start" : "justify-center"
            )}
            title="Peta Risiko"
          >
            <Map className="w-5 h-5 shrink-0" />
            {isExpanded && (
              <span className="whitespace-nowrap font-semibold tracking-tight">Peta Risiko</span>
            )}
          </button>

          <NavItem href="/dashboard/rtp" icon={<Briefcase className="w-5 h-5 shrink-0" />} label="Manajemen RTP" isExpanded={isExpanded} />

          {isExpanded && (
            <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-slate-400 font-bold tracking-wider whitespace-nowrap">
              Pelaporan
            </div>
          )}
          {!isExpanded && <div className="h-6" />}

          <NavItem href="/dashboard/laporan" icon={<BarChart2 className="w-5 h-5 shrink-0" />} label="Laporan Eksekutif" isExpanded={isExpanded} />
          <NavItem href="/dashboard/maturitas" icon={<GaugeCircle className="w-5 h-5 shrink-0" />} label="Maturitas MR" isExpanded={isExpanded} />

          {isExpanded && (
            <div className="pt-4 pb-2 px-3 text-[10px] uppercase text-slate-400 font-bold tracking-wider whitespace-nowrap">
              Administrasi
            </div>
          )}
          {!isExpanded && <div className="h-6" />}

          <NavItem href="/dashboard/master-data/unit-kerja" icon={<Database className="w-5 h-5 shrink-0" />} label="Master Unit Kerja" isExpanded={isExpanded} />
          <NavItem href="/dashboard/master-data/users" icon={<Users className="w-5 h-5 shrink-0" />} label="Manajemen Pengguna" isExpanded={isExpanded} />
        </nav>

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

      {/* Peta Risiko full-screen modal — rendered outside aside so it covers full viewport */}
      <PetaRisikoSidebarModal open={petaOpen} onClose={() => setPetaOpen(false)} />
    </>
  )
}

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
        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group",
        active ? "bg-green-50 text-green-700" : "hover:bg-slate-50 text-slate-500 hover:text-slate-900",
        isExpanded ? "justify-start" : "justify-center"
      )}
      title={label}
    >
      <div className="relative">
        {icon}
        {active && !isExpanded && (
          <span className="absolute -right-1 -top-1 w-2 h-2 rounded-full border-2 border-white bg-green-500" />
        )}
      </div>
      {isExpanded && (
        <span className="whitespace-nowrap font-semibold tracking-tight">{label}</span>
      )}
    </Link>
  )
}
