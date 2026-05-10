'use client'

import { useState } from 'react'
import { X, HelpCircle } from 'lucide-react'

const FACTORS = [
  {
    id: 'stimulus',
    label: 'Stimulus',
    sub: 'Tekanan',
    desc: 'Tekanan finansial, target kinerja, atau motivasi personal yang mendorong seseorang untuk melakukan penyuapan.',
    color: '#ef4444',
    bg: '#fee2e2',
    textColor: '#991b1b',
    // SVG sector: center→v5→v0 (upper-left side)
    midX: 148, midY: 88,
    labelX: 108, labelY: 64,
    anchor: 'middle' as const,
  },
  {
    id: 'ego',
    label: 'Ego',
    sub: 'Arogansi',
    desc: 'Keyakinan bahwa peraturan tidak berlaku untuk dirinya, atau merasa berhak atas keistimewaan tertentu meski melanggar aturan.',
    color: '#f97316',
    bg: '#ffedd5',
    textColor: '#9a3412',
    // upper-right side
    midX: 252, midY: 88,
    labelX: 292, labelY: 64,
    anchor: 'middle' as const,
  },
  {
    id: 'rasionalisasi',
    label: 'Rasionalisasi',
    sub: '',
    desc: 'Pembenaran diri atas tindakan yang dilakukan: "semua orang melakukannya", "ini sudah tradisi", atau "saya hanya melakukan yang diminta".',
    color: '#eab308',
    bg: '#fef9c3',
    textColor: '#713f12',
    // right side
    midX: 354, midY: 200,
    labelX: 398, labelY: 200,
    anchor: 'start' as const,
  },
  {
    id: 'kesempatan',
    label: 'Kesempatan',
    sub: '',
    desc: 'Adanya celah atau kelemahan dalam sistem pengendalian yang memungkinkan penyuapan terjadi tanpa terdeteksi.',
    color: '#22c55e',
    bg: '#dcfce7',
    textColor: '#14532d',
    // lower-right side
    midX: 252, midY: 312,
    labelX: 292, labelY: 336,
    anchor: 'middle' as const,
  },
  {
    id: 'kolusi',
    label: 'Kolusi',
    sub: '',
    desc: 'Persekongkolan antara dua pihak atau lebih untuk memanipulasi proses dan berbagi keuntungan atas tindakan yang tidak sah.',
    color: '#3b82f6',
    bg: '#dbeafe',
    textColor: '#1e3a8a',
    // lower-left side
    midX: 148, midY: 312,
    labelX: 108, labelY: 336,
    anchor: 'middle' as const,
  },
  {
    id: 'kemampuan',
    label: 'Kemampuan',
    sub: '',
    desc: 'Kompetensi, akses, wewenang, dan posisi yang dimiliki seseorang untuk mengeksploitasi kelemahan sistem pengendalian.',
    color: '#8b5cf6',
    bg: '#ede9fe',
    textColor: '#4c1d95',
    // left side
    midX: 46, midY: 200,
    labelX: 2, labelY: 200,
    anchor: 'end' as const,
  },
]

// Pointy-top hexagon, R=120, center=(200,200) in 400×400 SVG
// v0=(200,80) v1=(303.92,140) v2=(303.92,260) v3=(200,320) v4=(96.08,260) v5=(96.08,140)
const CX = 200, CY = 200
const VERTS = [
  [200, 80],   // v0 top
  [303.92, 140], // v1 top-right
  [303.92, 260], // v2 bottom-right
  [200, 320],  // v3 bottom
  [96.08, 260], // v4 bottom-left
  [96.08, 140], // v5 top-left
]

// Sector i = center → v[i] → v[(i+1)%6], but map: 0=Stimulus(v5→v0), 1=Ego(v0→v1)...
const SECTOR_VERTS = [
  [5, 0], // Stimulus
  [0, 1], // Ego
  [1, 2], // Rasionalisasi
  [2, 3], // Kesempatan
  [3, 4], // Kolusi
  [4, 5], // Kemampuan
]

function sectorPath(i: number) {
  const [a, b] = SECTOR_VERTS[i]
  const [x1, y1] = VERTS[a]
  const [x2, y2] = VERTS[b]
  return `M ${CX} ${CY} L ${x1} ${y1} L ${x2} ${y2} Z`
}

