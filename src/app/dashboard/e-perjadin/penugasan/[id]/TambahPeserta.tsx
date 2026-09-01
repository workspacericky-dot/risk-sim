'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  KATEGORI_PELAKSANA, LABEL_KATEGORI, PENGINAPAN_MODE, LABEL_PENGINAPAN_MODE,
} from '@/lib/e-perjadin/konstanta'
import { tambahPeserta } from '../actions'

const KELAS_SELECT = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs'
const PERAN_TIM = ['Pengendali Mutu', 'Pengendali Teknis', 'Ketua Tim', 'Anggota Tim'] as const

type Pegawai = { nip: string; nama: string; jabatan: string | null; kategori: string; userId: string | null }

export default function TambahPeserta({
  penugasanId, pegawai, ruteOpsi, luarKota,
}: {
  penugasanId: string
  pegawai: Pegawai[]
  ruteOpsi: string[]
  luarKota: boolean
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [eksternal, setEksternal] = useState(false)
  const [nip, setNip] = useState('')
  const sel = pegawai.find((p) => p.nip === nip)
  const [galat, setGalat] = useState<string | null>(null)
  const [peringatan, setPeringatan] = useState<string | null>(null)
  const [menyimpan, mulai] = useTransition()

  function kirim(fd: FormData) {
    setGalat(null); setPeringatan(null)
    fd.set('eksternal', eksternal ? '1' : '0')
    if (!eksternal) {
      if (!sel) { setGalat('Pilih pegawai atau aktifkan mode peserta eksternal.'); return }
      fd.set('nama', sel.nama)
      fd.set('nip', sel.nip)
      fd.set('pegawai_nip', sel.nip)
    }
    mulai(async () => {
      const hasil = await tambahPeserta(penugasanId, fd)
      if ('error' in hasil) { setGalat(hasil.error); return }
      if (hasil.peringatan) setPeringatan(hasil.peringatan)
      formRef.current?.reset()
      setNip('')
      router.refresh()
    })
  }

  return (
    <form ref={formRef} action={kirim} className="space-y-3">
      <p className="text-sm font-semibold text-slate-700">Tambah Peserta</p>

      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={eksternal} onChange={(e) => setEksternal(e.target.checked)} />
        Peserta eksternal (narasumber / tenaga ahli, tanpa akun)
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {eksternal ? (
          <>
            <div className="space-y-1">
              <Label htmlFor="nama">Nama</Label>
              <Input id="nama" name="nama" required placeholder="Nama lengkap" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" name="nip" placeholder="NIP (opsional)" />
            </div>
          </>
        ) : (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="pegawai_nip">Pegawai</Label>
            <select id="pegawai_nip" name="pegawai_nip" className={KELAS_SELECT}
              value={nip} onChange={(e) => setNip(e.target.value)}>
              <option value="">— pilih pegawai —</option>
              {pegawai.map((p) => (
                <option key={p.nip} value={p.nip}>
                  {p.nama}{p.jabatan ? ` — ${p.jabatan}` : ''}{p.userId ? '' : ' · tanpa akun'}
                </option>
              ))}
            </select>
            {sel && (
              <p className="text-[11px] text-slate-400">
                Kategori &amp; jabatan terisi dari master pegawai; sesuaikan bila perlu.
                {!sel.userId && ' Belum punya akun — presensi lapangan direkam Ketua Tim.'}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="jabatan">Jabatan</Label>
          <Input id="jabatan" name="jabatan" key={sel?.jabatan ?? 'x'} defaultValue={sel?.jabatan ?? ''} placeholder="mis. Auditor Muda" />
        </div>

        <div className="space-y-1">
          <Label htmlFor="peran_tim">Peran Tim</Label>
          <select id="peran_tim" name="peran_tim" required defaultValue="Anggota Tim" className={KELAS_SELECT}>
            {PERAN_TIM.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="kategori">Kategori Pelaksana</Label>
          <select id="kategori" name="kategori" required key={sel?.kategori ?? 'x'} defaultValue={sel?.kategori ?? '1'} className={KELAS_SELECT}>
            {KATEGORI_PELAKSANA.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="penginapan_mode">Penginapan</Label>
          <select id="penginapan_mode" name="penginapan_mode" required defaultValue="hotel" className={KELAS_SELECT}>
            {PENGINAPAN_MODE.map((m) => <option key={m} value={m}>{LABEL_PENGINAPAN_MODE[m]}</option>)}
          </select>
        </div>

        {luarKota && (
          <>
            <div className="space-y-1">
              <Label htmlFor="rute_pesawat">Rute Pesawat (plafon)</Label>
              <select id="rute_pesawat" name="rute_pesawat" defaultValue="-" className={KELAS_SELECT}>
                {ruteOpsi.map((r) => <option key={r} value={r}>{r === '-' ? 'Rute utama' : r}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="estimasi_pesawat">Transport Antarkota PP — at cost (Rp)</Label>
              <Input id="estimasi_pesawat" name="estimasi_pesawat" type="number" min={0} defaultValue={0} placeholder="tiket pesawat / kereta / kapal; 0 bila tak ada" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="estimasi_dpr">Estimasi DPR / Transport Lokal (Rp)</Label>
              <Input id="estimasi_dpr" name="estimasi_dpr" type="number" min={0} placeholder="kosong = nilai bawaan" />
            </div>
          </>
        )}

        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" name="homebase_jabodetabek" />
          Homebase di Jabodetabek (penginapan 30% tidak diberikan)
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" name="berhak_representasi" />
          Berhak uang representasi luar kota (mis. Eselon II) — lumpsum per hari
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" name="transport_lokal_riil" />
          Transport lokal dibayar riil / kunjungan &gt; 1 obrik — uang harian 60%
        </label>
        <label className="flex items-center gap-2 text-xs text-slate-600 sm:col-span-2">
          <input type="checkbox" name="pakai_kendaraan_dinas" />
          Memakai kendaraan dinas — transport lokal tidak dibayarkan
        </label>
      </div>

      {galat && <p className="text-sm text-red-600">{galat}</p>}
      {peringatan && <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">{peringatan}</p>}

      <Button type="submit" size="sm" disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : 'Tambah ke tim'}
      </Button>
    </form>
  )
}
