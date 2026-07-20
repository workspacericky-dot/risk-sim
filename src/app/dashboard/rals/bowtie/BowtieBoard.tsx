'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Network, Plus, Trash2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import type { Bowtie, BowtieRisk } from '@/lib/rals-bowtie'
import BowtieCanvas from './BowtieCanvas'

export default function BowtieBoard({ sessionId, participantId }: { sessionId: string; participantId: string }) {
  const [bowties, setBowties] = useState<Bowtie[]>([])
  const [risks, setRisks] = useState<BowtieRisk[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pickedRiskId, setPickedRiskId] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const sb = createClient()
    const [{ data: bt }, { data: rk }] = await Promise.all([
      sb.from('rals_bowtie').select('*').eq('participant_id', participantId).order('created_at', { ascending: false }),
      sb.from('rals_risk').select('id, kode, pernyataan, kategori, penyebab, dampak_uraian').eq('participant_id', participantId).order('created_at', { ascending: true }),
    ])
    setBowties((bt ?? []) as Bowtie[])
    setRisks((rk ?? []) as BowtieRisk[])
  }, [participantId])

  useEffect(() => { fetchData() }, [fetchData])

  const bowtiedRiskIds = new Set(bowties.map((b) => b.risk_id))
  const availableRisks = risks.filter((r) => !bowtiedRiskIds.has(r.id))
  const riskById = (id: string) => risks.find((r) => r.id === id)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!pickedRiskId) { setError('Pilih risiko yang akan dianalisis.'); return }
    setCreating(true); setError(null)
    const sb = createClient()
    const { data, error: insErr } = await sb.from('rals_bowtie').insert({
      session_id: sessionId, participant_id: participantId, risk_id: pickedRiskId,
    }).select('id').single()
    setCreating(false)
    if (insErr || !data) { setError(insErr?.message ?? 'Gagal membuat bowtie.'); return }
    setPickedRiskId('')
    await fetchData()
    setSelectedId(data.id)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus diagram bowtie ini beserta seluruh elemennya? (Risiko di register tidak ikut terhapus)')) return
    const sb = createClient()
    await sb.from('rals_bowtie').delete().eq('id', id)
    fetchData()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  if (selectedId) {
    return <BowtieCanvas bowtieId={selectedId} sessionId={sessionId} participantId={participantId}
      onBack={() => { setSelectedId(null); fetchData() }} />
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> Analisis Bowtie untuk Risiko
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">
          Pilih risiko yang sudah Anda identifikasi. Bowtie akan membantu menggali penyebab (ancaman) dan dampaknya secara terstruktur.
        </p>
        {availableRisks.length === 0 ? (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            {risks.length === 0
              ? 'Belum ada risiko di register Anda. Identifikasi risiko dulu (mis. lewat form biasa atau teknik lain).'
              : 'Semua risiko Anda sudah punya diagram bowtie.'}
          </p>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Pilih Risiko (Top Event)</label>
            <select value={pickedRiskId} onChange={(e) => setPickedRiskId(e.target.value)} className={inputCls + ' bg-white'}>
              <option value="" disabled>Pilih risiko dari register Anda...</option>
              {availableRisks.map((r) => (
                <option key={r.id} value={r.id}>{r.kode ? `${r.kode} — ` : ''}{r.pernyataan}</option>
              ))}
            </select>
          </div>
        )}
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={creating || availableRisks.length === 0}
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
          <p className="px-5 py-6 text-center text-sm text-muted-foreground">Belum ada diagram. Pilih risiko di atas untuk memulai.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {bowties.map((b) => {
              const risk = riskById(b.risk_id)
              return (
                <div key={b.id} className="flex items-center gap-3 px-5 py-3">
                  <Network className="w-4 h-4 text-indigo-400 shrink-0" />
                  <button onClick={() => setSelectedId(b.id)} className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-slate-800 truncate">{risk?.pernyataan ?? '(risiko tidak ditemukan)'}</p>
                    {risk?.kode && <p className="text-[11px] text-slate-400 truncate">{risk.kode}</p>}
                  </button>
                  {risk?.penyebab || risk?.dampak_uraian ? (
                    <span className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-green-700">
                      <Check className="w-3.5 h-3.5" /> Tersimpan
                    </span>
                  ) : null}
                  <button onClick={() => handleDelete(b.id)} className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
