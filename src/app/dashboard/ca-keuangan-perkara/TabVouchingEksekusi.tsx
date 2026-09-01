'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, X } from 'lucide-react'
import { kosongKwitansi, type BarisKwitansi } from '@/lib/ca-keuangan-perkara/kwitansi'
import type { NomorPerkaraMentah } from '@/lib/ca-keuangan-perkara/parse-jur'

type Props = {
  daftar: NomorPerkaraMentah[]
  onHasilBerubah: (data: BarisKwitansi[]) => void
}

export default function TabVouchingEksekusi({ daftar, onHasilBerubah }: Props) {
  const urut = useMemo(
    () => [...daftar].sort((a, b) => a.nomorPerkara.localeCompare(b.nomorPerkara)),
    [daftar],
  )

  const [data, setData] = useState<Record<string, BarisKwitansi>>(() =>
    Object.fromEntries(urut.map((p) => [p.nomorPerkara, kosongKwitansi(p)])))

  const hasil = useMemo(
    () => urut.map((p) => data[p.nomorPerkara] ?? kosongKwitansi(p)),
    [urut, data],
  )

  useEffect(() => { onHasilBerubah(hasil) }, [hasil, onHasilBerubah])

  function ubah(p: NomorPerkaraMentah, patch: Partial<BarisKwitansi>) {
    setData((lama) => ({
      ...lama,
      [p.nomorPerkara]: { ...(lama[p.nomorPerkara] ?? kosongKwitansi(p)), ...patch },
    }))
  }

  if (urut.length === 0) {
    return (
      <p className="text-sm text-slate-500 py-8 text-center">
        Tidak ada berkas Eksekusi yang diunggah — tidak ada Nomor Perkara untuk dicek.
      </p>
    )
  }

  const lengkap = hasil.filter((h) => h.adaKwitansi).length

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        {urut.length} Nomor Perkara Eksekusi (seluruhnya, tanpa disaring status perkara) —
        tandai kelengkapan bukti kwitansi transport eksekusi/peninjauan setempat.
        {' '}{lengkap} dari {urut.length} sudah ada bukti.
      </p>

      <div className="overflow-x-auto rounded-xl border border-slate-200 max-h-[32rem] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500 sticky top-0">
            <tr>
              <th className="text-left font-semibold px-3 py-2">Nomor Perkara</th>
              <th className="text-left font-semibold px-3 py-2 w-20">Tahun</th>
              <th className="text-center font-semibold px-3 py-2 w-36">Bukti Kwitansi</th>
              <th className="text-left font-semibold px-3 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {urut.map((p) => {
              const h = data[p.nomorPerkara] ?? kosongKwitansi(p)
              return (
                <tr key={p.nomorPerkara} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-700">{p.nomorPerkara}</td>
                  <td className="px-3 py-2 text-xs text-slate-700">{p.tahun ?? '—'}</td>
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
    </div>
  )
}
