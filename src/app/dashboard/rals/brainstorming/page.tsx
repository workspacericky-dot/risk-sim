'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Users2 } from 'lucide-react'
import BrainstormBoard from './BrainstormBoard'

type Joined = { participantId: string; sessionId: string; nama: string }
const STORAGE_KEY = 'rals_participant'

export default function BrainstormingPage() {
  const router = useRouter()
  const [joined, setJoined] = useState<Joined | null | undefined>(undefined) // undefined = belum dicek

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) { setJoined(null); return }
    try { setJoined(JSON.parse(raw)) } catch { setJoined(null) }
  }, [])

  if (joined === undefined) return null // hindari kedip sebelum localStorage terbaca

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
            <Users2 className="w-5 h-5 text-indigo-500" /> Teknik Brainstorming
          </h2>
          <p className="text-muted-foreground text-xs mt-0.5">Tangkap ide bersama peserta lain, lalu susun jadi risiko terstruktur.</p>
        </div>
      </div>

      <BrainstormBoard sessionId={joined.sessionId} participantId={joined.participantId} />
    </div>
  )
}
