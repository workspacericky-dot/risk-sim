'use client'

import {
  Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts'
import { JENIS_GAP, LABEL_GAP, WARNA_GAP, type JenisGap } from '@/lib/ca-kepeg/konstanta'

/**
 * Palet mewarisi run_full_analysis.py dan sudah lolos validasi CVD
 * (ΔE terburuk 10,7 deutan). Kontras beberapa warna terhadap latar putih di
 * bawah 3:1, karena itu tiap bagan wajib disertai legenda + tabel padanannya.
 */

const SUMBU = { fontSize: 11, fill: '#64748b' }
const CELAH = { stroke: '#ffffff', strokeWidth: 2 }

function rupiah(n: number): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)
}

function potongNama(nama: string, panjang = 34): string {
  return nama.length > panjang ? `${nama.slice(0, panjang - 1)}…` : nama
}

function tinggiBagan(jumlahBaris: number): number {
  return Math.max(240, jumlahBaris * 26 + 90)
}

const GAYA_TOOLTIP = {
  contentStyle: {
    fontSize: 12,
    borderRadius: 8,
    border: '1px solid #e2e8f0',
    boxShadow: '0 4px 12px rgba(0,0,0,.06)',
  },
} as const

// ── Gap per pegawai ───────────────────────────────────────────────────────

export type BarisBaganGap = { nama: string; total: number } & Record<JenisGap, number>

export function BaganGapPegawai({ data }: { data: BarisBaganGap[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">Tidak ada gap untuk digambarkan.</p>
  }

  const siap = data.map((d) => ({ ...d, label: potongNama(d.nama) }))

  return (
    <ResponsiveContainer width="100%" height={tinggiBagan(siap.length)}>
      <BarChart data={siap} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" tick={SUMBU} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={210}
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          {...GAYA_TOOLTIP}
          formatter={(v, n) => [`${Number(v)} kejadian`, String(n)]}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {JENIS_GAP.map((j, i) => (
          <Bar
            key={j}
            dataKey={j}
            name={`${j} — ${LABEL_GAP[j]}`}
            stackId="gap"
            fill={WARNA_GAP[j]}
            {...CELAH}
            radius={i === JENIS_GAP.length - 1 ? [0, 4, 4, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Rupiah per pegawai ────────────────────────────────────────────────────

export type BarisBaganRupiah = { nama: string; tukin: number; uangMakan: number; total: number }

export function BaganRupiah({ data }: { data: BarisBaganRupiah[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">Tidak ada estimasi rupiah untuk digambarkan.</p>
  }

  const siap = data.map((d) => ({ ...d, label: potongNama(d.nama) }))

  return (
    <ResponsiveContainer width="100%" height={tinggiBagan(siap.length)}>
      <BarChart data={siap} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          type="number"
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => (v >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)} jt` : rupiah(v))}
        />
        <YAxis
          type="category"
          dataKey="label"
          width={210}
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          {...GAYA_TOOLTIP}
          formatter={(v, n) => [`Rp ${rupiah(Number(v))}`, String(n)]}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        <Bar dataKey="tukin" name="Potongan Tunjangan Kinerja" stackId="rp" fill="#2980B9" {...CELAH} />
        <Bar dataKey="uangMakan" name="Potongan Uang Makan" stackId="rp" fill="#E67E22" {...CELAH} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Rekap gap per bulan ───────────────────────────────────────────────────

export type BarisBaganBulan = { namaBulan: string } & Record<JenisGap, number>

export function BaganPerBulan({ data }: { data: BarisBaganBulan[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis
          dataKey="namaBulan"
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: string) => v.slice(0, 3)}
        />
        <YAxis tick={SUMBU} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          {...GAYA_TOOLTIP}
          formatter={(v, n) => [`${Number(v)} kejadian`, String(n)]}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {JENIS_GAP.map((j, i) => (
          <Bar
            key={j}
            dataKey={j}
            name={`${j} — ${LABEL_GAP[j]}`}
            stackId="bulan"
            fill={WARNA_GAP[j]}
            {...CELAH}
            radius={i === JENIS_GAP.length - 1 ? [4, 4, 0, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

// ── Pelanggaran SIKEP per pegawai (tahap 1) ───────────────────────────────

export type BarisBaganSikep = {
  nama: string
  tl: number
  psw: number
  tidakPresensi: number
  tmk: number
  total: number
}

const SERI_SIKEP: Array<[keyof BarisBaganSikep, string, string]> = [
  ['tl', 'Terlambat (TL)', '#E74C3C'],
  ['psw', 'Pulang Cepat (PSW)', '#F39C12'],
  ['tidakPresensi', 'Tidak Presensi (THM/THP)', '#8E44AD'],
  ['tmk', 'Izin Tidak Masuk (TMK)', '#C0392B'],
]

export function BaganSikep({ data }: { data: BarisBaganSikep[] }) {
  if (data.length === 0) {
    return <p className="text-sm text-slate-500 py-8 text-center">Tidak ada pelanggaran pada bulan ini.</p>
  }

  const siap = data.map((d) => ({ ...d, label: potongNama(d.nama) }))

  return (
    <ResponsiveContainer width="100%" height={tinggiBagan(siap.length)}>
      <BarChart data={siap} layout="vertical" margin={{ top: 4, right: 44, bottom: 4, left: 8 }}>
        <CartesianGrid horizontal={false} stroke="#e2e8f0" strokeDasharray="3 3" />
        <XAxis type="number" tick={SUMBU} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={210}
          tick={SUMBU}
          axisLine={false}
          tickLine={false}
          interval={0}
        />
        <Tooltip
          {...GAYA_TOOLTIP}
          formatter={(v, n) => [`${Number(v)} hari`, String(n)]}
          cursor={{ fill: '#f1f5f9' }}
        />
        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
        {SERI_SIKEP.map(([kunci, label, warna], i) => (
          <Bar
            key={kunci}
            dataKey={kunci}
            name={label}
            stackId="sikep"
            fill={warna}
            {...CELAH}
            radius={i === SERI_SIKEP.length - 1 ? [0, 4, 4, 0] : undefined}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}
