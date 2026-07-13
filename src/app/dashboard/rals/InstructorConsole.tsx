'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Plus, Trash2, Activity } from 'lucide-react'
import { PROSES_BISNIS, parseProbis } from '@/lib/rals-probis'
import { createSession, setStage, deleteSession } from './actions'
import InstructorDashboard from './InstructorDashboard'

type Session = {
  id: string
  kode: string
  judul: string
  scenario_id: string
  tahap: string
  created_at: string
}

const STAGES: { key: string; label: string }[] = [
  { key: 'lobby',        label: 'Lobby' },
  { key: 'identifikasi', label: 'Identifikasi' },
  { key: 'analisis',     label: 'Analisis' },
  { key: 'evaluasi',     label: 'Evaluasi' },
  { key: 'selesai',      label: 'Selesai' },
]

export default function InstructorConsole({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [judul, setJudul] = useState('')
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDash, setOpenDash] = useState<string | null>(null)

  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!l1 || !l2) { setError('Pilih proses bisnis dan subproses bisnis.'); return }
    setLoading(true)
    const probisJson = JSON.stringify({ l1Kode: l1.kode, l1Nama: l1.nama, l2Kode: l2.kode, l2Nama: l2.nama })
    const res = await createSession(judul, probisJson)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setJudul(''); setL2Idx('')
    router.refresh()
  }

  async function handleStage(sessionId: string, tahap: string) {
    await setStage(sessionId, tahap as any)
    router.refresh()
  }

  async function handleDelete(sessionId: string, judul: string) {
    if (!confirm(`Hapus sesi "${judul}" beserta seluruh data peserta & risikonya? Tindakan ini tidak dapat dibatalkan.`)) return
    const res = await deleteSession(sessionId)
    if (res.error) { alert(res.error); return }
    router.refresh()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-serif">RALS — Konsol Instruktur</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Buat sesi consulting, bagikan kode ke peserta, dan buka tahap penilaian satu per satu.
        </p>
      </div>

      {/* Buat sesi */}
      <form onSubmit={handleCreate} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> Buat Sesi Baru
        </h3>
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Judul Sesi</label>
          <input value={judul} onChange={(e) => setJudul(e.target.value)} required
            placeholder="mis. Consulting MR Angkatan V" className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Proses Bisnis <span className="text-slate-400">(L1)</span></label>
            <select value={l1Kode} onChange={(e) => { setL1Kode(e.target.value); setL2Idx('') }} className={inputCls + ' bg-white'}>
              {PROSES_BISNIS.map((p) => <option key={p.kode} value={p.kode}>{p.kode} — {p.nama}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Subproses Bisnis <span className="text-slate-400">(L2)</span></label>
            <select value={l2Idx} onChange={(e) => setL2Idx(e.target.value)} className={inputCls + ' bg-white'}>
              <option value="" disabled>Pilih subproses...</option>
              {currentL1?.sub.map((s, i) => <option key={i} value={i}>{s.kode} — {s.nama}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={loading}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {loading ? 'Membuat...' : 'Buat Sesi'}
        </button>
      </form>

      {/* Daftar sesi */}
      <div className="space-y-3">
        {sessions.length === 0 ? (
          <div className="rounded-2xl border bg-white shadow-sm p-10 text-center text-muted-foreground">
            <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            Belum ada sesi. Buat sesi pertama Anda di atas.
          </div>
        ) : sessions.map((s) => (
          <div key={s.id} className="rounded-2xl border bg-white shadow-sm p-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h4 className="font-serif font-semibold text-slate-800">{s.judul}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {(() => { const pb = parseProbis(s.scenario_id); return pb ? `${pb.l1Nama} › ${pb.l2Kode} ${pb.l2Nama}` : (s.scenario_id || '—') })()}
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-widest text-slate-400">Kode Sesi</p>
                  <p className="font-mono text-2xl font-bold text-indigo-700 tracking-[0.2em]">{s.kode}</p>
                </div>
                <button onClick={() => handleDelete(s.id, s.judul)} title="Hapus sesi ini"
                  className="mt-1 text-slate-300 hover:text-red-500 transition-colors p-1 rounded">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Kontrol tahap */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">Tahap aktif:</span>
              {STAGES.map((st) => (
                <button key={st.key} onClick={() => handleStage(s.id, st.key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-helvetica font-medium tracking-tight border transition-colors ${
                    s.tahap === st.key
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-indigo-50 text-indigo-700 border-transparent hover:bg-indigo-100'
                  }`}>
                  {st.label}
                </button>
              ))}
              <button onClick={() => setOpenDash((v) => (v === s.id ? null : s.id))}
                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                  openDash === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
                <Activity className="w-3.5 h-3.5" /> {openDash === s.id ? 'Tutup Pantauan' : 'Pantau Live'}
              </button>
            </div>

            {openDash === s.id && <InstructorDashboard sessionId={s.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}
