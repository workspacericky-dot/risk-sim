'use client'

import { useRef, useEffect, useState } from 'react'
import { smapRiskLevel } from '@/lib/smap-data'

type RisikoPoint = {
  id: string
  no_urut: number
  uraian: string
  k: number
  d: number
  score: number
}

type Props = {
  points: RisikoPoint[]
  residualPoints?: RisikoPoint[]
}

// Returns inline border styles for the demarcation line between
// Rendah/Sangat Rendah (score ≤ 4) and Moderat+ (score ≥ 5).
function demarcStyle(k: number, d: number): React.CSSProperties {
  const score = k * d
  if (score >= 5) return {}
  const LINE = '2.5px solid rgba(15, 23, 42, 0.55)'
  const style: React.CSSProperties = {}
  if (d < 5 && k * (d + 1) >= 5) style.borderTop = LINE
  if (k < 5 && (k + 1) * d >= 5) style.borderRight = LINE
  return style
}

const CELLS = 5
const STAR_CLIP = 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'

type Geo = { labelW: number; cellW: number; cellH: number; headH: number }

function trimLine(
  p: { x: number; y: number },
  q: { x: number; y: number },
  s0: number,
  s1: number,
) {
  const dx = q.x - p.x, dy = q.y - p.y
  const len = Math.hypot(dx, dy)
  if (len < 1) return null
  const ux = dx / len, uy = dy / len
  return { x1: p.x + ux * s0, y1: p.y + uy * s0, x2: q.x - ux * s1, y2: q.y - uy * s1 }
}

