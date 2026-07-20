'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Check, ClipboardCheck, ShieldCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { getBesaran, getLevel, getKategoriKey } from '@/lib/risk-engine'
import { DEFAULT_SELERA } from '@/lib/rals-probis'
import { SPIP_UNSUR } from '@/lib/spip-control-library'
import ExportBar from './ExportBar'

type Risk = { id: string; kode: string; pernyataan: string; kategori: string; penyebab: string }
type Analysis = { risk_id: string; k_residu: number | null; d_residu: number | null }
type Treatment = {
  risk_id: string; kegiatan_pengendalian: string; unsur_spip: string; subunsur_spip: string
  penanggung_jawab: string; indikator_keluaran: string; target_waktu: string
  frekuensi_rencana: number | null; dampak_rencana: number | null
}

export default function PenangananForm({ participantId, sessionId }: { participantId: string; sessionId: string }) {
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [treatments, setTreatments] = useState<Record<string, Treatment>>({})
  const [selera, setSelera] = useState<Record<string, number>>(DEFAULT_SELERA)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const sb = createClient()
    const { data: r } = await sb.from('rals_risk').select('id, kode, pernyataan, kategori, penyebab')
      .eq('participant_id', participantId).order('created_at', { ascending: true })
    const rows = (r ?? []) as Risk[]
    setRisks(rows)

    if (rows.length) {
      const { data: a } = await sb.from('rals_analysis').select('risk_id, k_residu, d_residu').in('risk_id', rows.map((x) => x.id))
      const aMap: Record<string, Analysis> = {}
      for (const it of (a ?? []) as Analysis[]) aMap[it.risk_id] = it
      setAnalyses(aMap)

      const { data: t } = await sb.from('rals_treatment').select('*').in('risk_id', rows.map((x) => x.id))
      const tMap: Record<string, Treatment> = {}
      for (const it of (t ?? []) as Treatment[]) tMap[it.risk_id] = it
      setTreatments(tMap)
    }

    const { data: sr } = await sb.from('rals_selera_risiko').select('*').eq('session_id', sessionId).maybeSingle()
    if (sr) {
      setSelera({
        strategis: sr.strategis, kebijakan: sr.kebijakan, kecurangan: sr.kecurangan, bencana: sr.bencana,
        kepatuhan: sr.kepatuhan, operasional: sr.operasional, kemitraan: sr.kemitraan,
      })
    }
    setLoading(false)
  }, [participantId, sessionId])

  useEffect(() => { load() }, [load])

  if (loading) return <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Memuat...</div>

  const prioritas = risks
    .map((risk) => ({ risk, a: analyses[risk.id] }))
    .filter((x) => x.a && x.a.k_residu != null && x.a.d_residu != null)
    .map(({ risk, a }) => {
      const besaran = getBesaran(a!.k_residu, a!.d_residu)
      const key = getKategoriKey(risk.kategori)
      const threshold = key ? selera[key] ?? null : null
      return { risk, a: a!, besaran, threshold, over: besaran != null && threshold != null && besaran > threshold }
    })
    .filter((x) => x.over)
    .sort((x, y) => (y.besaran ?? 0) - (x.besaran ?? 0))

  return (
    <div className="space-y-4">
      <ExportBar participantId={participantId} stage="penanganan" />
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 flex items-start gap-2">
        <ClipboardCheck className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          Rancang rencana tindak pengendalian untuk risiko yang nilai residunya melebihi selera risiko —
          hasil dari tahap Evaluasi.
        </p>
      </div>

      {prioritas.length === 0 ? (
        <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-green-700 flex flex-col items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Tidak ada risiko yang perlu ditindaklanjuti. Semua risiko Anda dalam batas selera.
        </div>
      ) : (
        prioritas.map(({ risk, a, besaran, threshold }) => (
          <TreatmentRow key={risk.id} risk={risk} residualK={a.k_residu} residualD={a.d_residu}
            besaran={besaran} threshold={threshold} initial={treatments[risk.id] ?? null}
            sessionId={sessionId} participantId={participantId} />
        ))
      )}
    </div>
  )
}

