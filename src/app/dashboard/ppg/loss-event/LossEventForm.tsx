'use client'

import { useActionState } from 'react'
import { createPpgLossEvent, type PpgLossEventActionState } from '../actions'

const initialState: PpgLossEventActionState = { status: 'idle', message: '' }

export function LossEventForm({ children }: { children: React.ReactNode }) {
  const [state, action, pending] = useActionState(createPpgLossEvent, initialState)

  return <form action={action} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <fieldset disabled={pending} className="space-y-5 disabled:opacity-70">{children}</fieldset>
    {state.message && <div aria-live="polite" className={`rounded-xl border p-3 text-sm font-medium ${state.status === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}>{state.message}</div>}
    {pending && <p aria-live="polite" className="text-sm font-medium text-indigo-700">Menyimpan loss event…</p>}
  </form>
}
