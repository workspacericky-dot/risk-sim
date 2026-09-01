'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  ChevronLeft, ChevronRight, ChevronDown, ArrowRight, LayoutGrid,
  ClipboardList, AlertTriangle, Banknote, BarChart3, Target,
  ShieldCheck, Coins, Wallet, MapPin, SlidersHorizontal, Users2,
} from 'lucide-react'

type Ikon = React.ComponentType<{ className?: string }>

type Kartu = {
  id: string
  href: string
  icon: Ikon
  title: string
  tag: string
  gradient: string   // stop-stop-stop untuk chip ikon & dot aktif
  accent: string     // hex — mewarnai panggung, pil, CTA, panah
}

const SEMUA: Record<string, Kartu> = {
  penugasan: {
    id: 'penugasan',
    href: '/dashboard/e-perjadin/penugasan',
    icon: ClipboardList,
    title: 'Buat Penugasan Perjadin',
    tag: 'Operasional',
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    accent: '#6366f1',
  },
  anomali: {
    id: 'anomali',
    href: '/dashboard/e-perjadin/anomali',
    icon: AlertTriangle,
    title: 'Pantau Anomali Anti-Fraud',
    tag: 'Pengawasan',
    gradient: 'from-amber-500 via-orange-500 to-red-400',
    accent: '#f59e0b',
  },
  penyelesaian: {
    id: 'penyelesaian',
    href: '/dashboard/e-perjadin/penyelesaian',
    icon: Banknote,
    title: 'Rekonsiliasi Pembayaran',
    tag: 'Keuangan',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    accent: '#10b981',
  },
  'laporan-manajerial': {
    id: 'laporan-manajerial',
    href: '/dashboard/e-perjadin/laporan-manajerial',
    icon: BarChart3,
    title: 'Telaah Laporan Manajerial',
    tag: 'Manajerial',
    gradient: 'from-violet-500 via-purple-500 to-fuchsia-400',
    accent: '#8b5cf6',
  },
  tdt: {
    id: 'tdt',
    href: '/dashboard/e-perjadin/tdt',
    icon: Target,
    title: 'Pantau TDT & Metrik',
    tag: 'Kinerja',
    gradient: 'from-rose-500 via-pink-500 to-orange-400',
    accent: '#f43f5e',
  },
}

const MASTER: { href: string; judul: string; icon: Ikon }[] = [
  { href: '/dashboard/e-perjadin/peran', judul: 'Peran & Segregation of Duties', icon: ShieldCheck },
  { href: '/dashboard/e-perjadin/sbm', judul: 'Master SBM', icon: Coins },
  { href: '/dashboard/e-perjadin/pagu', judul: 'Master Pagu', icon: Wallet },
  { href: '/dashboard/e-perjadin/koordinat-satker', judul: 'Koordinat Satker', icon: MapPin },
  { href: '/dashboard/e-perjadin/parameter', judul: 'Parameter Kontrol', icon: SlidersHorizontal },
  { href: '/dashboard/e-perjadin/pegawai', judul: 'Master Pegawai', icon: Users2 },
]

