'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { Check } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getBesaran, getLevel, KEMUNGKINAN_LABELS, DAMPAK_LABELS } from '@/lib/risk-engine'
import { SPIP_UNSUR } from '@/lib/spip-control-library'
import ExportBar from './ExportBar'

type Risk = { id: string; kode: string; pernyataan: string; kategori: string }
type Analysis = {
  risk_id: string
  k_inheren: number | null; d_inheren: number | null
  ada_pengendalian: boolean | null; pengendalian_memadai: boolean | null
  k_residu: number | null; d_residu: number | null
  unsur_spip: string; subunsur_spip: string
  uraian_pengendalian: string; evidence_keberadaan: string; evidence_kememadaian: string
}

// ── Selektor skala 1–5 berlabel ─────────────────────────────────────────────
function Scale5({ value, onChange, labels }: {
  value: number | null; onChange: (n: number) => void; labels: Record<number, string>
}) {
  return (
    <div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button type="button" key={n} onClick={() => onChange(n)}
            className={`w-9 h-9 rounded-lg text-sm font-bold border transition-all ${
              value === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>{n}</button>
        ))}
      </div>
      <p className="text-[11px] text-slate-500 mt-1 h-4">{value ? labels[value] : ' '}</p>
    </div>
  )
}

function LevelBadge({ k, d }: { k: number | null; d: number | null }) {
  const besaran = getBesaran(k, d)
  const lvl = getLevel(besaran)
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border"
      style={{ color: lvl.color, borderColor: lvl.color + '55', background: lvl.color + '11' }}>
      {besaran ? <>Besaran {besaran} · {lvl.label}</> : 'Isi skor dulu'}
    </span>
  )
}

// ── Satu baris risiko ───────────────────────────────────────────────────────
function AnalisisRow({ risk, initial }: { risk: Risk; initial: Analysis | null }) {
  const [kI, setKI] = useState<number | null>(initial?.k_inheren ?? null)
  const [dI, setDI] = useState<number | null>(initial?.d_inheren ?? null)
  const [ada, setAda] = useState<boolean | null>(initial?.ada_pengendalian ?? null)
  const [unsurKode, setUnsurKode] = useState(() => SPIP_UNSUR.find((u) => initial?.unsur_spip?.startsWith(u.kode + ' — '))?.kode ?? '')
  const [subunsurSpip, setSubunsurSpip] = useState(initial?.subunsur_spip ?? '')
  const [uraian, setUraian] = useState(initial?.uraian_pengendalian ?? '')
  const [evidenceAda, setEvidenceAda] = useState(initial?.evidence_keberadaan ?? '')
  const [memadai, setMemadai] = useState<boolean | null>(initial?.pengendalian_memadai ?? null)
  const [evidenceMemadai, setEvidenceMemadai] = useState(initial?.evidence_kememadaian ?? '')
  const [kR, setKR] = useState<number | null>(initial?.k_residu ?? null)
  const [dR, setDR] = useState<number | null>(initial?.d_residu ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!initial)

  // Tandai "belum tersimpan" begitu ada field yang berubah — kecuali pada render pertama (saat data awal dimuat).
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setSaved(false)
  }, [kI, dI, ada, unsurKode, subunsurSpip, uraian, evidenceAda, memadai, evidenceMemadai, kR, dR])

  const currentUnsur = SPIP_UNSUR.find((u) => u.kode === unsurKode)
  const unsurLabel = currentUnsur ? `${currentUnsur.kode} — ${currentUnsur.nama}` : ''

  async function save() {
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('rals_analysis').upsert({
      risk_id: risk.id, k_inheren: kI, d_inheren: dI,
      ada_pengendalian: ada, pengendalian_memadai: memadai,
      unsur_spip: ada ? unsurLabel : '', subunsur_spip: ada ? subunsurSpip : '',
      uraian_pengendalian: ada ? uraian.trim() : '', evidence_keberadaan: ada ? evidenceAda.trim() : '',
      evidence_kememadaian: memadai !== null ? evidenceMemadai.trim() : '',
      k_residu: kR, d_residu: dR, updated_at: new Date().toISOString(),
    }, { onConflict: 'risk_id' })
    setSaving(false)
    if (!error) setSaved(true)
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">{risk.kode}</span>
        <p className="text-sm font-medium text-slate-800">{risk.pernyataan}</p>
      </div>

      {/* Risiko melekat */}
      <div className="rounded-xl bg-sky-50/60 border border-sky-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide">Risiko Melekat (sebelum pengendalian)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-slate-600">Kemungkinan</label><Scale5 value={kI} onChange={setKI} labels={KEMUNGKINAN_LABELS} /></div>
          <div><label className="text-xs font-semibold text-slate-600">Dampak</label><Scale5 value={dI} onChange={setDI} labels={DAMPAK_LABELS} /></div>
        </div>
        <LevelBadge k={kI} d={dI} />
      </div>

      {/* Pengendalian */}
      <div className="rounded-xl bg-amber-50/60 border border-amber-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">Pengendalian yang Ada</p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600">Sudah ada pengendalian?</span>
          <Toggle value={ada} onChange={(v) => { setAda(v); if (!v) { setUnsurKode(''); setSubunsurSpip(''); setUraian(''); setEvidenceAda(''); setMemadai(null); setEvidenceMemadai('') } }} />
        </div>

        {ada && (
          <div className="space-y-3 pl-1 border-l-2 border-amber-200 ml-1">
            {/* 1. Unsur & Subunsur SPIP */}
            <div className="grid sm:grid-cols-2 gap-3 pl-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Unsur SPIP terkait</label>
                <select value={unsurKode} onChange={(e) => { setUnsurKode(e.target.value); setSubunsurSpip('') }}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400 bg-white">
                  <option value="" disabled>Pilih unsur...</option>
                  {SPIP_UNSUR.map((u) => <option key={u.kode} value={u.kode}>{u.kode}. {u.nama}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Subunsur SPIP terkait</label>
                <select value={subunsurSpip} onChange={(e) => setSubunsurSpip(e.target.value)} disabled={!currentUnsur}
                  className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400 bg-white disabled:bg-slate-50 disabled:text-slate-400">
                  <option value="" disabled>{currentUnsur ? 'Pilih subunsur...' : 'Pilih unsur dulu'}</option>
                  {currentUnsur?.sub.map((s) => (
                    <option key={s.kode} value={`${s.kode} — ${s.nama}`}>{s.kode} — {s.nama}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* 2. Uraian + Evidence keberadaan — hanya muncul setelah unsur & subunsur terpilih */}
            {subunsurSpip && (
              <div className="space-y-2 pl-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Uraian Pengendalian yang Ada</label>
                  <textarea value={uraian} onChange={(e) => setUraian(e.target.value)} rows={2}
                    placeholder="Jelaskan bentuk pengendalian yang sudah berjalan..."
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Evidence Keberadaan</label>
                  <input value={evidenceAda} onChange={(e) => setEvidenceAda(e.target.value)}
                    placeholder="Link Google Drive/dokumen lain yang membuktikan pengendalian ini ada"
                    className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400" />
                </div>
              </div>
            )}

            {/* 3. Memadai? — hanya muncul setelah uraian & evidence keberadaan terisi */}
            {subunsurSpip && uraian.trim() && evidenceAda.trim() && (
              <div className="space-y-2 pl-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-600">Sudah memadai?</span>
                  <Toggle value={memadai} onChange={setMemadai} />
                </div>
                {memadai !== null && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-600">Evidence/Bukti Kememadaian</label>
                    <input value={evidenceMemadai} onChange={(e) => setEvidenceMemadai(e.target.value)}
                      placeholder="Link bukti yang mendukung penilaian memadai/belum memadai"
                      className="w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-amber-400" />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <p className="text-[11px] text-amber-700">Pengendalian yang memadai biasanya menurunkan skor risiko residu.</p>
      </div>

      {/* Risiko residu */}
      <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Risiko Residu (setelah pengendalian)</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div><label className="text-xs font-semibold text-slate-600">Kemungkinan</label><Scale5 value={kR} onChange={setKR} labels={KEMUNGKINAN_LABELS} /></div>
          <div><label className="text-xs font-semibold text-slate-600">Dampak</label><Scale5 value={dR} onChange={setDR} labels={DAMPAK_LABELS} /></div>
        </div>
        <LevelBadge k={kR} d={dR} />
      </div>

      <button onClick={save} disabled={saving}
        className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
        {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan Analisis'}
      </button>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean | null; onChange: (b: boolean) => void }) {
  return (
    <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold">
      <button type="button" onClick={() => onChange(true)}
        className={`px-3 py-1 ${value === true ? 'bg-green-600 text-white' : 'bg-white text-slate-500'}`}>Ya</button>
      <button type="button" onClick={() => onChange(false)}
        className={`px-3 py-1 ${value === false ? 'bg-slate-500 text-white' : 'bg-white text-slate-500'}`}>Belum</button>
    </div>
  )
}

// ── Form utama ──────────────────────────────────────────────────────────────
export default function AnalisisForm({ participantId }: { participantId: string }) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: r } = await sb.from('rals_risk').select('id, kode, pernyataan, kategori')
      .eq('participant_id', participantId).order('created_at', { ascending: true })
    const rows = (r ?? []) as Risk[]
    setRisks(rows)
    if (rows.length) {
      const { data: a } = await sb.from('rals_analysis').select('*').in('risk_id', rows.map((x) => x.id))
      const map: Record<string, Analysis> = {}
      for (const it of (a ?? []) as Analysis[]) map[it.risk_id] = it
      setAnalyses(map)
    }
    setLoading(false)
  }, [participantId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Memuat...</div>
  if (risks.length === 0) return (
    <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">
      Anda belum mencatat risiko pada tahap Identifikasi.
    </div>
  )

  return (
    <div className="space-y-4">
      <ExportBar participantId={participantId} stage="analisis" />
      <p className="text-sm text-slate-500">Nilai tiap risiko: seberapa besar kemungkinan & dampaknya, lalu setelah dikendalikan.</p>
      {risks.map((r) => <AnalisisRow key={r.id} risk={r} initial={analyses[r.id] ?? null} />)}
    </div>
  )
}
