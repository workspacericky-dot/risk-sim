'use client'

import { useMemo } from 'react'
import { RotateCcw, CalendarDays, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { EntriKalender } from '@/lib/ca-kepeg/kalender'
import {
  HARI_KERJA, JAM_KERJA_DEFAULT,
  type HariKerja, type KonfigJamKerja,
} from '@/lib/ca-kepeg/konstanta'

type Props = {
  namaSatker: string
  setNamaSatker: (v: string) => void
  tahun: number
  setTahun: (v: number) => void
  tahunTersedia: number[]
  jamKerja: KonfigJamKerja
  setJamKerja: (v: KonfigJamKerja) => void
  kalender: EntriKalender[]
}

export default function PanelSetup({
  namaSatker, setNamaSatker, tahun, setTahun, tahunTersedia,
  jamKerja, setJamKerja, kalender,
}: Props) {
  const ringkasan = useMemo(() => {
    const tahunIni = kalender.filter((e) => e.tanggal.startsWith(String(tahun)))
    const ramadhan = tahunIni.filter((e) => e.kategori === 'Ramadhan')
    const daerah = tahunIni.filter((e) => e.kategori === 'Libur Daerah')
    return {
      libur: tahunIni.length - ramadhan.length - daerah.length,
      liburDaerah: daerah.length,
      ramadhan: ramadhan.length,
      awalRamadhan: ramadhan[0]?.tanggal ?? null,
      akhirRamadhan: ramadhan[ramadhan.length - 1]?.tanggal ?? null,
    }
  }, [kalender, tahun])

  function ubahJam(mode: 'biasa' | 'ramadhan', hari: HariKerja, sisi: 'masuk' | 'pulang', nilai: string) {
    setJamKerja({
      ...jamKerja,
      [mode]: { ...jamKerja[mode], [hari]: { ...jamKerja[mode][hari], [sisi]: nilai } },
    })
  }

  const berubahDariBawaan = JSON.stringify(jamKerja) !== JSON.stringify(JAM_KERJA_DEFAULT)

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">1 · Parameter Analisis</CardTitle>
        <CardDescription>Identitas satker, tahun, dan standar jam kerja</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="satker">Nama Satuan Kerja</Label>
            <Input
              id="satker"
              value={namaSatker}
              onChange={(e) => setNamaSatker(e.target.value)}
              placeholder="mis. PA Bantul"
            />
            <p className="text-xs text-slate-500">Dipakai untuk judul bagan dan nama berkas ekspor.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tahun">Tahun Analisis</Label>
            <select
              id="tahun"
              value={tahun}
              onChange={(e) => setTahun(Number(e.target.value))}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
            >
              {tahunTersedia.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <p className="text-xs text-slate-500">Pilihan berasal dari kalender yang disediakan Admin Sistem.</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-semibold text-slate-800">Kalender {tahun}</span>
          </div>
          {ringkasan.libur === 0 && ringkasan.ramadhan === 0 ? (
            <p className="text-xs text-amber-700">
              Belum ada tanggal untuk tahun {tahun}. Seluruh hari Senin–Jumat akan
              dianggap hari kerja biasa.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              <Badge variant="secondary">{ringkasan.libur} libur / cuti bersama</Badge>
              {ringkasan.liburDaerah > 0 && (
                <Badge variant="secondary">{ringkasan.liburDaerah} libur daerah</Badge>
              )}
              <Badge variant="secondary">{ringkasan.ramadhan} hari Ramadhan</Badge>
              {ringkasan.awalRamadhan && (
                <span className="text-xs text-slate-500">
                  Ramadhan {ringkasan.awalRamadhan} s.d {ringkasan.akhirRamadhan}
                </span>
              )}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-3 gap-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-sm font-semibold text-slate-800">Standar Jam Kerja</span>
            </div>
            {berubahDariBawaan && (
              <Button variant="ghost" size="sm" onClick={() => setJamKerja(JAM_KERJA_DEFAULT)}>
                <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Kembalikan bawaan
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(['biasa', 'ramadhan'] as const).map((mode) => (
              <div key={mode} className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700 uppercase tracking-wide">
                  {mode === 'biasa' ? 'Hari Biasa' : 'Bulan Ramadhan'}
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[11px] text-slate-500 border-b border-slate-200">
                      <th className="text-left font-medium px-3 py-1.5">Hari</th>
                      <th className="text-left font-medium px-3 py-1.5">Masuk</th>
                      <th className="text-left font-medium px-3 py-1.5">Pulang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {HARI_KERJA.map((hari) => (
                      <tr key={hari} className="border-b border-slate-100 last:border-0">
                        <td className="px-3 py-1.5 text-slate-700">{hari}</td>
                        <td className="px-2 py-1">
                          <input
                            type="time"
                            value={jamKerja[mode][hari].masuk}
                            onChange={(e) => ubahJam(mode, hari, 'masuk', e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="time"
                            value={jamKerja[mode][hari].pulang}
                            onChange={(e) => ubahJam(mode, hari, 'pulang', e.target.value)}
                            className="w-full rounded border border-slate-200 px-2 py-1 text-xs font-mono"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-500 mt-3">
            Keterlambatan dan pulang cepat dihitung terhadap jam ini. Tanggal yang
            berkategori Ramadhan otomatis memakai tabel kanan.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