function TreatmentRow({ risk, residualK, residualD, besaran, threshold, initial, sessionId, participantId }: {
  risk: Risk; residualK: number | null; residualD: number | null; besaran: number | null; threshold: number | null
  initial: Treatment | null; sessionId: string; participantId: string
}) {
  const [unsurKode, setUnsurKode] = useState(() => SPIP_UNSUR.find((u) => initial?.unsur_spip?.startsWith(u.kode + ' — '))?.kode ?? '')
  const [subunsurSpip, setSubunsurSpip] = useState(initial?.subunsur_spip ?? '')
  const [kegiatan, setKegiatan] = useState(initial?.kegiatan_pengendalian ?? '')
  const [penanggungJawab, setPenanggungJawab] = useState(initial?.penanggung_jawab ?? '')
  const [indikator, setIndikator] = useState(initial?.indikator_keluaran ?? '')
  const [targetWaktu, setTargetWaktu] = useState(initial?.target_waktu ?? '')
  const [frekuensiRencana, setFrekuensiRencana] = useState<number | null>(initial?.frekuensi_rencana ?? null)
  const [dampakRencana, setDampakRencana] = useState<number | null>(initial?.dampak_rencana ?? null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(!!initial)

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setSaved(false)
  }, [unsurKode, subunsurSpip, kegiatan, penanggungJawab, indikator, targetWaktu, frekuensiRencana, dampakRencana])

  const currentUnsur = SPIP_UNSUR.find((u) => u.kode === unsurKode)
  const responRisiko = (residualK ?? 0) >= (residualD ?? 0) ? 'Mengurangi Frekuensi' : 'Mengurangi Dampak'
  const rencanaBesaran = getBesaran(frekuensiRencana, dampakRencana)
  const rencanaLevel = getLevel(rencanaBesaran)

  const inputCls = 'w-full text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  async function save() {
    setSaving(true)
    const sb = createClient()
    const unsurLabel = currentUnsur ? `${currentUnsur.kode} — ${currentUnsur.nama}` : ''
    const { error } = await sb.from('rals_treatment').upsert({
      risk_id: risk.id, session_id: sessionId, participant_id: participantId,
      kegiatan_pengendalian: kegiatan.trim(), unsur_spip: unsurLabel, subunsur_spip: subunsurSpip,
      penanggung_jawab: penanggungJawab.trim(), indikator_keluaran: indikator.trim(), target_waktu: targetWaktu.trim(),
      frekuensi_rencana: frekuensiRencana, dampak_rencana: dampakRencana, updated_at: new Date().toISOString(),
    }, { onConflict: 'risk_id' })
    setSaving(false)
    if (!error) setSaved(true)
  }

  return (
    <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-start gap-2">
        <span className="shrink-0 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1.5 py-0.5">{risk.kode}</span>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-800">{risk.pernyataan}</p>
          {risk.penyebab && <p className="text-[11px] text-slate-500 mt-0.5"><span className="font-semibold">Penyebab:</span> {risk.penyebab}</p>}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] px-2 py-0.5 rounded bg-red-50 text-red-700 border border-red-100">
          Besaran residu {besaran} &gt; selera {threshold}
        </span>
        <span className={`text-[11px] px-2 py-0.5 rounded border font-semibold ${
          responRisiko === 'Mengurangi Frekuensi' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-purple-50 text-purple-700 border-purple-200'
        }`}>{responRisiko}</span>
      </div>

      <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-4 space-y-3">
        <p className="text-xs font-semibold text-indigo-800 uppercase tracking-wide">Rencana Tindak Pengendalian</p>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">Kegiatan Pengendalian</label>
          <textarea value={kegiatan} onChange={(e) => setKegiatan(e.target.value)} rows={2}
            placeholder="Rencana kegiatan untuk mengendalikan risiko ini..." className={inputCls} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Unsur SPIP</label>
            <select value={unsurKode} onChange={(e) => { setUnsurKode(e.target.value); setSubunsurSpip('') }} className={inputCls + ' bg-white'}>
              <option value="" disabled>Pilih unsur...</option>
              {SPIP_UNSUR.map((u) => <option key={u.kode} value={u.kode}>{u.kode}. {u.nama}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Subunsur SPIP</label>
            <select value={subunsurSpip} onChange={(e) => setSubunsurSpip(e.target.value)} disabled={!currentUnsur}
              className={inputCls + ' bg-white disabled:bg-slate-50 disabled:text-slate-400'}>
              <option value="" disabled>{currentUnsur ? 'Pilih subunsur...' : 'Pilih unsur dulu'}</option>
              {currentUnsur?.sub.map((s) => <option key={s.kode} value={`${s.kode} — ${s.nama}`}>{s.kode} — {s.nama}</option>)}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Penanggung Jawab</label>
            <input value={penanggungJawab} onChange={(e) => setPenanggungJawab(e.target.value)} placeholder="Nama/jabatan" className={inputCls} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Target Waktu</label>
            <input value={targetWaktu} onChange={(e) => setTargetWaktu(e.target.value)} placeholder="mis. Semester I/2026" className={inputCls} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-slate-600">Indikator Keluaran</label>
          <textarea value={indikator} onChange={(e) => setIndikator(e.target.value)} rows={2}
            placeholder="Dokumen, aplikasi, atau bentuk lainnya..." className={inputCls} />
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Rencana Kemungkinan</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setFrekuensiRencana(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                    frekuensiRencana === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600">Rencana Dampak</label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} onClick={() => setDampakRencana(n)}
                  className={`w-8 h-8 rounded-lg text-xs font-bold border transition-all ${
                    dampakRencana === n ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border"
          style={{ color: rencanaLevel.color, borderColor: rencanaLevel.color + '55', background: rencanaLevel.color + '11' }}>
          {rencanaBesaran ? <>Besaran rencana {rencanaBesaran} · {rencanaLevel.label}</> : 'Isi rencana K×D dulu'}
        </span>
      </div>

      <button onClick={save} disabled={saving}
        className="px-5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60 transition-colors inline-flex items-center gap-2">
        {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan Rencana'}
      </button>
    </div>
  )
}
