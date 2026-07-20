'use client'

import { useEffect, useState } from 'react'
import { Check, Target } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { PROSES_BISNIS, parseKonteks } from '@/lib/rals-probis'
import ExportBar from './ExportBar'
import OrgExportButton from './OrgExportButton'

export default function KonteksForm({ participantId, sessionId }: { participantId: string; sessionId: string }) {
  const [l1Kode, setL1Kode] = useState(PROSES_BISNIS[0]?.kode ?? '')
  const [l2Idx, setL2Idx] = useState('')
  const [pemangkuNama, setPemangkuNama] = useState('')
  const [harapan, setHarapan] = useState('')
  const [kebutuhan, setKebutuhan] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentL1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)

  // Prefill dari data tersimpan (bila peserta pernah mengisi).
  useEffect(() => {
    const sb = createClient()
    sb.from('rals_participant').select('konteks').eq('id', participantId).single().then(({ data }) => {
      const k = parseKonteks(data?.konteks)
      if (k) {
        const l1 = PROSES_BISNIS.find((p) => p.kode === k.l1Kode)
        if (l1) {
          setL1Kode(l1.kode)
          const idx = l1.sub.findIndex((s) => s.kode === k.l2Kode && s.nama === k.l2Nama)
          if (idx >= 0) setL2Idx(String(idx))
        }
        setPemangkuNama(k.pemangkuNama); setHarapan(k.harapan); setKebutuhan(k.kebutuhan)
      }
      setLoaded(true)
    })
  }, [participantId])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const l1 = PROSES_BISNIS.find((p) => p.kode === l1Kode)
    const l2 = l2Idx !== '' ? l1?.sub[Number(l2Idx)] : undefined
    if (!l1 || !l2) { setError('Pilih proses bisnis dan subproses bisnis.'); return }
    setSaving(true)
    const konteks = JSON.stringify({
      l1Kode: l1.kode, l1Nama: l1.nama, l2Kode: l2.kode, l2Nama: l2.nama,
      pemangkuNama: pemangkuNama.trim(), harapan: harapan.trim(), kebutuhan: kebutuhan.trim(),
    })
    const sb = createClient()
    const { error: updErr } = await sb.from('rals_participant').update({ konteks }).eq('id', participantId)
    setSaving(false)
    if (updErr) { setError(updErr.message); return }
    setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="space-y-4">
      <ExportBar participantId={participantId} stage="konteks" />
      <OrgExportButton sessionId={sessionId} stage="konteks" />
      <form onSubmit={handleSave} className="space-y-4">
      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
          <Target className="w-4 h-4 text-indigo-500" /> Penetapan Konteks
        </h3>
        <p className="text-xs text-muted-foreground -mt-2">Tentukan proses bisnis yang menjadi lingkup penilaian risiko Anda.</p>

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
      </div>

      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800">Pemangku Kepentingan</h3>
        <p className="text-xs text-muted-foreground -mt-2">Siapa yang berkepentingan pada subproses ini, serta harapan dan kebutuhannya.</p>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Nama / Jabatan Pemangku Kepentingan</label>
          <input value={pemangkuNama} onChange={(e) => setPemangkuNama(e.target.value)}
            placeholder="mis. Pencari keadilan / Ketua Pengadilan / Panitera" className={inputCls} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Harapan</label>
            <textarea value={harapan} onChange={(e) => setHarapan(e.target.value)} rows={3}
              placeholder="Apa yang diharapkan pemangku kepentingan..." className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Kebutuhan</label>
            <textarea value={kebutuhan} onChange={(e) => setKebutuhan(e.target.value)} rows={3}
              placeholder="Apa yang dibutuhkan pemangku kepentingan..." className={inputCls} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={saving || !loaded}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan Konteks'}
        </button>
      </div>
      </form>
    </div>
  )
}
