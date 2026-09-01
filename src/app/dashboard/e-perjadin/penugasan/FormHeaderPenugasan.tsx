'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PROVINSI, JENIS_DINAS, LABEL_JENIS_DINAS } from '@/lib/e-perjadin/konstanta'
import { buatDraf, perbaruiDraf } from './actions'

const KELAS_SELECT = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs'

export type HeaderAwal = {
  jenis_alur: string
  jenis_dinas: string
  maksud: string
  unit_tujuan_id: string | null
  provinsi: string
  pka_id: string | null
  tanggal_berangkat: string
  tanggal_kembali: string
  tahun_anggaran: number
  uang_muka_persen: number
}

export default function FormHeaderPenugasan({
  mode,
  id,
  awal,
  unitKerja,
  pkaList,
}: {
  mode: 'baru' | 'ubah'
  id?: string
  awal?: HeaderAwal
  unitKerja: { id: string; label: string }[]
  pkaList: { id: string; label: string }[]
}) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const [alur, setAlur] = useState(awal?.jenis_alur ?? 'Non-Rampung')
  const [galat, setGalat] = useState<string | null>(null)
  const [menyimpan, mulai] = useTransition()

  function kirim(fd: FormData) {
    setGalat(null)
    mulai(async () => {
      const hasil = mode === 'baru' ? await buatDraf(fd) : await perbaruiDraf(id!, fd)
      if ('error' in hasil) { setGalat(hasil.error); return }
      router.push(`/dashboard/e-perjadin/penugasan/${mode === 'baru' && 'id' in hasil ? hasil.id : id}`)
      router.refresh()
    })
  }

  return (
    <form ref={formRef} action={kirim} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="jenis_alur">Alur</Label>
          <select id="jenis_alur" name="jenis_alur" className={KELAS_SELECT}
            value={alur} onChange={(e) => setAlur(e.target.value)}>
            <option value="Non-Rampung">Non-Rampung (ST/SPD terbit sistem)</option>
            <option value="Rampung">Rampung (ST dari luar sistem)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="jenis_dinas">Jenis Dinas</Label>
          <select id="jenis_dinas" name="jenis_dinas" defaultValue={awal?.jenis_dinas ?? 'Luar Kota'} className={KELAS_SELECT}>
            {JENIS_DINAS.map((j) => <option key={j} value={j}>{LABEL_JENIS_DINAS[j]}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="maksud">Maksud Penugasan</Label>
        <textarea id="maksud" name="maksud" required rows={2} defaultValue={awal?.maksud ?? ''}
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs"
          placeholder="mis. Pemeriksaan reguler atas pengelolaan keuangan perkara" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="unit_tujuan_id">Satker Tujuan</Label>
          <select id="unit_tujuan_id" name="unit_tujuan_id" defaultValue={awal?.unit_tujuan_id ?? ''} className={KELAS_SELECT}>
            <option value="">— pilih —</option>
            {unitKerja.map((u) => <option key={u.id} value={u.id}>{u.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="provinsi">Provinsi Tujuan (acuan SBM)</Label>
          <select id="provinsi" name="provinsi" required defaultValue={awal?.provinsi ?? ''} className={KELAS_SELECT}>
            <option value="" disabled>— pilih —</option>
            {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pka_id">Program Kerja Audit (opsional)</Label>
        <select id="pka_id" name="pka_id" defaultValue={awal?.pka_id ?? ''} className={KELAS_SELECT}>
          <option value="">— tidak ditautkan —</option>
          {pkaList.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tanggal_berangkat">Berangkat</Label>
          <Input id="tanggal_berangkat" name="tanggal_berangkat" type="date" required defaultValue={awal?.tanggal_berangkat} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tanggal_kembali">Kembali</Label>
          <Input id="tanggal_kembali" name="tanggal_kembali" type="date" required defaultValue={awal?.tanggal_kembali} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tahun_anggaran">Tahun Anggaran</Label>
          <Input id="tahun_anggaran" name="tahun_anggaran" type="number" required
            defaultValue={awal?.tahun_anggaran ?? new Date().getFullYear()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="uang_muka_persen">Uang Muka</Label>
          <select id="uang_muka_persen" name="uang_muka_persen"
            defaultValue={String(awal?.uang_muka_persen ?? 0)}
            disabled={alur === 'Rampung'} className={KELAS_SELECT}>
            <option value="0">0%</option>
            <option value="50">50%</option>
            <option value="100">100%</option>
          </select>
        </div>
      </div>
      {alur === 'Rampung' && (
        <p className="text-xs text-slate-500">Alur Rampung tidak memakai uang muka; perekaman dibatasi H+30 sejak kegiatan berakhir.</p>
      )}

      {galat && <p className="text-sm text-red-600">{galat}</p>}

      <Button type="submit" disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : mode === 'baru' ? 'Simpan Draf' : 'Simpan Perubahan'}
      </Button>
    </form>
  )
}
