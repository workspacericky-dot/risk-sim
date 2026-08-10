'use client'

import { useRef, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { KATEGORI_KALENDER } from '@/lib/ca-kepeg/konstanta'
import { tambahTanggal } from './actions'

export default function FormTambahTanggal() {
  const formRef = useRef<HTMLFormElement>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menyimpan, mulai] = useTransition()

  function kirim(formData: FormData) {
    setGalat(null)
    mulai(async () => {
      const hasil = await tambahTanggal(formData)
      if (hasil.error) setGalat(hasil.error)
      else formRef.current?.reset()
    })
  }

  return (
    <form ref={formRef} action={kirim} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="tanggal">Tanggal</Label>
        <Input id="tanggal" name="tanggal" type="date" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="kategori">Kategori</Label>
        <select
          id="kategori"
          name="kategori"
          required
          defaultValue="Libur Nasional"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs"
        >
          {KATEGORI_KALENDER.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
        <p className="text-xs text-slate-500">
          <strong>Libur Daerah</strong> opsional — untuk hari libur khas satker
          (mis. HUT daerah) yang tidak masuk SKB nasional. Diperlakukan sama
          seperti Libur Nasional: hari itu tidak dinilai.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="keterangan">Keterangan</Label>
        <Input id="keterangan" name="keterangan" placeholder="mis. Hari Suci Nyepi" />
      </div>
      {galat && <p className="text-xs text-red-600">{galat}</p>}
      <Button type="submit" className="w-full" disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : 'Simpan'}
      </Button>
    </form>
  )
}
