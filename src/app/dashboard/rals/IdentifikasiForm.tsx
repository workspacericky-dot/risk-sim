'use client'

import { useEffect, useState, useCallback } from 'react'
import { Trash2, Plus, Lightbulb } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'
import { parseKonteks, type KonteksData } from '@/lib/rals-probis'

type Risk = {
  id: string
  kode: string
  pernyataan: string
  kategori: string
  dampak_uraian: string
  penyebab: string
}

export default function IdentifikasiForm({
  sessionId, participantId,
}: { sessionId: string; participantId: string }) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [konteks, setKonteks] = useState<KonteksData | null>(null)
  const [pernyataan, setPernyataan] = useState('')
  const [kategori, setKategori] = useState('')
  const [dampak, setDampak] = useState('')
  const [penyebab, setPenyebab] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadRisks = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('rals_risk').select('*')
      .eq('participant_id', participantId).order('created_at', { ascending: true })
    setRisks((data ?? []) as Risk[])
  }, [participantId])

  useEffect(() => { loadRisks() }, [loadRisks])

  // Ambil konteks peserta (proses bisnis) untuk banner.
  useEffect(() => {
    const sb = createClient()
    sb.from('rals_participant').select('konteks').eq('id', participantId).single()
      .then(({ data }) => setKonteks(parseKonteks(data?.konteks)))
  }, [participantId])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!pernyataan.trim()) { setError('Pernyataan risiko wajib diisi.'); return }
    if (!kategori) { setError('Pilih satu kategori risiko.'); return }
    setSaving(true); setError(null)
    const sb = createClient()
    const { count } = await sb.from('rals_risk').select('id', { count: 'exact', head: true })
      .eq('participant_id', participantId)
    const kode = `R-${String((count ?? 0) + 1).padStart(2, '0')}`
    const { error: insErr } = await sb.from('rals_risk').insert({
      session_id: sessionId, participant_id: participantId, kode,
      pernyataan: pernyataan.trim(), kategori, dampak_uraian: dampak.trim(), penyebab: penyebab.trim(),
    })
    setSaving(false)
    if (insErr) { setError(insErr.message); return }
    setPernyataan(''); setKategori(''); setDampak(''); setPenyebab('')
    loadRisks()
  }

  async function handleDelete(id: string) {
    const sb = createClient()
    await sb.from('rals_risk').delete().eq('id', id)
    loadRisks()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  return (
    <div className="space-y-4">
      {/* Konteks peserta — bahan untuk mengidentifikasi risiko */}
      {konteks && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-sm">
          <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold">Proses Bisnis</p>
          <p className="font-serif font-semibold text-indigo-900">{konteks.l1Kode} — {konteks.l1Nama}</p>
          <p className="text-[10px] uppercase tracking-widest text-indigo-400 font-semibold mt-2">Subproses Bisnis</p>
          <p className="text-slate-700 text-sm font-medium">{konteks.l2Kode} — {konteks.l2Nama}</p>
          {konteks.pemangkuNama && (
            <p className="text-xs text-slate-500 mt-2">
              <span className="font-semibold">Pemangku kepentingan:</span> {konteks.pemangkuNama}
            </p>
          )}
          <p className="text-xs text-slate-500 mt-1">Identifikasi risiko yang mungkin muncul pada subproses ini.</p>
        </div>
      )}

      {/* Form tambah risiko */}
      <form onSubmit={handleAdd} className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
        <h3 className="font-serif font-semibold text-slate-800 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-500" /> Tambahkan Risiko yang Anda Temukan
        </h3>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Pernyataan Risiko</label>
          <textarea value={pernyataan} onChange={(e) => setPernyataan(e.target.value)} rows={3}
            placeholder="Uraikan peristiwa risiko yang mungkin terjadi..." className={inputCls} />
          <div className="flex items-start gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5">
            <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>Pola: <em>[peristiwa]</em> karena <em>[penyebab]</em> sehingga <em>[dampak]</em>. Contoh: &quot;Antrean pendaftaran perkara menumpuk karena jumlah petugas PTSP kurang, sehingga layanan melampaui waktu standar.&quot;</span>
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-600">Kategori Risiko</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {KATEGORI_RISIKO.map((k) => (
              <button type="button" key={k.key} onClick={() => setKategori(k.label)}
                title={k.hint}
                className={`text-left rounded-xl border p-2.5 transition-all ${
                  kategori === k.label
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
                }`}>
                <span className="block text-xs font-semibold text-slate-800">{k.label}</span>
                <span className="block text-[10px] text-slate-500 leading-tight mt-0.5">{k.hint}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Uraian Dampak <span className="text-slate-400 font-normal">(opsional)</span></label>
            <textarea value={dampak} onChange={(e) => setDampak(e.target.value)} rows={2}
              placeholder="Akibat bila risiko terjadi..." className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Penyebab <span className="text-slate-400 font-normal">(opsional)</span></label>
            <textarea value={penyebab} onChange={(e) => setPenyebab(e.target.value)} rows={2}
              placeholder="Akar masalah pemicu risiko..." className={inputCls} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <button type="submit" disabled={saving}
          className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? 'Menyimpan...' : 'Simpan Risiko'}
        </button>
      </form>

      {/* Daftar risiko sendiri */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Risiko yang Sudah Anda Catat</h3>
          <span className="text-[11px] text-slate-400">{risks.length} risiko</span>
        </div>
        {risks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">Belum ada. Tambahkan risiko pertama Anda di atas.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {risks.map((r) => (
              <div key={r.id} className="flex items-start gap-3 px-5 py-3">
                <span className="shrink-0 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">{r.kode}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-800">{r.pernyataan}</p>
                  {r.kategori && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">{r.kategori}</span>}
                </div>
                <button onClick={() => handleDelete(r.id)} title="Hapus" className="shrink-0 text-slate-300 hover:text-red-500 transition-colors p-1">
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
