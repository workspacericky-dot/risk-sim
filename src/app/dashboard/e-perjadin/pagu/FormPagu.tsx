'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { simpanPagu } from './actions'

export default function FormPagu() {
  const formRef = useRef<HTMLFormElement>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [menyimpan, mulai] = useTransition()

  function kirim(formData: FormData) {
    setGalat(null)
    setOk(false)
    mulai(async () => {
      const hasil = await simpanPagu(formData)
      if (hasil.error) setGalat(hasil.error)
      else { setOk(true); formRef.current?.reset() }
    })
  }

  return (
    <form ref={formRef} action={kirim} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tahun">Tahun Anggaran</Label>
        <Input id="tahun" name="tahun" type="number" required defaultValue={new Date().getFullYear()} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="mata_anggaran">Mata Anggaran</Label>
        <Input id="mata_anggaran" name="mata_anggaran" required placeholder="mis. 005.01.WA.1066.EBA.994.052.A" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="uraian">Uraian</Label>
        <Input id="uraian" name="uraian" placeholder="mis. Perjalanan Dinas Pemeriksaan Reguler" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pagu">Pagu (Rp)</Label>
        <Input id="pagu" name="pagu" type="number" min={0} step={1} required placeholder="mis. 1500000000" />
      </div>

      {galat && <p className="text-xs text-red-600">{galat}</p>}
      {ok && <p className="text-xs text-green-600">Pagu tersimpan.</p>}

      <Button type="submit" className="w-full" disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : 'Simpan pagu'}
      </Button>
      <p className="text-xs text-slate-500">
        Mata anggaran yang sama pada tahun yang sama akan ditimpa.
      </p>
    </form>
  )
}
