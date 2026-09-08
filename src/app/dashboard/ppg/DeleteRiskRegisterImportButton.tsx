'use client'

import { useActionState } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { deletePpgRiskImport } from './risk-import-actions'
import { initialRiskImportState } from './risk-import-state'

export function DeleteRiskRegisterImportButton({ batchId, fileName }: { batchId: string; fileName: string }) {
  const [state, action, pending] = useActionState(deletePpgRiskImport, initialRiskImportState)

  return (
    <form
      action={action}
      className="flex flex-col items-end gap-1"
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Hapus riwayat impor "${fileName}"? Baris staging dan usulan kurasi yang hanya berasal dari impor ini akan dihapus. Risk Library atau penilaian yang sudah dibuat tidak ikut dihapus.`,
        )
        if (!confirmed) event.preventDefault()
      }}
    >
      <input type="hidden" name="batch_id" value={batchId} />
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {pending ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
        {pending ? 'Menghapus…' : 'Hapus'}
      </button>
      {state.status === 'error' ? <span role="alert" className="max-w-xs text-right text-xs text-rose-700">{state.message}</span> : null}
    </form>
  )
}
