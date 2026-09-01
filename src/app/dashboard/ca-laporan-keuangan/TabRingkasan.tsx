'use client'

import { AlertTriangle } from 'lucide-react'
import { ringkasKategori, ringkasSeverity } from '@/lib/ca-laporan-keuangan/analisis'
import { fmtRp, WARNA_SEVERITY } from '@/lib/ca-laporan-keuangan/format'
import { URUTAN_SEVERITY, type DataLk, type Temuan } from '@/lib/ca-laporan-keuangan/konstanta'

const cari = <T extends { uraian: string }>(b: T[], p: RegExp) => b.find((x) => p.test(x.uraian))

export default function TabRingkasan({ data, temuan }: { data: DataLk; temuan: Temuan[] }) {
  const m = data.metadata
  const severity = ringkasSeverity(temuan)
  const kategori = ringkasKategori(temuan)

  const identitas: [string, string | number | null][] = [
    ['Satuan Kerja', m.namaSatker], ['Kode Satker', m.kodeSatker],
    ['Kementerian/Lembaga', m.kementerian], ['Eselon I', m.eselon1],
    ['Wilayah/Provinsi', m.wilayah], ['Tahun Anggaran', m.tahun],
    ['Status Laporan', m.status], ['Tanggal Data', m.tglData],
    ['Tanggal Cetak', m.tglCetak], ['Penanggung Jawab', m.penanggungJawab],
  ]

  const statistik: [string, number | null | undefined][] = [
    ['Total Aset', cari(data.neraca, /^JUMLAH ASET$/i)?.nilai],
    ['Total Kewajiban', cari(data.neraca, /^JUMLAH KEWAJIBAN$/i)?.nilai],
    ['Total Ekuitas', cari(data.neraca, /^JUMLAH EKUITAS$/i)?.nilai],
    ['Realisasi Pendapatan', cari(data.lra, /^Jumlah Pendapatan Negara dan Hibah/i)?.realisasi],
    ['Realisasi Belanja', cari(data.lra, /^Jumlah Belanja Negara/i)?.realisasi],
    ['Surplus/Defisit-LO', cari(data.lo, /^SURPLUS\/DEFISIT\s*-\s*LO$/i)?.nilai],
  ]

  return (
    <div className="space-y-6">
      {data.bagianTidakLengkap.length > 0 && (
        <div className="flex gap-2 items-start rounded-xl border border-amber-200 bg-amber-50 p-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 space-y-1">
            <p className="font-semibold">Sebagian dokumen tidak dapat diparse:</p>
            {data.bagianTidakLengkap.map((b) => <p key={b}>{b}</p>)}
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {URUTAN_SEVERITY.map((s) => (
          <div key={s} className={`rounded-xl border p-4 ${WARNA_SEVERITY[s]}`}>
            <p className="text-3xl font-bold tabular-nums">{severity[s]}</p>
            <p className="text-xs font-semibold mt-1">{s}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <h3 className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border-b">
            Identitas Dokumen
          </h3>
          <table className="w-full text-sm">
            <tbody>
              {identitas.map(([nama, nilai]) => (
                <tr key={nama} className="border-t border-slate-100 first:border-t-0">
                  <td className="px-4 py-2 text-slate-500 w-1/2">{nama}</td>
                  <td className="px-4 py-2 text-slate-900 font-medium">
                    {nilai ?? <span className="text-amber-600 font-normal">tidak terbaca</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border-b">
              Statistik Utama (Rp)
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {statistik.map(([nama, nilai]) => (
                  <tr key={nama} className="border-t border-slate-100 first:border-t-0">
                    <td className="px-4 py-2 text-slate-500">{nama}</td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums text-slate-900">
                      {fmtRp(nilai ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <h3 className="px-4 py-3 text-sm font-semibold text-slate-800 bg-slate-50 border-b">
              Temuan per Kategori
            </h3>
            <table className="w-full text-sm">
              <tbody>
                {kategori.map((k) => (
                  <tr key={k.kategori} className="border-t border-slate-100 first:border-t-0">
                    <td className="px-4 py-2 text-slate-500">
                      <span className="font-mono font-semibold text-slate-700 mr-2">{k.kategori}</span>
                      {k.judul}
                    </td>
                    <td className="px-4 py-2 text-right font-semibold tabular-nums w-14">
                      {k.jumlah}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
