'use client'

import { Trash2 } from 'lucide-react'
import { deleteKonteks } from './actions'

export default function DeleteKonteksButton({ id, unitName }: { id: string; unitName: string }) {
  return (
    <button
      type="button"
      title="Hapus dokumen konteks ini"
      className="text-slate-300 hover:text-red-500 transition-colors p-1.5 rounded"
      onClick={async () => {
        if (!confirm(
          `Hapus dokumen konteks "${unitName}" beserta SELURUH data risiko, analisis, dan RTP terkait?\n\nTindakan ini tidak dapat dibatalkan.`
        )) return
        const result = await deleteKonteks(id)
        if (result?.error) alert(result.error)
      }}
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )
}
