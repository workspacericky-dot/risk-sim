'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, BookOpenCheck, ClipboardCheck, DatabaseZap, LayoutDashboard, RefreshCw, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard/ppg', label: 'Ringkasan', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/ppg/pustaka', label: 'Risk and Control Library', icon: BookOpenCheck },
  { href: '/dashboard/ppg/penilaian', label: 'Penilaian Risiko', icon: ClipboardCheck },
  { href: '/dashboard/ppg/loss-event', label: 'Loss Event', icon: DatabaseZap },
  { href: '/dashboard/ppg/analitik', label: 'Titik Rawan', icon: BarChart3 },
  { href: '/dashboard/ppg/tindak-lanjut', label: 'Program PPG', icon: RefreshCw },
  { href: '/dashboard/ppg/referensi', label: 'Referensi & Impor', icon: Settings2 },
]

export function PpgModuleNav({ isSatker = false }: { isSatker?: boolean }) {
  const pathname = usePathname()
  const visibleItems = isSatker ? items.filter((item) => ['/dashboard/ppg/penilaian', '/dashboard/ppg/loss-event', '/dashboard/ppg/tindak-lanjut'].includes(item.href)) : items
  return (
    <nav aria-label="Navigasi modul PPG" className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/85 p-2 shadow-sm backdrop-blur">
      {visibleItems.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href)
        return (
          <Link key={href} href={href} className={cn('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors', active ? 'bg-indigo-700 text-white shadow-sm' : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-800')}>
            <Icon className="h-4 w-4" />{label}
          </Link>
        )
      })}
    </nav>
  )
}
