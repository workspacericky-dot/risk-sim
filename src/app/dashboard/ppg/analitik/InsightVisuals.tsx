'use client'

import { Bar, BarChart, CartesianGrid, Cell, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts'
import type { PpgAssistedInsight } from '@/lib/ppg/insights'

const colors: Record<PpgAssistedInsight['priority'], string> = {
  prioritas_nasional: '#e11d48',
  preventif: '#d97706',
  perbaikan_kontrol: '#0891b2',
  monitoring: '#64748b',
}

export function InsightVisuals({ rows }: { rows: PpgAssistedInsight[] }) {
  const visible = rows.slice(0, 18)
  const scatterData = groupMatrixPoints(visible)
  const barData = visible.slice(0, 10).map((row) => ({ kode: row.kode, kritis: row.cluster_1_satkers, terbatas: row.cluster_2_satkers, monitoring: row.cluster_3_satkers }))
  return <div className="space-y-5">
    <div className="grid gap-5 xl:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Matriks Gabungan Insight A × Insight B</h3><p className="mt-1 text-xs text-slate-500">Visual ini merupakan hasil formula rule-based yang transparan. Rekomendasi berbasis penalaran tersedia pada bagian AI di bawahnya.</p><div className="mt-4 flex h-[360px] min-w-0"><div className="flex w-8 shrink-0 items-center justify-center text-sm text-slate-500"><span className="whitespace-nowrap [writing-mode:vertical-rl] rotate-180">Indeks paparan berbasis data (A)</span></div><div className="min-w-0 flex-1">
        <ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{ top: 12, right: 18, bottom: 16, left: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" dataKey="insight_b_score" domain={[0, 100]} name="Insight B" unit="" label={{ value: 'Realisasi risiko (B)', position: 'insideBottom', offset: -10 }} /><YAxis type="number" dataKey="insight_a_score" domain={[0, 100]} name="Insight A" width={44} /><ReferenceLine x={50} stroke="#94a3b8" strokeDasharray="5 5" /><ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="5 5" /><Tooltip cursor={{ strokeDasharray: '3 3' }} content={<MatrixTooltip />} /><Scatter data={scatterData} shape={renderMatrixPoint}>{scatterData.map((point) => <Cell key={point.key} fill={colors[point.priority]} />)}</Scatter></ScatterChart></ResponsiveContainer>
      </div></div><p className="mt-1 text-[11px] text-slate-500">Menampilkan {visible.length} risiko pada {scatterData.length} koordinat unik. Angka di dalam bubble menunjukkan jumlah risiko yang bertumpuk pada koordinat yang sama.</p><details className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-[11px] text-slate-600"><summary className="cursor-pointer font-semibold text-slate-700">Cara menghitung sumbu A dan B</summary><div className="mt-2 space-y-1 leading-relaxed"><p><b>Sumbu Y — A:</b> 30% konsentrasi skenario + 25% anomali musim + 20% konsentrasi jabatan + 15% objek uang/setara uang + 10% tren positif. Karena laporan belum dipetakan langsung ke setiap risiko generik, A merupakan baseline paparan periode yang sama untuk semua risiko.</p><p><b>Sumbu X — B:</b> 25% Satker terdampak + 35% Satker berdampak tinggi + 25% Satker berulang + 15% Satker dengan kontrol gagal. Semua persentase memakai populasi Satker terukur untuk risiko/periode terkait.</p><p><b>Koordinat:</b> setiap risiko ditempatkan pada (B, A). Risiko dengan pasangan skor identik digabung dalam satu bubble tanpa mengubah nilainya.</p></div></details><div className="mt-2 flex flex-wrap gap-3 text-[11px]">{Object.entries(colors).map(([key, color]) => <span key={key} className="flex items-center gap-1.5"><span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />{priorityLabel(key)}</span>)}</div></section>
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">Distribusi klaster per risiko</h3><p className="mt-1 text-xs text-slate-500">Klaster 1 adalah realisasi kritis, Klaster 2 realisasi terbatas, dan Klaster 3 monitoring.</p><div className="mt-4 h-[360px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={barData} layout="vertical" margin={{ left: 10, right: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" /><YAxis type="category" dataKey="kode" width={72} tick={{ fontSize: 11 }} /><Tooltip /><Legend /><Bar dataKey="kritis" name="Klaster 1" stackId="cluster" fill="#e11d48" /><Bar dataKey="terbatas" name="Klaster 2" stackId="cluster" fill="#d97706" /><Bar dataKey="monitoring" name="Klaster 3" stackId="cluster" fill="#94a3b8" /></BarChart></ResponsiveContainer></div></section>
    </div>
    <details id="dasar-analitik-gabungan" className="group rounded-2xl border border-indigo-200 bg-indigo-50/40 shadow-sm">
      <summary className="cursor-pointer list-inside px-5 py-4 text-sm font-bold text-indigo-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        Dasar Analitik Gabungan A × B
        <span className="ml-2 font-normal text-indigo-800">({visible.length} risiko · lihat dasar perhitungan)</span>
      </summary>
      <div className="border-t border-indigo-100 px-5 pb-5 pt-4">
        <p className="text-xs leading-relaxed text-indigo-900">Ringkasan angka rule-based untuk verifikasi dan audit. Bagian ini tidak menghasilkan rekomendasi program; rekomendasi kontekstual tersedia pada kartu AI.</p>
        <div className="mt-4 overflow-x-auto rounded-xl border border-indigo-100 bg-white">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr><th className="px-3 py-2.5">Risiko</th><th className="px-3 py-2.5">Klasifikasi</th><th className="px-3 py-2.5 text-right">A</th><th className="px-3 py-2.5 text-right">B</th><th className="px-3 py-2.5 text-right">Terdampak</th><th className="px-3 py-2.5 text-right">Dampak tinggi</th><th className="px-3 py-2.5 text-right">Berulang</th><th className="px-3 py-2.5 text-right">Kontrol gagal</th><th className="px-3 py-2.5 text-right">Di atas selera</th><th className="px-3 py-2.5 text-right">Upper limit</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((row) => <tr id={`dasar-gabungan-${row.risk_library_id}`} key={row.risk_library_id} className="scroll-mt-6 text-slate-700 target:bg-violet-50">
                <td className="whitespace-nowrap px-3 py-3"><b className="text-slate-900">{row.kode}</b><span className="ml-1 text-slate-500">· {row.kategori}</span></td>
                <td className="px-3 py-3"><span className="whitespace-nowrap rounded-full px-2 py-1 text-[10px] font-bold uppercase text-white" style={{ backgroundColor: colors[row.priority] }}>{priorityLabel(row.priority)}</span></td>
                <Metric value={row.insight_a_score.toFixed(1)} />
                <Metric value={row.insight_b_score.toFixed(1)} />
                <Metric value={`${row.affected_satkers}/${row.eligible_satkers} (${row.affected_pct.toFixed(1)}%)`} />
                <Metric value={`${row.high_impact_satkers}/${row.eligible_satkers} (${row.high_impact_pct.toFixed(1)}%)`} />
                <Metric value={`${row.recurring_satkers}/${row.eligible_satkers} (${row.recurring_pct.toFixed(1)}%)`} />
                <Metric value={`${row.control_failure_satkers}/${row.eligible_satkers} (${row.control_failure_pct.toFixed(1)}%)`} />
                <Metric value={`${row.above_appetite_satkers}/${row.appetite_set_satkers}`} />
                <Metric value={String(row.upper_limit_satkers)} />
              </tr>)}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-slate-500">Metrik kejadian memakai denominator Satker terukur untuk risiko/periode tersebut. “Di atas selera” memakai jumlah Satker yang telah menetapkan appetite terkait.</p>
      </div>
    </details>
  </div>
}

function Metric({ value }: { value: string }) { return <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">{value}</td> }
function priorityLabel(value: string) { return value.replaceAll('_', ' ') }
type MatrixPoint = { key: string; insight_a_score: number; insight_b_score: number; priority: PpgAssistedInsight['priority']; rows: PpgAssistedInsight[] }
function groupMatrixPoints(rows: PpgAssistedInsight[]) { const groups = new Map<string, MatrixPoint>(); rows.forEach((row) => { const key = `${row.insight_a_score.toFixed(1)}:${row.insight_b_score.toFixed(1)}`; const existing = groups.get(key); if (existing) existing.rows.push(row); else groups.set(key, { key, insight_a_score: row.insight_a_score, insight_b_score: row.insight_b_score, priority: row.priority, rows: [row] }) }); return [...groups.values()] }
function renderMatrixPoint(props: unknown) { const point = props as { cx?: number; cy?: number; fill?: string; payload?: MatrixPoint }; const cx = point.cx ?? 0; const cy = point.cy ?? 0; const count = point.payload?.rows.length ?? 1; const radius = count > 1 ? 11 : 6; return <g><circle cx={cx} cy={cy} r={radius} fill={point.fill || '#64748b'} stroke="white" strokeWidth={2} />{count > 1 && <text x={cx} y={cy + 3.5} textAnchor="middle" fill="white" fontSize={10} fontWeight={700}>{count}</text>}</g> }
function MatrixTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: MatrixPoint }> }) { const point = payload?.[0]?.payload; if (!active || !point) return null; return <div className="max-w-80 rounded-lg border bg-white p-3 text-xs shadow-lg"><b>{point.rows.length} risiko pada koordinat yang sama</b><p className="mt-1">A: {point.insight_a_score.toFixed(1)} · B: {point.insight_b_score.toFixed(1)}</p><div className="mt-2 space-y-2">{point.rows.map((row) => <div key={row.risk_library_id} className="border-t pt-2 first:border-0 first:pt-0"><b>{row.kode}</b><p className="text-slate-600">{row.peristiwa}</p><p>{row.affected_satkers}/{row.eligible_satkers} Satker terdampak ({row.affected_pct.toFixed(1)}%)</p></div>)}</div></div> }
