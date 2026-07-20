'use client'

import { FileText, FileSpreadsheet, Building2 } from 'lucide-react'
import { STAGE_TITLES, type ExportStage } from '@/lib/rals-export'

export default function OrgExportButton({ sessionId, stage }: { sessionId: string; stage: ExportStage }) {
  const label = `Ekspor Form ${STAGE_TITLES[stage]} Kepaniteraan MA`
  return (
    <div className="no-print rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 flex items-center justify-between gap-3 flex-wrap">
      <p className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1.5">
        <Building2 className="w-3.5 h-3.5" /> {label}
      </p>
      <div className="flex items-center gap-2">
        <a href={`/dashboard/rals/print?scope=org&sessionId=${sessionId}&stage=${stage}`} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-100 text-[11px] font-semibold text-indigo-700 transition-colors">
          <FileText className="w-3.5 h-3.5" /> PDF
        </a>
        <a href={`/api/rals/export?scope=org&sessionId=${sessionId}&stage=${stage}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-indigo-200 bg-white hover:bg-indigo-100 text-[11px] font-semibold text-indigo-700 transition-colors">
          <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
        </a>
      </div>
    </div>
  )
}