export default function EPerjadinHub({
  isAdmin, bisaAnomali, bisaPenyelesaian, bisaTdt, peran,
}: {
  isAdmin: boolean
  bisaAnomali: boolean
  bisaPenyelesaian: boolean
  bisaTdt: boolean
  peran: string[]
}) {
  const ids = [
    'penugasan',
    ...(bisaAnomali ? ['anomali'] : []),
    ...(bisaPenyelesaian ? ['penyelesaian'] : []),
    ...(bisaAnomali ? ['laporan-manajerial'] : []),
    ...(bisaTdt ? ['tdt'] : []),
  ]
  const cards = ids.map((id) => SEMUA[id])

  const [active, setActive] = useState(0)
  const [bukaMaster, setBukaMaster] = useState(false)
  const banyak = cards.length > 1
  const aktif = cards[active]
  const prev = () => setActive((i) => (i - 1 + cards.length) % cards.length)
  const next = () => setActive((i) => (i + 1) % cards.length)

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-serif">E-Perjadin Bawas</h1>
        <p className="text-sm text-slate-500 mt-1">
          Sistem perjalanan dinas pengawasan terintegrasi — pilih modul yang ingin dibuka.
        </p>
        {peran.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {peran.map((p) => (
              <span key={p} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700">{p}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── Pemilih modul ───────────────────────────────────────────────── */}

      {/* < lg — strip gulir snap, satu kartu per layar */}
      <div className="lg:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory pb-3 -mx-4 px-4 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {cards.map((card) => (
          <div key={card.id} className="snap-center shrink-0 w-[86vw] max-w-[380px]">
            <KartuIsi card={card} />
          </div>
        ))}
      </div>

      {/* lg+ — carousel panggung 3D */}
      <div className="relative hidden lg:flex items-center justify-center overflow-x-clip" style={{ minHeight: 360 }}>
        {/* Panggung ber-aksen di belakang kartu aktif */}
        <div
          aria-hidden
          className="absolute rounded-[34px] pointer-events-none"
          style={{
            left: '50%', top: '50%', transform: 'translate(-50%, -50%)',
            width: 560, height: 300,
            background: `linear-gradient(165deg, ${aktif.accent}29, ${aktif.accent}0a)`,
            boxShadow: `0 46px 90px -46px ${aktif.accent}59`,
            transition: 'background .5s ease, box-shadow .5s ease',
            zIndex: 0,
          }}
        />

        {banyak && (
          <button
            onClick={prev}
            aria-label="Kartu sebelumnya"
            className="absolute left-0 z-20 flex items-center justify-center w-12 h-12 rounded-full border border-slate-900/5 bg-white hover:scale-110 transition-transform"
            style={{ color: aktif.accent, boxShadow: '0 10px 24px -6px rgba(15,23,42,0.2)' }}
          >
            <ChevronLeft className="w-5 h-5" strokeWidth={2.4} />
          </button>
        )}

        <div className="relative w-full flex items-center justify-center" style={{ height: 360 }}>
          {cards.map((card, idx) => {
            const offset = idx - active
            if (Math.abs(offset) > 1) return null

            const isCenter = offset === 0
            const isLeft = offset === -1
            const isRight = offset === 1
            const translateX = isCenter ? 0 : isLeft ? -320 : 320
            const rotate = isLeft ? -5 : isRight ? 5 : 0

            return (
              <div
                key={card.id}
                onClick={() => !isCenter && setActive(idx)}
                style={{
                  position: 'absolute',
                  transform: `translateX(${translateX}px) scale(${isCenter ? 1 : 0.82}) rotate(${rotate}deg)`,
                  opacity: isCenter ? 1 : 0.5,
                  zIndex: isCenter ? 10 : 2,
                  transition: 'all 0.5s cubic-bezier(0.34,1.1,0.64,1)',
                  cursor: isCenter ? 'default' : 'pointer',
                  width: 380,
                }}
              >
                <KartuIsi card={card} interaktif={isCenter} elevasi={isCenter} />
              </div>
            )
          })}
        </div>

        {banyak && (
          <button
            onClick={next}
            aria-label="Kartu berikutnya"
            className="absolute right-0 z-20 flex items-center justify-center w-12 h-12 rounded-full border border-slate-900/5 bg-white hover:scale-110 transition-transform"
            style={{ color: aktif.accent, boxShadow: '0 10px 24px -6px rgba(15,23,42,0.2)' }}
          >
            <ChevronRight className="w-5 h-5" strokeWidth={2.4} />
          </button>
        )}
      </div>

      {/* ── Dot indicators (lg+) ─────────────────────────────────────────── */}
      {banyak && (
        <div className="hidden lg:flex items-center justify-center gap-2">
          {cards.map((card, idx) => (
            <button
              key={card.id}
              onClick={() => setActive(idx)}
              aria-label={card.title}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === active ? `w-8 bg-gradient-to-r ${card.gradient}` : 'w-2 bg-slate-300'
              }`}
            />
          ))}
        </div>
      )}

      {/* ── Master Data (admin) ──────────────────────────────────────────── */}
      {isAdmin && (
        <div className="pt-2">
          <button
            onClick={() => setBukaMaster((v) => !v)}
            className="group w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-5 py-4 text-left shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 text-sm font-bold text-slate-800 font-serif">Kelola Master Data</div>
            <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform ${bukaMaster ? 'rotate-180' : ''}`} />
          </button>

          {bukaMaster && (
            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {MASTER.map(({ href, judul, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-all hover:border-slate-300 hover:bg-slate-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-slate-600" />
                  </div>
                  <div className="flex-1 min-w-0 text-sm font-semibold text-slate-800">{judul}</div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/** Isi visual satu kartu modul — dipakai di strip mobile & carousel 3D. */
function KartuIsi({ card, interaktif = true, elevasi = true }: { card: Kartu; interaktif?: boolean; elevasi?: boolean }) {
  const Icon = card.icon
  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-white border border-white/90"
      style={{
        boxShadow: elevasi
          ? `0 2px 4px rgba(15,23,42,0.06), 0 34px 64px -26px ${card.accent}52`
          : '0 24px 50px -24px rgba(15,23,42,0.24)',
      }}
    >
      <div className="p-6 sm:p-8 flex flex-col gap-5" style={{ minHeight: 220 }}>
        <div className="flex items-start justify-between gap-3">
          <div
            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center bg-gradient-to-br ${card.gradient}`}
            style={{ boxShadow: `0 14px 26px -8px ${card.accent}80` }}
          >
            <Icon className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
          </div>
          <span
            className="text-[10px] font-bold uppercase tracking-wider text-white rounded-full px-3 py-1.5"
            style={{ background: card.accent }}
          >
            {card.tag}
          </span>
        </div>

        <div className="flex-1">
          <h2 className="text-xl sm:text-2xl font-bold font-serif text-slate-800 leading-tight">{card.title}</h2>
        </div>

        {interaktif ? (
          <Link
            href={card.href}
            className="flex items-center justify-center gap-2 h-12 rounded-2xl text-white text-sm font-bold transition-transform hover:scale-[1.02]"
            style={{ background: card.accent, boxShadow: `0 16px 28px -8px ${card.accent}80` }}
          >
            Buka <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div
            className="h-12 rounded-2xl flex items-center justify-center text-white text-sm font-bold"
            style={{ background: `${card.accent}66` }}
          >
            Buka
          </div>
        )}
      </div>
    </div>
  )
}
