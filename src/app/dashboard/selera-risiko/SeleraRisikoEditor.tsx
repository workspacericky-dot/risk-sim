'use client'

import { useState, useTransition } from 'react'
import { RiskAppetiteMatrix } from '@/components/RiskAppetiteMatrix'
import { saveSeleraRisiko, type SeleraRisikoData } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { CheckCircle, AlertTriangle } from 'lucide-react'

interface Category {
  key: keyof Omit<SeleraRisikoData, 'catatan'>
  label: string
  description: string
  example: string
  color: string
  textColor: string
}

const CATEGORIES: Category[] = [
  {
    key:         'strategis',
    label:       'Strategis',
    description: 'Risiko terkait sasaran strategis organisasi',
    example:     'Contoh: nilai maks. diterima = 9',
    color:       'bg-blue-100',
    textColor:   'text-blue-800',
  },
  {
    key:         'kebijakan',
    label:       'Kebijakan',
    description: 'Risiko akibat perubahan atau ketidakjelasan kebijakan',
    example:     'Contoh: nilai maks. diterima = 9',
    color:       'bg-indigo-100',
    textColor:   'text-indigo-800',
  },
  {
    key:         'kecurangan',
    label:       'Kecurangan (Fraud)',
    description: 'Risiko kecurangan yang merugikan negara — toleransi sangat rendah',
    example:     'Contoh: nilai maks. diterima = 4',
    color:       'bg-red-100',
    textColor:   'text-red-800',
  },
  {
    key:         'bencana',
    label:       'Bencana',
    description: 'Risiko akibat bencana alam maupun non-alam',
    example:     'Contoh: nilai maks. diterima = 9',
    color:       'bg-rose-100',
    textColor:   'text-rose-800',
  },
  {
    key:         'kepatuhan',
    label:       'Kepatuhan',
    description: 'Risiko ketidakpatuhan terhadap regulasi dan peraturan',
    example:     'Contoh: nilai maks. diterima = 8 atau 9',
    color:       'bg-amber-100',
    textColor:   'text-amber-800',
  },
  {
    key:         'operasional',
    label:       'Operasional',
    description: 'Risiko dalam proses dan operasional sehari-hari',
    example:     'Contoh: nilai maks. diterima = 9',
    color:       'bg-violet-100',
    textColor:   'text-violet-800',
  },
  {
    key:         'kemitraan',
    label:       'Kemitraan',
    description: 'Risiko yang timbul dari hubungan kerja sama / mitra kerja',
    example:     'Contoh: nilai maks. diterima = 9',
    color:       'bg-teal-100',
    textColor:   'text-teal-800',
  },
]

interface Props {
  konteksId: string
  unitNama:  string
  tahun:     number
  initial:   SeleraRisikoData | null
}

