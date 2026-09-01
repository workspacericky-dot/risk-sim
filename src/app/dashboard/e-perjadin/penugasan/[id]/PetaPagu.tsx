'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { petakanPagu } from '../actions'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default function PetaPagu({
  penugasanId,
  opsi,
}: {
  penugasanId: string
  opsi: { id: string; label: string; tersedia: number; dipilih: boolean }[]
}) {
  const router = useRouter()
  const [dipilih, setDipilih] = useState<Set<string>>(new Set(opsi.filter((o) => o.dipilih).map((o) => o.id)))
  const [galat, setGalat] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [menyimpan, mulai] = useTransition()

  function toggle(id: string) {
    setOk(false)
    setDipilih((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function simpan() {
    setGalat(null)
    mulai(async () => {
      const hasil = await petakanPagu(penugasanId, [...dipilih])
      if ('error' in hasil) setGalat(hasil.error)
      else { setOk(true); router.refresh() }
    })
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {opsi.map((o) => (
          <label key={o.id} className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <span className="flex items-center gap-2">
              <input type="checkbox" checked={dipilih.has(o.id)} onChange={() => toggle(o.id)} />
              <span className="font-mono text-xs">{o.label}</span>
            </span>
            <span className="text-xs text-slate-500 shrink-0">tersedia {rupiah(o.tersedia)}</span>
          </label>
        ))}
      </div>
      {galat && <p className="text-sm text-red-600">{galat}</p>}
      {ok && <p className="text-sm text-green-600">Pemetaan pagu tersimpan.</p>}
      <Button type="button" size="sm" onClick={simpan} disabled={menyimpan}>
        {menyimpan ? 'Menyimpan…' : 'Simpan pemetaan'}
      </Button>
    </div>
  )
}
