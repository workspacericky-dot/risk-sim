'use client'

import { useActionState } from 'react'
import { approvePpgProgram, type PpgProgramApprovalState } from '../actions'

const initialState: PpgProgramApprovalState = { status: 'idle', message: '' }

export function ProgramApprovalForm({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState(approvePpgProgram, initialState)
  return <form action={action} className="mt-4 grid gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 md:grid-cols-[1fr_auto]">
    <input type="hidden" name="program_id" value={programId} />
    <label className="grid gap-1 text-xs font-semibold text-amber-950">Catatan penetapan UPG Pusat
      <input name="catatan_penetapan" required minLength={10} maxLength={1500} placeholder="Dasar review dan keputusan penetapan program" className="h-9 rounded-lg border border-amber-300 bg-white px-3 text-sm font-normal outline-none focus:ring-2 focus:ring-amber-500/50" />
    </label>
    <button disabled={pending} className="self-end rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Menetapkan…' : 'Tetapkan Program PPG'}</button>
    {state.message && <p aria-live="polite" className={`text-xs md:col-span-2 ${state.status === 'success' ? 'text-emerald-700' : 'text-rose-700'}`}>{state.message}</p>}
  </form>
}
