'use client'

import { useRef } from 'react'
import { Upload, X, AlertTriangle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  klasifikasiBerkas, jenisTerpakai, LABEL_JENIS, type JenisBerkas,
} from '@/lib/ca-keuangan-perkara/klasifikasi-file'
import { JENIS_PERKARA } from '@/lib/ca-keuangan-perkara/konstanta'

export type BerkasTerpilih = {
  id: string
  file: File
  jenis: JenisBerkas
  catatan: string
}

const PILIHAN_JENIS: JenisBerkas[] = [...JENIS_PERKARA, 'tidak-dipakai']

const WARNA_JENIS: Record<string, string> = {
  Gugatan: 'bg-sky-50 text-sky-700 border-sky-200',
  Permohonan: 'bg-orange-50 text-orange-700 border-orange-200',
  GS: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Banding: 'bg-amber-50 text-amber-700 border-amber-200',
  Kasasi: 'bg-pink-50 text-pink-700 border-pink-200',
  PK: 'bg-green-50 text-green-700 border-green-200',
  Eksekusi: 'bg-violet-50 text-violet-700 border-violet-200',
}

type Props = {
  namaSatker: string
  setNamaSatker: (v: string) => void
  berkas: BerkasTerpilih[]
  setBerkas: React.Dispatch<React.SetStateAction<BerkasTerpilih[]>>
}

export default function PanelUnggah({ namaSatker, setNamaSatker, berkas, setBerkas }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function tambah(daftar: FileList | null) {
    if (!daftar) return
    const baru: BerkasTerpilih[] = [...daftar].map((file) => {
      const k = klasifikasiBerkas(file.name)
      return {
        id: `${file.name}-${file.size}-${file.lastModified}`,
        file, jenis: k.jenis, catatan: k.catatan,
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
  const bermasalah = berkas.filter((b) => b.jenis === 'tidak-dikenali')

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">1 · Identitas Satker & Berkas Sumber</CardTitle>
        <CardDescription>
          Satu berkas .xls/.xlsx per jenis perkara (Gugatan, Permohonan, GS, Banding,
          Kasasi, PK, Eksekusi) — jenisnya dikenali otomatis dari nama berkas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2 max-w-md">
          <Label htmlFor="satker">Nama Satuan Kerja</Label>
          <Input
            id="satker"
            value={namaSatker}
            onChange={(e) => setNamaSatker(e.target.value)}
            placeholder="mis. MS Banda Aceh"
          />
          <p className="text-xs text-slate-500">Dipakai untuk judul bagan dan nama berkas ekspor.</p>
        </div>

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
            Boleh sekaligus banyak berkas — mis. <code className="bg-slate-100 px-1 rounded">jur_gugatan.xls</code>,
            {' '}<code className="bg-slate-100 px-1 rounded">jur_permohonan.xls</code>, dst.
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
                    {bermasalah.length} berkas tidak dikenali — pilih jenisnya manual di bawah.
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
                    <th className="text-left font-semibold px-3 py-2 w-56">Jenis Perkara</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {berkas.map((b) => (
                    <tr key={b.id} className="border-t border-slate-100">
                      <td className="px-3 py-2">
                        <span className="text-xs text-slate-700 break-all">{b.file.name}</span>
                        {b.catatan && (
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
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
