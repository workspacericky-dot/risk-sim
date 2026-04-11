'use client'

// Matrix lookup: RISK_MATRIX[kemungkinan][dampak] → besaran (1–25)
const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

function getCellColor(kemungkinan: number, dampak: number): string {
  const score = RISK_MATRIX[kemungkinan]?.[dampak] ?? 0
  if (score >= 20) return '#b91c1c'  // red-700
  if (score >= 16) return '#ea580c'  // orange-600
  if (score >= 11) return '#ca8a04'  // yellow-600
  if (score >= 6)  return '#16a34a'  // green-600
  return '#0891b2'                   // cyan-600
}

function getCellScore(kemungkinan: number, dampak: number): number {
  return RISK_MATRIX[kemungkinan]?.[dampak] ?? 0
}

function getCellTextColor(kemungkinan: number, dampak: number): string {
  const score = RISK_MATRIX[kemungkinan]?.[dampak] ?? 0
  if (score >= 11) return 'rgba(255,255,255,0.85)'
  return 'rgba(255,255,255,0.9)'
}

export type RiskPoint = {
  id: string
  label: string        // short label shown in circle (e.g. "1", "R-01")
  kemungkinan: number  // 1–5 (y-axis)
  dampak: number       // 1–5 (x-axis)
  pernyataan?: string  // tooltip
}

const K_LABELS: Record<number, string> = {
  5: 'Hampir pasti terjadi',
  4: 'Kemungkinan besar terjadi',
  3: 'Mungkin terjadi',
  2: 'Kemungkinan kecil terjadi',
  1: 'Kemungkinan tidak terjadi',
}

const D_LABELS: Record<number, string> = {
  1: 'Sangat Rendah',
  2: 'Rendah',
  3: 'Sedang',
  4: 'Tinggi',
  5: 'Sangat Tinggi',
}

export function RiskMatrix({ risks }: { risks: RiskPoint[] }) {
  return (
    <div className="w-full overflow-x-auto">
      <div style={{ minWidth: 560 }}>

        {/* Header row: Tingkat Dampak label + column headers */}
        <div className="flex">
          {/* Corner + y-axis space */}
          <div style={{ width: 148 }} className="shrink-0" />
          {/* Column headers */}
          {[1, 2, 3, 4, 5].map((d) => (
            <div
              key={d}
              className="flex-1 text-center pb-2 text-[11px] leading-tight font-medium text-slate-600"
            >
              <div className="font-bold text-slate-400 text-[10px]">{d}</div>
              <div>{D_LABELS[d]}</div>
            </div>
          ))}
        </div>

        {/* Matrix rows (kemungkinan 5 → 1, top to bottom) */}
        {[5, 4, 3, 2, 1].map((k) => (
          <div key={k} className="flex">
            {/* Row label */}
            <div
              style={{ width: 148 }}
              className="shrink-0 flex items-center justify-end pr-3 text-right text-[10px] text-slate-600 leading-tight py-1"
            >
              <div>
                <span className="block font-bold text-slate-400">{k}</span>
                <span>{K_LABELS[k]}</span>
              </div>
            </div>

            {/* Cells */}
            {[1, 2, 3, 4, 5].map((d) => {
              const cellRisks = risks.filter(
                (r) => r.kemungkinan === k && r.dampak === d
              )
              const score = getCellScore(k, d)
              const bg = getCellColor(k, d)
              const textCol = getCellTextColor(k, d)

              return (
                <div
                  key={d}
                  className="flex-1 border border-white/30 relative flex flex-wrap items-center justify-center gap-1 p-1"
                  style={{
                    backgroundColor: bg,
                    minHeight: 72,
                  }}
                  title={`Kemungkinan ${k} × Dampak ${d} = ${score}`}
                >
                  {/* Score label in corner */}
                  <span
                    className="absolute top-1 left-1.5 text-[9px] font-bold select-none"
                    style={{ color: textCol }}
                  >
                    {score}
                  </span>

                  {/* Risk circles */}
                  {cellRisks.map((r) => (
                    <div
                      key={r.id}
                      className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-800 shadow-md cursor-default select-none z-10 border-2 border-white/80"
                      title={r.pernyataan ?? r.label}
                    >
                      {r.label}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}

        {/* X-axis label */}
        <div className="flex mt-1">
          <div style={{ width: 148 }} className="shrink-0" />
          <div className="flex-1 text-center text-[11px] font-semibold text-slate-500 mt-1">
            ← Tingkat Dampak →
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-3 flex-wrap mt-3 justify-center text-[10px]">
          {[
            { label: 'Sangat Rendah', color: '#0891b2' },
            { label: 'Rendah',        color: '#16a34a' },
            { label: 'Moderat',       color: '#ca8a04' },
            { label: 'Tinggi',        color: '#ea580c' },
            { label: 'Sangat Tinggi', color: '#b91c1c' },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="w-3 h-3 rounded-sm inline-block"
                style={{ backgroundColor: color }}
              />
              <span className="text-slate-600">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
