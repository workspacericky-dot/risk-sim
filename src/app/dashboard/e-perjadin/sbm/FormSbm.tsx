'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  PROVINSI, KOMPONEN_SBM, LABEL_KOMPONEN, SATUAN_SBM, KATEGORI_PELAKSANA, LABEL_KATEGORI,
} from '@/lib/e-perjadin/konstanta'
import { simpanSbm } from './actions'

const KELAS_SELECT = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs'

export default function FormSbm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [komponen, setKomponen] = useState('uang_harian')
  const [galat, setGalat] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [menyimpan, mulai] = useTransition()

  function kirim(formData: FormData) {
    setGalat(null); setOk(false)
    mulai(async () => {
      const hasil = await simpanSbm(formData)
      if (hasil.error) setGalat(hasil.error)
      else { setOk(true); formRef.current?.reset(); setKomponen('uang_harian') }
    })
  }

  const satuanBawaan = komponen === 'penginapan' ? 'OM' : komponen === 'tiket_pesawat' ? 'PP' : 'OH'

  return (
    <form ref={formRef} action={kirim} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="tahun">Tahun Anggaran</Label>
          <Input id="tahun" name="tahun" type="number" required defaultValue={new Date().getFullYear()} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="satuan">Satuan</Label>
          <select id="satuan" name="satuan" required key={satuanBawaan} defaultValue={satuanBawaan} className={KELAS_SELECT}>
            {SATUAN_SBM.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="komponen">Komponen</Label>
        <select id="komponen" name="komponen" required value={komponen}
          onChange={(e) => setKomponen(e.target.value)} className={KELAS_SELECT}>
          {KOMPONEN_SBM.map((k) => <option key={k} value={k}>{LABEL_KOMPONEN[k]}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="provinsi">Provinsi</Label>
        <select id="provinsi" name="provinsi" required defaultValue="" className={KELAS_SELECT}>
          <option value="" disabled>Pilih provinsi…</option>
          {PROVINSI.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tingkat_biaya">
          {komponen === 'penginapan' ? 'Kategori Pelaksana'
            : komponen === 'tiket_pesawat' ? 'Rute (sub-rute; "-" untuk rute utama)'
            : 'Tingkat Biaya'}
        </Label>
        {komponen === 'penginapan' ? (
          <select id="tingkat_biaya" name="tingkat_biaya" required defaultValue="1" className={KELAS_SELECT}>
            {KATEGORI_PELAKSANA.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>)}
          </select>
        ) : komponen === 'uang_harian' ? (
          <Input id="tingkat_biaya" name="tingkat_biaya" required readOnly defaultValue="-"
            className="bg-slate-50 text-slate-500" />
        ) : (
          <Input id="tingkat_biaya" name="tingkat_biaya" required defaultValue="-"
            placeholder='"-" atau mis. "Jakarta - Silangit"' />
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="nilai">Nilai Tarif (Rp)</Label>
        <Input id="nilai" name="nilai" type="number" min={0} step={1} required placeholder="mis. 370000" />
      </div>

      {galat && <p className="text-xs text-red-600">{galat}</p>}
      {ok && <p className="text-xs text-green-600">Tarif tersimpan.</p>}

      <Button type="submit" className="w-full" disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : 'Simpan tarif'}
      </Button>
      <p className="text-xs text-slate-500">
        Uang harian = per provinsi (tingkat &ldquo;-&rdquo;). Penginapan = per kategori 1/2.
        Tiket pesawat = plafon per rute. Kombinasi yang sama akan ditimpa.
      </p>
    </form>
  )
}