export default function SmapPetaRisiko({ points, residualPoints = [] }: Props) {
  const tableRef = useRef<HTMLTableElement>(null)
  const [geo, setGeo] = useState<Geo>({ labelW: 80, cellW: 56, cellH: 56, headH: 36 })

  useEffect(() => {
    const measure = () => {
      const tbl = tableRef.current
      if (!tbl) return
      const labelTd = tbl.querySelector<HTMLElement>('tbody td:first-child')
      const dataTd  = tbl.querySelector<HTMLElement>('tbody td:nth-child(2)')
      const thead   = tbl.querySelector<HTMLElement>('thead')
      if (!labelTd || !dataTd || !thead) return
      setGeo({
        labelW: labelTd.offsetWidth,
        cellW:  dataTd.offsetWidth,
        cellH:  dataTd.offsetHeight,
        headH:  thead.offsetHeight,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    if (tableRef.current) ro.observe(tableRef.current)
    return () => ro.disconnect()
  }, [])

  // Build grids
  const grid:  Record<number, Record<number, RisikoPoint[]>> = {}
  const rGrid: Record<number, Record<number, RisikoPoint[]>> = {}
  for (let d = 1; d <= CELLS; d++) {
    grid[d] = {}; rGrid[d] = {}
    for (let k = 1; k <= CELLS; k++) { grid[d][k] = []; rGrid[d][k] = [] }
  }
  points.forEach(p => { if (p.k >= 1 && p.k <= 5 && p.d >= 1 && p.d <= 5) grid[p.d][p.k].push(p) })
  residualPoints.forEach(p => { if (p.k >= 1 && p.k <= 5 && p.d >= 1 && p.d <= 5) rGrid[p.d][p.k].push(p) })

  function cellCenter(k: number, d: number) {
    return {
      x: geo.labelW + (k - 1) * geo.cellW + geo.cellW / 2,
      y: geo.headH  + (CELLS - d) * geo.cellH + geo.cellH / 2,
    }
  }

  const byId = Object.fromEntries(points.map(p => [p.id, p]))
  const arrows = residualPoints
    .map(r => {
      const e = byId[r.id]
      if (!e || (e.k === r.k && e.d === r.d)) return null
      const seg = trimLine(cellCenter(e.k, e.d), cellCenter(r.k, r.d), 12, 14)
      return seg ? { id: r.id, ...seg } : null
    })
    .filter((x): x is { id: string; x1: number; y1: number; x2: number; y2: number } => x !== null)

  const svgW = geo.labelW + CELLS * geo.cellW
  const svgH = geo.headH  + CELLS * geo.cellH

  function cellColor(k: number, d: number) {
    const s = k * d
    if (s >= 15) return 'bg-red-500/20 hover:bg-red-500/30'
    if (s >= 10) return 'bg-orange-400/20 hover:bg-orange-400/30'
    if (s >= 5)  return 'bg-yellow-300/30 hover:bg-yellow-300/40'
    if (s >= 3)  return 'bg-green-400/20 hover:bg-green-400/30'
    return 'bg-blue-300/20 hover:bg-blue-300/30'
  }

  const K_LABELS = ['1\nTdk Terjadi', '2\nKecil', '3\nMungkin', '4\nBesar', '5\nHampir Pasti']
  const D_LABELS = ['1\nSgt Rendah', '2\nRendah', '3\nSedang', '4\nTinggi', '5\nSgt Tinggi']

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-slate-700">Peta Risiko — Status setelah Kontrol Saat Ini (K × D)</h4>

      <div className="flex gap-2">
        {/* Y-axis label */}
        <div className="flex flex-col items-center justify-center w-8 shrink-0">
          <span
            className="text-[10px] font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap"
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            Dampak →
          </span>
        </div>

        <div className="flex-1 overflow-x-auto">
          <div style={{ position: 'relative' }}>
            <table ref={tableRef} className="border-collapse w-full min-w-[420px]">
              <thead>
                <tr>
                  <th className="w-20 text-[10px] text-slate-400 font-normal text-right pr-2 pb-1" />
                  {K_LABELS.map((l, i) => (
                    <th key={i} className="text-center pb-1">
                      <span className="text-[10px] text-slate-500 font-medium leading-tight whitespace-pre-line block">{l}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[5, 4, 3, 2, 1].map(d => (
                  <tr key={d}>
                    <td className="text-right pr-2 text-[10px] text-slate-500 font-medium whitespace-pre-line w-20">
                      {D_LABELS[d - 1]}
                    </td>
                    {[1, 2, 3, 4, 5].map(k => {
                      const cell  = grid[d][k]
                      const rCell = rGrid[d][k]
                      const score = k * d
                      return (
                        <td
                          key={k}
                          className={`border border-slate-200 h-14 w-14 text-center align-middle relative transition-colors ${cellColor(k, d)}`}
                          style={demarcStyle(k, d)}
                          title={`K=${k}, D=${d}, Score=${score}`}
                        >
                          <span className="absolute top-0.5 right-1 text-[9px] text-slate-400/60 font-mono">{score}</span>
                          <div className="flex flex-wrap gap-0.5 justify-center items-center p-1">
                            {cell.map(r => {
                              const lvl = smapRiskLevel(r.score)
                              return (
                                <span
                                  key={r.id}
                                  title={`R${r.no_urut}: ${r.uraian}`}
                                  className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[9px] font-bold cursor-help ${lvl.color} ${lvl.textColor} border ${lvl.borderColor}`}
                                >
                                  {r.no_urut}
                                </span>
                              )
                            })}
                            {rCell.map(r => {
                              const lvl = smapRiskLevel(r.score)
                              return (
                                <span
                                  key={`s${r.id}`}
                                  title={`R${r.no_urut}* (setelah penanganan): ${r.uraian}`}
                                  className={`inline-flex items-center justify-center w-6 h-6 text-[5px] font-bold cursor-help ${lvl.color} ${lvl.textColor}`}
                                  style={{ clipPath: STAR_CLIP }}
                                >
                                  {r.no_urut}*
                                </span>
                              )
                            })}
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {arrows.length > 0 && (
              <svg
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: svgW,
                  height: svgH,
                  pointerEvents: 'none',
                  overflow: 'visible',
                }}
              >
                <defs>
                  <marker id="smap-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L8,3 z" fill="rgba(15,23,42,0.55)" />
                  </marker>
                </defs>
                {arrows.map(a => (
                  <line
                    key={a.id}
                    x1={a.x1} y1={a.y1}
                    x2={a.x2} y2={a.y2}
                    stroke="rgba(15,23,42,0.45)"
                    strokeWidth="1.5"
                    strokeDasharray="5,3"
                    markerEnd="url(#smap-arrow)"
                  />
                ))}
              </svg>
            )}
          </div>
          <p className="text-center text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1.5">Kemungkinan →</p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-600 pt-1">
        {[
          { label: 'Sangat Rendah (1–2)', color: 'bg-blue-400' },
          { label: 'Rendah (3–4)',        color: 'bg-green-500' },
          { label: 'Moderat (5–9)',       color: 'bg-yellow-400' },
          { label: 'Tinggi (10–12)',      color: 'bg-orange-500' },
          { label: 'Ekstrim (15–25)',     color: 'bg-red-600' },
        ].map(l => (
          <span key={l.label} className="flex items-center gap-1.5">
            <span className={`w-3 h-3 rounded-full ${l.color} inline-block shrink-0`} />
            {l.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 ml-2">
          <span className="inline-block w-8 h-0 shrink-0" style={{ borderTop: '2.5px solid rgba(15,23,42,0.55)' }} />
          Batas Rendah / Moderat
        </span>
        {residualPoints.length > 0 && (
          <>
            <span className="flex items-center gap-1.5 ml-2">
              <span
                className="inline-flex w-4 h-4 bg-slate-500 shrink-0"
                style={{ clipPath: STAR_CLIP }}
              />
              Setelah Penanganan
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="28" height="10" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
                <line x1="2" y1="5" x2="20" y2="5" stroke="rgba(15,23,42,0.45)" strokeWidth="1.5" strokeDasharray="4,2" />
                <path d="M19,2 L27,5 L19,8 z" fill="rgba(15,23,42,0.55)" />
              </svg>
              Arah penanganan
            </span>
          </>
        )}
      </div>

      {/* Risk index */}
      {points.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-1">
          {points.map(r => {
            const lvl      = smapRiskLevel(r.score)
            const residual = residualPoints.find(rp => rp.id === r.id)
            const rLvl     = residual ? smapRiskLevel(residual.score) : null
            return (
              <div key={r.id} className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-2">
                <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${lvl.color} ${lvl.textColor}`}>
                  {r.no_urut}
                </span>
                <div className="min-w-0">
                  <p className="text-[10px] text-slate-700 line-clamp-2 leading-relaxed">{r.uraian}</p>
                  <div className="flex flex-wrap items-center gap-1 mt-0.5">
                    <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${lvl.color} ${lvl.textColor}`}>
                      {r.score} – {lvl.label}
                    </span>
                    {rLvl && (
                      <>
                        <span className="text-[9px] text-slate-400">→</span>
                        <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.5 rounded ${rLvl.color} ${rLvl.textColor}`}>
                          {residual!.score} – {rLvl.label}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
