'use client'

import { useCallback, useMemo, useState } from 'react'
import { Play, RotateCcw, ShieldCheck, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bangunPetaKalender, type EntriKalender } from '@/lib/ca-kepeg/kalender'
import { jenisTerpakai } from '@/lib/ca-keuangan-perkara/klasifikasi-file'
import type { JenisPerkara } from '@/lib/ca-keuangan-perkara/konstanta'
import { parseBerkasJur, type BarisPivot } from '@/lib/ca-keuangan-perkara/parse-jur'
import { jalankanAnalisisSaldo, type HasilAnalisisSaldo } from '@/lib/ca-keuangan-perkara/analisis-saldo'
import type { HasilKepatuhan } from '@/lib/ca-keuangan-perkara/kepatuhan'
import type { BarisKwitansi } from '@/lib/ca-keuangan-perkara/kwitansi'
import { bangunWorkbook, namaBerkasEkspor } from '@/lib/ca-keuangan-perkara/export-excel'
import PanelUnggah, { type BerkasTerpilih } from './PanelUnggah'
import PanelHasilSaldo from './PanelHasilSaldo'
import PanelKepatuhan from './PanelKepatuhan'
import PanelKwitansiEksekusi from './PanelKwitansiEksekusi'

type Langkah = 'siap' | 'memproses' | 'selesai'

export default function CaKeuanganPerkaraClient({ kalender }: { kalender: EntriKalender[] }) {
  const [namaSatker, setNamaSatker] = useState('')
  const [berkas, setBerkas] = useState<BerkasTerpilih[]>([])

  const [langkah, setLangkah] = useState<Langkah>('siap')
  const [progres, setProgres] = useState<string[]>([])
  const [hasil, setHasil] = useState<HasilAnalisisSaldo | null>(null)
  const [kepatuhan, setKepatuhan] = useState<HasilKepatuhan[]>([])
  const [kwitansiEksekusi, setKwitansiEksekusi] = useState<BarisKwitansi[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [mengunduh, setMengunduh] = useState(false)

  const petaKalender = useMemo(() => bangunPetaKalender(kalender), [kalender])
  const onHasilKepatuhanBerubah = useCallback((h: HasilKepatuhan[]) => setKepatuhan(h), [])
  const onKwitansiBerubah = useCallback((h: BarisKwitansi[]) => setKwitansiEksekusi(h), [])

  const terpakai = berkas.filter(
    (b): b is BerkasTerpilih & { jenis: JenisPerkara } => jenisTerpakai(b.jenis),
  )
  const bisaJalan = namaSatker.trim() !== '' && terpakai.length > 0

  function catat(baris: string) {
    setProgres((s) => [...s, baris])
  }

  async function jalankan() {
    setLangkah('memproses')
    setProgres([])
    setGalat(null)
    setHasil(null)
    setKepatuhan([])
    setKwitansiEksekusi([])

    try {
      const pivotGabungan: BarisPivot[] = []

      for (const b of terpakai) {
        // Beri kesempatan browser menggambar ulang progres di antara berkas.
        await new Promise((r) => setTimeout(r, 0))
        const buf = await b.file.arrayBuffer()
        const parsed = parseBerkasJur(buf, b.jenis, b.file.name)

        if (parsed.kolomHilang.length > 0) {
          catat(`[LEWAT] ${b.file.name} (${b.jenis}) — kolom tidak ditemukan: ${parsed.kolomHilang.join(', ')}`)
          continue
        }

        catat(`${b.file.name} (${b.jenis}) — ${parsed.jumlahBarisData} baris, ${parsed.jumlahBarisTerfilter} terfilter (perkara berakhir)`)
        pivotGabungan.push(...parsed.pivot)
      }

      if (pivotGabungan.length === 0) {
        throw new Error('Tidak ada baris perkara berakhir (Proses Terakhir sesuai filter) pada berkas manapun.')
      }

      const analisis = jalankanAnalisisSaldo(pivotGabungan)
      catat(`Selesai — ${analisis.daftarSaldoPositif.length} perkara saldo positif, ${analisis.daftarAnomali.length} anomali saldo negatif.`)
      setHasil(analisis)
      setLangkah('selesai')
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
      setLangkah('siap')
    }
  }

  function ulangi() {
    setLangkah('siap')
    setHasil(null)
    setKepatuhan([])
    setKwitansiEksekusi([])
    setProgres([])
    setGalat(null)
  }

  async function unduh() {
    if (!hasil) return
    setMengunduh(true)
    try {
      const blob = await bangunWorkbook(namaSatker.trim() || 'Satker', hasil, kepatuhan, kwitansiEksekusi)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = namaBerkasEkspor(namaSatker.trim() || 'Satker')
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setMengunduh(false)
    }
  }

  if (langkah === 'selesai' && hasil) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{namaSatker.trim() || 'Satker'}</span>
            {' · '}{hasil.pivot.length} perkara dianalisis
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={unduh} disabled={mengunduh}>
              <Download className="w-4 h-4 mr-2" /> {mengunduh ? 'Menyusun…' : 'Unduh Excel'}
            </Button>
            <Button variant="outline" size="sm" onClick={ulangi}>
              <RotateCcw className="w-4 h-4 mr-2" /> Analisis Baru
            </Button>
          </div>
        </div>

        <PanelHasilSaldo hasil={hasil} />
        <PanelKepatuhan
          daftarSaldoPositif={hasil.daftarSaldoPositif}
          peta={petaKalender}
          onHasilBerubah={onHasilKepatuhanBerubah}
        />
        <PanelKwitansiEksekusi pivot={hasil.pivot} onHasilBerubah={onKwitansiBerubah} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-start rounded-xl border border-slate-200 bg-white/70 p-4">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Berkas diproses di perangkat Anda dan tidak pernah dikirim ke server.
          Hasil analisis hilang saat halaman dimuat ulang — unduh Excel bila ingin menyimpannya.
        </p>
      </div>

      <PanelUnggah namaSatker={namaSatker} setNamaSatker={setNamaSatker} berkas={berkas} setBerkas={setBerkas} />

      {galat && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Gagal memproses: {galat}
        </div>
      )}

      {progres.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-slate-900 p-4 max-h-64 overflow-y-auto">
          <pre className="text-[11px] leading-relaxed text-slate-200 font-mono whitespace-pre-wrap">
            {progres.join('\n')}
          </pre>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={jalankan} disabled={!bisaJalan || langkah === 'memproses'} size="lg">
          <Play className="w-4 h-4 mr-2" />
          {langkah === 'memproses' ? 'Memproses…' : 'Jalankan Analisis'}
        </Button>
        {!bisaJalan && (
          <p className="text-xs text-slate-500">
            {namaSatker.trim() === '' && 'Isi nama satker. '}
            {terpakai.length === 0 && 'Unggah minimal satu berkas jenis perkara.'}
          </p>
        )}
      </div>
    </div>
  )
}
