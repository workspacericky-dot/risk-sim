'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ClipboardList, AlertOctagon, TrendingUp, Clock } from 'lucide-react'

const CARDS = [
  {
    id: 'monitoring-rtp',
    icon: ClipboardList,
    title: 'Monitoring RTP',
    subtitle: 'Rencana Tindak Pengendalian',
    description:
      'Pantau progres implementasi rencana tindak pengendalian atas risiko-risiko prioritas. Lacak status, tenggat waktu, dan persentase penyelesaian per satuan kerja.',
    gradient: 'from-indigo-500 via-blue-500 to-cyan-400',
    bg: 'from-indigo-50 to-blue-50',
    iconColor: 'text-indigo-600',
    iconBg: 'bg-indigo-100',
    accentColor: '#6366f1',
    tag: 'Pengendalian Risiko',
  },
  {
    id: 'monitoring-loss-event',
    icon: AlertOctagon,
    title: 'Monitoring Loss Event',
    subtitle: 'Kejadian Kerugian',
    description:
      'Rekam dan analisis kejadian kerugian aktual yang terjadi akibat materilisasi risiko. Hitung frekuensi, besaran kerugian, dan dampak terhadap kinerja organisasi.',
    gradient: 'from-rose-500 via-red-500 to-orange-400',
    bg: 'from-rose-50 to-orange-50',
    iconColor: 'text-rose-600',
    iconBg: 'bg-rose-100',
    accentColor: '#f43f5e',
    tag: 'Kejadian Risiko',
  },
  {
    id: 'monitoring-level-risiko',
    icon: TrendingUp,
    title: 'Monitoring Level Risiko',
    subtitle: 'Tren & Pergerakan Risiko',
    description:
      'Visualisasikan tren pergerakan level risiko dari waktu ke waktu. Pantau apakah risiko membaik, stagnan, atau memburuk pasca implementasi pengendalian.',
    gradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    bg: 'from-emerald-50 to-teal-50',
    iconColor: 'text-emerald-600',
    iconBg: 'bg-emerald-100',
    accentColor: '#10b981',
    tag: 'Tren Risiko',
  },
]

export default function MonitoringRisikoPage() {
  const [active, setActive] = useState(0)

  const prev = () => setActive(i => (i - 1 + CARDS.length) % CARDS.length)
  const next = () => setActive(i => (i + 1) % CARDS.length)

  return (
    <div className="space-y-8">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800 font-serif">Monitoring Risiko</h1>
        <p className="text-sm text-slate-500 mt-1">
          Pilih modul monitoring yang ingin diakses — fitur segera hadir
        </p>
      </div>

      {/* ── Carousel ─────────────────────────────────────────────────────── */}
      <div className="relative flex items-center justify-center" style={{ minHeight: 480 }}>

        {/* Left arrow */}
        <button
          onClick={prev}
          className="absolute left-0 z-20 flex items-center justify-center w-11 h-11 rounded-full border border-white/60 shadow-lg hover:scale-110 transition-all"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <ChevronLeft className="w-5 h-5 text-slate-600" />
        </button>

        {/* Cards track */}
        <div className="relative w-full flex items-center justify-center" style={{ height: 480, perspective: '1200px' }}>
          {CARDS.map((card, idx) => {
            const offset  = idx - active
            const absOff  = Math.abs(offset)
            // Clamp visible range: -1, 0, +1
            if (absOff > 1) return null

            const isCenter = offset === 0
            const isLeft   = offset === -1
            const isRight  = offset === 1

            const translateX = isCenter ? 0 : isLeft ? -300 : 300
            const scale      = isCenter ? 1 : 0.78
            const opacity    = isCenter ? 1 : 0.45
            const zIndex     = isCenter ? 10 : 1
            const rotateY    = isLeft ? 20 : isRight ? -20 : 0
            const blur       = isCenter ? 0 : 3

            const Icon = card.icon

            return (
              <div
                key={card.id}
                onClick={() => !isCenter && setActive(idx)}
                style={{
                  position:  'absolute',
                  transform: `translateX(${translateX}px) scale(${scale}) rotateY(${rotateY}deg)`,
                  opacity,
                  zIndex,
                  filter:    blur > 0 ? `blur(${blur}px)` : 'none',
                  transition: 'all 0.5s cubic-bezier(0.34,1.1,0.64,1)',
                  cursor:    isCenter ? 'default' : 'pointer',
                  width:     380,
                }}
              >
                {/* Card */}
                <div
                  className={`relative overflow-hidden rounded-3xl border border-white/60 shadow-2xl`}
                  style={{
                    background: 'rgba(255,255,255,0.92)',
                    backdropFilter: 'blur(20px)',
                    height: 420,
                  }}
                >
                  {/* Gradient top strip */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${card.gradient}`} />

                  {/* Decorative blurred orb */}
                  <div
                    className="absolute -top-16 -right-16 w-48 h-48 rounded-full opacity-10 blur-3xl"
                    style={{ background: card.accentColor }}
                  />

                  <div className="p-8 flex flex-col h-full gap-5">
                    {/* Icon + tag */}
                    <div className="flex items-start justify-between">
                      <div className={`w-16 h-16 rounded-2xl ${card.iconBg} flex items-center justify-center shadow-sm`}>
                        <Icon className={`w-8 h-8 ${card.iconColor}`} />
                      </div>
                      <span className={`flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border bg-gradient-to-r ${card.bg} ${card.iconColor} border-current/20`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {card.tag}
                      </span>
                    </div>

                    {/* Text */}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold font-serif text-slate-800 leading-tight">
                        {card.title}
                      </h2>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5 uppercase tracking-wider">
                        {card.subtitle}
                      </p>
                      <p className="text-sm text-slate-600 mt-4 leading-relaxed">
                        {card.description}
                      </p>
                    </div>

                    {/* Coming soon badge */}
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-2xl border"
                      style={{
                        background: 'rgba(241,245,249,0.8)',
                        borderColor: 'rgba(226,232,240,0.8)',
                      }}
                    >
                      <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-slate-500">Segera Hadir</p>
                        <p className="text-[10px] text-slate-400">Fitur ini sedang dalam pengembangan</p>
                      </div>
                      <span
                        className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: card.accentColor + '18', color: card.accentColor }}
                      >
                        Coming Soon
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right arrow */}
        <button
          onClick={next}
          className="absolute right-0 z-20 flex items-center justify-center w-11 h-11 rounded-full border border-white/60 shadow-lg hover:scale-110 transition-all"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <ChevronRight className="w-5 h-5 text-slate-600" />
        </button>
      </div>

      {/* ── Dot indicators ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-2.5">
        {CARDS.map((card, idx) => (
          <button
            key={card.id}
            onClick={() => setActive(idx)}
            style={{
              width:      idx === active ? 28 : 8,
              height:     8,
              borderRadius: 9999,
              background: idx === active ? card.accentColor : '#cbd5e1',
              transition: 'all 0.35s ease',
            }}
          />
        ))}
      </div>

      {/* ── Active card label ─────────────────────────────────────────────── */}
      <p className="text-center text-xs text-slate-400 font-medium tracking-wider uppercase">
        {CARDS[active].title}
      </p>
    </div>
  )
}
