'use client'

import { useState } from 'react'
import { Download, Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bangunWorkbook, namaBerkasEkspor } from '@/lib/ca-laporan-keuangan/export-excel'
import type { HasilProses } from '@/lib/ca-laporan-keuangan/proses'
import PanelUnggah from './PanelUnggah'
import TabCalk from './TabCalk'
import TabDataLaporan from './TabDataLaporan'
import TabRasioTren from './TabRasioTren'
import TabRingkasan from './TabRingkasan'
import TabTemuan from './TabTemuan'

type Tab = 'ringkasan' | 'temuan' | 'data' | 'calk' | 'rasio'

const LABEL_TAB: Record<Tab, string> = {
  ringkasan: 'Ringkasan Eksekutif',
  temuan: 'Temuan',
  data: 'Data Laporan',
  calk: 'CaLK Index',
  rasio: 'Rasio & Tren',
}

export default function CaLaporanKeuanganClient() {
  const [berkas, setBerkas] = useState<File | null>(null)
  const [memproses, setMemproses] = useState(false)
  const [hasil, setHasil] = useState<HasilProses | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ringkasan')
  const [mengunduh, setMengunduh] = useState(false)

  async function jalankan() {
    if (!berkas) return
    setMemproses(true)
    setGalat(null)
    setHasil(null)

    try {
      // Impor dinamis: pdf.js hanya dimuat saat analisis benar-benar dijalankan.
      const { prosesPdf } = await import('@/lib/ca-laporan-keuangan/proses')
      const buf = await berkas.arrayBuffer()
      const h = await prosesPdf(buf)

      if (h.data.lra.length === 0 && h.data.neraca.length === 0 && h.data.lo.length === 0) {
        throw new Error(
          'Tidak ada tabel laporan yang dikenali. Pastikan berkas adalah cetakan Laporan Keuangan Satker dari SAKTI.',
        )
      }

      setHasil(h)
      setTab('ringkasan')
    } catch (e) {
      setGalat(e instanceof Error ? e.message : String(e))
    } finally {
      setMemproses(false)
    }
  }

  function ulangi() {
    setHasil(null)
    setBerkas(null)
    setGalat(null)
  }

  async function unduh() {
    if (!hasil) return
    setMengunduh(true)
    try {
      const blob = await bangunWorkbook(hasil.data, hasil.temuan, hasil.rasio)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = namaBerkasEkspor(hasil.data.metadata.namaSatker)
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setMengunduh(false)
    }
  }

  if (hasil) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">
              {hasil.data.metadata.namaSatker ?? 'Satker'}
            </span>
            {' · '}TA {hasil.data.metadata.tahun ?? '—'}
            {' · '}{hasil.jumlahHalaman} halaman
            {' · '}{hasil.temuan.length} temuan
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

        <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
          {(Object.keys(LABEL_TAB) as Tab[]).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`whitespace-nowrap px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === k
                  ? 'border-slate-800 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {LABEL_TAB[k]}
              {k === 'temuan' && hasil.temuan.length > 0 && (
                <span className="ml-1.5 text-xs text-slate-400">({hasil.temuan.length})</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'ringkasan' && <TabRingkasan data={hasil.data} temuan={hasil.temuan} />}
        {tab === 'temuan' && <TabTemuan temuan={hasil.temuan} />}
        {tab === 'data' && <TabDataLaporan data={hasil.data} />}
        {tab === 'calk' && <TabCalk data={hasil.data} temuan={hasil.temuan} />}
        {tab === 'rasio' && <TabRasioTren rasio={hasil.rasio} />}
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

      <PanelUnggah berkas={berkas} setBerkas={setBerkas} />

      {galat && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          Gagal memproses: {galat}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button onClick={jalankan} disabled={!berkas || memproses} size="lg">
          <Play className="w-4 h-4 mr-2" />
          {memproses ? 'Memproses…' : 'Jalankan Analisis'}
        </Button>
        {!berkas && (
          <p className="text-xs text-slate-500">Unggah satu berkas PDF laporan keuangan.</p>
        )}
      </div>
    </div>
  )
}
