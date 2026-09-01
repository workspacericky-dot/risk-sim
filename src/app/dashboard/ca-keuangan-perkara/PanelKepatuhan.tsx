'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Upload, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PetaKalender } from '@/lib/ca-kepeg/konstanta'
import type { BarisPivot } from '@/lib/ca-keuangan-perkara/parse-jur'
import {
  hitungStatus, parseFileKepatuhan, type HasilKepatuhan, type InputKepatuhan,
} from '@/lib/ca-keuangan-perkara/kepatuhan'
import type { Media } from '@/lib/ca-keuangan-perkara/konstanta'

const WARNA_STATUS: Record<HasilKepatuhan['status'], string> = {
  'Sesuai (≤3 hari kerja)': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'PERLU KONFIRMASI MANUAL': 'bg-red-50 text-red-700 border-red-200',
  'Data tanggal belum lengkap': 'bg-amber-50 text-amber-700 border-amber-200',
}

const PRIORITAS_STATUS: Record<HasilKepatuhan['status'], number> = {
  'PERLU KONFIRMASI MANUAL': 0,
  'Data tanggal belum lengkap': 1,
  'Sesuai (≤3 hari kerja)': 2,
}

function kosong(nomorPerkara: string): InputKepatuhan {
  return { nomorPerkara, media: null, tglPutusan: null, tglUnggahECourt: null, tglDiberitahukan: null }
}

function rupiah(n: number): string {
  return `Rp ${new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(n)}`
}

type Props = {
  daftarSaldoPositif: BarisPivot[]
  peta: PetaKalender
  onHasilBerubah: (hasil: HasilKepatuhan[]) => void
}

export default function PanelKepatuhan({ daftarSaldoPositif, peta, onHasilBerubah }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dataInput, setDataInput] = useState<Record<string, InputKepatuhan>>(() =>
    Object.fromEntries(daftarSaldoPositif.map((p) => [p.nomorPerkara, kosong(p.nomorPerkara)])))
  const [catatanUnggah, setCatatanUnggah] = useState<string | null>(null)

  const petaSisa = useMemo(
    () => new Map(daftarSaldoPositif.map((p) => [p.nomorPerkara, p.sisa])),
    [daftarSaldoPositif],
  )

  const hasil = useMemo(
    () => daftarSaldoPositif
      .map((p) => hitungStatus(dataInput[p.nomorPerkara] ?? kosong(p.nomorPerkara), peta))
      .sort((a, b) => PRIORITAS_STATUS[a.status] - PRIORITAS_STATUS[b.status] || a.nomorPerkara.localeCompare(b.nomorPerkara)),
    [daftarSaldoPositif, dataInput, peta],
  )

  useEffect(() => { onHasilBerubah(hasil) }, [hasil, onHasilBerubah])

  function ubah(nomorPerkara: string, patch: Partial<InputKepatuhan>) {
    setDataInput((lama) => ({
      ...lama,
      [nomorPerkara]: { ...(lama[nomorPerkara] ?? kosong(nomorPerkara)), ...patch },
    }))
  }

  async function unggahFileKedua(file: File) {
    const buf = await file.arrayBuffer()
    const { data, kolomHilang } = parseFileKepatuhan(buf)

    let cocok = 0
    setDataInput((lama) => {
      const baru = { ...lama }
      for (const p of daftarSaldoPositif) {
        const dariFile = data[p.nomorPerkara]
        if (!dariFile) continue
        cocok++
        baru[p.nomorPerkara] = { ...baru[p.nomorPerkara], ...dariFile, nomorPerkara: p.nomorPerkara }
      }
      return baru
    })

    const pesanKolom = kolomHilang.length > 0
      ? ` Kolom tidak ditemukan: ${kolomHilang.join(', ')}.`
      : ''
    setCatatanUnggah(`${file.name} — ${cocok} dari ${daftarSaldoPositif.length} perkara cocok by Nomor Perkara.${pesanKolom}`)
  }

  const lengkap = hasil.filter((h) => h.status !== 'Data tanggal belum lengkap').length

  if (daftarSaldoPositif.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">3 · Uji Kepatuhan Pemberitahuan Sisa Panjar</CardTitle>
        <CardDescription>
          {daftarSaldoPositif.length} perkara bersaldo positif — isi 4 tanggal per perkara
          (langsung di tabel, atau unggah file rekap kedua) untuk menghitung status otomatis.
          {' '}{lengkap} dari {daftarSaldoPositif.length} sudah lengkap.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Upload className="w-4 h-4" /> Unggah rekap tanggal (opsional)
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) unggahFileKedua(f)
              e.target.value = ''
            }}
          />
          {catatanUnggah && <p className="text-xs text-slate-500">{catatanUnggah}</p>}
        </div>

        <div className="flex gap-2 items-start rounded-lg border border-slate-200 bg-slate-50 p-3">
          <ShieldCheck className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            Tanggal mulai acuan otomatis mengikuti Media: <b>Elektronik</b> → Tgl Unggah e-Court,
            <b> Manual</b> → Tgl Putusan. Hari kerja mengecualikan Sabtu/Minggu dan kalender libur
            yang sama dengan modul CA Bid. Kepegawaian.
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-left font-semibold px-3 py-2">Nomor Perkara</th>
                <th className="text-right font-semibold px-3 py-2 w-32">Sisa Panjar</th>
                <th className="text-left font-semibold px-3 py-2 w-28">Media</th>
                <th className="text-left font-semibold px-3 py-2 w-36">Tgl Putusan</th>
                <th className="text-left font-semibold px-3 py-2 w-36">Tgl Unggah e-Court</th>
                <th className="text-left font-semibold px-3 py-2 w-36">Tgl Diberitahukan</th>
                <th className="text-left font-semibold px-3 py-2 w-20">Hari Kerja</th>
                <th className="text-left font-semibold px-3 py-2 w-52">Status</th>
              </tr>
            </thead>
            <tbody>
              {hasil.map((h) => (
                <tr key={h.nomorPerkara} className="border-t border-slate-100">
                  <td className="px-3 py-2 text-xs text-slate-700">{h.nomorPerkara}</td>
                  <td className="px-3 py-2 text-xs text-slate-700 text-right tabular-nums">
                    {rupiah(petaSisa.get(h.nomorPerkara) ?? 0)}
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={h.media ?? ''}
                      onChange={(e) => ubah(h.nomorPerkara, { media: (e.target.value || null) as Media | null })}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                    >
                      <option value="">— pilih —</option>
                      <option value="Elektronik">Elektronik</option>
                      <option value="Manual">Manual</option>
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={h.tglPutusan ?? ''}
                      onChange={(e) => ubah(h.nomorPerkara, { tglPutusan: e.target.value || null })}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={h.tglUnggahECourt ?? ''}
                      onChange={(e) => ubah(h.nomorPerkara, { tglUnggahECourt: e.target.value || null })}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <input
                      type="date"
                      value={h.tglDiberitahukan ?? ''}
                      onChange={(e) => ubah(h.nomorPerkara, { tglDiberitahukan: e.target.value || null })}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-700 text-center">{h.lamaHariKerja ?? '—'}</td>
                  <td className="px-2 py-2">
                    <Badge variant="outline" className={`text-[11px] ${WARNA_STATUS[h.status]}`}>
                      {h.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
