'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Waypoints } from 'lucide-react'
import SwiftFlow from './SwiftFlow'

type Joined = { participantId: string; sessionId: string; nama: string }
const STORAGE_KEY = 'rals_participant'

export default function SwiftPage() {
  const router = useRouter()
  const [joined, setJoined] = useState<Joined | null | undefined>(undefined)

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { setJoined(null); return }
    try { setJoined(JSON.parse(raw)) } catch { setJoined(null) }
  }, [])

  if (joined === undefined) return null

  if (joined === null) {
    return (
      <div className="max-w-md mx-auto mt-12 text-center space-y-3">
        <p className="text-sm text-muted-foreground">Anda belum bergabung ke sesi RALS.</p>
        <button onClick={() => router.push('/dashboard/rals')}
          className="text-sm text-indigo-600 underline">Kembali ke RALS</button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto mt-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/dashboard/rals')}
          className="flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Identifikasi Risiko">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold tracking-tight font-serif flex items-center gap-2">
            <Waypoints className="w-5 h-5 text-indigo-500" /> Teknik SWIFT Analysis
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">Petakan proses, lalu jelajahi skenario &quot;bagaimana jika...&quot; dengan cepat.</p>
        </div>
      </div>

      <SwiftFlow sessionId={joined.sessionId} participantId={joined.participantId} />
    </div>
  )
}
