'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Network, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { PROSES_BISNIS } from '@/lib/rals-probis'
import type { Bowtie } from '@/lib/rals-bowtie'
import BowtieCanvas from './BowtieCanvas'

export default function BowtieBoard({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [bowties, setBowties] = useState<Bowtie[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [topEvent, setTopEvent] = useState('')
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)

  const fetchBowties = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('rals_bowtie').select('*')
      .eq('participant_id', participantId).order('created_at', { ascending: false })
    setBowties((data ?? []) as Bowtie[])
  }, [participantId])

  useEffect(() => { fetchBowties() }, [fetchBowties])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!topEvent.trim() || !l1 || !l2) { setError('Kejadian utama dan fokus proses bisnis wajib diisi.'); return }
    setCreating(true); setError(null)
    const sb = createClient()
    const { data, error: insErr } = await sb.from('rals_bowtie').insert({
      session_id: sessionId, participant_id: participantId, top_event: topEvent.trim(),
      l1_kode: l1.kode, l1_nama: l1.nama, l2_kode: l2.kode, l2_nama: l2.nama,
    }).select('id').single()
    setCreating(false)
    if (insErr || !data) { setError(insErr?.message ?? 'Gagal membuat bowtie.'); return }
    setTopEvent(''); setL2Idx('')
    await fetchBowties()
    setSelectedId(data.id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus diagram bowtie ini beserta seluruh elemennya?')) return
    const sb = createClient()
    await sb.from('rals_bowtie').delete().eq('id', id)
    fetchBowties()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  if (selectedId) {
    return <BowtieCanvas bowtieId={selectedId} sessionId={sessionId} participantId={participantId}
      onBack={() => { setSelectedId(null); fetchBowties() }} />
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> Diagram Bowtie Baru
        </h3>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Kejadian Utama (Top Event)</label>
          <input value={topEvent} onChange={(e) => setTopEvent(e.target.value)}
            placeholder="mis. Kebocoran draf putusan sebelum dibacakan" className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Proses Bisnis <span className="text-slate-400 font-normal">(L1)</span></label>
            <select value={l1Kode} onChange={(e) => { setL1Kode(e.target.value); setL2Idx('') }} className={inputCls + ' bg-white'}>
              {PROSES_BISNIS.map((p) => <option key={p.kode} value={p.kode}>{p.kode} — {p.nama}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Subproses Bisnis <span className="text-slate-400 font-normal">(L2)</span></label>
            <select value={l2Idx} onChange={(e) => setL2Idx(e.target.value)} className={inputCls + ' bg-white'}>
              <option value="" disabled>Pilih subproses...</option>
              {currentL1?.sub.map((s, i) => <option key={i} value={i}>{s.kode} — {s.nama}</option>)}
            </select>
          </div>
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={creating}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {creating ? 'Membuat...' : 'Buka Kanvas Bowtie'}
        </button>
      </form>

      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Diagram Saya</h3>
          <span className="text-[11px] text-slate-400">{bowties.length} bowtie</span>
        </div>
        {bowties.length === 0 ? (
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada diagram. Buat bowtie pertama Anda di atas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {bowties.map((b) => (
              <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                <Network className="w-4 h-4 text-indigo-400 shrink-0" />
                <button onClick={() => setSelectedId(b.id)} className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-slate-800 truncate">{b.top_event}</p>
                  <p className="text-[11px] text-slate-400 truncate">{b.l2_nama}</p>
                </button>
                {b.promoted_risk_id && (
                  <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                    <Check className="w-3.5 h-3.5" /> Di register
                  </span>
                )}
                <button onClick={() => handleDelete(b.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
