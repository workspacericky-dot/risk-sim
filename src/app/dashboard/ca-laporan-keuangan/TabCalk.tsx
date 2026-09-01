'use client'

import { Fragment, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import type { DataLk, Temuan } from '@/lib/ca-laporan-keuangan/konstanta'

export default function TabCalk({ data, temuan }: { data: DataLk; temuan: Temuan[] }) {
  const [terbuka, setTerbuka] = useState<string | null>(null)

  const bermasalah = (kode: string) => temuan.some((t) => t.pos.startsWith(`CaLK ${kode} `))

  const semuaTabel = [...new Set([...data.tabelTerdaftar.keys(), ...data.tabelMuncul.keys()])]
    .sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">
          Indeks Catatan ({data.calk.length} sub-bab)
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2 w-24">Kode</th>
                <th className="text-left font-semibold px-3 py-2">Judul Pos</th>
                <th className="text-center font-semibold px-3 py-2 w-16">Hal.</th>
                <th className="text-center font-semibold px-3 py-2 w-28">Nilai Disebut</th>
                <th className="text-center font-semibold px-3 py-2 w-36">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.calk.map((s, i) => {
                const perluTinjau = bermasalah(s.kode)
                const kosong = s.narasi.trim() === ''
                const kunci = `${s.kode}-${i}`
                return (
                  <Fragment key={kunci}>
                    <tr
                      onClick={() => setTerbuka(terbuka === kunci ? null : kunci)}
                      className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 ${
                        perluTinjau ? 'bg-orange-50/70' : kosong ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      <td className="px-3 py-2 font-mono font-semibold text-slate-700">{s.kode}</td>
                      <td className="px-3 py-2 text-slate-800">{s.judul}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-slate-500">{s.halaman}</td>
                      <td className="px-3 py-2 text-center tabular-nums text-slate-600">{s.nilai.length}</td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant="outline"
                          className={
                            perluTinjau ? 'bg-orange-100 text-orange-800 border-orange-300'
                              : kosong ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }
                        >
                          {perluTinjau ? 'Perlu Ditinjau' : kosong ? 'Narasi Kosong' : 'Lengkap'}
                        </Badge>
                      </td>
                    </tr>
                    {terbuka === kunci && (
                      <tr className="border-t border-slate-100 bg-slate-50/60">
                        <td colSpan={5} className="px-4 py-3">
                          <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                            {s.narasi || '(tidak ada narasi)'}
                          </p>
                          {s.nilai.length > 0 && (
                            <p className="mt-2 text-[11px] text-slate-500">
                              Nilai disebut: {s.nilai.map((n) => n.teks).join(' · ')}
                            </p>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {semuaTabel.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-800 mb-2">
            Daftar Tabel ({semuaTabel.length})
          </h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="text-center font-semibold px-3 py-2 w-20">No</th>
                  <th className="text-left font-semibold px-3 py-2">Judul</th>
                  <th className="text-center font-semibold px-3 py-2 w-28">Hal. Muncul</th>
                  <th className="text-center font-semibold px-3 py-2 w-36">Status</th>
                </tr>
              </thead>
              <tbody>
                {semuaTabel.map((n) => {
                  const terdaftar = data.tabelTerdaftar.has(n)
                  const muncul = data.tabelMuncul.get(n)
                  const status = terdaftar && muncul ? 'Lengkap' : terdaftar ? 'Tidak Ditemukan' : 'Tidak Terdaftar'
                  return (
                    <tr key={n} className={`border-t border-slate-100 ${status === 'Lengkap' ? '' : 'bg-amber-50/50'}`}>
                      <td className="px-3 py-1.5 text-center tabular-nums font-semibold text-slate-700">{n}</td>
                      <td className="px-3 py-1.5 text-slate-800">
                        {data.tabelTerdaftar.get(n) ?? <span className="text-slate-400">(tidak terdaftar)</span>}
                      </td>
                      <td className="px-3 py-1.5 text-center tabular-nums text-slate-500">{muncul ?? '—'}</td>
                      <td className="px-3 py-1.5 text-center text-xs text-slate-600">{status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
