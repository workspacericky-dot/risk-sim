'use client'

import { useState } from 'react'
import { Map as MapIcon, X } from 'lucide-react'

// ── Same lookup as everywhere else ───────────────────────────────────────────
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getCellColor(k: number, d: number): string {
  const score = RISK_MATRIX[k]?.[d] ?? 0
  if (score >= 20) return '#fca5a5'  // red-300
  if (score >= 16) return '#fdba74'  // orange-300
  if (score >= 11) return '#fde047'  // yellow-300
  if (score >= 6)  return '#86efac'  // green-300
  return '#67e8f9'                   // cyan-300
}

export type RiskPoint = {
  id: string
  label: string        // kode_risiko
  kemungkinan: number  // 1–5 (y-axis)
  dampak: number       // 1–5 (x-axis)
  pernyataan?: string
}

type Props = {
  risks: RiskPoint[]
  unitNama: string
  tahun: number | string
}

// ── SVG Heatmap Dimensions ───────────────────────────────────────────────────
const ML = 130  // left margin (Y-axis labels)
const MB = 64   // bottom margin (X-axis labels)
const MT = 18   // top margin
const MR = 18   // right margin
const CELL = 72 // cell size (px)
const PW = CELL * 5  // plot width  = 360
const PH = CELL * 5  // plot height = 360
const W  = ML + PW + MR  // total SVG width  = 508
const H  = MT + PH + MB  // total SVG height = 442

const K_LABELS: Record<number, string> = {
  5: 'Hampir pasti',
  4: 'Kemungkinan besar',
  3: 'Mungkin terjadi',
  2: 'Kemungkinan kecil',
  1: 'Hampir tidak',
}
const D_LABELS: Record<number, string> = {
  1: 'Sangat Rendah',
  2: 'Rendah',
  3: 'Sedang',
  4: 'Tinggi',
  5: 'Sangat Tinggi',
}

// Cell top-left in SVG coords: k=5 is top row, k=1 is bottom row; d=1 is left col
function cellX(d: number) { return ML + (d - 1) * CELL }
function cellY(k: number) { return MT + (5 - k) * CELL }

// Risk circle center
function circleCX(d: number) { return ML + (d - 1) * CELL + CELL / 2 }
function circleCY(k: number) { return MT + (5 - k) * CELL + CELL / 2 }

// When multiple risks land on the same cell, offset them
function buildOffsets(risks: RiskPoint[]): Map<string, { cx: number; cy: number }> {
  const cellGroups = new Map<string, RiskPoint[]>()
  for (const r of risks) {
    const key = `${r.kemungkinan},${r.dampak}`
    if (!cellGroups.has(key)) cellGroups.set(key, [])
    cellGroups.get(key)!.push(r)
  }
  const result = new Map<string, { cx: number; cy: number }>()
  const OFFSETS = [
    [0, 0], [-16, -10], [16, -10], [0, 16],
    [-16, 10], [16, 10], [-22, 0], [22, 0],
  ]
  for (const [, group] of cellGroups) {
    group.forEach((r, i) => {
      const [ox, oy] = OFFSETS[Math.min(i, OFFSETS.length - 1)]
      result.set(r.id, {
        cx: circleCX(r.dampak)      + ox,
        cy: circleCY(r.kemungkinan) + oy,
      })
    })
  }
  return result
}

