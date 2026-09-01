'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import AnalisisRow from './AnalisisRow'

type AnalisisRecord = {
  level_kemungkinan?: number | null
  level_dampak?: number | null
  ada_pengendalian?: boolean | null
  existing_control?: string | null
  efektivitas_control?: boolean | null
  residual_kemungkinan?: number | null
  residual_dampak?: number | null
}

type RisikoItem = {
  id: string
  kode_risiko: string | null
  pernyataan_risiko: string
  kategori_risiko: string | null
  analisis: AnalisisRecord[] | null
}

type Props = {
  konteksId: string
  seleraRisiko: number
  risikoList: RisikoItem[]
  initialAnalisisCount: number
}

export default function AnalisisTable({
  konteksId,
  seleraRisiko,
  risikoList,
  initialAnalisisCount,
}: Props) {
  // Track which risikoIds have been saved in this session
  const [savedIds, setSavedIds] = useState<Set<string>>(
    () => new Set(
      risikoList
        .filter(r => r.analisis && r.analisis.length > 0)
        .map(r => r.id)
    )
  )

  const analisisCount = savedIds.size
  const total = risikoList.length

  function handleRowSaved(risikoId: string) {
    setSavedIds(prev => {
      if (prev.has(risikoId)) return prev          // already counted
      const next = new Set(prev)
      next.add(risikoId)
      return next
    })
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
        <div>
          <h3 className="font-serif font-semibold text-slate-800">Register Analisis Risiko</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Format: Lampiran Pedoman No. 6</p>
        </div>
        <Badge variant="outline" className="text-xs">
          {analisisCount}/{total} dianalisis
        </Badge>
      </div>

      <div className="overflow-x-auto">
        <table
          className="border-collapse text-xs"
          style={{ width: '100%', minWidth: 1260 }}
        >
          <colgroup>
            <col style={{ width: 72 }} />
            <col style={{ width: 200 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 130 }} />
            <col style={{ width: 88 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 70 }} />
            <col style={{ width: 72 }} />
            <col style={{ width: 100 }} />
            <col style={{ width: 62 }} />
          </colgroup>

          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-wide">
              <th className="border border-slate-300 bg-slate-200 text-slate-700 px-2 py-2 text-center" rowSpan={2}>
                Kode<br />Risiko<br /><span className="font-normal text-slate-400 normal-case">(1)</span>
              </th>
              <th className="border border-slate-300 bg-slate-200 text-slate-700 px-2 py-2 text-center" rowSpan={2}>
                Pernyataan Risiko<br /><span className="font-normal text-slate-400 normal-case">(2)</span>
              </th>
              <th className="border border-slate-300 bg-sky-100 text-sky-800 px-2 py-2 text-center" colSpan={4}>
                Skor/Nilai Risiko yang Melekat
              </th>
              <th className="border border-slate-300 bg-amber-100 text-amber-800 px-2 py-2 text-center" colSpan={3}>
                Pengendalian yang Ada
              </th>
              <th className="border border-slate-300 bg-indigo-100 text-indigo-800 px-2 py-2 text-center" colSpan={4}>
                Skor/Nilai Risiko Residu setelah Pengendalian
              </th>
              <th className="border border-slate-300 bg-slate-200 text-slate-700 px-2 py-2 text-center" rowSpan={2}>
                Aksi
              </th>
            </tr>
            <tr className="text-[10px]">
              <th className="border border-slate-300 bg-sky-50 text-slate-600 px-2 py-2 text-center">
                Skor<br />Prob.<br /><span className="font-normal text-slate-400">(3)</span>
              </th>
              <th className="border border-slate-300 bg-sky-50 text-slate-600 px-2 py-2 text-center">
                Skor<br />Dampak<br /><span className="font-normal text-slate-400">(4)</span>
              </th>
              <th className="border border-slate-300 bg-sky-100 text-sky-700 font-semibold px-2 py-2 text-center">
                Besaran<br />Risiko<br /><span className="font-normal text-slate-400">(4a)</span>
              </th>
              <th className="border border-slate-300 bg-sky-50 text-slate-600 px-2 py-2 text-center">
                Level<br />Risiko<br /><span className="font-normal text-slate-400">(5)</span>
              </th>
              <th className="border border-slate-300 bg-amber-50 text-slate-600 px-2 py-2 text-center">
                Ada/<br />Belum<br /><span className="font-normal text-slate-400">(6)</span>
              </th>
              <th className="border border-slate-300 bg-amber-50 text-slate-600 px-2 py-2 text-center">
                Uraian<br /><span className="font-normal text-slate-400">(7)</span>
              </th>
              <th className="border border-slate-300 bg-amber-50 text-slate-600 px-2 py-2 text-center">
                Memadai/<br />Belum<br /><span className="font-normal text-slate-400">(8)</span>
              </th>
              <th className="border border-slate-300 bg-indigo-50 text-slate-600 px-2 py-2 text-center">
                Skor<br />Prob.<br /><span className="font-normal text-slate-400">(9)</span>
              </th>
              <th className="border border-slate-300 bg-indigo-50 text-slate-600 px-2 py-2 text-center">
                Skor<br />Dampak<br /><span className="font-normal text-slate-400">(10)</span>
              </th>
              <th className="border border-slate-300 bg-indigo-100 text-indigo-700 font-semibold px-2 py-2 text-center">
                Besaran<br />Risiko<br /><span className="font-normal text-slate-400">(10a)</span>
              </th>
              <th className="border border-slate-300 bg-indigo-50 text-slate-600 px-2 py-2 text-center">
                Level<br />Risiko<br /><span className="font-normal text-slate-400">(11)</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {risikoList.length > 0 ? (
              risikoList.map((r) => {
                const a = r.analisis && r.analisis.length > 0 ? r.analisis[0] : null
                return (
                  <AnalisisRow
                    key={r.id}
                    risikoId={r.id}
                    kodeRisiko={r.kode_risiko}
                    pernyataanRisiko={r.pernyataan_risiko}
                    kategoriRisiko={r.kategori_risiko}
                    konteksId={konteksId}
                    seleraRisiko={seleraRisiko}
                    initialAnalisis={a}
                    onSaved={() => handleRowSaved(r.id)}
                  />
                )
              })
            ) : (
              <tr>
                <td
                  colSpan={14}
                  className="border border-slate-100 px-4 py-10 text-center text-muted-foreground"
                >
                  Belum ada risiko yang teridentifikasi untuk konteks ini.{' '}
                  <a
                    href={`/dashboard/identifikasi?konteks=${konteksId}`}
                    className="text-blue-600 underline"
                  >
                    Kembali ke Identifikasi
                  </a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Keterangan footer ────────────────────────── */}
      <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
        <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
          <p>Butir (a) : Diisi nama unit pemilik risiko</p>
          <p>Kolom 6 : Diisi ada atau belum ada pengendalian yang ada</p>
          <p>Butir (b) : Diisi tahun berjalan</p>
          <p>Kolom 7 : Diisi uraian pengendalian yang ada</p>
          <p>Kolom 1 : Kode risiko dari kolom 4 pada Lampiran 5</p>
          <p>Kolom 8 : Diisi memadai atau belum memadai</p>
          <p>Kolom 2 : Uraian risiko dari Lampiran 5</p>
          <p>Kolom 9 : Nilai kemungkinan risiko residu setelah pengendalian</p>
          <p>Kolom 3 : Nilai frekuensi kemungkinan risiko yang melekat</p>
          <p>Kolom 10 : Nilai dampak risiko residu setelah pengendalian</p>
          <p>Kolom 4 : Nilai dampak risiko yang melekat</p>
          <p>Kolom 10a : Besaran risiko residu dari matriks 5×5 (Lampiran 3)</p>
          <p>Kolom 4a : Besaran risiko melekat dari matriks 5×5 (Lampiran 3)</p>
          <p>Kolom 11 : Level risiko residu (1–5) dari tabel konversi</p>
          <p>Kolom 5 : Level risiko melekat (1–5) dari tabel konversi</p>
          <p></p>
        </div>
      </div>
    </div>
  )
}
