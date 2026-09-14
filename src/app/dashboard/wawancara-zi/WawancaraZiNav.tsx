'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpenCheck, ListChecks } from 'lucide-react'
import { cn } from '@/lib/utils'

const items = [
  { href: '/dashboard/wawancara-zi', label: 'Daftar Sesi', icon: ListChecks, exact: true },
  { href: '/dashboard/wawancara-zi/panduan', label: 'Panduan & Rubrik', icon: BookOpenCheck },
]

export function WawancaraZiNav() {
  const pathname = usePathname()
  if (/\/wawancara-zi\/[0-9a-f-]{36}$/i.test(pathname)) return null
  return <nav aria-label="Navigasi Wawancara ZI" className="grid grid-cols-2 gap-1.5 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
    {items.map(({ href, label, icon: Icon, exact }) => {
      const active = exact ? pathname === href : pathname.startsWith(href)
      return <Link key={href} href={href} className={cn('flex min-w-0 items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition', active ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-600 hover:bg-teal-50 hover:text-teal-800')}>
        <Icon className="h-4 w-4 shrink-0"/><span>{label}</span>
      </Link>
    })}
  </nav>
}
