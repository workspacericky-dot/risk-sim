'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { setujuiRevisi, tolakRevisi } from './actions'

export default function AksiRevisiPT({ penugasanId }: { penugasanId: string }) {
  const router = useRouter()
  const [tolak, setTolak] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [pending, mulai] = useTransition()

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={pending} onClick={() => mulai(async () => {
          setErr(null)
          const r = await setujuiRevisi(penugasanId)
          if ('error' in r) setErr(r.error); else router.refresh()
        })}>Setujui &amp; Terbitkan ST Revisi</Button>
        <Button size="sm" variant="outline" onClick={() => setTolak(!tolak)}>Tolak</Button>
      </div>
      {tolak && (
        <div className="space-y-2">
          <textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan penolakan"
            className="w-full rounded-md border border-input px-3 py-2 text-sm" />
          <Button size="sm" variant="destructive" disabled={pending || !alasan.trim()} onClick={() => mulai(async () => {
            setErr(null)
            const fd = new FormData(); fd.set('alasan', alasan)
            const r = await tolakRevisi(penugasanId, fd)
            if ('error' in r) setErr(r.error); else router.refresh()
          })}>Konfirmasi Tolak</Button>
        </div>
      )}
      {err && <p className="text-sm text-red-600 whitespace-pre-wrap">{err}</p>}
    </div>
  )
}