export function SeleraRisikoEditor({ konteksId, unitNama, tahun, initial }: Props) {
  const [values, setValues] = useState<SeleraRisikoData>({
    strategis:   initial?.strategis   ?? 9,
    kebijakan:   initial?.kebijakan   ?? 9,
    kecurangan:  initial?.kecurangan  ?? 4,
    bencana:     initial?.bencana     ?? 9,
    kepatuhan:   initial?.kepatuhan   ?? 9,
    operasional: initial?.operasional ?? 9,
    kemitraan:   initial?.kemitraan   ?? 9,
    catatan:     initial?.catatan     ?? '',
  })
  const [saved,     setSaved]     = useState(false)
  const [errMsg,    setErrMsg]    = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleChange(key: keyof SeleraRisikoData, raw: string) {
    setSaved(false)
    if (key === 'catatan') {
      setValues((v) => ({ ...v, catatan: raw }))
      return
    }
    const num = parseInt(raw, 10)
    if (!isNaN(num) && num >= 1 && num <= 25) {
      setValues((v) => ({ ...v, [key]: num }))
    }
  }

  function handleSave() {
    setErrMsg(null)
    startTransition(async () => {
      try {
        await saveSeleraRisiko(konteksId, values)
        setSaved(true)
      } catch (e: unknown) {
        setErrMsg(e instanceof Error ? e.message : 'Gagal menyimpan.')
      }
    })
  }

  return (
    <div className="space-y-8">

      {/* Context banner */}
      <div className="rounded-xl border bg-white shadow-sm px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
          <span className="text-green-800 font-bold text-sm">{tahun}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{unitNama}</p>
          <p className="text-xs text-slate-500">Tahun Penerapan {tahun}</p>
        </div>
        <div className="ml-auto text-xs text-slate-400 text-right leading-relaxed">
          Nilai: <strong>1 – 25</strong><br />
          Risiko dengan skor <strong>&gt; nilai yang ditetapkan</strong> wajib dibuatkan RTP
        </div>
      </div>

      {/* ── SECTION 1: INPUT ── */}
      <div>
        <h3 className="text-lg font-serif font-semibold text-slate-800 mb-1">Penetapan Nilai Selera Risiko per Kategori</h3>
        <p className="text-xs text-slate-500 mb-4">
          Masukkan nilai numerik <strong>tertinggi yang masih dapat diterima</strong> (1–25) untuk setiap kategori risiko.
          Risiko yang nilainya <strong>melebihi</strong> angka ini wajib dibuatkan Rencana Tindak Pengendalian (RTP).
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {CATEGORIES.map((cat) => (
            <Card key={cat.key} className="border shadow-sm">
              <CardHeader className={`${cat.color} border-b py-3 px-4`}>
                <CardTitle className={`text-sm font-semibold ${cat.textColor}`}>{cat.label}</CardTitle>
                <CardDescription className="text-xs text-slate-600 mt-0.5">{cat.description}</CardDescription>
              </CardHeader>
              <CardContent className="pt-3 pb-4 px-4 space-y-2">
                <div className="flex items-center gap-3">
                  <Label htmlFor={`input-${cat.key}`} className="text-xs shrink-0 text-slate-600">
                    Nilai maks. diterima:
                  </Label>
                  <Input
                    id={`input-${cat.key}`}
                    type="number"
                    min={1}
                    max={25}
                    value={values[cat.key] as number}
                    onChange={(e) => handleChange(cat.key, e.target.value)}
                    className="w-20 text-center font-bold text-lg h-10"
                  />
                </div>
                <p className="text-[10px] text-slate-400 italic">{cat.example}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Catatan */}
        <div className="mt-4 space-y-2">
          <Label htmlFor="catatan" className="text-sm">Catatan / Justifikasi (opsional)</Label>
          <Textarea
            id="catatan"
            rows={2}
            value={values.catatan ?? ''}
            onChange={(e) => handleChange('catatan', e.target.value)}
            placeholder="Misalnya: Penetapan nilai maks. kecurangan = 4 karena toleransi sangat rendah..."
            className="text-xs"
          />
        </div>

        {/* Save button + status */}
        <div className="mt-4 flex items-center gap-3">
          <Button onClick={handleSave} disabled={isPending} className="bg-green-800 hover:bg-green-900">
            {isPending ? 'Menyimpan...' : 'Simpan Selera Risiko'}
          </Button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-green-700">
              <CheckCircle className="w-4 h-4" />
              Berhasil disimpan
            </span>
          )}
          {errMsg && (
            <span className="flex items-center gap-1.5 text-sm text-red-700">
              <AlertTriangle className="w-4 h-4" />
              {errMsg}
            </span>
          )}
        </div>
      </div>

      {/* ── SECTION 2: OUTPUT MATRICES ── */}
      <div>
        <h3 className="text-lg font-serif font-semibold text-slate-800 mb-1">Peta Matriks Selera Risiko</h3>
        <p className="text-xs text-slate-500 mb-4">
          Area <span className="font-medium text-green-700">hijau</span> = nilai yang diterima (≤ nilai yang ditetapkan).
          Garis tebal hitam memisahkan area aman dari area yang{' '}
          <span className="font-medium text-red-700">wajib dimitigasi</span>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className={`${cat.color} border-b px-4 py-2.5 flex items-center justify-between`}>
                <span className={`text-xs font-semibold ${cat.textColor}`}>{cat.label}</span>
                <span className={`text-xs font-mono font-bold ${cat.textColor}`}>
                  Maks. diterima: {values[cat.key]}
                </span>
              </div>
              <div className="p-3">
                <RiskAppetiteMatrix threshold={values[cat.key] as number} compact />
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
