'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { BarisPivot } from '@/lib/ca-keuangan-perkara/parse-jur'
import { filterEksekusi, kosongKwitansi, type BarisKwitansi } from '@/lib/ca-keuangan-perkara/kwitansi'

function rupiah(n: number): string {
  const nilai = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n))
  return `${n < 0 ? '−' : ''}Rp ${nilai}`
}

type Props = {
  pivot: BarisPivot[]
  onHasilBerubah: (data: BarisKwitansi[]) => void
}

export default function PanelKwitansiEksekusi({ pivot, onHasilBerubah }: Props) {
  const eksekusi = useMemo(() => filterEksekusi(pivot), [pivot])

  const [data, setData] = useState<Record<string, BarisKwitansi>>(() =>
    Object.fromEntries(eksekusi.map((p) => [p.nomorPerkara, kosongKwitansi(p)])))

  const hasil = useMemo(
    () => eksekusi.map((p) => data[p.nomorPerkara] ?? kosongKwitansi(p)),
    [eksekusi, data],
  )

  useEffect(() => { onHasilBerubah(hasil) }, [hasil, onHasilBerubah])

  function ubah(p: BarisPivot, patch: Partial<BarisKwitansi>) {
    setData((lama) => ({
      ...lama,
      [p.nomorPerkara]: { ...(lama[p.nomorPerkara] ?? kosongKwitansi(p)), ...patch },
    }))
  }

  if (eksekusi.length === 0) return null

  const lengkap = hasil.filter((h) => h.adaKwitansi).length

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">4 · Cek Kelengkapan Kwitansi Eksekusi</CardTitle>
        <CardDescription>
          {eksekusi.length} perkara jenis Eksekusi — tandai apakah bukti kwitansi sudah ada, beri catatan bila perlu.
          {' '}{lengkap} dari {eksekusi.length} sudah ada bukti.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Nomor Perkara</th>
                <th className="text-left font-semibold px-3 py-2 w-20">Tahun</th>
                <th className="text-right font-semibold px-3 py-2 w-36">Sum of Sisa</th>
                <th className="text-center font-semibold px-3 py-2 w-36">Bukti Kwitansi</th>
                <th className="text-left font-semibold px-3 py-2">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {eksekusi.map((p) => {
                const h = data[p.nomorPerkara] ?? kosongKwitansi(p)
                return (
                  <tr key={p.nomorPerkara} className="border-t border-slate-100">
                    <td className="px-3 py-2 text-xs text-slate-700">{p.nomorPerkara}</td>
                    <td className="px-3 py-2 text-xs text-slate-700">{p.tahun ?? '—'}</td>
                    <td className="px-3 py-2 text-right text-xs text-slate-700 tabular-nums">{rupiah(p.sisa)}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        onClick={() => ubah(p, { adaKwitansi: !h.adaKwitansi })}
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${
                          h.adaKwitansi
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-600'
                            : 'bg-red-50 border-red-300 text-red-500'
                        }`}
                        title={h.adaKwitansi
                          ? 'Sudah ada bukti kwitansi — klik untuk batalkan'
                          : 'Belum ada bukti kwitansi — klik untuk tandai sudah ada'}
                      >
                        {h.adaKwitansi ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        type="text"
                        value={h.catatan}
                        onChange={(e) => ubah(p, { catatan: e.target.value })}
                        placeholder="Catatan…"
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
