'use client'

import { useState } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { HasilAnalisisSaldo } from '@/lib/ca-keuangan-perkara/analisis-saldo'
import { BaganMatriks } from './Bagan'

const TAB = ['Ringkasan Positif', 'Ringkasan Negatif & Anomali', 'Rincian Pivot'] as const
type NamaTab = typeof TAB[number]

function rupiah(n: number): string {
  const nilai = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n))
  return `${n < 0 ? '−' : ''}Rp ${nilai}`
}

export default function PanelHasilSaldo({ hasil }: { hasil: HasilAnalisisSaldo }) {
  const [tab, setTab] = useState<NamaTab>('Ringkasan Positif')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-emerald-700">Total Saldo Positif</p>
            <p className="text-lg font-bold text-emerald-900">{rupiah(hasil.ringkasanPositif.totalKeseluruhan)}</p>
            <p className="text-xs text-emerald-700">{hasil.daftarSaldoPositif.length} perkara — panjar belum dikembalikan</p>
          </div>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <TrendingDown className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-red-700">Total Saldo Negatif / Anomali</p>
            <p className="text-lg font-bold text-red-900">{rupiah(hasil.ringkasanNegatif.totalKeseluruhan)}</p>
            <p className="text-xs text-red-700">{hasil.daftarAnomali.length} perkara — wajib ditelusuri</p>
          </div>
        </div>
        {hasil.tanpaTahun.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-amber-700">Tahun tidak terbaca</p>
              <p className="text-lg font-bold text-amber-900">{hasil.tanpaTahun.length} perkara</p>
              <p className="text-xs text-amber-700">Nomor Perkara tidak memuat pola /20xx/ — periksa manual</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TAB.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Ringkasan Positif' && (
        <div className="space-y-4">
          <BaganMatriks matriks={hasil.ringkasanPositif} />
          <TabelMatriks matriks={hasil.ringkasanPositif} />
        </div>
      )}

      {tab === 'Ringkasan Negatif & Anomali' && (
        <div className="space-y-4">
          <BaganMatriks matriks={hasil.ringkasanNegatif} />
          <TabelMatriks matriks={hasil.ringkasanNegatif} />
          <TabelAnomali hasil={hasil} />
        </div>
      )}

      {tab === 'Rincian Pivot' && <TabelPivot hasil={hasil} />}
    </div>
  )
}

function TabelMatriks({ matriks }: { matriks: HasilAnalisisSaldo['ringkasanPositif'] }) {
  if (matriks.tahunList.length === 0) {
    return <p className="text-sm text-slate-500 py-4 text-center">Tidak ada data.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Tahun</th>
            {matriks.jenisList.map((j) => (
              <th key={j} className="text-right font-semibold px-3 py-2">{j}</th>
            ))}
            <th className="text-right font-semibold px-3 py-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {matriks.tahunList.map((t) => (
            <tr key={t} className="border-t border-slate-100">
              <td className="px-3 py-2 font-medium text-slate-700">{t}</td>
              {matriks.jenisList.map((j) => (
                <td key={j} className="px-3 py-2 text-right text-slate-700 tabular-nums">
                  {matriks.sel[t][j] === 0 ? '—' : rupiah(matriks.sel[t][j])}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                {rupiah(matriks.totalPerTahun[t])}
              </td>
            </tr>
          ))}
          <tr className="border-t border-slate-200 bg-slate-50">
            <td className="px-3 py-2 font-semibold text-slate-900">Total</td>
            {matriks.jenisList.map((j) => (
              <td key={j} className="px-3 py-2 text-right font-semibold text-slate-900 tabular-nums">
                {rupiah(matriks.totalPerJenis[j])}
              </td>
            ))}
            <td className="px-3 py-2 text-right font-bold text-slate-900 tabular-nums">
              {rupiah(matriks.totalKeseluruhan)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TabelAnomali({ hasil }: { hasil: HasilAnalisisSaldo }) {
  if (hasil.daftarAnomali.length === 0) {
    return <p className="text-sm text-slate-500 py-4 text-center">Tidak ada anomali saldo negatif.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Nomor Perkara</th>
            <th className="text-left font-semibold px-3 py-2">Jenis</th>
            <th className="text-left font-semibold px-3 py-2">Tahun</th>
            <th className="text-right font-semibold px-3 py-2">Sum of Sisa</th>
          </tr>
        </thead>
        <tbody>
          {hasil.daftarAnomali.map((a) => (
            <tr key={`${a.jenis}-${a.nomorPerkara}`} className="border-t border-slate-100">
              <td className="px-3 py-2 text-slate-700">{a.nomorPerkara}</td>
              <td className="px-3 py-2"><Badge variant="secondary">{a.jenis}</Badge></td>
              <td className="px-3 py-2 text-slate-700">{a.tahun ?? '—'}</td>
              <td className="px-3 py-2 text-right font-semibold text-red-700 tabular-nums">{rupiah(a.sisa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TabelPivot({ hasil }: { hasil: HasilAnalisisSaldo }) {
  const urut = [...hasil.pivot].sort((a, b) => a.jenis.localeCompare(b.jenis) || a.nomorPerkara.localeCompare(b.nomorPerkara))
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[32rem] overflow-y-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 sticky top-0">
          <tr>
            <th className="text-left font-semibold px-3 py-2">Jenis</th>
            <th className="text-left font-semibold px-3 py-2">Nomor Perkara</th>
            <th className="text-left font-semibold px-3 py-2">Tahun</th>
            <th className="text-right font-semibold px-3 py-2">Sum of Sisa</th>
          </tr>
        </thead>
        <tbody>
          {urut.map((p) => (
            <tr key={`${p.jenis}-${p.nomorPerkara}`} className="border-t border-slate-100">
              <td className="px-3 py-2"><Badge variant="secondary">{p.jenis}</Badge></td>
              <td className="px-3 py-2 text-slate-700">{p.nomorPerkara}</td>
              <td className="px-3 py-2 text-slate-700">{p.tahun ?? '—'}</td>
              <td className={`px-3 py-2 text-right font-semibold tabular-nums ${p.sisa < 0 ? 'text-red-700' : p.sisa > 0 ? 'text-emerald-700' : 'text-slate-500'}`}>
                {rupiah(p.sisa)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
