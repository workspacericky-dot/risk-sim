'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  CartesianGrid, Legend, PieChart, Pie,
} from 'recharts'
import { Building2, ShieldCheck, TrendingUp, ChevronLeft, Search, ArrowUpRight } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Unit       = { id: string; nama_unit: string }
type RisikoRow  = { id: string; kode_risiko: string|null; pernyataan_risiko: string; kategori_risiko: string|null; konteks_id: string; created_at: string }
type AnalisisRow = { risiko_id: string; level_kemungkinan: number; level_dampak: number; residual_kemungkinan: number|null; residual_dampak: number|null; di_atas_selera_risiko: boolean }
type KonteksRow = { id: string; unit_kerja_id: string; tahun_penerapan: number }
type UnitRow    = { id: string; nama_unit: string }
type SeleraRow  = { konteks_id: string; strategis?: number; kebijakan?: number; kecurangan?: number; bencana?: number; kepatuhan?: number; operasional?: number; kemitraan?: number }

function getCategoryThreshold(kategoriRisiko: string|null, selera: SeleraRow|undefined): number|null {
  if (!selera || !kategoriRisiko) return null
  const k = kategoriRisiko.toLowerCase()
  if (k.includes('strategis'))                          return selera.strategis ?? null
  if (k.includes('kebijakan'))                          return selera.kebijakan ?? null
  if (k.includes('kecurangan') || k.includes('fraud'))  return selera.kecurangan ?? null
  if (k.includes('bencana'))                            return selera.bencana ?? null
  if (k.includes('kepatuhan'))                          return selera.kepatuhan ?? null
  if (k.includes('operasional'))                        return selera.operasional ?? null
  if (k.includes('kemitraan'))                          return selera.kemitraan ?? null
  return null
}

// ─── Constants ────────────────────────────────────────────────────────────────
const MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}
function besaran(k: number, d: number): number | null { return MATRIX[k]?.[d] ?? null }
function levelFromBesaran(b: number): number { return b>=20?5:b>=16?4:b>=11?3:b>=6?2:1 }
function levelLabel(l: number): string { return ['','Sangat Rendah','Rendah','Moderat','Tinggi','Sangat Tinggi'][l]||'–' }
function scoreColor(b: number): string { return b>=20?'#ef4444':b>=16?'#f97316':b>=11?'#eab308':b>=6?'#22c55e':'#3b82f6' }

// ─── Card wrapper ─────────────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/60 shadow-sm flex flex-col ${className}`}
      style={{ background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(12px)' }}
    >
      {children}
    </div>
  )
}

