'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { simpanParameter } from './actions'

export default function FormParameter({ pKey, nilai }: { pKey: string; nilai: string }) {
  const router = useRouter()
  const [v, setV] = useState(nilai)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, mulai] = useTransition()
  const berubah = v !== nilai

  return (
    <div className="flex items-center gap-2">
      <input value={v} onChange={(e) => { setV(e.target.value); setOk(false); setErr(null) }}
        className="h-8 w-40 rounded border border-slate-200 px-2 text-sm font-mono" />
      {berubah && (
        <Button type="button" size="sm" disabled={pending} onClick={() => {
          setErr(null)
          mulai(async () => {
            const r = await simpanParameter(pKey, v)
            if ('error' in r) setErr(r.error)
            else { setOk(true); router.refresh() }
          })
        }}>Simpan</Button>
      )}
      {ok && !berubah && <span className="text-xs text-green-600 inline-flex items-center gap-1"><Check className="w-3 h-3" /> tersimpan</span>}
      {err && <span className="text-xs text-red-600">{err}</span>}
    </div>
  )
}
