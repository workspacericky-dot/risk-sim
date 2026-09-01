'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Bell, Search, ChevronDown, X, User, Users, Printer, Menu } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMobileNav } from '@/app/dashboard/MobileNav'

// --- Role label map ---
const ROLE_LABELS: Record<string, string> = {
  admin_satker: 'Admin Satker',
  pemilik_risiko: 'Pemilik Risiko Satker',
  pengelola_risiko: 'Pengelola Risiko Satker',
  kepala_umr: 'Kepala Unit MR (MA)',
  anggota_umr: 'Anggota Unit MR (MA)',
  kepala_apip: 'Kepala APIP',
  anggota_apip: 'Anggota APIP',
  pemilik_risiko_ma: 'Pemilik Risiko MA',
  admin_sistem: 'Administrator Sistem',
}

// --- Types ---
type Props = {
  userEmail: string
  userName: string | null
  userRole: string | null
  initialYear: number
}

// --- Helper: generate initials from email ---
function getInitials(email: string): string {
  const name = email.split('@')[0]
  const parts = name.split(/[._-]/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

// --- Search overlay: highlights matching text on the page ---
function clearHighlights() {
  document.querySelectorAll('mark[data-page-search]').forEach((el) => {
    const parent = el.parentNode
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent ?? ''), el)
      parent.normalize()
    }
  })
}

function highlightText(query: string): number {
  clearHighlights()
  if (!query.trim()) return 0

  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        const parent = node.parentElement
        if (!parent) return NodeFilter.FILTER_REJECT
        // Skip script, style, input, and already-highlighted nodes
        const tag = parent.tagName.toLowerCase()
        if (['script', 'style', 'input', 'textarea', 'mark'].includes(tag)) return NodeFilter.FILTER_REJECT
        // Skip header itself
        if (parent.closest('header')) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    }
  )

  const nodes: Text[] = []
  let node: Node | null
  while ((node = walker.nextNode())) {
    nodes.push(node as Text)
  }

  let count = 0
  let firstMark: HTMLElement | null = null
  const lowerQuery = query.toLowerCase()

  for (const textNode of nodes) {
    const text = textNode.textContent ?? ''
    const lowerText = text.toLowerCase()
    if (!lowerText.includes(lowerQuery)) continue

    const frag = document.createDocumentFragment()
    let lastIndex = 0
    let idx = lowerText.indexOf(lowerQuery, 0)
    while (idx !== -1) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, idx)))
      const mark = document.createElement('mark')
      mark.setAttribute('data-page-search', '1')
      mark.style.cssText = 'background:#fde047;color:#1a1a1a;border-radius:2px;padding:0 1px;'
      mark.textContent = text.slice(idx, idx + query.length)
      frag.appendChild(mark)
      if (!firstMark) firstMark = mark
      count++
      lastIndex = idx + query.length
      idx = lowerText.indexOf(lowerQuery, lastIndex)
    }
    frag.appendChild(document.createTextNode(text.slice(lastIndex)))
    textNode.parentNode?.replaceChild(frag, textNode)
  }

  if (firstMark) {
    firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }
  return count
}

// --- Notification Panel ---
const NOTIFICATIONS = [
  { id: 1, text: 'Belum ada notifikasi baru.', time: '', unread: false },
]

// --- Year Range ---
const currentYear = new Date().getFullYear()
const YEARS = [currentYear - 1, currentYear, currentYear + 1]

