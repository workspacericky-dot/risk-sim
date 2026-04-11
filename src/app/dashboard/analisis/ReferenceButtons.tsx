'use client'

import { useState } from 'react'
import { X, Grid3x3, Table2 } from 'lucide-react'

// ── Risk Matrix 5x5 lookup [kemungkinan][dampak] ──────────────────────────
// Exactly as per Lampiran 3 / Gambar 2
const MATRIX_LOOKUP: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

// Color by besaran risiko
function getCellStyle(besaran: number) {
  if (besaran >= 20) return { bg: '#ef4444', text: 'white' }  // red-500
  if (besaran >= 16) return { bg: '#f97316', text: 'white' }  // orange-500
  if (besaran >= 11) return { bg: '#eab308', text: '#1e293b' } // yellow-500
  if (besaran >= 6)  return { bg: '#22c55e', text: 'white' }  // green-500
  return { bg: '#3b82f6', text: 'white' }                     // blue-500
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

const CONVERSION_ROWS = [
  { status: 'Sangat Tinggi', level: 5, range: '20 s.d 25', warna: 'Merah',        bg: '#ef4444', text: 'white' },
  { status: 'Tinggi',        level: 4, range: '16 s.d 19', warna: 'Orange',       bg: '#f97316', text: 'white' },
  { status: 'Moderat',       level: 3, range: '11 s.d 15', warna: 'Kuning',       bg: '#eab308', text: '#1e293b' },
  { status: 'Rendah',        level: 2, range: '6 s.d 10',  warna: 'Hijau',        bg: '#22c55e', text: 'white' },
  { status: 'Sangat Rendah', level: 1, range: '1 s.d 5',   warna: 'Biru',         bg: '#3b82f6', text: 'white' },
]

function MatrixModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div>
            <h3 className="font-serif font-bold text-slate-800 text-lg">Matriks Analisis Risiko 5 × 5</h3>
            <p className="text-xs text-slate-500 mt-0.5">Lampiran 3 — Matriks Besaran Risiko</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto">
          <table className="w-full border-collapse text-xs" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="border border-slate-300 bg-slate-100 px-2 py-2 text-center text-slate-600" colSpan={2} rowSpan={2}>
                  <span className="text-[10px] leading-tight">Matriks Analisis<br/>Risiko 5 x 5</span>
                </th>
                <th className="border border-slate-300 bg-slate-50 text-center font-semibold text-slate-700 py-2 px-2" colSpan={5}>
                  Tingkat Dampak
                </th>
              </tr>
              <tr>
                {[1, 2, 3, 4, 5].map(d => (
                  <th key={d} className="border border-slate-300 bg-slate-50 px-2 py-2 text-center">
                    <div className="font-bold text-slate-700">{d}</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">{D_LABELS[d]}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[5, 4, 3, 2, 1].map((k, kIdx) => (
                <tr key={k}>
                  {kIdx === 0 && (
                    <td
                      className="border border-slate-300 bg-slate-100 text-center text-[9px] font-semibold text-slate-600"
                      rowSpan={5}
                      style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', padding: '12px 6px', minWidth: 28 }}
                    >
                      Tingkat Kemungkinan
                    </td>
                  )}
                  <td className="border border-slate-300 bg-slate-50 px-2 py-2 text-center min-w-[80px]">
                    <div className="font-bold text-slate-700">{k}</div>
                    <div className="text-[9px] text-slate-400 leading-tight mt-0.5">{K_LABELS[k]}</div>
                  </td>
                  {[1, 2, 3, 4, 5].map(d => {
                    const besaran = MATRIX_LOOKUP[k][d]
                    const { bg, text } = getCellStyle(besaran)
                    return (
                      <td
                        key={d}
                        className="border border-slate-300 text-center font-bold text-base py-3"
                        style={{ backgroundColor: bg, color: text, minWidth: 56 }}
                      >
                        {besaran}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>

          {/* Legend */}
          <div className="mt-4 flex flex-wrap gap-2">
            {CONVERSION_ROWS.map(row => (
              <div key={row.level} className="flex items-center gap-1.5 text-xs">
                <div className="w-4 h-4 rounded" style={{ backgroundColor: row.bg }} />
                <span className="text-slate-600">{row.warna} ({row.range}): {row.status}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function ConversionModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b bg-slate-50">
          <div>
            <h3 className="font-serif font-bold text-slate-800 text-lg">Tabel Konversi Level Risiko</h3>
            <p className="text-xs text-slate-500 mt-0.5">Konversi Besaran Risiko → Level (1–5)</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors p-1.5 rounded-lg hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 px-4 py-2.5 text-left font-semibold text-slate-700">Status Risiko</th>
                <th className="border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700">Level Risiko</th>
                <th className="border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700">Besaran Risiko</th>
                <th className="border border-slate-300 px-4 py-2.5 text-center font-semibold text-slate-700">Warna</th>
              </tr>
            </thead>
            <tbody>
              {CONVERSION_ROWS.map(row => (
                <tr key={row.level}>
                  <td
                    className="border border-slate-300 px-4 py-3 text-center font-bold text-base"
                    style={{ backgroundColor: row.bg, color: row.text }}
                  >
                    {row.status}
                  </td>
                  <td className="border border-slate-300 px-4 py-3 text-center font-semibold text-slate-700">{row.level}</td>
                  <td className="border border-slate-300 px-4 py-3 text-center text-slate-700">{row.range}</td>
                  <td className="border border-slate-300 px-4 py-3 text-center">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-4 h-4 rounded" style={{ backgroundColor: row.bg }} />
                      <span className="text-slate-600">{row.warna}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ReferenceButtons() {
  const [showMatrix, setShowMatrix] = useState(false)
  const [showConversion, setShowConversion] = useState(false)

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowMatrix(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors shadow-sm"
        >
          <Grid3x3 className="w-3.5 h-3.5" />
          Matriks Risiko
        </button>
        <button
          onClick={() => setShowConversion(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-medium transition-colors shadow-sm"
        >
          <Table2 className="w-3.5 h-3.5" />
          Tabel Konversi
        </button>
      </div>

      {showMatrix && <MatrixModal onClose={() => setShowMatrix(false)} />}
      {showConversion && <ConversionModal onClose={() => setShowConversion(false)} />}
    </>
  )
}
