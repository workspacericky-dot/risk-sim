'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, FileSearch, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard/uji-publik-zi', label: 'Dashboard', icon: BarChart3, exact: true },
  { href: '/dashboard/uji-publik-zi/impor', label: 'Impor XLSX', icon: Upload },
  { href: '/dashboard/uji-publik-zi/respon', label: 'Detail Respons', icon: FileSearch },
]

export function UjiPublikNav() {
  const pathname = usePathname()
  return <nav aria-label="Navigasi Uji Publik ZI" className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
    {items.map(({ href, label, icon: Icon, exact }) => {
      const active = exact ? pathname === href : pathname.startsWith(href)
      return <Link key={href} href={href} className={cn('flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-800')}>
        <Icon className="h-4 w-4 shrink-0"/><span>{label}</span>
      </Link>
    })}
  </nav>
}