function RiskHeatmap({ risks }: { risks: RiskPoint[] }) {
  const offsets = buildOffsets(risks)

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      style={{ fontFamily: 'inherit', maxHeight: 440 }}
      aria-label="Risk Heat Map"
    >
      {/* ── Background cells ── */}
      {[5, 4, 3, 2, 1].flatMap((k) =>
        [1, 2, 3, 4, 5].map((d) => (
          <rect
            key={`bg-${k}-${d}`}
            x={cellX(d)}
            y={cellY(k)}
            width={CELL}
            height={CELL}
            fill={getCellColor(k, d)}
            stroke="white"
            strokeWidth={1}
          />
        ))
      )}

      {/* ── Score labels in each cell ── */}
      {[5, 4, 3, 2, 1].flatMap((k) =>
        [1, 2, 3, 4, 5].map((d) => (
          <text
            key={`score-${k}-${d}`}
            x={cellX(d) + 4}
            y={cellY(k) + 11}
            fontSize={9}
            fill="rgba(0,0,0,0.35)"
            fontWeight="bold"
          >
            {RISK_MATRIX[k]?.[d]}
          </text>
        ))
      )}

      {/* ── Y-axis labels (Kemungkinan) ── */}
      {[5, 4, 3, 2, 1].map((k) => (
        <text
          key={`yl-${k}`}
          x={ML - 8}
          y={cellY(k) + CELL / 2}
          textAnchor="end"
          dominantBaseline="middle"
          fontSize={9}
          fill="#475569"
        >
          {k} – {K_LABELS[k]}
        </text>
      ))}

      {/* ── Y-axis title ── */}
      <text
        transform={`rotate(-90) translate(${-(MT + PH / 2)}, 14)`}
        textAnchor="middle"
        fontSize={10}
        fill="#64748b"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        ← KEMUNGKINAN →
      </text>

      {/* ── X-axis labels (Dampak) ── */}
      {[1, 2, 3, 4, 5].map((d) => (
        <text
          key={`xl-${d}`}
          x={cellX(d) + CELL / 2}
          y={MT + PH + 14}
          textAnchor="middle"
          fontSize={9}
          fill="#475569"
        >
          {d} – {D_LABELS[d]}
        </text>
      ))}

      {/* ── X-axis title ── */}
      <text
        x={ML + PW / 2}
        y={H - 4}
        textAnchor="middle"
        fontSize={10}
        fill="#64748b"
        fontWeight="600"
        letterSpacing="0.05em"
      >
        ← DAMPAK →
      </text>

      {/* ── Risk circles ── */}
      {risks.map((r) => {
        const pos = offsets.get(r.id)!
        // Truncate long codes to fit circle
        const shortLabel = r.label.length > 8 ? r.label.slice(0, 7) + '…' : r.label
        return (
          <g key={r.id}>
            <title>{r.label}{r.pernyataan ? ` — ${r.pernyataan}` : ''}</title>
            {/* Shadow */}
            <circle cx={pos.cx + 1} cy={pos.cy + 1} r={19} fill="rgba(0,0,0,0.15)" />
            {/* Circle */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r={19}
              fill="white"
              stroke="#1e293b"
              strokeWidth={1.5}
            />
            {/* Label */}
            <text
              x={pos.cx}
              y={pos.cy}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={r.label.length > 6 ? 7 : 8}
              fontWeight="700"
              fill="#1e293b"
            >
              {shortLabel}
            </text>
          </g>
        )
      })}

      {/* ── Legend ── */}
      {[
        { label: 'Sangat Rendah', color: '#67e8f9' },
        { label: 'Rendah',        color: '#86efac' },
        { label: 'Moderat',       color: '#fde047' },
        { label: 'Tinggi',        color: '#fdba74' },
        { label: 'Sangat Tinggi', color: '#fca5a5' },
      ].map(({ label, color }, i) => (
        <g key={label} transform={`translate(${ML + i * 70}, ${MT + PH + 38})`}>
          <rect width={10} height={10} fill={color} rx={2} stroke="rgba(0,0,0,0.15)" strokeWidth={0.5} />
          <text x={13} y={9} fontSize={8} fill="#64748b">{label}</text>
        </g>
      ))}
    </svg>
  )
}

export function RiskMapPopup({ risks, unitNama, tahun }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 shadow-sm transition-all text-sm font-medium"
        title="Lihat Peta Risiko"
      >
        <MapIcon className="w-4 h-4" />
        <span>Peta Risiko</span>
      </button>

      {/* Overlay + Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(6px)', backgroundColor: 'rgba(15,23,42,0.55)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden"
            style={{ animation: 'popup-enter 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-serif font-bold text-slate-800 text-lg">Peta Risiko — Heat Map</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lampiran Pedoman No. 8 · <strong>{unitNama}</strong> · Tahun{' '}
                  <strong>{tahun}</strong>
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Heatmap */}
            <div className="px-4 py-4 overflow-x-auto">
              {risks.length > 0 ? (
                <RiskHeatmap risks={risks} />
              ) : (
                <div className="py-12 text-center text-slate-400">
                  <MapIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Belum ada risiko yang terpetakan.</p>
                  <p className="text-xs mt-1">Lengkapi analisis risiko terlebih dahulu.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            {risks.length > 0 && (
              <div className="px-6 py-3 border-t bg-slate-50 text-[10px] text-slate-400 leading-relaxed">
                Setiap lingkaran mewakili satu risiko yang telah dianalisis.
                Posisi ditentukan oleh skor kemungkinan (sumbu Y) dan dampak residu (sumbu X).
                Label menunjukkan kode risiko.
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes popup-enter {
          from { opacity: 0; transform: scale(0.88) translateY(16px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </>
  )
}
