'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GraduationCap, Plus, Trash2, Activity, Users, Target, Table2, Lock, Unlock } from 'lucide-react'
import { createSession, setStage, setSessionMode, deleteSession } from './actions'
import InstructorDashboard from './InstructorDashboard'
import DelphiFacilitatorPanel from './DelphiFacilitatorPanel'
import SeleraRisikoPanel from './SeleraRisikoPanel'
import LiveTablesPanel from './LiveTablesPanel'

type Session = {
  id: string
  kode: string
  judul: string
  scenario_id: string
  tahap: string
  mode: string
  created_at: string
}

const STAGES: { key: string; label: string }[] = [
  { key: 'lobby',        label: 'Lobby' },
  { key: 'konteks',      label: 'Konteks' },
  { key: 'identifikasi', label: 'Identifikasi' },
  { key: 'analisis',     label: 'Analisis' },
  { key: 'evaluasi',     label: 'Evaluasi' },
  { key: 'penanganan',   label: 'Penanganan' },
  { key: 'selesai',      label: 'Selesai' },
]

export default function InstructorConsole({ sessions }: { sessions: Session[] }) {
  const router = useRouter()
  const [judul, setJudul] = useState('')
  const [mode, setMode] = useState<'terkontrol' | 'mandiri'>('terkontrol')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openDash, setOpenDash] = useState<string | null>(null)
  const [openDelphi, setOpenDelphi] = useState<string | null>(null)
  const [openSelera, setOpenSelera] = useState<string | null>(null)
  const [openTables, setOpenTables] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(null)
    const res = await createSession(judul, mode)
    setLoading(false)
    if (res.error) { setError(res.error); return }
    setJudul(''); setMode('terkontrol')
    router.refresh()
  }

  async function handleStage(sessionId: string, tahap: string) {
    await setStage(sessionId, tahap as any)
    router.refresh()
  }

  async function handleToggleMode(sessionId: string, current: string) {
    await setSessionMode(sessionId, current === 'mandiri' ? 'terkontrol' : 'mandiri')
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
          <p className="text-[11px] text-slate-400">Proses bisnis & konteks ditetapkan masing-masing peserta pada tahap Konteks.</p>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-slate-600">Tipe Sesi</label>
          <div className="grid sm:grid-cols-2 gap-2">
            <button type="button" onClick={() => setMode('terkontrol')}
              className={`text-left rounded-xl border p-3 transition-all ${
                mode === 'terkontrol' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"><Lock className="w-3.5 h-3.5 text-indigo-500" /> Terkontrol</span>
              <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">Instruktur membuka tahap satu per satu untuk seluruh peserta.</span>
            </button>
            <button type="button" onClick={() => setMode('mandiri')}
              className={`text-left rounded-xl border p-3 transition-all ${
                mode === 'mandiri' ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200' : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-800"><Unlock className="w-3.5 h-3.5 text-indigo-500" /> Mandiri</span>
              <span className="block text-[11px] text-slate-500 leading-snug mt-0.5">Peserta bebas berpindah tahap sendiri — cocok untuk latihan mandiri pasca-pelatihan.</span>
            </button>
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
                <button onClick={() => handleToggleMode(s.id, s.mode)}
                  title={`Ubah ke mode ${s.mode === 'mandiri' ? 'Terkontrol' : 'Mandiri'}`}
                  className={`inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                    s.mode === 'mandiri'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                  }`}>
                  {s.mode === 'mandiri' ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                  {s.mode === 'mandiri' ? 'Mandiri' : 'Terkontrol'}
                </button>
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

            {/* Kontrol tahap — hanya relevan untuk sesi terkontrol; sesi mandiri diatur peserta sendiri */}
            <div className="mt-4 flex items-center gap-1.5 flex-wrap">
              {s.mode === 'mandiri' ? (
                <span className="text-[11px] text-slate-400">Sesi mandiri — peserta berpindah tahap sendiri, tidak perlu dibuka satu per satu.</span>
              ) : (
                <>
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
                </>
              )}
              {(s.mode === 'mandiri' || s.tahap === 'lobby') && (
                <button onClick={() => setOpenSelera((v) => (v === s.id ? null : s.id))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                    openSelera === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}>
                  <Target className="w-3.5 h-3.5" /> {openSelera === s.id ? 'Tutup Selera Risiko' : 'Selera Risiko'}
                </button>
              )}
              <button onClick={() => setOpenTables((v) => (v === s.id ? null : s.id))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                  openTables === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
                <Table2 className="w-3.5 h-3.5" /> {openTables === s.id ? 'Tutup Tabel Live' : 'Tabel Live'}
              </button>
              <button onClick={() => setOpenDelphi((v) => (v === s.id ? null : s.id))}
                className={`ml-auto px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                  openDelphi === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
                <Users className="w-3.5 h-3.5" /> {openDelphi === s.id ? 'Tutup Panel Delphi' : 'Panel Delphi'}
              </button>
              <button onClick={() => setOpenDash((v) => (v === s.id ? null : s.id))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border inline-flex items-center gap-1.5 transition-colors ${
                  openDash === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                }`}>
                <Activity className="w-3.5 h-3.5" /> {openDash === s.id ? 'Tutup Pantauan' : 'Pantau Live'}
              </button>
            </div>

            {(s.mode === 'mandiri' || s.tahap === 'lobby') && openSelera === s.id && <SeleraRisikoPanel sessionId={s.id} />}
            {openTables === s.id && <LiveTablesPanel sessionId={s.id} />}
            {openDelphi === s.id && <DelphiFacilitatorPanel sessionId={s.id} />}
            {openDash === s.id && <InstructorDashboard sessionId={s.id} />}
          </div>
        ))}
      </div>
    </div>
  )
}
