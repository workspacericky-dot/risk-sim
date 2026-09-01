'use client'

import { useRef } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

type Props = {
  berkas: File | null
  setBerkas: (f: File | null) => void
}

export default function PanelUnggah({ berkas, setBerkas }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  function ambil(daftar: FileList | null) {
    const pdf = [...(daftar ?? [])].find((f) => f.name.toLowerCase().endsWith('.pdf'))
    if (pdf) setBerkas(pdf)
  }

  return (
    <Card>
      <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
        <CardTitle className="text-lg">1 · Berkas Laporan Keuangan</CardTitle>
        <CardDescription>
          Satu berkas PDF Laporan Keuangan Satker cetakan SAKTI — lengkap dengan LRA,
          Neraca, LO, LPE, Neraca Percobaan, dan CaLK. Identitas satker dibaca
          otomatis dari dokumen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); ambil(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors"
        >
          <Upload className="w-7 h-7 text-slate-400" />
          <span className="text-sm font-medium text-slate-700">
            Seret berkas PDF ke sini, atau klik untuk memilih
          </span>
          <span className="text-xs text-slate-500 text-center max-w-lg">
            Gunakan cetakan lengkap (bukan per-laporan terpisah) agar uji konsistensi
            antar-laporan dapat dijalankan.
          </span>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => { ambil(e.target.files); e.target.value = '' }}
          />
        </div>

        {berkas && (
          <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
            <FileText className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm text-slate-800 truncate">{berkas.name}</p>
              <Badge variant="secondary" className="mt-1">
                {(berkas.size / 1024 / 1024).toFixed(2)} MB
              </Badge>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setBerkas(null)}
              title="Keluarkan berkas"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
