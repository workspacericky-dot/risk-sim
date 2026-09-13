'use client'

import { useActionState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { deleteZiImport } from '../actions'
import { initialZiImportState } from '../import-state'

export function DeleteZiImportButton({ batchId, fileName }: { batchId: string; fileName: string }) {
  const [state, action, pending] = useActionState(deleteZiImport, initialZiImportState)

  return (
    <form
      action={action}
      className="flex flex-col items-end gap-1"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Hapus hasil impor "${fileName}"? Seluruh respons, hasil analisis, dan metrik unit dari impor ini akan dihapus permanen.`,
        )
        if (!confirmed) event.preventDefault()
      }}
    >
      <input type="hidden" name="batch_id" value={batchId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {pending ? 'Menghapus…' : 'Hapus impor'}
      </button>
      {state.status === 'error' ? <span role="alert" className="max-w-sm text-right text-rose-700">{state.message}</span> : null}
    </form>
  )
}