// ─── Half-donut gauge ─────────────────────────────────────────────────────────
function RiskGauge({ percent }: { percent: number }) {
  const r = 60, cx = 80, cy = 76, sw = 14
  const circ = Math.PI * r
  const prog = (percent / 100) * circ
  const color = percent >= 70 ? '#22c55e' : percent >= 40 ? '#eab308' : '#ef4444'
  return (
    <svg width="160" height="86" viewBox="0 0 160 86">
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke="#e2e8f0" strokeWidth={sw} strokeLinecap="round" />
      <path d={`M${cx-r} ${cy} A${r} ${r} 0 0 1 ${cx+r} ${cy}`}
        fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
        strokeDasharray={`${prog} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s ease' }}
      />
      <text x={cx} y={cy-10} textAnchor="middle" fontSize="22" fontWeight="700" fill={color} fontFamily="'IBM Plex Serif',serif">{percent}%</text>
      <text x={cx} y={cy+4} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="600" letterSpacing="1" fontFamily="'DM Mono',monospace">RISK HEALTH</text>
    </svg>
  )
}

// ─── Satker filter dropdown ───────────────────────────────────────────────────
function SatkerFilter({ units, selectedId, onChange }: {
  units: Unit[]; selectedId: string|null; onChange: (id: string|null) => void
}) {
  const [open, setOpen]   = useState(false)
  const [q, setQ]         = useState('')
  const ref               = useRef<HTMLDivElement>(null)
  const filtered          = units.filter(u => u.nama_unit.toLowerCase().includes(q.toLowerCase()))
  const selectedName      = units.find(u => u.id === selectedId)?.nama_unit ?? 'Mahkamah Agung (Semua)'

  useEffect(() => {
    function handle(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/70 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:shadow-md"
        style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(8px)' }}
      >
        <Building2 className="w-4 h-4 text-blue-500" />
        <span className="max-w-[220px] truncate">{selectedName}</span>
        <ChevronLeft className={`w-3.5 h-3.5 transition-transform text-slate-400 ${open ? '-rotate-90' : 'rotate-90'}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-50 w-72 rounded-xl border border-slate-200 shadow-xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(16px)' }}>
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-1.5">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input autoFocus value={q} onChange={e => setQ(e.target.value)}
                placeholder="Cari satker…" className="flex-1 bg-transparent text-xs outline-none text-slate-700" />
            </div>
          </div>
          {/* All option */}
          <button onClick={() => { onChange(null); setOpen(false); setQ('') }}
            className={`w-full text-left px-4 py-2.5 text-xs border-b border-slate-100 transition-colors font-semibold ${!selectedId ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}>
            🏛 Mahkamah Agung (Semua)
          </button>
          {/* Units */}
          <div className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-4">Tidak ada hasil</p>
            ) : filtered.map(u => (
              <button key={u.id} onClick={() => { onChange(u.id); setOpen(false); setQ('') }}
                className={`w-full text-left px-4 py-2.5 text-xs border-b border-slate-100 last:border-0 transition-colors ${selectedId===u.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'}`}>
                {u.nama_unit}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Risk Register chart ──────────────────────────────────────────────────────
type RiskItem = {
  id: string; kode_risiko: string|null; pernyataan_risiko: string
  kategori_risiko: string|null; konteks_id: string
  inherentBesaran: number|null; residualBesaran: number|null; isPriority: boolean
}

function RiskRegisterChart({ risks, konteksId }: { risks: RiskItem[]; konteksId: string|null }) {
  const [mode, setMode] = useState<'inherent'|'residual'>('residual')
  const [drillCat, setDrillCat] = useState<string|null>(null)

  // Category view: avg score per category
  const categoryData = useMemo(() => {
    const groups: Record<string, number[]> = {}
    for (const r of risks) {
      const score = mode === 'inherent' ? r.inherentBesaran : r.residualBesaran
      if (score == null) continue
      const cat = (r.kategori_risiko || 'Tidak Dikategorikan').replace('Risiko ', '')
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(score)
    }
    return Object.entries(groups).map(([cat, scores]) => ({
      name: cat,
      fullName: cat,
      score: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length*10)/10,
      count: scores.length,
    })).sort((a,b) => b.score - a.score)
  }, [risks, mode])

  // Drilled view: individual risks in selected category
  const drillData = useMemo(() => {
    if (!drillCat) return []
    const fullCat = `Risiko ${drillCat}`
    return risks
      .filter(r => (r.kategori_risiko === fullCat || r.kategori_risiko === drillCat) )
      .map(r => ({
        name: r.kode_risiko || r.id.slice(0,8),
        fullName: r.pernyataan_risiko,
        score: (mode === 'inherent' ? r.inherentBesaran : r.residualBesaran) ?? 0,
      }))
      .filter(r => r.score > 0)
      .sort((a,b) => b.score - a.score)
  }, [risks, drillCat, mode])

  const chartData   = drillCat ? drillData : categoryData
  const hasData     = chartData.length > 0
  const barH        = Math.max(240, chartData.length * 36)

  return (
    <div className="flex flex-col gap-3 flex-1">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          {drillCat && (
            <button onClick={() => setDrillCat(null)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold transition-colors">
              <ChevronLeft className="w-3 h-3" /> Semua Kategori
            </button>
          )}
          {drillCat && <span className="text-[10px] text-slate-500 font-semibold truncate max-w-[140px]">↳ {drillCat}</span>}
        </div>
        {/* Mode switch */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
          {(['inherent','residual'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${mode===m ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              {m === 'inherent' ? 'Inherent' : 'Residual'}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {!hasData ? (
        <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">Belum ada data analisis risiko</div>
      ) : (
        <div style={{ height: barH }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 32, left: 4, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} domain={[0,25]} />
              <YAxis
                type="category" dataKey="name" width={110}
                tick={(props: any) => {
                  const { x, y, payload } = props
                  const label = (payload.value as string).length > 16
                    ? (payload.value as string).slice(0,16) + '…'
                    : payload.value
                  const clickable = !drillCat
                  return (
                    <g transform={`translate(${x},${y})`}
                      onClick={() => clickable && setDrillCat(payload.value)}
                      style={{ cursor: clickable ? 'pointer' : 'default' }}>
                      <text x={-6} y={0} dy="0.35em" textAnchor="end"
                        fill={clickable ? '#4f46e5' : '#64748b'}
                        fontSize={10} fontWeight={clickable ? 600 : 400}
                        style={{ textDecoration: clickable ? 'underline' : 'none' }}>
                        {label}
                      </text>
                    </g>
                  )
                }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '11px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                formatter={(value: any, _: any, entry: any) => [
                  `${value} (${levelLabel(levelFromBesaran(Number(value)))})`,
                  drillCat ? entry.payload.fullName : 'Rata-rata skor',
                ]}
                cursor={{ fill: 'rgba(99,102,241,0.05)' }}
              />
              <Bar dataKey="score" radius={[0,4,4,0]} maxBarSize={22}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={scoreColor(entry.score)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {!drillCat && hasData && (
        <p className="text-[10px] text-indigo-400 italic">Klik nama kategori untuk melihat risiko per-kategori</p>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ExecutiveDashboard({ units }: { units: Unit[] }) {
  const [selectedUnitId, setSelectedUnitId] = useState<string|null>(null)
  const [loading, setLoading] = useState(true)

  const [allRisiko,   setAllRisiko]   = useState<RisikoRow[]>([])
  const [allAnalisis, setAllAnalisis] = useState<AnalisisRow[]>([])
  const [allKonteks,  setAllKonteks]  = useState<KonteksRow[]>([])
  const [allUnits,    setAllUnits]    = useState<UnitRow[]>([])
  const [pkaIds,      setPkaIds]      = useState<Set<string>>(new Set())
  const [seleraMap,   setSeleraMap]   = useState<Map<string, SeleraRow>>(new Map())

  // Fetch everything once on mount
  useEffect(() => {
    async function load() {
      setLoading(true)
      const sb = createClient()
      const [r, a, k, u, p, s] = await Promise.all([
        sb.from('risiko').select('id,kode_risiko,pernyataan_risiko,kategori_risiko,konteks_id,created_at'),
        sb.from('analisis_risiko').select('risiko_id,level_kemungkinan,level_dampak,residual_kemungkinan,residual_dampak,di_atas_selera_risiko'),
        sb.from('penetapan_konteks').select('id,unit_kerja_id,tahun_penerapan'),
        sb.from('unit_kerja').select('id,nama_unit'),
        sb.from('program_kerja_audit').select('risiko_id'),
        sb.from('selera_risiko_kategori').select('konteks_id,strategis,kebijakan,kecurangan,bencana,kepatuhan,operasional,kemitraan'),
      ])
      setAllRisiko(r.data ?? [])
      setAllAnalisis(a.data ?? [])
      setAllKonteks(k.data ?? [])
      setAllUnits(u.data ?? [])
      setPkaIds(new Set((p.data ?? []).map((x:any) => x.risiko_id)))
      const sm = new Map<string, SeleraRow>()
      for (const row of (s.data ?? [])) sm.set(row.konteks_id, row)
      setSeleraMap(sm)
      setLoading(false)
    }
    load()
  }, [])

  // ── Derived: lookup maps ───────────────────────────────────────────────────
  const analisisMap = useMemo(() => {
    const m = new Map<string, AnalisisRow>()
    allAnalisis.forEach(a => m.set(a.risiko_id, a))
    return m
  }, [allAnalisis])

  const konteksMap = useMemo(() => {
    const m = new Map<string, KonteksRow>()
    allKonteks.forEach(k => m.set(k.id, k))
    return m
  }, [allKonteks])

  const unitMap = useMemo(() => {
    const m = new Map<string, UnitRow>()
    allUnits.forEach(u => m.set(u.id, u))
    return m
  }, [allUnits])

  // ── Derived: filtered konteks IDs for selected unit ────────────────────────
  const filteredKonteksIds = useMemo(() => {
    if (!selectedUnitId) return null // null = all
    return new Set(allKonteks.filter(k => k.unit_kerja_id === selectedUnitId).map(k => k.id))
  }, [selectedUnitId, allKonteks])

  // Latest konteks for selected unit (for navigation links)
  const selectedKonteksId = useMemo(() => {
    if (!selectedUnitId) return null
    return allKonteks
      .filter(k => k.unit_kerja_id === selectedUnitId)
      .sort((a,b) => b.tahun_penerapan - a.tahun_penerapan)[0]?.id ?? null
  }, [selectedUnitId, allKonteks])

  // ── Derived: filtered risks with computed scores ───────────────────────────
  const riskData = useMemo((): RiskItem[] => {
    const filtered = filteredKonteksIds
      ? allRisiko.filter(r => filteredKonteksIds.has(r.konteks_id))
      : allRisiko
    return filtered.map(r => {
      const a = analisisMap.get(r.id)
      const inh = a ? besaran(a.level_kemungkinan, a.level_dampak) : null
      const res = (a?.residual_kemungkinan && a?.residual_dampak)
        ? besaran(a.residual_kemungkinan, a.residual_dampak) : null
      // Priority: dynamic check against per-category selera, fallback to stored flag
      let isPriority = false
      if (a && res !== null) {
        const selera = seleraMap.get(r.konteks_id)
        const threshold = getCategoryThreshold(r.kategori_risiko, selera)
        isPriority = threshold !== null ? res > threshold : (a.di_atas_selera_risiko ?? false)
      }
      return { ...r, inherentBesaran: inh, residualBesaran: res, isPriority }
    })
  }, [filteredKonteksIds, allRisiko, analisisMap, seleraMap])

  // ── Derived: distribution (residual) ──────────────────────────────────────
  const distributionData = useMemo(() => {
    const counts = [0,0,0,0,0] // index = level-1
    for (const r of riskData) {
      if (r.residualBesaran == null) continue
      const l = levelFromBesaran(r.residualBesaran)
      counts[l-1]++
    }
    return [
      { name: 'Sangat Tinggi', value: counts[4], fill: '#ef4444' },
      { name: 'Tinggi',        value: counts[3], fill: '#f97316' },
      { name: 'Moderat',       value: counts[2], fill: '#eab308' },
      { name: 'Rendah',        value: counts[1], fill: '#22c55e' },
      { name: 'Sangat Rendah', value: counts[0], fill: '#3b82f6' },
    ].filter(d => d.value > 0)
  }, [riskData])

  // ── Derived: indeks kesehatan ──────────────────────────────────────────────
  const healthData = useMemo(() => {
    const priority = riskData.filter(r => r.isPriority)
    const handled  = priority.filter(r => pkaIds.has(r.id)).length
    const pct      = priority.length > 0 ? Math.round((handled / priority.length) * 100) : 100
    return { percent: pct, priorityCount: priority.length, handledCount: handled, total: riskData.length }
  }, [riskData, pkaIds])

  // ── Derived: trend (cumulative, last 6 months) ─────────────────────────────
  const trendData = useMemo(() => {
    const now = new Date()
    const filtered = filteredKonteksIds
      ? allRisiko.filter(r => filteredKonteksIds.has(r.konteks_id))
      : allRisiko
    return Array.from({ length: 6 }, (_, i) => {
      const d        = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const endMonth = new Date(d.getFullYear(), d.getMonth()+1, 0, 23, 59, 59)
      const label    = d.toLocaleString('id-ID', { month: 'short', year: '2-digit' })
      const count    = filtered.filter(r => new Date(r.created_at) <= endMonth).length
      return { bulan: label, Risiko: count }
    })
  }, [filteredKonteksIds, allRisiko])

  // ── Derived: top list ──────────────────────────────────────────────────────
  const topList = useMemo(() => {
    if (!selectedUnitId) {
      // Rank satker by sum of residual besaran of their priority risks
      const stats: Record<string, { name: string; score: number; count: number; konteksId: string|null }> = {}
      for (const r of allRisiko) {
        const a = analisisMap.get(r.id)
        if (!a) continue
        const resBesaran = (a.residual_kemungkinan && a.residual_dampak) ? besaran(a.residual_kemungkinan, a.residual_dampak) : null
        const selera = seleraMap.get(r.konteks_id)
        const threshold = getCategoryThreshold(r.kategori_risiko, selera)
        const isPriority = resBesaran !== null && threshold !== null ? resBesaran > threshold : (a.di_atas_selera_risiko ?? false)
        if (!isPriority) continue
        const k = konteksMap.get(r.konteks_id)
        if (!k) continue
        const u = unitMap.get(k.unit_kerja_id)
        if (!u) continue
        const scoreVal = resBesaran ?? 0
        if (!stats[u.id]) {
          const latestKonteks = allKonteks
            .filter(k2 => k2.unit_kerja_id === u.id)
            .sort((a2,b2) => b2.tahun_penerapan - a2.tahun_penerapan)[0]
          stats[u.id] = { name: u.nama_unit, score: 0, count: 0, konteksId: latestKonteks?.id ?? null }
        }
        stats[u.id].score += scoreVal
        stats[u.id].count++
      }
      return Object.values(stats).sort((a,b) => b.score - a.score).slice(0,5).map(s => ({
        isSatker: true, name: s.name, score: s.score, count: s.count,
        label: `Skor total prioritas: ${s.score}`,
        link: s.konteksId ? `/dashboard/evaluasi?konteks=${s.konteksId}` : '/dashboard/evaluasi',
      }))
    } else {
      // Rank priority risks for this satker
      return riskData
        .filter(r => r.isPriority)
        .sort((a,b) => (b.residualBesaran??0) - (a.residualBesaran??0))
        .slice(0,5)
        .map(r => ({
          isSatker: false, name: r.kode_risiko || r.id.slice(0,8),
          score: r.residualBesaran ?? 0, count: 1,
          label: r.pernyataan_risiko,
          link: selectedKonteksId ? `/dashboard/evaluasi?konteks=${selectedKonteksId}` : '/dashboard/evaluasi',
        }))
    }
  }, [selectedUnitId, allRisiko, allKonteks, analisisMap, konteksMap, unitMap, riskData, selectedKonteksId])

  // ── Summary stats ──────────────────────────────────────────────────────────
  const unitCount     = units.length
  const riskCount     = riskData.length
  const priorityCount = riskData.filter(r => r.isPriority).length

  const now     = new Date()
  const days    = ['Min','Sen','Sel','Rab','Kam','Jum','Sab']
  const today   = now.getDate()
  const startW  = today - now.getDay()
  const weekDays = Array.from({ length: 7 }, (_, i) => startW + i)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 gap-3 text-slate-400">
        <div className="w-5 h-5 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin" />
        <span className="text-sm">Memuat dashboard…</span>
      </div>
    )
  }

  const cardBase = 'rounded-2xl border border-white/60 p-5 shadow-sm flex flex-col gap-3'
  const cardBg   = { background: 'rgba(255,255,255,0.80)', backdropFilter: 'blur(12px)' }

  return (
    <div className="space-y-5">

      {/* ── Filter row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-semibold">Filter Satker:</span>
        <SatkerFilter units={units} selectedId={selectedUnitId} onChange={setSelectedUnitId} />
        {selectedUnitId && (
          <span className="text-xs text-slate-400">
            {riskCount} risiko · {priorityCount} prioritas
          </span>
        )}
      </div>

      {/* ── Top row: 4 widgets ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">

        {/* Widget 1: Periode & Metrik */}
        <div className={cardBase} style={cardBg}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Periode Evaluasi</p>
            <span className="text-[11px] font-semibold text-slate-500 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200">
              {now.toLocaleString('id-ID', { month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="grid grid-cols-7 gap-0 text-center">
            {days.map(d => <div key={d} className="text-[9px] font-bold text-slate-400 uppercase pb-1">{d}</div>)}
            {weekDays.map(day => (
              <div key={day}
                className={`text-xs rounded-full w-6 h-6 flex items-center justify-center mx-auto font-semibold transition-all
                  ${day===today ? 'bg-blue-500 text-white shadow-md shadow-blue-200' : 'text-slate-600 hover:bg-white/60'}`}>
                {day > 0 ? day : ''}
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 pt-2 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><Building2 className="w-3.5 h-3.5 text-blue-400" /> Satuan Kerja</span>
              <span className="text-xs font-bold text-slate-800">{unitCount} instansi</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Total Risiko</span>
              <span className="text-xs font-bold text-slate-800">{riskCount} risiko</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs text-slate-500"><TrendingUp className="w-3.5 h-3.5 text-purple-400" /> Prioritas</span>
              <span className="text-xs font-bold text-red-600">{priorityCount} risiko</span>
            </div>
          </div>
        </div>

        {/* Widget 2: Risk Register */}
        <div className={`${cardBase} md:col-span-1 xl:col-span-1`} style={cardBg}>
          <div className="flex items-center justify-between shrink-0">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Risk Register</p>
            <a href={selectedKonteksId ? `/dashboard/analisis?konteks=${selectedKonteksId}` : '/dashboard/konteks'}
              className="text-[11px] text-indigo-500 font-semibold hover:underline flex items-center gap-0.5">
              Detail <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <RiskRegisterChart risks={riskData} konteksId={selectedKonteksId} />
        </div>

        {/* Widget 3: Top Satker / Risiko Prioritas */}
        <div className={cardBase} style={cardBg}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">
              {selectedUnitId ? 'Risiko Prioritas' : 'Top Satker Berisiko'}
            </p>
          </div>
          <div className="flex flex-col gap-2 flex-1">
            {topList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">Belum ada risiko prioritas</p>
            ) : topList.map((item, idx) => (
              <div key={idx} className="flex items-start gap-2.5">
                <span className={`text-[11px] font-bold w-4 shrink-0 mt-0.5 ${idx===0?'text-red-500':idx===1?'text-orange-400':'text-slate-400'}`}>
                  #{idx+1}
                </span>
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                  style={{ background: idx===0?'#ef4444':idx===1?'#f97316':'#94a3b8' }}>
                  {item.isSatker ? item.name.slice(0,2).toUpperCase() : (idx+1).toString()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-slate-800 truncate leading-tight">{item.name}</p>
                  <p className="text-[9px] text-slate-400 truncate leading-tight mt-0.5">{item.label}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${scoreColor(item.score)==='#ef4444'?'text-red-600 bg-red-50':scoreColor(item.score)==='#f97316'?'text-orange-600 bg-orange-50':scoreColor(item.score)==='#eab308'?'text-amber-600 bg-amber-50':'text-green-600 bg-green-50'}`}>
                    {item.score}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-auto pt-2 border-t border-slate-100 flex justify-between items-center">
            <span className="text-[10px] text-slate-400">{priorityCount} risiko melampaui toleransi</span>
            <a href={selectedKonteksId ? `/dashboard/evaluasi?konteks=${selectedKonteksId}` : '/dashboard/evaluasi'}
              className="text-[11px] text-blue-500 font-semibold hover:underline flex items-center gap-0.5">
              Detail <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Widget 4: Indeks Kesehatan */}
        <div className={cardBase} style={cardBg}>
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] font-medium uppercase tracking-widest text-slate-400">Indeks Kesehatan</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${healthData.percent>=70?'text-green-600 bg-green-50 border-green-100':healthData.percent>=40?'text-yellow-600 bg-yellow-50 border-yellow-100':'text-red-600 bg-red-50 border-red-100'}`}>
              {healthData.percent>=70?'↑ Terkendali':healthData.percent>=40?'~ Waspada':'↓ Kritis'}
            </span>
          </div>
          <div className="flex justify-center">
            <RiskGauge percent={healthData.percent} />
          </div>
          <div className="rounded-xl px-3 py-2" style={{ background: 'rgba(241,245,249,0.7)' }}>
            <p className="text-[10px] text-slate-500 leading-relaxed">
              {healthData.priorityCount === 0
                ? `Tidak ada risiko prioritas. Seluruh ${healthData.total} risiko berada dalam batas toleransi.`
                : `${healthData.handledCount} dari ${healthData.priorityCount} risiko prioritas sudah masuk Program Kerja Audit (ditindaklanjuti).`
              }
            </p>
          </div>
        </div>

      </div>

      {/* ── Bottom row: 2 charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Distribusi Level Risiko (Residual) */}
        <div className={cardBase} style={cardBg}>
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribusi Level Risiko</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">Sebaran Nilai Risiko Sisa (Residual)</p>
          </div>
          {distributionData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-slate-400 text-xs">Belum ada data analisis</div>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distributionData} cx="50%" cy="48%"
                    innerRadius={52} outerRadius={80} paddingAngle={3} dataKey="value"
                    label={({ name, percent }) => (percent??0)>0.05 ? `${name} (${((percent??0)*100).toFixed(0)}%)` : ''}
                    labelLine={false}>
                    {distributionData.map((entry, i) => <Cell key={i} fill={entry.fill} strokeWidth={0} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'11px' }}
                    formatter={(v, n) => [`${v} risiko`, n]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {distributionData.map(d => (
              <span key={d.name} className="flex items-center gap-1 text-[10px] text-slate-600">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: d.fill }} />
                {d.name}: {d.value}
              </span>
            ))}
          </div>
        </div>

        {/* Tren Manajemen Risiko */}
        <div className={cardBase} style={cardBg}>
          <div className="mb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tren Manajemen Risiko</p>
            <p className="text-sm font-semibold text-slate-700 mt-0.5">Akumulasi Risiko Teridentifikasi (6 Bulan)</p>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }} barCategoryGap="38%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(203,213,225,0.5)" />
                <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ borderRadius:'10px', border:'1px solid #e2e8f0', fontSize:'11px' }}
                  cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                  formatter={(v: any) => [`${v} risiko`, 'Risiko Teridentifikasi']}
                />
                <Bar dataKey="Risiko" fill="#6366f1" radius={[5,5,0,0]}>
                  {trendData.map((_, i) => (
                    <Cell key={i} fill={i === trendData.length-1 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 italic">
            Menampilkan total kumulatif risiko teridentifikasi per akhir bulan (6 bulan terakhir)
          </p>
        </div>

      </div>
    </div>
  )
}
