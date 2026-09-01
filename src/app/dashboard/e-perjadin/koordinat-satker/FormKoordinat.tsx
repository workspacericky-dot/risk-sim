'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { simpanKoordinat } from './actions'

export default function FormKoordinat({
  unitId, lintang, bujur, radius,
}: {
  unitId: string
  lintang: number | null
  bujur: number | null
  radius: number | null
}) {
  const router = useRouter()
  const [lat, setLat] = useState(lintang != null ? String(lintang) : '')
  const [lon, setLon] = useState(bujur != null ? String(bujur) : '')
  const [rad, setRad] = useState(radius != null ? String(radius) : '500')
  const [err, setErr] = useState<string | null>(null)
  const [pending, mulai] = useTransition()

  function simpan(hapus: boolean) {
    setErr(null)
    mulai(async () => {
      const fd = new FormData()
      fd.set('hapus', String(hapus))
      fd.set('lintang', lat); fd.set('bujur', lon); fd.set('radius_geofence', rad)
      const r = await simpanKoordinat(unitId, fd)
      if ('error' in r) setErr(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <input value={lat} onChange={(e) => setLat(e.target.value)} placeholder="lintang"
        className="h-7 w-24 rounded border border-slate-200 px-1.5 font-mono" />
      <input value={lon} onChange={(e) => setLon(e.target.value)} placeholder="bujur"
        className="h-7 w-24 rounded border border-slate-200 px-1.5 font-mono" />
      <input value={rad} onChange={(e) => setRad(e.target.value)} placeholder="radius m" type="number"
        className="h-7 w-20 rounded border border-slate-200 px-1.5" />
      <Button type="button" size="sm" disabled={pending} onClick={() => simpan(false)}>Simpan</Button>
      {lintang != null && (
        <button type="button" disabled={pending} onClick={() => simpan(true)}
          className="text-red-500 font-semibold">hapus</button>
      )}
      {err && <span className="text-red-600 w-full">{err}</span>}
    </div>
  )
}
