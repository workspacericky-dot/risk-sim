'use client'

import { useMemo, useState } from 'react'
import { Play, RotateCcw, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { bangunPetaKalender, type EntriKalender } from '@/lib/ca-kepeg/kalender'
import { JAM_KERJA_DEFAULT, type KonfigJamKerja } from '@/lib/ca-kepeg/konstanta'
import { jenisTerpakai } from '@/lib/ca-kepeg/klasifikasi-file'
import { parseSikep, type HasilSikepBulan } from '@/lib/ca-kepeg/parse-sikep'
import { parseKomdanas } from '@/lib/ca-kepeg/parse-komdanas'
import { parseGrade, parseUangMakan, parseGolongan } from '@/lib/ca-kepeg/parse-rp'
import { jalankanAnalisis, type DataBulan, type HasilAnalisis } from '@/lib/ca-kepeg/analisis'
import PanelSetup from './PanelSetup'
import PanelUnggah, { type BerkasTerpilih } from './PanelUnggah'
import PanelHasil from './PanelHasil'

type Langkah = 'siap' | 'memproses' | 'selesai'

export default function CaKepegClient({ kalender }: { kalender: EntriKalender[] }) {
  const tahunTersedia = useMemo(
    () => [...new Set(kalender.map((e) => Number(e.tanggal.slice(0, 4))))].sort((a, b) => b - a),
    [kalender],
  )

  const [namaSatker, setNamaSatker] = useState('')
  const [tahun, setTahun] = useState(tahunTersedia[0] ?? new Date().getFullYear())
  const [jamKerja, setJamKerja] = useState<KonfigJamKerja>(JAM_KERJA_DEFAULT)
  const [berkas, setBerkas] = useState<BerkasTerpilih[]>([])

  const [langkah, setLangkah] = useState<Langkah>('siap')
  const [progres, setProgres] = useState<string[]>([])
  const [hasil, setHasil] = useState<HasilAnalisis | null>(null)
  const [sikepBulanan, setSikepBulanan] = useState<HasilSikepBulan[]>([])
  const [kodeAsing, setKodeAsing] = useState<Record<string, number>>({})
  const [galat, setGalat] = useState<string | null>(null)

  const petaKalender = useMemo(() => bangunPetaKalender(kalender), [kalender])

  const terpakai = berkas.filter((b) => jenisTerpakai(b.jenis))
  const adaDaftarHadir = terpakai.some((b) => b.jenis === 'daftar-hadir')
  const adaSikep = terpakai.some((b) => b.jenis === 'sikep')
  const bisaJalan = namaSatker.trim() !== '' && adaDaftarHadir && adaSikep

  function catat(baris: string) {
    setProgres((s) => [...s, baris])
  }

  async function jalankan() {
    setLangkah('memproses')
    setProgres([])
    setGalat(null)
    setHasil(null)

    try {
      const perBulan = new Map<number, DataBulan>()
      const ambilBulan = (b: number) => {
        if (!perBulan.has(b)) perBulan.set(b, { bulan: b })
        return perBulan.get(b)!
      }

      let golongan: Record<string, string> = {}
      const asing: Record<string, number> = {}

      for (const b of terpakai) {
        // Beri kesempatan browser menggambar ulang progres di antara berkas.
        await new Promise((r) => setTimeout(r, 0))
        const buf = await b.file.arrayBuffer()

        if (b.jenis === 'daftar-pegawai') {
          golongan = parseGolongan(buf)
          catat(`Daftar pegawai — ${Object.keys(golongan).length} pegawai bergolongan`)
          continue
        }

        if (b.bulan == null) {
          catat(`[LEWAT] ${b.file.name} — bulan tidak diketahui`)
          continue
        }

        const slot = ambilBulan(b.bulan)

        if (b.jenis === 'sikep') {
          const s = parseSikep(buf, b.file.name, b.bulan, petaKalender, jamKerja)
          slot.sikep = s
          catat(`SIKEP ${b.file.name} — ${s.pegawai.length} blok pegawai, ${s.jumlahBarisData} baris`)
        } else if (b.jenis === 'daftar-hadir') {
          const k = parseKomdanas(buf)
          slot.komdanas = k.pegawai
          catat(`Daftar hadir bulan ${b.bulan} — ${Object.keys(k.pegawai).length} pegawai`)
          for (const [kode, jumlah] of Object.entries(k.kodeAsing)) {
            asing[kode] = (asing[kode] ?? 0) + jumlah
            catat(`  [PERINGATAN] kode "${kode}" tidak dikenal — ${jumlah} kemunculan, terbaca sebagai hadir bersih`)
          }
        } else if (b.jenis === 'jabatan') {
          const g = parseGrade(buf)
          slot.grade = g
          catat(`Jabatan & SK bulan ${b.bulan} — ${Object.keys(g).length} pegawai`)
        } else if (b.jenis === 'uang-makan') {
          const u = parseUangMakan(buf)
          slot.uangMakan = u
          catat(`Uang makan bulan ${b.bulan} — ${Object.keys(u).length} pegawai`)
        }
      }

      if (Object.keys(golongan).length === 0) {
        catat('[PERINGATAN] Daftar pegawai tidak diunggah — tarif uang makan tidak dapat dihitung.')
      }

      const analisis = jalankanAnalisis({
        tahun,
        namaSatker: namaSatker.trim(),
        golongan,
        bulanan: [...perBulan.values()],
      })

      catat(`Selesai — ${analisis.total.gap} gap pada ${analisis.total.pegawaiBergap} pegawai.`)
      setKodeAsing(asing)
      setSikepBulanan(
        [...perBulan.values()]
          .map((d) => d.sikep)
          .filter((s): s is HasilSikepBulan => s !== undefined)
          .sort((a, b) => a.bulan - b.bulan),
      )
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
    setSikepBulanan([])
    setKodeAsing({})
    setProgres([])
    setGalat(null)
  }

  if (langkah === 'selesai' && hasil) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{hasil.namaSatker}</span> — Tahun {hasil.tahun}
            {' · '}Bulan dianalisis: {hasil.bulanTersedia.length}
          </p>
          <Button variant="outline" size="sm" onClick={ulangi}>
            <RotateCcw className="w-4 h-4 mr-2" /> Analisis Baru
          </Button>
        </div>
        <PanelHasil hasil={hasil} sikepBulanan={sikepBulanan} kodeAsing={kodeAsing} />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex gap-3 items-start rounded-xl border border-slate-200 bg-white/70 p-4">
        <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600 leading-relaxed">
          Seluruh berkas diproses di perangkat Anda dan tidak pernah dikirim ke server.
          Hasil analisis hilang saat halaman dimuat ulang — unduh Excel bila ingin menyimpannya.
        </p>
      </div>

      <PanelSetup
        namaSatker={namaSatker}
        setNamaSatker={setNamaSatker}
        tahun={tahun}
        setTahun={setTahun}
        tahunTersedia={tahunTersedia}
        jamKerja={jamKerja}
        setJamKerja={setJamKerja}
        kalender={kalender}
      />

      <PanelUnggah berkas={berkas} setBerkas={setBerkas} tahun={tahun} />

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
            {!adaSikep && 'Perlu minimal satu berkas SIKEP. '}
            {!adaDaftarHadir && 'Perlu minimal satu berkas daftar hadir KOMDANAS.'}
          </p>
        )}
      </div>
    </div>
  )
}
