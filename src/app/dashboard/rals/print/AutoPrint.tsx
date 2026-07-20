'use client'

import { useEffect } from 'react'
import { Printer } from 'lucide-react'

export default function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400) // beri waktu layout selesai render dulu
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="no-print flex justify-end">
      <button onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors">
        <Printer className="w-3.5 h-3.5" /> Cetak / Simpan sebagai PDF
      </button>
    </div>
  )
}
