'use client'

import React from 'react'
import { AlertTriangle, Building2, ShieldCheck, TrendingUp, X } from 'lucide-react'
import {
  ResponsiveContainer, LineChart, Line
} from 'recharts'

// --- Types ---
type TopSatker = { name: string; level: number; count: number }

type Props = {
  unitCount: number
  riskCount: number
  prioritasCount: number
  rtpCount: number
  topSatker: TopSatker[]
  sehatPercent: number
  latestRiskStatement: string | null
  latestRiskSatker: string | null
  latestRiskScore: number | null
}

// Constant sparkline trend data (simulated weekly alert trend)
const alertTrendData = [
  { v: 2 }, { v: 4 }, { v: 3 }, { v: 7 }, { v: 5 }, { v: 9 }, { v: 7 }, { v: 12 }, { v: 10 }
]

const levelColors = ['#ef4444', '#f97316', '#eab308']
const levelLabels = ['Tinggi', 'Sedang', 'Rendah']

// --- Half-donut gauge ---
function RiskGauge({ percent }: { percent: number }) {
  const r = 60
  const cx = 80
  const cy = 80
  const strokeWidth = 14
  const circumference = Math.PI * r // half circle
  const progress = (percent / 100) * circumference
  const trackColor = '#f1f5f9'
  const fillColor = percent >= 70 ? '#22c55e' : percent >= 40 ? '#eab308' : '#ef4444'

  return (
    <svg width="160" height="90" viewBox="0 0 160 90">
      {/* Track */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={trackColor} strokeWidth={strokeWidth} strokeLinecap="round"
      />
      {/* Progress */}
      <path
        d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
        fill="none" stroke={fillColor} strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={`${progress} ${circumference}`}
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Label */}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill={fillColor} fontFamily="'IBM Plex Serif', serif">
        {percent}%
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600" letterSpacing="1" fontFamily="'DM Mono', monospace">
        RISK HEALTH
      </text>
    </svg>
  )
}

export default function DashboardWidgets({
  unitCount, riskCount, prioritasCount, rtpCount,
  topSatker, sehatPercent,
  latestRiskStatement, latestRiskSatker, latestRiskScore
}: Props) {

  const now = new Date()
  const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
  const today = now.getDate()
  const startOfWeek = today - now.getDay()
  const weekDays = Array.from({ length: 7 }, (_, i) => startOfWeek + i)

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

      {/* ── WIDGET 1: Jadwal & Metrik Periode ─────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Periode Evaluasi</p>
          <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
            {now.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}
          </span>
        </div>

        {/* Mini Calendar */}
        <div>
          <div className="grid grid-cols-7 gap-0 text-center">
            {days.map(d => (
              <div key={d} className="text-[9px] font-bold text-slate-400 uppercase pb-1">{d}</div>
            ))}
            {weekDays.map(day => (
              <div
                key={day}
                className={`text-xs rounded-full w-6 h-6 flex items-center justify-center mx-auto font-semibold transition-all
                  ${day === today
                    ? 'bg-green-500 text-white shadow-md shadow-green-200'
                    : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                {day > 0 ? day : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Key metrics */}
        <div className="border-t border-slate-100 pt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-xs text-slate-500">Satuan Kerja</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{unitCount} instansi</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-slate-500">Total Risiko</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{riskCount} risiko</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5 text-purple-500" />
              <span className="text-xs text-slate-500">Aksi RTP</span>
            </div>
            <span className="text-xs font-bold text-slate-800">{rtpCount} rencana</span>
          </div>
        </div>
      </div>

      {/* ── WIDGET 2: Peringatan Risiko Prioritas ─────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Peringatan Risiko</p>
          <span className="flex items-center gap-1 text-[10px] font-bold text-red-500 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse inline-block"></span>
            Risiko Tinggi
          </span>
        </div>

        {/* Sparkline */}
        <div className="h-16">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={alertTrendData}>
              <Line
                type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: '#ef4444' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Latest risk alert */}
        {latestRiskStatement ? (
          <div className="border border-slate-100 rounded-xl p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="p-1.5 bg-red-100 rounded-lg shrink-0">
              <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{latestRiskStatement}</p>
              <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                <Building2 className="w-3 h-3" />
                {latestRiskSatker || 'Tidak diketahui'} &nbsp;·&nbsp; Skor: <span className="text-red-600 font-bold">{latestRiskScore}</span>
              </p>
            </div>
          </div>
        ) : (
          <div className="border border-dashed border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xs text-slate-400">Tidak ada risiko prioritas aktif</p>
          </div>
        )}

        <div className="mt-auto text-right">
          <span className="text-[11px] text-green-600 font-semibold cursor-pointer hover:underline">
            Lihat semua peringatan →
          </span>
        </div>
      </div>

      {/* ── WIDGET 3: Top Satker Berisiko ─────────────────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Top Satker Berisiko</p>
        </div>

        <div className="flex flex-col gap-2.5 mt-1">
          {topSatker.length > 0 ? topSatker.map((satker, idx) => (
            <div key={satker.name} className="flex items-center gap-3">
              <span className={`text-[11px] font-bold w-5 text-center ${idx === 0 ? 'text-red-500' : idx === 1 ? 'text-orange-400' : 'text-slate-400'}`}>
                #{idx + 1}
              </span>
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: levelColors[idx] || '#94a3b8' }}>
                {satker.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-slate-800 truncate">{satker.name}</p>
                <p className="text-[10px] text-slate-400">Level {satker.level}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-slate-800">{satker.count}</p>
                <p className="text-[9px] text-slate-400 uppercase tracking-wide">risiko</p>
              </div>
            </div>
          )) : (
            <p className="text-xs text-slate-400 py-4 text-center">Belum ada data risiko</p>
          )}
        </div>

        <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[10px] text-slate-400">{prioritasCount} risiko melampaui toleransi</span>
          <span className="text-[11px] text-green-600 font-semibold cursor-pointer hover:underline">Detail →</span>
        </div>
      </div>

      {/* ── WIDGET 4: Indeks Kesehatan Risiko (Gauge) ─────────────── */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Indeks Kesehatan</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sehatPercent >= 70 ? 'text-green-600 bg-green-50 border-green-100' : sehatPercent >= 40 ? 'text-yellow-600 bg-yellow-50 border-yellow-100' : 'text-red-600 bg-red-50 border-red-100'}`}>
            {sehatPercent >= 70 ? '↑ Terkendali' : sehatPercent >= 40 ? '~ Waspada' : '↓ Kritis'}
          </span>
        </div>

        {/* Gauge chart */}
        <div className="flex justify-center mt-1">
          <RiskGauge percent={sehatPercent} />
        </div>

        {/* AI-like summary text */}
        <div className="bg-slate-50 rounded-xl px-3 py-2 mt-1">
          <p className="text-[10px] text-slate-500 leading-relaxed">
            {sehatPercent >= 70
              ? `Sebagian besar risiko di seluruh satuan kerja berada dalam batas toleransi. Dari ${riskCount} risiko tercatat, ${prioritasCount} memerlukan tindak lanjut prioritas.`
              : sehatPercent >= 40
                ? `Terdeteksi tekanan signifikan pada profil risiko. Sebanyak ${prioritasCount} risiko melampaui selera risiko dan memerlukan perhatian segera.`
                : `Status kritis: ${prioritasCount} dari ${riskCount} risiko tercatat berada di atas batas toleransi. Eskalasi tindak lanjut diperlukan.`
            }
          </p>
        </div>
      </div>

    </div>
  )
}
