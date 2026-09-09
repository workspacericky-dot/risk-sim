'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Database, FlaskConical, RotateCcw } from 'lucide-react'
import { resetPpgDemo, setPpgScenario } from './scenario-actions'

type PpgScenarioKey = 'real' | 'demo'

export function PpgScenarioSwitcher({ active, isAdmin }: { active: PpgScenarioKey; isAdmin: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState('')
  const switchTo = (key: PpgScenarioKey) => startTransition(async () => {
    setMessage('')
    const result = await setPpgScenario(key)
    setMessage(result.message)
    if (result.ok) router.refresh()
  })
  const reset = () => startTransition(async () => {
    if (!window.confirm('Reset seluruh data pada slot Simulasi Lengkap ke kondisi dummy awal? Data Riil tidak akan berubah.')) return
    const result = await resetPpgDemo()
    setMessage(result.message)
    if (result.ok) router.refresh()
  })

  return <div className="w-full rounded-2xl border border-white/20 bg-white/10 p-2.5 backdrop-blur-sm sm:w-auto">
    <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-100">Save slot aktif</p>
    <div className="flex flex-wrap gap-1.5">
      <button type="button" disabled={pending} onClick={() => switchTo('real')} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${active === 'real' ? 'bg-white text-indigo-950 shadow' : 'text-white hover:bg-white/15'}`}><Database className="h-3.5 w-3.5" />Data Riil</button>
      <button type="button" disabled={pending} onClick={() => switchTo('demo')} className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${active === 'demo' ? 'bg-amber-300 text-amber-950 shadow' : 'text-white hover:bg-white/15'}`}><FlaskConical className="h-3.5 w-3.5" />Simulasi Lengkap</button>
      {isAdmin && active === 'demo' && <button type="button" disabled={pending} onClick={reset} title="Kembalikan data dummy ke kondisi awal" className="rounded-lg px-2.5 py-2 text-amber-100 hover:bg-white/15 disabled:opacity-50"><RotateCcw className={`h-3.5 w-3.5 ${pending ? 'animate-spin' : ''}`} /></button>}
    </div>
    {message && <p className="mt-2 max-w-xs px-1 text-[10px] leading-relaxed text-white/85">{message}</p>}
  </div>
}
