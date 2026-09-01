'use client'

import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fmtPersen } from '@/lib/ca-laporan-keuangan/format'
import type { BarisRasio, KelompokRasio } from '@/lib/ca-laporan-keuangan/rasio'

const KELOMPOK: KelompokRasio[] = ['Horizontal', 'Vertikal', 'Realisasi Anggaran', 'Likuiditas & Efisiensi']

const KETERANGAN: Record<KelompokRasio, string> = {
  Horizontal: 'Pertumbuhan tiap pos utama dibanding tahun lalu.',
  Vertikal: 'Proporsi tiap jenis beban terhadap total beban tahun berjalan.',
  'Realisasi Anggaran': 'Serapan realisasi terhadap pagu masing-masing jenis belanja.',
  'Likuiditas & Efisiensi': 'Rasio bernilai "—" berarti tidak terdefinisi (penyebut nol), bukan nilai buruk.',
}

export default function TabRasioTren({ rasio }: { rasio: BarisRasio[] }) {
  const realisasi = rasio.filter((r) => r.kelompok === 'Realisasi Anggaran' && r.nilai !== null)

  return (
    <div className="space-y-6">
      {realisasi.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-1">Realisasi terhadap Pagu</h3>
          <p className="text-xs text-slate-500 mb-4">
            Garis 100% menandai batas pagu — batang di atasnya berarti realisasi melampaui anggaran.
          </p>
          <ResponsiveContainer width="100%" height={Math.max(180, realisasi.length * 46)}>
            <BarChart data={realisasi} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" domain={[0, 'dataMax']} tick={{ fontSize: 11 }} unit="%" />
              <YAxis
                type="category"
                dataKey="nama"
                width={230}
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.replace(' (realisasi / pagu)', '')}
              />
              <Tooltip
                formatter={(v) => [fmtPersen(typeof v === 'number' ? v : null), 'Realisasi']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine x={100} stroke="#dc2626" strokeDasharray="4 4" />
              <Bar dataKey="nilai" radius={[0, 4, 4, 0]}>
                {realisasi.map((r, i) => (
                  <Cell key={i} fill={(r.nilai ?? 0) > 100 ? '#f97316' : '#0ea5e9'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {KELOMPOK.map((k) => {
        const baris = rasio.filter((r) => r.kelompok === k)
        if (baris.length === 0) return null
        return (
          <div key={k}>
            <h3 className="text-sm font-semibold text-slate-800">{k}</h3>
            <p className="text-xs text-slate-500 mb-2">{KETERANGAN[k]}</p>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Rasio / Pos</th>
                    <th className="text-right font-semibold px-3 py-2 w-32">Nilai</th>
                    <th className="text-left font-semibold px-3 py-2 w-64">Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((r, i) => (
                    <tr key={`${r.nama}-${i}`} className={`border-t border-slate-100 ${r.nilai === null ? 'bg-sky-50/50' : ''}`}>
                      <td className="px-3 py-1.5 text-slate-800">{r.nama}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmtPersen(r.nilai)}</td>
                      <td className="px-3 py-1.5 text-xs text-slate-500">{r.catatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}
    </div>
  )
}
