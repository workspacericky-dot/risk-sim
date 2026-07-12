'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, LogOut, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { joinSession } from './actions'

type Joined = { participantId: string; sessionId: string; nama: string }

const STAGE_LABEL: Record<string, string> = {
  lobby: 'Menunggu instruktur memulai',
  identifikasi: 'Identifikasi Risiko',
  analisis: 'Analisis Risiko',
  evaluasi: 'Evaluasi Risiko',
  selesai: 'Sesi Selesai',
}

const STORAGE_KEY = 'rals_participant'

export default function ParticipantView() {
  const [joined, setJoined] = useState<Joined | null>(null)
  const [tahap, setTahap] = useState<string>('lobby')
  const [kode, setKode] = useState('')
  const [nama, setNama] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pulihkan identitas dari perangkat ini.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { try { setJoined(JSON.parse(raw)) } catch {} }
  }, [])

  // Ambil tahap awal + berlangganan perubahan tahap (realtime).
  useEffect(() => {
    if (!joined) return
    const supabase = createClient()
    let active = true

    supabase.from('rals_session').select('tahap').eq('id', joined.sessionId).single()
      .then(({ data }) => { if (active && data) setTahap(data.tahap) })

    const channel = supabase
      .channel(`rals_session:${joined.sessionId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rals_session', filter: `id=eq.${joined.sessionId}` },
        (payload) => setTahap((payload.new as any).tahap))
      .subscribe()

    return () => { active = false; supabase.removeChannel(channel) }
  }, [joined])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await joinSession(kode, nama)
    setLoading(false)
    if (res.error || !res.participantId || !res.sessionId) { setError(res.error ?? 'Gagal bergabung.'); return }
    const j: Joined = { participantId: res.participantId, sessionId: res.sessionId, nama: nama.trim() }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(j))
    setJoined(j)
  }

  function handleLeave() {
    localStorage.removeItem(STORAGE_KEY)
    setJoined(null)
    setKode(''); setNama('')
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  // ── Belum bergabung: form gabung ──────────────────────────────────────────
  if (!joined) {
    return (
      <div className="max-w-md mx-auto mt-8">
        <div className="text-center mb-6">
          <GraduationCap className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
          <h2 className="text-2xl font-bold font-serif tracking-tight">Gabung Sesi RALS</h2>
          <p className="text-sm text-muted-foreground mt-1">Masukkan kode sesi dari instruktur untuk mulai.</p>
        </div>
        <form onSubmit={handleJoin} className="rounded-2xl border bg-white shadow-sm p-6 space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Kode Sesi</label>
            <input value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} required maxLength={6}
              placeholder="mis. K3M9PQ" className={inputCls + ' font-mono tracking-[0.3em] text-center text-lg uppercase'} />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Nama Anda</label>
            <input value={nama} onChange={(e) => setNama(e.target.value)} required placeholder="Nama lengkap" className={inputCls} />
          </div>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {loading ? 'Bergabung...' : 'Gabung Sesi'}
          </button>
        </form>
      </div>
    )
  }

  // ── Sudah bergabung: tampilkan tahap aktif (live) ─────────────────────────
  return (
    <div className="max-w-lg mx-auto mt-8 space-y-4">
      <div className="rounded-2xl border bg-white shadow-sm p-8 text-center space-y-3">
        <p className="text-sm text-slate-500">Halo, <span className="font-semibold text-slate-800">{joined.nama}</span> 👋</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm font-semibold">
          <Clock className="w-4 h-4" />
          {STAGE_LABEL[tahap] ?? tahap}
        </div>
        <p className="text-xs text-muted-foreground">
          {tahap === 'lobby'
            ? 'Layar ini akan otomatis berpindah saat instruktur telah mengizinkan.'
            : 'Tahap ini sudah dibuka. Form pengisian akan tampil di sini.'}
        </p>
      </div>
      <button onClick={handleLeave}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors mx-auto">
        <LogOut className="w-3.5 h-3.5" /> Keluar dari sesi
      </button>
    </div>
  )
}
