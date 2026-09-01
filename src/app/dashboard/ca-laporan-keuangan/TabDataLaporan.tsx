'use client'

import { useState } from 'react'
import { fmtPersen, fmtRp } from '@/lib/ca-laporan-keuangan/format'
import type { BarisLo, BarisNeraca, DataLk } from '@/lib/ca-laporan-keuangan/konstanta'

type SubTab = 'lra' | 'neraca' | 'lo' | 'lpe' | 'npAkrual' | 'npKas'

const LABEL: Record<SubTab, string> = {
  lra: 'LRA',
  neraca: 'Neraca',
  lo: 'Laporan Operasional',
  lpe: 'Perubahan Ekuitas',
  npAkrual: 'N. Percobaan Akrual',
  npKas: 'N. Percobaan Kas',
}

export default function TabDataLaporan({ data }: { data: DataLk }) {
  const tersedia = (Object.keys(LABEL) as SubTab[]).filter((k) => data[k].length > 0)
  const [aktif, setAktif] = useState<SubTab>(tersedia[0] ?? 'lra')

  if (tersedia.length === 0) {
    return <p className="text-sm text-slate-500">Tidak ada tabel laporan yang berhasil diekstraksi.</p>
  }

  const tahun = data.metadata.tahun ?? 0

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {tersedia.map((k) => (
          <button
            key={k}
            onClick={() => setAktif(k)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              aktif === k
                ? 'border-slate-800 bg-slate-800 text-white'
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
            }`}
          >
            {LABEL[k]} ({data[k].length})
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        {aktif === 'lra' && <TabelLra data={data} tahun={tahun} />}
        {(aktif === 'neraca' || aktif === 'lo' || aktif === 'lpe') && (
          <TabelEmpatKolom
            baris={data[aktif] as (BarisNeraca | BarisLo)[]}
            tahun={tahun}
            labelPos={aktif === 'neraca' ? 'Nama Perkiraan' : 'Uraian'}
          />
        )}
        {(aktif === 'npAkrual' || aktif === 'npKas') && (
          <TabelNp baris={data[aktif]} total={aktif === 'npAkrual' ? data.totalNpAkrual : data.totalNpKas} />
        )}
      </div>
    </div>
  )
}

const TH = 'text-left font-semibold px-3 py-2'
const THR = 'text-right font-semibold px-3 py-2'

function TabelLra({ data, tahun }: { data: DataLk; tahun: number }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className={TH}>Uraian</th>
          <th className={THR}>Anggaran {tahun}</th>
          <th className={THR}>Realisasi {tahun}</th>
          <th className={THR}>%</th>
          <th className={THR}>Anggaran {tahun - 1}</th>
          <th className={THR}>Realisasi {tahun - 1}</th>
          <th className={THR}>%</th>
          <th className="text-center font-semibold px-3 py-2 w-14">Hal.</th>
        </tr>
      </thead>
      <tbody>
        {data.lra.map((b, i) => (
          <tr key={`${b.uraian}-${i}`} className={`border-t border-slate-100 ${b.adalahJumlah ? 'bg-slate-50 font-semibold' : ''}`}>
            <td className="px-3 py-1.5 text-slate-800" style={{ paddingLeft: `${12 + Math.max(0, b.indent - 20) * 0.8}px` }}>
              {b.uraian}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.anggaran)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.realisasi)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{fmtPersen(b.persen)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.anggaranLalu)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.realisasiLalu)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{fmtPersen(b.persenLalu)}</td>
            <td className="px-3 py-1.5 text-center tabular-nums text-slate-400">{b.halaman}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelEmpatKolom({ baris, tahun, labelPos }: {
  baris: (BarisNeraca | BarisLo)[]; tahun: number; labelPos: string
}) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className={TH}>{labelPos}</th>
          <th className={THR}>{tahun}</th>
          <th className={THR}>{tahun - 1}</th>
          <th className={THR}>Kenaikan/(Penurunan)</th>
          <th className={THR}>%</th>
          <th className="text-center font-semibold px-3 py-2 w-14">Hal.</th>
        </tr>
      </thead>
      <tbody>
        {baris.map((b, i) => (
          <tr key={`${b.uraian}-${i}`} className={`border-t border-slate-100 ${b.adalahJumlah ? 'bg-slate-50 font-semibold' : ''}`}>
            <td className="px-3 py-1.5 text-slate-800" style={{ paddingLeft: `${12 + Math.max(0, b.indent - 20) * 0.8}px` }}>
              {b.uraian}
            </td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.nilai)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.nilaiLalu)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.kenaikan)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums text-slate-500">{fmtPersen(b.persen)}</td>
            <td className="px-3 py-1.5 text-center tabular-nums text-slate-400">{b.halaman}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function TabelNp({ baris, total }: {
  baris: DataLk['npAkrual']; total: DataLk['totalNpAkrual']
}) {
  const debet = baris.reduce((s, r) => s + (r.debet ?? 0), 0)
  const kredit = baris.reduce((s, r) => s + (r.kredit ?? 0), 0)

  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
        <tr>
          <th className="text-center font-semibold px-3 py-2 w-16">TRN</th>
          <th className="text-center font-semibold px-3 py-2 w-24">Kode Akun</th>
          <th className={TH}>Nama Akun</th>
          <th className={THR}>Debet</th>
          <th className={THR}>Kredit</th>
          <th className="text-center font-semibold px-3 py-2 w-14">Hal.</th>
        </tr>
      </thead>
      <tbody>
        {baris.map((b, i) => (
          <tr key={`${b.kodeAkun}-${i}`} className="border-t border-slate-100">
            <td className="px-3 py-1.5 text-center font-mono text-xs text-slate-500">{b.kodeTrn}</td>
            <td className="px-3 py-1.5 text-center font-mono text-xs text-slate-700">{b.kodeAkun}</td>
            <td className="px-3 py-1.5 text-slate-800">{b.namaAkun}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.debet)}</td>
            <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(b.kredit)}</td>
            <td className="px-3 py-1.5 text-center tabular-nums text-slate-400">{b.halaman}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-slate-300 bg-slate-50 font-semibold">
          <td className="px-3 py-2 text-slate-800" colSpan={3}>
            JUMLAH (hitung ulang)
          </td>
          <td className="px-3 py-2 text-right tabular-nums">{fmtRp(debet)}</td>
          <td className="px-3 py-2 text-right tabular-nums">{fmtRp(kredit)}</td>
          <td />
        </tr>
        <tr className="bg-slate-50 text-slate-500">
          <td className="px-3 py-1.5" colSpan={3}>JUMLAH (tercetak di PDF)</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(total.debet)}</td>
          <td className="px-3 py-1.5 text-right tabular-nums">{fmtRp(total.kredit)}</td>
          <td />
        </tr>
      </tbody>
    </table>
  )
}
