'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Search, TrendingUp, TrendingDown } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { JENIS_PERKARA } from '@/lib/ca-keuangan-perkara/konstanta'
import type { HasilAnalisisSaldo } from '@/lib/ca-keuangan-perkara/analisis-saldo'
import type { BarisPivot, NomorPerkaraMentah } from '@/lib/ca-keuangan-perkara/parse-jur'
import type { BarisKwitansi } from '@/lib/ca-keuangan-perkara/kwitansi'
import type { HasilEfisiensi } from '@/lib/ca-keuangan-perkara/efisiensi'
import { BaganMatriks } from './Bagan'
import TabVouchingEksekusi from './TabVouchingEksekusi'
import TabEfisiensiBiaya from './TabEfisiensiBiaya'

const TAB = [
  'Ringkasan Positif', 'Ringkasan Negatif & Anomali', 'Rincian Pivot',
  'Vouching Transport Eksekusi/PS', 'Efisiensi Biaya Proses',
] as const
type NamaTab = typeof TAB[number]

function rupiah(n: number): string {
  const nilai = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n))
  return `${n < 0 ? '−' : ''}Rp ${nilai}`
}

type Props = {
  hasil: HasilAnalisisSaldo
  daftarEksekusi: NomorPerkaraMentah[]
  semuaNomorPerkara: NomorPerkaraMentah[]
  onKwitansiBerubah: (data: BarisKwitansi[]) => void
  onEfisiensiBerubah: (data: HasilEfisiensi) => void
}

export default function PanelHasilSaldo({
  hasil, daftarEksekusi, semuaNomorPerkara, onKwitansiBerubah, onEfisiensiBerubah,
}: Props) {
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

      {tab === 'Vouching Transport Eksekusi/PS' && (
        <TabVouchingEksekusi daftar={daftarEksekusi} onHasilBerubah={onKwitansiBerubah} />
      )}

      {tab === 'Efisiensi Biaya Proses' && (
        <TabEfisiensiBiaya
          semuaNomorPerkara={semuaNomorPerkara}
          pivotBerakhir={hasil.pivot}
          onHasilBerubah={onEfisiensiBerubah}
        />
      )}
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

type UrutanSisa = '' | 'desc' | 'asc'

function TabelPivot({ hasil }: { hasil: HasilAnalisisSaldo }) {
  const [cari, setCari] = useState('')
  const [filterJenis, setFilterJenis] = useState('')
  const [filterTahun, setFilterTahun] = useState('')
  const [urutSisa, setUrutSisa] = useState<UrutanSisa>('')

  const tahunTersedia = useMemo(
    () => [...new Set(hasil.pivot.map((p) => p.tahun).filter((t): t is number => t !== null))].sort((a, b) => b - a),
    [hasil.pivot],
  )

  const baris = useMemo(() => {
    const kataKunci = cari.trim().toLowerCase()
    const tersaring = hasil.pivot.filter((p: BarisPivot) => {
      if (kataKunci && !p.nomorPerkara.toLowerCase().includes(kataKunci)) return false
      if (filterJenis && p.jenis !== filterJenis) return false
      if (filterTahun && String(p.tahun) !== filterTahun) return false
      return true
    })
    return [...tersaring].sort((a, b) => {
      if (urutSisa === 'desc') return b.sisa - a.sisa
      if (urutSisa === 'asc') return a.sisa - b.sisa
      return a.jenis.localeCompare(b.jenis) || a.nomorPerkara.localeCompare(b.nomorPerkara)
    })
  }, [hasil.pivot, cari, filterJenis, filterTahun, urutSisa])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari Nomor Perkara…"
            className="pl-7 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 w-52"
          />
        </div>
        <select
          value={filterJenis}
          onChange={(e) => setFilterJenis(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-2 py-1.5"
        >
          <option value="">Semua Jenis</option>
          {JENIS_PERKARA.map((j) => <option key={j} value={j}>{j}</option>)}
        </select>
        <select
          value={filterTahun}
          onChange={(e) => setFilterTahun(e.target.value)}
          className="text-xs rounded-lg border border-slate-200 px-2 py-1.5"
        >
          <option value="">Semua Tahun</option>
          {tahunTersedia.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          value={urutSisa}
          onChange={(e) => setUrutSisa(e.target.value as UrutanSisa)}
          className="text-xs rounded-lg border border-slate-200 px-2 py-1.5"
        >
          <option value="">Urutkan: Jenis / Nomor Perkara</option>
          <option value="desc">Sum of Sisa: Tertinggi → Terendah</option>
          <option value="asc">Sum of Sisa: Terendah → Tertinggi</option>
        </select>
        <span className="text-xs text-slate-500 ml-auto">{baris.length} dari {hasil.pivot.length} baris</span>
      </div>

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
            {baris.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">Tidak ada baris yang cocok.</td></tr>
            ) : baris.map((p) => (
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
    </div>
  )
}
