'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, LogOut, Clock } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { joinSession, setParticipantStage } from './actions'
import KonteksForm from './KonteksForm'
import IdentifikasiForm from './IdentifikasiForm'
import AnalisisForm from './AnalisisForm'
import EvaluasiForm from './EvaluasiForm'
import PenangananForm from './PenangananForm'

type Joined = { participantId: string; sessionId: string; nama: string }

const STAGE_LABEL: Record<string, string> = {
  lobby: 'Menunggu instruktur memulai',
  konteks: 'Penetapan Konteks',
  identifikasi: 'Identifikasi Risiko',
  analisis: 'Analisis Risiko',
  evaluasi: 'Evaluasi Risiko',
  penanganan: 'Penanganan Risiko',
  selesai: 'Sesi Selesai',
}

const SELF_PACED_STAGES = [
  { key: 'konteks',      label: 'Konteks' },
  { key: 'identifikasi', label: 'Identifikasi' },
  { key: 'analisis',     label: 'Analisis' },
  { key: 'evaluasi',     label: 'Evaluasi' },
  { key: 'penanganan',   label: 'Penanganan' },
  { key: 'selesai',      label: 'Selesai' },
]

const STORAGE_KEY = 'rals_participant'

export default function ParticipantView() {
  const [joined, setJoined] = useState<Joined | null>(null)
  const [tahap, setTahap] = useState<string>('lobby')
  const [mode, setMode] = useState<'terkontrol' | 'mandiri'>('terkontrol')
  const [kode, setKode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Pulihkan identitas dari perangkat ini.
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) { try { setJoined(JSON.parse(raw)) } catch {} }
  }, [])

  // Ambil tahap + skenario, berlangganan realtime, dan poll sebagai jaring pengaman.
  useEffect(() => {
    if (!joined) return
    const supabase = createClient()
    let active = true

    async function fetchState() {
      const { data: session } = await supabase.from('rals_session').select('tahap, mode').eq('id', joined!.sessionId).single()
      if (!active || !session) return
      if (session.mode === 'mandiri') {
        setMode('mandiri')
        const { data: p } = await supabase.from('rals_participant').select('tahap').eq('id', joined!.participantId).single()
        if (active) setTahap(p?.tahap ?? 'konteks')
      } else {
        setMode('terkontrol')
        setTahap(session.tahap)
      }
    }
    fetchState()

    // Sesi mandiri: peserta mengubah tahapnya sendiri, tidak ada perubahan dari instruktur untuk dipantau via realtime.
    const channel = supabase
      .channel(`rals_session:${joined.sessionId}`)
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rals_session', filter: `id=eq.${joined.sessionId}` },
        fetchState)
      .subscribe()

    // Fallback: realtime kadang tak terkirim — poll tahap tiap 4 detik.
    const poll = setInterval(fetchState, 4000)

    return () => { active = false; clearInterval(poll); supabase.removeChannel(channel) }
  }, [joined])

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await joinSession(kode)
    setLoading(false)
    if (res.error || !res.participantId || !res.sessionId) { setError(res.error ?? 'Gagal bergabung.'); return }
    const j: Joined = { participantId: res.participantId, sessionId: res.sessionId, nama: res.nama ?? 'Peserta' }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(j))
    setJoined(j)
  }

  async function handleSelfStage(next: string) {
    setTahap(next) // optimistis — hanya milik peserta ini sendiri, tak perlu tunggu server
    if (joined) await setParticipantStage(joined.participantId, next as any)
  }

  function handleLeave() {
    localStorage.removeItem(STORAGE_KEY)
    setJoined(null)
    setKode('')
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
          <p className="text-[11px] text-slate-400">Nama Anda diambil otomatis dari akun. Bila pindah perangkat, cukup masuk lagi dan gabung dengan kode yang sama untuk melanjutkan.</p>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
            {loading ? 'Bergabung...' : 'Gabung Sesi'}
          </button>
        </form>
      </div>
    )
  }

  // ── Sudah bergabung: header + router tahap ────────────────────────────────
  const isForm = tahap === 'konteks' || tahap === 'identifikasi' || tahap === 'analisis' || tahap === 'evaluasi' || tahap === 'penanganan'
  return (
    <div className={`mx-auto mt-8 space-y-4 ${isForm ? 'max-w-3xl' : 'max-w-lg'}`}>
      {/* Header: nama + tahap aktif */}
      <div className="rounded-2xl border bg-white shadow-sm px-5 py-3 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">Halo, <span className="font-semibold text-slate-800">{joined.nama}</span> 👋</p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-slate-900 text-white text-sm font-helvetica font-medium tracking-tight shadow-sm">
          <Clock className="w-4 h-4 opacity-70" />
          {STAGE_LABEL[tahap] ?? tahap}
        </div>
      </div>

      {/* Sesi mandiri: peserta pilih sendiri tahap yang ingin dilatih, tanpa izin instruktur */}
      {mode === 'mandiri' && (
        <div className="rounded-2xl border bg-white shadow-sm px-4 py-3 flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-slate-400 mr-1">Pilih tahap:</span>
          {SELF_PACED_STAGES.map((st) => (
            <button key={st.key} onClick={() => handleSelfStage(st.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-helvetica font-medium tracking-tight border transition-colors ${
                tahap === st.key
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                  : 'bg-slate-50 text-slate-600 border-transparent hover:bg-slate-100'
              }`}>
              {st.label}
            </button>
          ))}
        </div>
      )}

      {/* Body per tahap */}
      {tahap === 'konteks' ? (
        <KonteksForm participantId={joined.participantId} sessionId={joined.sessionId} />
      ) : tahap === 'identifikasi' ? (
        <IdentifikasiForm sessionId={joined.sessionId} participantId={joined.participantId} />
      ) : tahap === 'analisis' ? (
        <AnalisisForm participantId={joined.participantId} sessionId={joined.sessionId} />
      ) : tahap === 'evaluasi' ? (
        <EvaluasiForm participantId={joined.participantId} sessionId={joined.sessionId} />
      ) : tahap === 'penanganan' ? (
        <PenangananForm participantId={joined.participantId} sessionId={joined.sessionId} />
      ) : (
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">
          {tahap === 'selesai'
            ? 'Sesi telah selesai. Terima kasih atas partisipasi Anda.'
            : 'Layar ini akan otomatis berpindah saat instruktur telah mengizinkan.'}
        </div>
      )}

      <button onClick={handleLeave}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-500 transition-colors mx-auto">
        <LogOut className="w-3.5 h-3.5" /> Keluar dari sesi
      </button>
    </div>
  )
}
