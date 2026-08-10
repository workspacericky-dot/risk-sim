'use client'

import { useRef, useState, useTransition } from 'react'
import { Upload, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  uraiKalenderMarkdown, ratakanEntri, ringkasKalender,
  type BarisDitolak, type EntriKalender,
} from '@/lib/ca-kepeg/kalender'
import { imporKalender } from './actions'

export default function ImporKalender() {
  const [entri, setEntri] = useState<EntriKalender[] | null>(null)
  const [ditolak, setDitolak] = useState<BarisDitolak[]>([])
  const [namaBerkas, setNamaBerkas] = useState('')
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'salah'; teks: string } | null>(null)
  const [menyimpan, mulaiSimpan] = useTransition()
  const [sedangSeret, setSedangSeret] = useState(false)
  // dragleave ikut memicu saat kursor melintasi elemen anak — hitung kedalamannya.
  const kedalamanSeret = useRef(0)

  async function prosesBerkas(berkas: File | undefined) {
    if (!berkas) return

    setPesan(null)

    if (!/\.(md|markdown)$/i.test(berkas.name)) {
      setEntri(null)
      setDitolak([])
      setNamaBerkas('')
      setPesan({
        jenis: 'salah',
        teks: `"${berkas.name}" bukan berkas Markdown. Impor kalender hanya menerima berkas .md seperti ref_kalender.md.`,
      })
      return
    }

    setNamaBerkas(berkas.name)

    const { entri: terbaca, ditolak: gagal } = uraiKalenderMarkdown(await berkas.text())
    setDitolak(gagal)

    const hasil = ratakanEntri(terbaca)
    if (hasil.length === 0) {
      setEntri(null)
      setPesan({
        jenis: 'salah',
        teks: 'Tidak ada baris tabel yang dikenali. Pastikan berkas memakai format tabel Markdown dengan kolom Tanggal | Kategori | Keterangan.',
      })
      return
    }
    setEntri(hasil)
  }

  function mulaiSeret(e: React.DragEvent) {
    e.preventDefault()
    kedalamanSeret.current += 1
    setSedangSeret(true)
  }

  function akhiriSeret(e: React.DragEvent) {
    e.preventDefault()
    kedalamanSeret.current -= 1
    if (kedalamanSeret.current <= 0) {
      kedalamanSeret.current = 0
      setSedangSeret(false)
    }
  }

  function jatuhkan(e: React.DragEvent) {
    e.preventDefault()
    kedalamanSeret.current = 0
    setSedangSeret(false)
    prosesBerkas(e.dataTransfer.files?.[0])
  }

  function simpan() {
    if (!entri) return
    mulaiSimpan(async () => {
      const hasil = await imporKalender(entri)
      if (hasil.error) {
        setPesan({ jenis: 'salah', teks: hasil.error })
      } else {
        setPesan({ jenis: 'ok', teks: `${hasil.jumlah} tanggal berhasil disimpan.` })
        setEntri(null)
        setDitolak([])
        setNamaBerkas('')
      }
    })
  }

  const ringkasan = entri ? ringkasKalender(entri) : null
  const tahun = entri
    ? [...new Set(entri.map((e) => e.tanggal.slice(0, 4)))].sort()
    : []

  return (
    <div className="space-y-4">
      <label
        onDragEnter={mulaiSeret}
        onDragOver={(e) => e.preventDefault()}
        onDragLeave={akhiriSeret}
        onDrop={jatuhkan}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl p-6 cursor-pointer transition-colors ${
          sedangSeret
            ? 'border-slate-800 bg-slate-100'
            : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'
        }`}
      >
        <Upload className={`w-6 h-6 transition-colors ${sedangSeret ? 'text-slate-700' : 'text-slate-400'}`} />
        <span className="text-sm font-medium text-slate-700">
          {sedangSeret ? 'Lepaskan berkas di sini' : 'Seret ref_kalender.md ke sini, atau klik untuk memilih'}
        </span>
        <span className="text-xs text-slate-500 text-center">
          Tabel Markdown: Tanggal | Kategori | Keterangan.
          Rentang Ramadhan ditulis <code className="bg-slate-100 px-1 rounded">YYYY-MM-DD s.d YYYY-MM-DD</code>.
        </span>
        <input
          type="file"
          accept=".md,.markdown"
          className="hidden"
          onChange={(e) => { prosesBerkas(e.target.files?.[0]); e.target.value = '' }}
        />
      </label>

      {namaBerkas && (
        <p className="text-xs text-slate-500">
          Berkas: <span className="font-medium text-slate-700">{namaBerkas}</span>
        </p>
      )}

      {ditolak.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
          <div className="flex gap-2 items-start">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
            <p className="text-xs font-semibold text-red-800">
              {ditolak.length} baris tidak terbaca dan akan dilewati
            </p>
          </div>
          <ul className="space-y-1.5">
            {ditolak.map((d, i) => (
              <li key={i} className="text-[11px] text-red-800">
                <code className="block bg-red-100 rounded px-1.5 py-0.5 break-all">{d.baris}</code>
                <span className="text-red-700">{d.alasan}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {ringkasan && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{ringkasan.total} tanggal</Badge>
            <Badge variant="secondary">{ringkasan.libur} libur / cuti bersama</Badge>
            {ringkasan.liburDaerah > 0 && (
              <Badge variant="secondary">{ringkasan.liburDaerah} libur daerah</Badge>
            )}
            <Badge variant="secondary">{ringkasan.ramadhan} hari Ramadhan</Badge>
            {tahun.map((t) => <Badge key={t}>{t}</Badge>)}
          </div>
          <p className="text-xs text-slate-500">
            Tanggal yang sudah ada akan ditimpa. Baris Libur Nasional / Cuti Bersama
            mengalahkan rentang Ramadhan pada tanggal yang sama.
          </p>
          <Button onClick={simpan} disabled={menyimpan} className="w-full">
            {menyimpan ? 'Menyimpan…' : `Simpan ${ringkasan.total} tanggal`}
          </Button>
        </div>
      )}

      {pesan && (
        <div className={`flex gap-2 items-start text-sm rounded-lg p-3 ${
          pesan.jenis === 'ok'
            ? 'bg-green-50 text-green-800 border border-green-200'
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {pesan.jenis === 'ok'
            ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          <span>{pesan.teks}</span>
        </div>
      )}
    </div>
  )
}