// --- Main component ---
export function DashboardHeader({ userEmail, userName, userRole, initialYear }: Props) {
  const { setOpen: setNavOpen } = useMobileNav()
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [matchCount, setMatchCount] = useState<number | null>(null)
  const [notifOpen, setNotifOpen] = useState(false)
  const [yearOpen, setYearOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState(initialYear)
  const [profileOpen, setProfileOpen] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)
  const yearRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false)
      if (yearRef.current && !yearRef.current.contains(e.target as Node)) setYearOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50)
    } else {
      clearHighlights()
      setSearchQuery('')
      setMatchCount(null)
    }
  }, [searchOpen])

  // Escape closes search
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    const count = highlightText(query)
    setMatchCount(query.trim() ? count : null)
  }, [])

  const initials = userName
    ? userName.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()
    : getInitials(userEmail)
  const displayName = userName ?? userEmail.split('@')[0].replace(/[._-]/g, ' ')
  const roleLabel = userRole ? (ROLE_LABELS[userRole] ?? userRole) : null

  return (
    <>
      {/* Search bar overlay */}
      {searchOpen && (
        <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center h-16 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-4 sm:px-8">
          <div className="flex items-center gap-3 w-full max-w-2xl">
            <Search className="size-4 text-slate-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari teks di halaman ini..."
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-muted-foreground"
            />
            {matchCount !== null && (
              <span className="text-xs text-muted-foreground shrink-0">
                {matchCount} hasil
              </span>
            )}
            <button
              onClick={() => setSearchOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              <X className="size-4 text-slate-500" />
            </button>
          </div>
        </div>
      )}

      {/* Actual header */}
      <header className="bg-[#F8F9FA] px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between sticky top-0 z-10 border-b border-slate-200">
        <div className="flex items-center gap-2 sm:gap-4 min-w-0">
          {/* Hamburger — buka drawer navigasi di layar sempit */}
          <button
            onClick={() => setNavOpen(true)}
            className="md:hidden -ml-1 w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-colors shrink-0"
            title="Buka menu"
            aria-label="Buka menu navigasi"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-serif font-semibold text-lg tracking-tight text-slate-800 hidden md:block truncate">
            Risk Management Sim.
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 lg:gap-4 text-sm font-medium text-slate-600">
          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
            title="Cari teks di halaman"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Print / Export PDF button */}
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 hover:border-slate-400 text-slate-600 hover:text-slate-800 text-xs font-semibold transition-all shadow-sm"
            title="Ekspor halaman ini ke PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Ekspor PDF</span>
          </button>

          {/* Notification button */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => setNotifOpen((o) => !o)}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors relative"
              title="Notifikasi"
            >
              <Bell className="w-4 h-4" />
              {/* Unread dot — hidden when no unread */}
              {/* <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" /> */}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-10 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                  <span className="text-sm font-semibold text-slate-700">Notifikasi</span>
                  <span className="text-xs text-muted-foreground">0 baru</span>
                </div>
                <div className="divide-y">
                  {NOTIFICATIONS.map((n) => (
                    <div key={n.id} className="px-4 py-3 text-sm text-slate-500 italic">
                      {n.text}
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2 border-t bg-slate-50">
                  <span className="text-xs text-muted-foreground">Fitur notifikasi akan segera hadir.</span>
                </div>
              </div>
            )}
          </div>

          <div className="h-4 w-[1px] bg-slate-300 mx-1 hidden sm:block" />

          {/* Year selector */}
          <div ref={yearRef} className="relative">
            <button
              onClick={() => setYearOpen((o) => !o)}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-700 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 whitespace-nowrap"
              title="Pilih Tahun Periode MR"
            >
              <span className="hidden md:inline">Tahun Periode:&nbsp;</span><strong className="text-slate-700">{selectedYear}</strong>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </button>

            {yearOpen && (
              <div className="absolute right-0 top-10 w-44 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-3 py-2 border-b bg-slate-50">
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Pilih Tahun MR</span>
                </div>
                {YEARS.map((y) => (
                  <button
                    key={y}
                    onClick={() => {
                      setSelectedYear(y)
                      setYearOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors',
                      y === selectedYear && 'font-semibold text-slate-900'
                    )}
                  >
                    <span>{y}</span>
                    {y === selectedYear && (
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile / Account button */}
          <div ref={profileRef} className="relative">
            <button
              onClick={() => setProfileOpen((o) => !o)}
              className="flex items-center gap-2 bg-slate-900 text-white pl-1 pr-1 sm:pl-1.5 sm:pr-3 py-1 sm:py-1.5 rounded-full hover:bg-slate-800 transition-all shadow-sm"
              title="Profil Akun"
            >
              <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initials}
              </div>
              <span className="text-sm font-medium hidden sm:block max-w-[9rem] truncate">{displayName}</span>
            </button>

            {profileOpen && (
              <div className="absolute right-0 top-11 w-72 max-w-[calc(100vw-2rem)] rounded-xl bg-white border border-slate-200 shadow-lg z-50 overflow-hidden">
                <div className="px-4 py-4 flex items-center gap-3 border-b bg-slate-50">
                  <div className="w-11 h-11 rounded-full bg-slate-900 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{displayName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                    {roleLabel && (
                      <span className="inline-block mt-1.5 text-[10px] font-semibold uppercase tracking-wider bg-green-100 text-green-800 border border-green-200 rounded px-1.5 py-0.5">
                        {roleLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <button className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg transition-colors">
                    <User className="size-4" />
                    <span>Profil Saya</span>
                  </button>
                  {userRole === 'admin_sistem' && (
                    <a
                      href="/dashboard/kelola-pengguna"
                      onClick={() => setProfileOpen(false)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      <Users className="size-4" />
                      <span>Kelola Pengguna</span>
                    </a>
                  )}
                </div>
                <div className="p-2 border-t">
                  <form action="/auth/signout" method="POST">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <span>Keluar</span>
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  )
}
