'use client'

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { JENIS_PERKARA } from '@/lib/ca-keuangan-perkara/konstanta'
import type { MatriksRingkasan } from '@/lib/ca-keuangan-perkara/analisis-saldo'

/**
 * Palet kategorikal tervalidasi (urutan tetap, tidak diacak) — 7 dari 8 slot
 * lolos gate CVD pasangan-bersebelahan pada mode terang & gelap.
 */
export const WARNA_JENIS: Record<string, string> = {
  Gugatan: '#2a78d6',
  Permohonan: '#eb6834',
  GS: '#1baf7a',
  Banding: '#eda100',
  Kasasi: '#e87ba4',
  PK: '#008300',
  Eksekusi: '#4a3aa7',
}

const SUMBU = { fontSize: 11, fill: '#64748b' }

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
}

const GAYA_TOOLTIP = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,.06)',
  },
} as const

export function BaganMatriks({ matriks }: { matriks: MatriksRingkasan }) {
  if (matriks.tahunList.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">Tidak ada data untuk digambarkan.</p>
  }

  const data = matriks.tahunList.map((tahun) => ({
    tahun: String(tahun),
    ...Object.fromEntries(matriks.jenisList.map((j) => [j, matriks.sel[tahun][j]])),
  }))

  return (
    <ResponsiveContainer width="100%" height={320}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 8 }} barGap={2}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis dataKey="tahun" tick={SUMBU} axisLine={false} tickLine={false} />
        <YAxis
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={rupiah}
        />
        <Tooltip {...GAYA_TOOLTIP} formatter={(v) => [`Rp ${rupiah(Number(v))}`, '']} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {JENIS_PERKARA.map((j) => (
          <Bar key={j} dataKey={j} name={j} fill={WARNA_JENIS[j]} radius={[4, 4, 0, 0]} maxBarSize={24} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