export default function SmapFraudHexagon() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<number | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 text-[11px] font-semibold transition-colors"
        title="Lihat Fraud Hexagon — faktor-faktor penyebab penyuapan"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        Fraud Hexagon
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-orange-50 to-amber-50">
              <div>
                <h3 className="text-base font-bold font-serif text-slate-800">Fraud Hexagon Theory</h3>
                <p className="text-xs text-slate-500 mt-0.5">6 faktor pemicu penyuapan (Vousinas, 2019) — hover pada tiap segmen untuk detail</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* SVG Hexagon */}
              <div className="flex justify-center">
                <svg viewBox="0 0 400 400" className="w-full max-w-sm" style={{ overflow: 'visible' }}>
                  <defs>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  {/* Outer ring subtle shadow */}
                  <polygon
                    points={VERTS.map(v => v.join(',')).join(' ')}
                    fill="none"
                    stroke="#e2e8f0"
                    strokeWidth="2"
                  />

                  {/* 6 sectors */}
                  {FACTORS.map((f, i) => (
                    <path
                      key={f.id}
                      d={sectorPath(i)}
                      fill={active === i ? f.color : f.bg}
                      stroke="white"
                      strokeWidth="2"
                      style={{
                        cursor: 'pointer',
                        transition: 'fill 0.2s ease',
                        filter: active === i ? 'url(#glow)' : undefined,
                      }}
                      onMouseEnter={() => setActive(i)}
                      onMouseLeave={() => setActive(null)}
                    />
                  ))}

                  {/* Center circle */}
                  <circle cx={CX} cy={CY} r={62} fill="white" stroke="#f1f5f9" strokeWidth="2" />
                  <text x={CX} y={CY - 10} textAnchor="middle" className="text-[11px]" fontSize={11} fontWeight="700" fill="#1e293b">
                    PENYUAPAN
                  </text>
                  <text x={CX} y={CY + 6} textAnchor="middle" fontSize={8.5} fill="#64748b">
                    &amp; KECURANGAN
                  </text>
                  <text x={CX} y={CY + 19} textAnchor="middle" fontSize={8} fill="#94a3b8">
                    ISO 37001
                  </text>

                  {/* Labels outside hexagon */}
                  {FACTORS.map((f, i) => {
                    const isActive = active === i
                    return (
                      <g
                        key={f.id}
                        style={{ cursor: 'pointer' }}
                        onMouseEnter={() => setActive(i)}
                        onMouseLeave={() => setActive(null)}
                      >
                        <text
                          x={f.labelX}
                          y={f.labelY}
                          textAnchor={f.anchor}
                          fontSize={10}
                          fontWeight={isActive ? '700' : '600'}
                          fill={isActive ? f.color : '#374151'}
                          style={{ transition: 'fill 0.2s' }}
                        >
                          {f.label}
                        </text>
                        {f.sub && (
                          <text
                            x={f.labelX}
                            y={f.labelY + 12}
                            textAnchor={f.anchor}
                            fontSize={8.5}
                            fill={isActive ? f.color : '#9ca3af'}
                            style={{ transition: 'fill 0.2s' }}
                          >
                            [{f.sub}]
                          </text>
                        )}
                      </g>
                    )
                  })}
                </svg>
              </div>

              {/* Active factor detail card */}
              {active !== null && (
                <div
                  className="rounded-xl border-2 p-4 transition-all"
                  style={{ borderColor: FACTORS[active].color, backgroundColor: FACTORS[active].bg }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="w-3 h-3 rounded-full inline-block"
                      style={{ backgroundColor: FACTORS[active].color }}
                    />
                    <span className="text-sm font-bold" style={{ color: FACTORS[active].textColor }}>
                      {FACTORS[active].label}
                      {FACTORS[active].sub && <span className="font-normal ml-1">[{FACTORS[active].sub}]</span>}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: FACTORS[active].textColor }}>
                    {FACTORS[active].desc}
                  </p>
                </div>
              )}

              {/* All 6 factors summary cards */}
              {active === null && (
                <div className="grid grid-cols-2 gap-2">
                  {FACTORS.map((f, i) => (
                    <div
                      key={f.id}
                      className="rounded-xl border p-3 cursor-pointer transition-all hover:shadow-md"
                      style={{ borderColor: f.color + '60', backgroundColor: f.bg }}
                      onMouseEnter={() => setActive(i)}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.color }} />
                        <span className="text-[11px] font-bold" style={{ color: f.textColor }}>{f.label}</span>
                        {f.sub && <span className="text-[10px]" style={{ color: f.textColor + 'aa' }}>[{f.sub}]</span>}
                      </div>
                      <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: f.textColor + 'cc' }}>
                        {f.desc}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-[10px] text-slate-400 text-center pt-1">
                Fraud Hexagon Theory (Vousinas, 2019) — perluasan dari Fraud Triangle (Cressey, 1953) dan Fraud Diamond (Wolfe & Hermanson, 2004)
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
