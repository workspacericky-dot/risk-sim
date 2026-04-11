import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import DashboardCharts from "./DashboardCharts"
import DashboardWidgets from "./DashboardWidgets"

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // --- Aggregated Metrics ---
  const { count: unitCount } = await supabase
    .from('unit_kerja').select('*', { count: 'exact', head: true })

  const { count: riskCount } = await supabase
    .from('risiko').select('*', { count: 'exact', head: true })

  const { data: analysis } = await supabase
    .from('analisis_risiko').select('status_risiko, di_atas_selera_risiko')

  const { count: rtpCount } = await supabase
    .from('rtp').select('*', { count: 'exact', head: true })

  // --- Top 3 Satker by Risk Count ---
  const { data: topRisksRaw } = await supabase
    .from('risiko')
    .select('konteks:penetapan_konteks(unit:unit_kerja_id(nama_unit, tingkat))')

  // --- Latest priority risk for alert card ---
  const { data: latestPriorityRisk } = await supabase
    .from('analisis_risiko')
    .select('status_risiko, risiko:risiko_id(pernyataan_risiko, sumber_risiko, konteks:penetapan_konteks(unit:unit_kerja_id(nama_unit)))')
    .eq('di_atas_selera_risiko', true)
    .order('created_at', { ascending: false })
    .limit(1)

  // --- Compute distribution ---
  let counts = { sTinggi: 0, tinggi: 0, sedang: 0, rendah: 0, sRendah: 0 }
  let prioritasCount = 0

  if (analysis) {
    analysis.forEach(a => {
      const score = a.status_risiko || 0
      if (a.di_atas_selera_risiko) prioritasCount++
      if (score >= 20) counts.sTinggi++
      else if (score >= 15) counts.tinggi++
      else if (score >= 10) counts.sedang++
      else if (score >= 5) counts.rendah++
      else counts.sRendah++
    })
  }

  // --- Top satker by risk count ---
  const satkerTally: Record<string, { name: string, level: number, count: number }> = {}
  if (topRisksRaw) {
    topRisksRaw.forEach((r: any) => {
      const konteks = Array.isArray(r.konteks) ? r.konteks[0] : r.konteks
      const unit = Array.isArray(konteks?.unit) ? konteks.unit[0] : konteks?.unit
      if (unit?.nama_unit) {
        const key = unit.nama_unit
        if (!satkerTally[key]) satkerTally[key] = { name: unit.nama_unit, level: unit.tingkat || 0, count: 0 }
        satkerTally[key].count++
      }
    })
  }
  const topSatker = Object.values(satkerTally)
    .sort((a, b) => b.count - a.count)
    .slice(0, 3)

  const distributionData = [
    { name: 'Sangat Tinggi', value: counts.sTinggi, fill: '#ef4444' },
    { name: 'Tinggi', value: counts.tinggi, fill: '#f97316' },
    { name: 'Sedang', value: counts.sedang, fill: '#eab308' },
    { name: 'Rendah', value: counts.rendah, fill: '#22c55e' },
    { name: 'Sangat Rendah', value: counts.sRendah, fill: '#3b82f6' },
  ]

  const totalAnalysis = analysis?.length || 0
  const sehatPercent = totalAnalysis > 0
    ? Math.round(((totalAnalysis - prioritasCount) / totalAnalysis) * 100)
    : 100

  // Latest priority risk info
  const latestRisk = latestPriorityRisk?.[0]
  const latestRiskRisiko = latestRisk?.risiko as any
  const latestRiskStatement = latestRiskRisiko?.pernyataan_risiko || null
  const latestRiskSatker = latestRiskRisiko?.konteks?.unit?.nama_unit || null

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-serif">Executive Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1 font-sans">
          Ringkasan manajemen risiko Mahkamah Agung RI — {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Arbitra-style 4-widget top row */}
      <DashboardWidgets
        unitCount={unitCount || 0}
        riskCount={riskCount || 0}
        prioritasCount={prioritasCount}
        rtpCount={rtpCount || 0}
        topSatker={topSatker}
        sehatPercent={sehatPercent}
        latestRiskStatement={latestRiskStatement}
        latestRiskSatker={latestRiskSatker}
        latestRiskScore={latestRisk?.status_risiko || null}
      />

      {/* Charts Row */}
      <DashboardCharts distribution={distributionData.filter(d => d.value > 0)} />
    </div>
  )
}
