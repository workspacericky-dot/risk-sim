'use client'

import { deletePpgImport } from '../actions'

export function DeleteImportButton({ batchId, fileName }: { batchId: string; fileName: string }) {
  return (
    <form
      action={deletePpgImport}
      onSubmit={(event) => {
        const confirmed = window.confirm(
          `Hapus impor "${fileName}"? Seluruh laporan yang berasal dari file ini juga akan dihapus dan tidak dapat dipulihkan.`,
        )
        if (!confirmed) event.preventDefault()
      }}
    >
      <input type="hidden" name="batch_id" value={batchId} />
      <button
        type="submit"
        className="rounded-full border border-rose-200 bg-white px-3 py-1 text-xs font-bold text-rose-700 transition hover:bg-rose-50"
      >
        Hapus
      </button>
    </form>
  )
}
