'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { FileSpreadsheet, RefreshCw } from 'lucide-react'
import {
  CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LABEL_KR, LABEL_ANTI, TDT_TARGET } from '@/lib/e-perjadin/metrik'
import type { BarisDeret } from './data'
import { hitungMetrikSnapshot } from './actions'

const SUMBU = { fontSize: 11, fill: '#64748b' }
const prs = (n: number) => `${(n * 100).toFixed(0)}%`
const tgl = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export default function TdtDashboard({
  deret, pekanLalu, pekanLaluBelumSnapshot, bolehHitung, dihitungPada,
}: {
  deret: BarisDeret[]
  pekanLalu: string
  pekanLaluBelumSnapshot: boolean
  bolehHitung: boolean
  dihitungPada: string | null
}) {
  const router = useRouter()
  const [pesan, setPesan] = useState<string | null>(null)
  const [pending, mulai] = useTransition()

  const berjalan = deret[deret.length - 1]
  const terkiniFinal = [...deret].reverse().find((d) => d.ada && !d.berjalan) ?? null
  const acuan = terkiniFinal ?? berjalan

  const dataTren = deret.map((d) => ({
    pekan: tgl(d.mingguMulai),
    tdt: d.tdt == null ? null : Math.round(d.tdt * 1000) / 10,
    berjalan: d.berjalan,
  }))

  const krKeys = Object.keys(LABEL_KR)
  const antiKeys = Object.keys(LABEL_ANTI)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">TDT &amp; Metrik Manajerial</h2>
          <p className="text-muted-foreground">
            Tingkat Perjalanan Dinas Tuntas-Terverifikasi (North Star) dan KR/anti-metrik pendukung — tren 12 pekan.
          </p>
        </div>
        <a href="/dashboard/e-perjadin/tdt/rekap.xlsx"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">
            TDT {acuan.berjalan ? 'pekan berjalan' : `pekan ${tgl(acuan.mingguMulai)}`}
          </div>
          <div className="mt-1 text-4xl font-bold tabular-nums">
            {acuan.tdt == null ? '—' : prs(acuan.tdt)}
          </div>
          <div className="text-xs text-slate-400">
            {acuan.tdtPembilang}/{acuan.tdtPenyebut} penugasan · target {prs(TDT_TARGET)}
            {acuan.tdt != null && (
              <span className={acuan.tdt >= TDT_TARGET ? ' text-emerald-600' : ' text-amber-600'}>
                {' '}({acuan.tdt >= TDT_TARGET ? '+' : ''}{((acuan.tdt - TDT_TARGET) * 100).toFixed(0)} poin)
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Presensi lolos otomatis (KR1.3)</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">
            {acuan.kr.kr1_3_presensi_otomatis == null ? '—' : prs(acuan.kr.kr1_3_presensi_otomatis)}
          </div>
          <div className="text-xs text-slate-400">tanpa keputusan manual PPK</div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="text-xs text-slate-500">Median hari kembali → E-SPJ disetujui (KR2.1)</div>
          <div className="mt-1 text-4xl font-bold tabular-nums">
            {acuan.kr.kr2_1_median_hari_espj == null ? '—' : acuan.kr.kr2_1_median_hari_espj.toFixed(1)}
          </div>
          <div className="text-xs text-slate-400">ambang tuntas: 14 hari kalender</div>
        </div>
      </div>

      {bolehHitung && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-sm">
          <RefreshCw className="w-4 h-4 text-slate-500" />
          <span className="text-slate-600">
            Snapshot pekan lalu ({tgl(pekanLalu)}):{' '}
            {pekanLaluBelumSnapshot
              ? <span className="font-semibold text-amber-600">belum dihitung</span>
              : <span className="text-slate-500">terakhir {dihitungPada ? new Date(dihitungPada).toLocaleString('id-ID') : '—'}</span>}
          </span>
          <Button size="sm" disabled={pending} onClick={() => mulai(async () => {
            setPesan(null)
            const r = await hitungMetrikSnapshot(pekanLalu)
            if ('error' in r) setPesan(r.error); else router.refresh()
          })}>
            {pekanLaluBelumSnapshot ? 'Hitung snapshot pekan lalu' : 'Hitung ulang'}
          </Button>
          {pesan && <span className="text-red-600">{pesan}</span>}
        </div>
      )}

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">Tren TDT — 12 pekan</CardTitle>
          <CardDescription>Garis putus merah = target {prs(TDT_TARGET)}. Titik terakhir = pekan berjalan (belum tutup).</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dataTren} margin={{ left: 4, right: 16, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="pekan" tick={SUMBU} />
              <YAxis domain={[0, 100]} unit="%" tick={SUMBU} width={44} />
              <Tooltip
                formatter={(v) => [typeof v === 'number' ? `${v}%` : '—', 'TDT']}
                contentStyle={{ fontSize: 12, borderRadius: 8 }}
              />
              <ReferenceLine y={TDT_TARGET * 100} stroke="#dc2626" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="tdt" stroke="#0ea5e9" strokeWidth={2} connectNulls={false}
                dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">Key Results (O1–O2)</CardTitle>
          <CardDescription>Nilai pekan {acuan.berjalan ? 'berjalan' : tgl(acuan.mingguMulai)}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {krKeys.map((k) => {
            const v = acuan.kr[k]
            const persen = k !== 'kr2_1_median_hari_espj'
            return (
              <div key={k} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{LABEL_KR[k]}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {v == null ? '—' : persen ? prs(v) : `${v.toFixed(1)} hari`}
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">Anti-metrik (§6)</CardTitle>
          <CardDescription>Sinyal kontrol yang dilonggarkan diam-diam — dipantau berdampingan dengan metrik keberhasilan.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {antiKeys.map((k) => {
            const seri = deret.map((d) => ({ pekan: tgl(d.mingguMulai), v: d.ada ? (d.antiMetrik[k] ?? 0) : null }))
            const kini = acuan.antiMetrik[k]
            const rasio = k === 'rasio_rampung'
            return (
              <div key={k} className="rounded-lg border border-slate-200 p-3">
                <div className="text-xs text-slate-500">{LABEL_ANTI[k]}</div>
                <div className="mt-1 text-2xl font-bold tabular-nums">
                  {kini == null ? '—' : rasio ? prs(kini) : kini}
                </div>
                <ResponsiveContainer width="100%" height={44}>
                  <LineChart data={seri} margin={{ top: 4, bottom: 0, left: 0, right: 0 }}>
                    <Line type="monotone" dataKey="v" stroke="#f97316" strokeWidth={1.5} dot={false} connectNulls={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">HEART — pengalaman pengguna</CardTitle>
          <CardDescription>Sinyal adopsi presensi lapangan pekan {acuan.berjalan ? 'berjalan' : tgl(acuan.mingguMulai)}.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Presensi berhasil pada percobaan pertama</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {acuan.heart.presensi_berhasil_pertama == null ? '—' : prs(acuan.heart.presensi_berhasil_pertama)}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="text-xs text-slate-500">Median waktu merekam satu titik</div>
            <div className="mt-1 text-2xl font-bold tabular-nums">
              {acuan.heart.median_durasi_rekam_detik == null ? '—' : `${acuan.heart.median_durasi_rekam_detik.toFixed(0)} dtk`}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
