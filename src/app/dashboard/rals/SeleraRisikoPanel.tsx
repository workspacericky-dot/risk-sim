'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle, Target } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { RiskAppetiteMatrix } from '@/components/RiskAppetiteMatrix'
import { KATEGORI_RISIKO } from '@/lib/risk-engine'
import { DEFAULT_SELERA } from '@/lib/rals-probis'

export default function SeleraRisikoPanel({ sessionId }: { sessionId: string }) {
  const [values, setValues] = useState<Record<string, number>>({ ...DEFAULT_SELERA })
  const [catatan, setCatatan] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data } = await sb.from('rals_selera_risiko').select('*').eq('session_id', sessionId).maybeSingle()
    if (data) {
      setValues({
        strategis: data.strategis, kebijakan: data.kebijakan, kecurangan: data.kecurangan, bencana: data.bencana,
        kepatuhan: data.kepatuhan, operasional: data.operasional, kemitraan: data.kemitraan,
      })
      setCatatan(data.catatan ?? '')
    }
    setLoading(false)
  }, [sessionId])

  useEffect(() => { load() }, [load])

  function handleChange(key: string, raw: string) {
    setSaved(false)
    const num = parseInt(raw, 10)
    if (!isNaN(num) && num >= 1 && num <= 25) setValues((v) => ({ ...v, [key]: num }))
  }

  async function handleSave() {
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('rals_selera_risiko').upsert({
      session_id: sessionId, strategis: values.strategis, kebijakan: values.kebijakan, kecurangan: values.kecurangan,
      bencana: values.bencana, kepatuhan: values.kepatuhan, operasional: values.operasional, kemitraan: values.kemitraan,
      catatan, updated_at: new Date().toISOString(),
    }, { onConflict: 'session_id' })
    setSaving(false)
    if (!error) setSaved(true)
  }

  if (loading) return <div className="mt-4 border-t pt-4 text-center text-xs text-muted-foreground">Memuat...</div>

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Target className="w-3.5 h-3.5 text-indigo-500" />
        Tetapkan nilai maksimal (1–25) yang masih dapat diterima per kategori risiko. Ini menjadi ambang batas prioritas peserta di tahap Evaluasi.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {KATEGORI_RISIKO.map((cat) => (
          <div key={cat.key} className="rounded-xl border bg-white p-3 space-y-1.5">
            <p className="text-[11px] font-semibold text-slate-700">{cat.label}</p>
            <p className="text-[10px] text-slate-400 leading-tight h-7">{cat.hint}</p>
            <input type="number" min={1} max={25} value={values[cat.key]}
              onChange={(e) => handleChange(cat.key, e.target.value)}
              className="w-full text-center font-bold text-lg border border-slate-200 rounded-lg py-1 outline-none focus:border-indigo-400" />
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <label className="text-xs font-semibold text-slate-600">Catatan / Justifikasi (opsional)</label>
        <textarea value={catatan} onChange={(e) => { setCatatan(e.target.value); setSaved(false) }} rows={2}
          placeholder="mis. Nilai maks. kecurangan = 4 karena toleransi sangat rendah..."
          className="w-full text-xs border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400" />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors">
          {saving ? 'Menyimpan...' : 'Simpan Selera Risiko'}
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle className="w-3.5 h-3.5" /> Tersimpan</span>}
      </div>

      <div>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Peta Matriks Selera Risiko</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {KATEGORI_RISIKO.map((cat) => (
            <div key={cat.key} className="rounded-xl border bg-white overflow-hidden">
              <div className="px-3 py-2 border-b bg-slate-50 flex items-center justify-between">
                <span className="text-[11px] font-semibold text-slate-700">{cat.label}</span>
                <span className="text-[11px] font-mono font-bold text-indigo-600">Maks: {values[cat.key]}</span>
              </div>
              <div className="p-2">
                <RiskAppetiteMatrix threshold={values[cat.key]} compact />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
