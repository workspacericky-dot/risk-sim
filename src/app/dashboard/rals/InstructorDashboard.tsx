'use client'

import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, ClipboardCheck } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { RiskMatrix, type RiskPoint } from '@/components/RiskMatrix'
import { KATEGORI_RISIKO, getBesaran, getKategoriKey } from '@/lib/risk-engine'
import { DEFAULT_SELERA } from '@/lib/rals-probis'

type Participant = { id: string; nama: string }
type Risk = { id: string; kode: string; pernyataan: string; kategori: string; participant_id: string; created_at: string }
type Analysis = {
  risk_id: string; k_residu: number | null; d_residu: number | null
  ada_pengendalian: boolean | null; pengendalian_memadai: boolean | null
}
type Treatment = { risk_id: string; kegiatan_pengendalian: string; penanggung_jawab: string; target_waktu: string }

export default function InstructorDashboard({ sessionId }: { sessionId: string }) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [treatments, setTreatments] = useState<Record<string, Treatment>>({})
  const [selera, setSelera] = useState<Record<string, number>>(DEFAULT_SELERA)

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const [{ data: p }, { data: r }, { data: sr }] = await Promise.all([
      sb.from('rals_participant').select('id, nama').eq('session_id', sessionId),
      sb.from('rals_risk').select('id, kode, pernyataan, kategori, participant_id, created_at')
        .eq('session_id', sessionId).order('created_at', { ascending: false }),
      sb.from('rals_selera_risiko').select('*').eq('session_id', sessionId).maybeSingle(),
    ])
    setParticipants((p ?? []) as Participant[])
    const rows = (r ?? []) as Risk[]
    setRisks(rows)
    if (sr) {
      setSelera({
        strategis: sr.strategis, kebijakan: sr.kebijakan, kecurangan: sr.kecurangan, bencana: sr.bencana,
        kepatuhan: sr.kepatuhan, operasional: sr.operasional, kemitraan: sr.kemitraan,
      })
    }

    if (rows.length) {
      const ids = rows.map((x) => x.id)
      const [{ data: a }, { data: t }] = await Promise.all([
        sb.from('rals_analysis').select('risk_id, k_residu, d_residu, ada_pengendalian, pengendalian_memadai').in('risk_id', ids),
        sb.from('rals_treatment').select('risk_id, kegiatan_pengendalian, penanggung_jawab, target_waktu').in('risk_id', ids),
      ])
      const aMap: Record<string, Analysis> = {}
      for (const it of (a ?? []) as Analysis[]) aMap[it.risk_id] = it
      setAnalyses(aMap)
      const tMap: Record<string, Treatment> = {}
      for (const it of (t ?? []) as Treatment[]) tMap[it.risk_id] = it
      setTreatments(tMap)
    } else {
      setAnalyses({}); setTreatments({})
    }
  }, [sessionId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_dash:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_risk', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_participant', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_analysis' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_treatment' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_selera_risiko', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000) // fallback jika realtime tak terkirim
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  const analisedRisks = risks.filter((r) => {
    const a = analyses[r.id]
    return a && a.k_residu != null && a.d_residu != null
  })

  const points: RiskPoint[] = analisedRisks.map((r) => ({
    id: r.id, label: r.kode, kemungkinan: analyses[r.id].k_residu!, dampak: analyses[r.id].d_residu!,
    pernyataan: r.pernyataan, pengendalian: analyses[r.id].ada_pengendalian,
  }))

  // Risiko prioritas: besaran residu > selera kategorinya (sama seperti Evaluasi/Penanganan)
  const prioritas = analisedRisks.filter((r) => {
    const a = analyses[r.id]
    const besaran = getBesaran(a.k_residu, a.d_residu)
    const key = getKategoriKey(r.kategori)
    const threshold = key ? selera[key] ?? null : null
    return besaran != null && threshold != null && besaran > threshold
  })
  // "Punya rencana" = baris rals_treatment sudah tersimpan (peserta mengisi salah satu
  // field), bukan mensyaratkan kolom Kegiatan Pengendalian spesifik terisi — peserta bisa
  // mulai dari field lain dulu (PIC, target waktu, dst).
  const prioritasDenganRencana = prioritas.filter((r) => !!treatments[r.id])

  // Kememadaian pengendalian yang ada
  const kememadaianCounts = {
    belumAda:   analisedRisks.filter((r) => analyses[r.id].ada_pengendalian === false).length,
    memadai:    analisedRisks.filter((r) => analyses[r.id].ada_pengendalian === true && analyses[r.id].pengendalian_memadai === true).length,
    kurang:     analisedRisks.filter((r) => analyses[r.id].ada_pengendalian === true && analyses[r.id].pengendalian_memadai === false).length,
    belumDinilai: analisedRisks.filter((r) => analyses[r.id].ada_pengendalian === true && analyses[r.id].pengendalian_memadai === null).length,
  }
  const maxKememadaian = Math.max(1, ...Object.values(kememadaianCounts))

  const nama = (pid: string) => participants.find((p) => p.id === pid)?.nama ?? '—'
  const katCount = (label: string) => risks.filter((r) => r.kategori === label).length
  const maxKat = Math.max(1, ...KATEGORI_RISIKO.map((k) => katCount(k.label)))

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {/* Statistik */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Peserta" value={participants.length} />
        <Stat label="Total Risiko" value={risks.length} />
        <Stat label="Dianalisis" value={analisedRisks.length} />
        <Stat label="Prioritas" value={prioritas.length} accent="text-red-700" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Heatmap agregat (residu) */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Peta Risiko Kelas (Residu)</h4>
          {points.length === 0
            ? <p className="text-xs text-muted-foreground py-8 text-center">Belum ada risiko yang dianalisis.</p>
            : <RiskMatrix risks={points} />}
        </div>

        {/* Distribusi kategori */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Distribusi Kategori</h4>
          <div className="space-y-1.5">
            {KATEGORI_RISIKO.map((k) => {
              const c = katCount(k.label)
              return (
                <div key={k.key} className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-600 w-28 shrink-0 truncate">{k.label}</span>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div className="h-full bg-indigo-400 rounded" style={{ width: `${(c / maxKat) * 100}%` }} />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-500 w-5 text-right">{c}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Kememadaian pengendalian yang ada */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Kememadaian Pengendalian yang Ada</h4>
          <div className="space-y-1.5">
            {[
              { label: 'Belum ada pengendalian', value: kememadaianCounts.belumAda, color: 'bg-slate-400' },
              { label: 'Ada · Memadai',           value: kememadaianCounts.memadai, color: 'bg-green-500' },
              { label: 'Ada · Kurang Memadai',    value: kememadaianCounts.kurang, color: 'bg-amber-500' },
              { label: 'Ada · Belum dinilai',      value: kememadaianCounts.belumDinilai, color: 'bg-slate-300' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 w-36 shrink-0 truncate">{row.label}</span>
                <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                  <div className={`h-full rounded ${row.color}`} style={{ width: `${(row.value / maxKememadaian) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-slate-500 w-5 text-right">{row.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progres Rencana Penanganan Risiko */}
        <div className="rounded-xl border bg-white p-4">
          <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-1.5">
            <ClipboardCheck className="w-3.5 h-3.5 text-indigo-500" /> Rencana Penanganan Risiko
          </h4>
          {prioritas.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Belum ada risiko prioritas yang perlu ditangani.</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded" style={{ width: `${(prioritasDenganRencana.length / prioritas.length) * 100}%` }} />
                </div>
                <span className="text-[11px] font-semibold text-slate-600 shrink-0">{prioritasDenganRencana.length}/{prioritas.length}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">risiko prioritas sudah punya rencana tindak pengendalian.</p>
              {prioritas.length - prioritasDenganRencana.length > 0 && (
                <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1.5">
                  <AlertTriangle className="w-3 h-3" /> {prioritas.length - prioritasDenganRencana.length} risiko prioritas belum ada rencana.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Umpan risiko masuk */}
      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="px-4 py-2.5 border-b bg-slate-50 text-sm font-semibold text-slate-700">Umpan Risiko Masuk</div>
        {risks.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-muted-foreground">Belum ada risiko masuk.</p>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {risks.slice(0, 30).map((r) => (
              <div key={r.id} className="flex items-start gap-2 px-4 py-2">
                <span className="shrink-0 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">{r.kode}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800">{r.pernyataan}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{nama(r.participant_id)}{r.kategori ? ` · ${r.kategori}` : ''}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Umpan rencana penanganan masuk */}
      {prioritasDenganRencana.length > 0 && (
        <div className="rounded-xl border bg-white overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-slate-50 text-sm font-semibold text-slate-700">Umpan Rencana Penanganan</div>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {prioritasDenganRencana.map((r) => {
              const t = treatments[r.id]
              return (
                <div key={r.id} className="flex items-start gap-2 px-4 py-2">
                  <span className="shrink-0 font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-1 py-0.5">{r.kode}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-800">
                      {t.kegiatan_pengendalian?.trim() || <span className="text-slate-300 italic">(Kegiatan pengendalian belum diisi)</span>}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {nama(r.participant_id)}
                      {t.penanggung_jawab ? ` · PIC: ${t.penanggung_jawab}` : ''}
                      {t.target_waktu ? ` · ${t.target_waktu}` : ''}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border bg-white p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-slate-400">{label}</p>
      <p className={`text-2xl font-bold font-serif ${accent ?? 'text-slate-800'}`}>{value}</p>
    </div>
  )
}
