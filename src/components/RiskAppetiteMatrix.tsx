'use client'

import React from 'react'

// Same lookup as RiskMatrix
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getScore(k: number, d: number): number {
  if (k < 1 || k > 5 || d < 1 || d > 5) return Infinity
  return RISK_MATRIX[k]?.[d] ?? Infinity
}

function isAccepted(k: number, d: number, threshold: number): boolean {
  return getScore(k, d) <= threshold
}

/** Background color for a cell given the threshold.
 *  Accepted zone → soft green; above → normal heat-map color. */
function getCellBg(k: number, d: number, threshold: number): string {
  if (isAccepted(k, d, threshold)) return '#86efac'  // green-300
  const score = getScore(k, d)
  if (score >= 20) return '#b91c1c'
  if (score >= 16) return '#ea580c'
  if (score >= 11) return '#ca8a04'
  if (score >= 6)  return '#16a34a'
  return '#0891b2'
}

/** Text color inside each cell */
function getCellText(k: number, d: number, threshold: number): string {
  return isAccepted(k, d, threshold) ? '#14532d' : 'rgba(255,255,255,0.85)'
}

/** Compute inline border styles — thick dark line where acceptance zone transitions */
function getCellBorders(k: number, d: number, threshold: number): React.CSSProperties {
  const THICK = '2.5px solid #1e293b'
  const THIN  = '1px solid rgba(255,255,255,0.25)'

  const cur  = isAccepted(k, d, threshold)
  return {
    borderTop:    cur !== isAccepted(k + 1, d, threshold) ? THICK : THIN,
    borderRight:  cur !== isAccepted(k, d + 1, threshold) ? THICK : THIN,
    borderBottom: cur !== isAccepted(k - 1, d, threshold) ? THICK : THIN,
    borderLeft:   cur !== isAccepted(k, d - 1, threshold) ? THICK : THIN,
  }
}

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

interface RiskAppetiteMatrixProps {
  threshold: number
  /** Optional label shown above the matrix (e.g. category name) */
  categoryName?: string
  /** Compact mode for smaller display */
  compact?: boolean
}

export function RiskAppetiteMatrix({ threshold, categoryName, compact = false }: RiskAppetiteMatrixProps) {
  const cellSize = compact ? 44 : 64
  const labelWidth = compact ? 80 : 120
  const fontSize = compact ? '9px' : '10px'

  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: labelWidth + cellSize * 5 }}>

        {/* Column headers */}
        <div className="flex">
          <div style={{ width: labelWidth }} className="shrink-0" />
          {[1, 2, 3, 4, 5].map((d) => (
            <div
              key={d}
              className="flex-1 text-center pb-1 leading-tight font-medium text-slate-500"
              style={{ fontSize, width: cellSize }}
            >
              <div className="font-bold text-slate-400" style={{ fontSize: compact ? '8px' : '9px' }}>{d}</div>
              {!compact && <div>{D_LABELS[d]}</div>}
            </div>
          ))}
        </div>

        {/* Matrix rows (k = 5 → 1, top to bottom) */}
        {[5, 4, 3, 2, 1].map((k) => (
          <div key={k} className="flex">
            {/* Row label */}
            <div
              style={{ width: labelWidth }}
              className="shrink-0 flex items-center justify-end pr-2 text-right leading-tight text-slate-500 py-0.5"
            >
              <div style={{ fontSize }}>
                <span className="block font-bold text-slate-400" style={{ fontSize: compact ? '8px' : '9px' }}>{k}</span>
                {!compact && <span>{K_LABELS[k]}</span>}
              </div>
            </div>

            {/* Cells */}
            {[1, 2, 3, 4, 5].map((d) => {
              const score   = getScore(k, d)
              const bg      = getCellBg(k, d, threshold)
              const textCol = getCellText(k, d, threshold)
              const borders = getCellBorders(k, d, threshold)
              const accepted = isAccepted(k, d, threshold)

              return (
                <div
                  key={d}
                  className="flex-1 relative flex items-center justify-center"
                  style={{
                    backgroundColor: bg,
                    minHeight: cellSize,
                    width: cellSize,
                    ...borders,
                  }}
                  title={`K${k}×D${d} = ${score}${accepted ? ' ✓ (dalam selera)' : ' ✗ (wajib RTP)'}`}
                >
                  <span
                    className="font-bold select-none"
                    style={{ color: textCol, fontSize: compact ? '10px' : '12px' }}
                  >
                    {score === Infinity ? '–' : score}
                  </span>

                  {/* Checkmark for accepted cells */}
                  {accepted && (
                    <span
                      className="absolute bottom-0.5 right-0.5 select-none"
                      style={{ color: '#15803d', fontSize: '7px', lineHeight: 1 }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        ))}

        {/* X-axis label */}
        <div className="flex mt-0.5">
          <div style={{ width: labelWidth }} className="shrink-0" />
          <div className="flex-1 text-center font-semibold text-slate-400 mt-0.5" style={{ fontSize }}>
            ← Dampak →
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap mt-2 justify-start" style={{ fontSize: compact ? '9px' : '10px' }}>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block border border-slate-300" style={{ backgroundColor: '#86efac' }} />
            <span className="text-slate-600">Dalam selera (≤{threshold})</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: '#ca8a04' }} />
            <span className="text-slate-600">Di atas selera — wajib RTP</span>
          </div>
        </div>
      </div>
    </div>
  )
}
