'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search, Map, Loader2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { RiskMatrix } from '@/components/RiskMatrix'
import type { RiskPoint } from '@/components/RiskMatrix'

type UnitKerja = { id: string; nama_unit: string }

type Props = {
  open: boolean
  onClose: () => void
}

export function PetaRisikoSidebarModal({ open, onClose }: Props) {
  const [units, setUnits] = useState<UnitKerja[]>([])
  const [search, setSearch] = useState('')
  const [selectedUnit, setSelectedUnit] = useState<UnitKerja | null>(null)
  const [riskPoints, setRiskPoints] = useState<RiskPoint[]>([])
  const [unitInfo, setUnitInfo] = useState<{ tahun: number | string } | null>(null)
  const [loadingUnits, setLoadingUnits] = useState(false)
  const [loadingMap, setLoadingMap] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // Fetch unit_kerja list when modal opens
  useEffect(() => {
    if (!open) return
    setLoadingUnits(true)
    const supabase = createClient()
    supabase
      .from('unit_kerja')
      .select('id, nama_unit')
      .order('nama_unit', { ascending: true })
      .then(({ data }) => {
        setUnits(data ?? [])
        setLoadingUnits(false)
        setTimeout(() => searchRef.current?.focus(), 80)
      })
  }, [open])

  // Reset on close
  useEffect(() => {
    if (!open) {
      setSearch('')
      setSelectedUnit(null)
      setRiskPoints([])
      setUnitInfo(null)
    }
  }, [open])

  // Fetch risk map data for selected unit
  async function handleSelectUnit(unit: UnitKerja) {
    setSelectedUnit(unit)
    setRiskPoints([])
    setUnitInfo(null)
    setLoadingMap(true)

    const supabase = createClient()

    // Get the latest konteks for this unit
    const { data: konteksData } = await supabase
      .from('penetapan_konteks')
      .select('id, tahun_penerapan')
      .eq('unit_kerja_id', unit.id)
      .order('tahun_penerapan', { ascending: false })
      .limit(1)
      .single()

    if (!konteksData) {
      setLoadingMap(false)
      return
    }

    setUnitInfo({ tahun: konteksData.tahun_penerapan })

    // Get all analyzed risks for this konteks
    const { data: risikoList } = await supabase
      .from('risiko')
      .select(`
        id,
        kode_risiko,
        pernyataan_risiko,
        analisis:analisis_risiko(residual_kemungkinan, residual_dampak)
      `)
      .eq('konteks_id', konteksData.id)
      .order('created_at', { ascending: true })

    const points: RiskPoint[] = []
    let idx = 1
    for (const r of risikoList ?? []) {
      const a = (r as any).analisis?.[0]
      if (a?.residual_kemungkinan != null && a?.residual_dampak != null) {
        points.push({
          id: r.id,
          label: String(idx++),
          kemungkinan: a.residual_kemungkinan as number,
          dampak: a.residual_dampak as number,
          pernyataan: (r as any).pernyataan_risiko,
        })
      }
    }

    setRiskPoints(points)
    setLoadingMap(false)
  }

  const filtered = units.filter((u) =>
    u.nama_unit.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15,23,42,0.6)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        style={{
          width: selectedUnit ? 700 : 480,
          maxWidth: '95vw',
          maxHeight: '85vh',
          animation: 'sidebar-modal-enter 0.3s cubic-bezier(0.34,1.56,0.64,1) forwards',
          transition: 'width 0.35s cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Map className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-slate-800">Peta Risiko</h2>
              <p className="text-xs text-slate-500">
                {selectedUnit
                  ? `${selectedUnit.nama_unit}${unitInfo ? ` · Tahun ${unitInfo.tahun}` : ''}`
                  : 'Pilih unit kerja untuk melihat peta risiko'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors text-slate-500"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Left panel: search + unit list */}
          <div
            className="flex flex-col border-r shrink-0"
            style={{ width: 240 }}
          >
            {/* Search */}
            <div className="p-3 border-b">
              <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2">
                <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cari unit kerja..."
                  className="flex-1 bg-transparent text-xs outline-none text-slate-700 placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Unit list */}
            <div className="flex-1 overflow-y-auto">
              {loadingUnits ? (
                <div className="flex items-center justify-center py-8 text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6 px-3">
                  {search ? 'Tidak ada hasil' : 'Belum ada unit kerja'}
                </p>
              ) : (
                filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUnit(u)}
                    className={`w-full text-left px-4 py-2.5 text-xs transition-colors border-b border-slate-100 last:border-0 ${
                      selectedUnit?.id === u.id
                        ? 'bg-indigo-50 text-indigo-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {u.nama_unit}
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right panel: risk map */}
          <div className="flex-1 flex flex-col min-w-0">
            {!selectedUnit ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3 p-8">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Map className="w-7 h-7 opacity-40" />
                </div>
                <p className="text-sm text-center">Pilih unit kerja di sebelah kiri untuk menampilkan peta risiko</p>
              </div>
            ) : loadingMap ? (
              <div className="flex-1 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Memuat peta risiko...</span>
              </div>
            ) : !unitInfo ? (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-2 p-8">
                <p className="text-sm text-center">Belum ada data konteks untuk unit ini.</p>
                <a
                  href="/dashboard/konteks"
                  className="text-xs text-indigo-500 underline"
                >
                  Tambahkan Konteks
                </a>
              </div>
            ) : (
              <div className="flex-1 overflow-auto p-5">
                {riskPoints.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                    <Map className="w-8 h-8 opacity-30" />
                    <p className="text-sm text-center">Belum ada risiko yang terpetakan.</p>
                    <p className="text-xs text-center">Lengkapi analisis risiko terlebih dahulu.</p>
                  </div>
                ) : (
                  <RiskMatrix risks={riskPoints} />
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes sidebar-modal-enter {
          from { opacity: 0; transform: scale(0.9) translateY(20px); }
          to   { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  )
}
