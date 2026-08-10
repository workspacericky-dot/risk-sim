'use client'

import { useEffect, useRef } from 'react'
import { Upload, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  klasifikasiBerkas, jenisTerpakai, LABEL_JENIS, type JenisBerkas,
} from '@/lib/ca-kepeg/klasifikasi-file'
import { NAMA_BULAN } from '@/lib/ca-kepeg/konstanta'

export type BerkasTerpilih = {
  id: string
  file: File
  jenis: JenisBerkas
  bulan: number | null
  catatan: string
}

const PILIHAN_JENIS: JenisBerkas[] = [
  'sikep', 'daftar-hadir', 'jabatan', 'uang-makan', 'daftar-pegawai', 'tidak-dipakai',
]

const WARNA_JENIS: Record<string, string> = {
  'sikep': 'bg-sky-50 text-sky-700 border-sky-200',
  'daftar-hadir': 'bg-violet-50 text-violet-700 border-violet-200',
  'jabatan': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'uang-makan': 'bg-amber-50 text-amber-700 border-amber-200',
  'daftar-pegawai': 'bg-slate-100 text-slate-700 border-slate-200',
}

type Props = {
  berkas: BerkasTerpilih[]
  setBerkas: React.Dispatch<React.SetStateAction<BerkasTerpilih[]>>
  tahun: number
}

export default function PanelUnggah({ berkas, setBerkas, tahun }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const tahunSebelum = useRef(tahun)

  // Tahun analisis ikut menentukan hasil klasifikasi — klasifikasi ulang saat berubah.
  useEffect(() => {
    if (tahunSebelum.current === tahun) return
    tahunSebelum.current = tahun
    setBerkas((lama) => lama.map((b) => {
      const k = klasifikasiBerkas(b.file.name, tahun)
      return { ...b, jenis: k.jenis, bulan: k.bulan, catatan: k.catatan }
    }))
  }, [tahun, setBerkas])

  function tambah(daftar: FileList | null) {
    if (!daftar) return
    const baru: BerkasTerpilih[] = [...daftar].map((file) => {
      const k = klasifikasiBerkas(file.name, tahun)
      return {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file, jenis: k.jenis, bulan: k.bulan, catatan: k.catatan,
      }
    })
    setBerkas((lama) => {
      const adaId = new Set(lama.map((b) => b.id))
      return [...lama, ...baru.filter((b) => !adaId.has(b.id))]
    })
  }

  function ubah(id: string, patch: Partial<BerkasTerpilih>) {
    setBerkas((lama) => lama.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }

  function hapus(id: string) {
    setBerkas((lama) => lama.filter((b) => b.id !== id))
  }

  const dipakai = berkas.filter((b) => jenisTerpakai(b.jenis))
  const bermasalah = berkas.filter((b) => b.catatan !== '' && jenisTerpakai(b.jenis))

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">2 · Unggah Berkas</CardTitle>
        <CardDescription>
          Masukkan seluruh berkas sekaligus — jenis dan bulannya dikenali dari nama berkas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); tambah(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-7 h-7 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            Seret berkas ke sini, atau klik untuk memilih
          </span>
          <span className="text-xs text-slate-500 text-center max-w-lg">
            SIKEP <code className="bg-slate-100 px-1 rounded">.xls</code> bulanan ·
            KOMDANAS <code className="bg-slate-100 px-1 rounded">01_daftar_hadir</code>,
            <code className="bg-slate-100 px-1 rounded">03_jabatan_dan_SK</code>,
            <code className="bg-slate-100 px-1 rounded">00_uang_makan</code> ·
            <code className="bg-slate-100 px-1 rounded">daftar_pegawai.xlsx</code>
          </span>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => { tambah(e.target.files); e.target.value = '' }}
          />
        </div>

        {berkas.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                <Badge variant="secondary">{berkas.length} berkas</Badge>
                <Badge variant="secondary">{dipakai.length} dipakai analisis</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setBerkas([])}>
                Kosongkan daftar
              </Button>
            </div>

            {bermasalah.length > 0 && (
              <div className="flex gap-2 items-start rounded-lg border border-amber-200 bg-amber-50 p-3">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <p className="font-semibold">
                    {bermasalah.length} berkas perlu diperiksa — perbaiki jenis/bulannya di bawah.
                  </p>
                  {bermasalah.slice(0, 3).map((b) => (
                    <p key={b.id}>{b.file.name}: {b.catatan}</p>
                  ))}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Nama Berkas</th>
                    <th className="text-left font-semibold px-3 py-2 w-56">Jenis</th>
                    <th className="text-left font-semibold px-3 py-2 w-36">Bulan</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {berkas.map((b) => {
                    const perluBulan = jenisTerpakai(b.jenis) && b.jenis !== 'daftar-pegawai'
                    return (
                      <tr key={b.id} className="border-t border-slate-100">
                        <td className="px-3 py-2">
                          <span className="text-xs text-slate-700 break-all">{b.file.name}</span>
                          {b.catatan && jenisTerpakai(b.jenis) && (
                            <p className="text-[11px] text-amber-700 mt-0.5">{b.catatan}</p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={b.jenis}
                            onChange={(e) => ubah(b.id, { jenis: e.target.value as JenisBerkas, catatan: '' })}
                            className={`w-full rounded border px-2 py-1 text-xs ${WARNA_JENIS[b.jenis] ?? 'border-slate-200 text-slate-500'}`}
                          >
                            {PILIHAN_JENIS.map((j) => (
                              <option key={j} value={j}>{LABEL_JENIS[j]}</option>
                            ))}
                            {b.jenis === 'tidak-dikenali' && (
                              <option value="tidak-dikenali">{LABEL_JENIS['tidak-dikenali']}</option>
                            )}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          {perluBulan ? (
                            <select
                              value={b.bulan ?? ''}
                              onChange={(e) => ubah(b.id, {
                                bulan: e.target.value ? Number(e.target.value) : null,
                                catatan: '',
                              })}
                              className="w-full rounded border border-slate-200 px-2 py-1 text-xs"
                            >
                              <option value="">— pilih —</option>
                              {NAMA_BULAN.map((n, i) => (
                                <option key={n} value={i + 1}>{n}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-2 py-2">
                          <button
                            onClick={() => hapus(b.id)}
                            className="text-slate-400 hover:text-red-600 transition-colors"
                            title="Keluarkan dari daftar"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
