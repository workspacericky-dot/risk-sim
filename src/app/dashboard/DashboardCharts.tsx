'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'

type RiskDistributionData = { name: string; value: number; fill: string }

export default function DashboardCharts({ distribution }: { distribution: RiskDistributionData[] }) {
  const trendData = [
    { bulan: 'Jan', Risiko: 5, Mitigasi: 2 },
    { bulan: 'Feb', Risiko: 12, Mitigasi: 6 },
    { bulan: 'Mar', Risiko: 18, Mitigasi: 15 },
    { bulan: 'Apr', Risiko: distribution.reduce((sum, d) => sum + d.value, 0), Mitigasi: 20 },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

      {/* Peta Distribusi Pie */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribusi Level Risiko</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">Klasifikasi Skor Risiko Teranalisis</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={distribution}
                cx="50%" cy="48%"
                innerRadius={58} outerRadius={88}
                paddingAngle={4}
                dataKey="value"
                nameKey="name"
                label={({ name, percent }) =>
                  percent > 0.04 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''
                }
                labelLine={false}
              >
                {distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px' }}
                formatter={(value, name) => [`${value} risiko`, name]}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tren Bar Chart */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Tren Manajemen Risiko</p>
          <p className="text-sm font-semibold text-slate-700 mt-0.5">Identifikasi vs Mitigasi (RTP)</p>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trendData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis
                dataKey="bulan" tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                axisLine={false} tickLine={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #f1f5f9', boxShadow: '0 4px 20px rgba(0,0,0,0.06)', fontSize: '12px' }}
                cursor={{ fill: '#f8fafc' }}
              />
              <Legend
                verticalAlign="top" height={32}
                wrapperStyle={{ fontSize: '11px', paddingBottom: '8px' }}
                formatter={val => val === 'Risiko' ? 'Risiko Teridentifikasi' : 'RTP Dirancang'}
              />
              <Bar dataKey="Risiko" fill="#6366f1" radius={[6, 6, 0, 0]} />
              <Bar dataKey="Mitigasi" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  )
}
