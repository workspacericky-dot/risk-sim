'use client'

import { Printer, FileSpreadsheet } from 'lucide-react'
import type { ExportStage } from '@/lib/rals-export'

export default function ExportBar({ participantId, stage }: { participantId: string; stage: ExportStage }) {
  return (
    <div className="no-print flex items-center justify-end gap-2">
      <a href={`/dashboard/rals/print?participantId=${participantId}&stage=${stage}`} target="_blank" rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors">
        <Printer className="w-3.5 h-3.5" /> Ekspor PDF
      </a>
      <a href={`/api/rals/export?participantId=${participantId}&stage=${stage}`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors">
        <FileSpreadsheet className="w-3.5 h-3.5" /> Ekspor Excel
      </a>
    </div>
  )
}
