'use client'

import { useMemo, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { fmtRp, WARNA_BARIS_SEVERITY, WARNA_SEVERITY } from '@/lib/ca-laporan-keuangan/format'
import {
  JUDUL_KATEGORI, URUTAN_SEVERITY, type Kategori, type Severity, type Temuan,
} from '@/lib/ca-laporan-keuangan/konstanta'

export default function TabTemuan({ temuan }: { temuan: Temuan[] }) {
  const [severity, setSeverity] = useState<Severity | 'semua'>('semua')
  const [kategori, setKategori] = useState<Kategori | 'semua'>('semua')

  const tersaring = useMemo(
    () => temuan.filter(
      (t) => (severity === 'semua' || t.severity === severity)
        && (kategori === 'semua' || t.kategori === kategori),
    ),
    [temuan, severity, kategori],
  )

  const kategoriAda = (Object.keys(JUDUL_KATEGORI) as Kategori[])
    .filter((k) => temuan.some((t) => t.kategori === k))

  if (temuan.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-6">
        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
        <div>
          <p className="font-semibold text-emerald-900">Tidak ada temuan</p>
          <p className="text-sm text-emerald-800">
            Seluruh uji konsistensi, kalkulasi, dan narasi terlewati tanpa selisih.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Severity</p>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip aktif={severity === 'semua'} onClick={() => setSeverity('semua')}>
              Semua ({temuan.length})
            </FilterChip>
            {URUTAN_SEVERITY.filter((s) => temuan.some((t) => t.severity === s)).map((s) => (
              <FilterChip key={s} aktif={severity === s} onClick={() => setSeverity(s)}>
                {s} ({temuan.filter((t) => t.severity === s).length})
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Kategori</p>
          <div className="flex gap-1.5 flex-wrap">
            <FilterChip aktif={kategori === 'semua'} onClick={() => setKategori('semua')}>
              Semua
            </FilterChip>
            {kategoriAda.map((k) => (
              <FilterChip key={k} aktif={kategori === k} onClick={() => setKategori(k)}>
                {k} · {JUDUL_KATEGORI[k]}
              </FilterChip>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
            <tr>
              <th className="text-left font-semibold px-3 py-2 w-10">No</th>
              <th className="text-left font-semibold px-3 py-2 w-24">Severity</th>
              <th className="text-left font-semibold px-3 py-2 w-16">Kat.</th>
              <th className="text-left font-semibold px-3 py-2">Deskripsi Temuan</th>
              <th className="text-left font-semibold px-3 py-2 w-52">Pos/Akun</th>
              <th className="text-right font-semibold px-3 py-2 w-28">Tercetak</th>
              <th className="text-right font-semibold px-3 py-2 w-28">Hitung Ulang</th>
              <th className="text-right font-semibold px-3 py-2 w-24">Selisih</th>
              <th className="text-center font-semibold px-3 py-2 w-14">Hal.</th>
            </tr>
          </thead>
          <tbody>
            {tersaring.map((t, i) => (
              <tr key={`${t.kategori}-${t.pos}-${i}`} className={`border-t border-slate-100 ${WARNA_BARIS_SEVERITY[t.severity]}`}>
                <td className="px-3 py-2 text-slate-500 tabular-nums">{i + 1}</td>
                <td className="px-3 py-2">
                  <Badge variant="outline" className={WARNA_SEVERITY[t.severity]}>{t.severity}</Badge>
                </td>
                <td className="px-3 py-2 font-mono font-semibold text-slate-700" title={JUDUL_KATEGORI[t.kategori]}>
                  {t.kategori}
                </td>
                <td className="px-3 py-2 text-slate-800">
                  {t.deskripsi}
                  <p className="text-[11px] text-slate-500 mt-1">↳ {t.rekomendasi}</p>
                </td>
                <td className="px-3 py-2 text-slate-600 text-xs">{t.pos}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtRp(t.nilaiTercetak)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmtRp(t.nilaiHitung)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-semibold">{fmtRp(t.selisih)}</td>
                <td className="px-3 py-2 text-center tabular-nums text-slate-500">{t.halaman ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tersaring.length === 0 && (
        <p className="text-sm text-slate-500 text-center py-4">
          Tidak ada temuan yang cocok dengan filter.
        </p>
      )}
    </div>
  )
}

function FilterChip({ aktif, onClick, children }: {
  aktif: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        aktif
          ? 'border-slate-800 bg-slate-800 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-400'
      }`}
    >
      {children}
    </button>
  )
}
