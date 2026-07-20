'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { getBesaran, getLevel, getKategoriKey } from '@/lib/risk-engine'
import { DEFAULT_SELERA, parseKonteks } from '@/lib/rals-probis'

type Participant = { id: string; nama: string; konteks: string | null }
type Risk = { id: string; kode: string; pernyataan: string; kategori: string; dampak_uraian: string; penyebab: string; participant_id: string }
type Analysis = {
  risk_id: string; k_inheren: number | null; d_inheren: number | null
  ada_pengendalian: boolean | null; pengendalian_memadai: boolean | null
  unsur_spip: string; subunsur_spip: string; k_residu: number | null; d_residu: number | null
}
type Treatment = {
  risk_id: string; kegiatan_pengendalian: string; unsur_spip: string; subunsur_spip: string
  penanggung_jawab: string; target_waktu: string; frekuensi_rencana: number | null; dampak_rencana: number | null
}

const TABS = [
  { key: 'konteks', label: 'Konteks' }, { key: 'identifikasi', label: 'Identifikasi' },
  { key: 'analisis', label: 'Analisis' }, { key: 'evaluasi', label: 'Evaluasi' }, { key: 'penanganan', label: 'Penanganan' },
] as const
type TabKey = (typeof TABS)[number]['key']

export default function LiveTablesPanel({ sessionId }: { sessionId: string }) {
  const [tab, setTab] = useState<TabKey>('identifikasi')
  const [participants, setParticipants] = useState<Participant[]>([])
  const [risks, setRisks] = useState<Risk[]>([])
  const [analyses, setAnalyses] = useState<Record<string, Analysis>>({})
  const [treatments, setTreatments] = useState<Record<string, Treatment>>({})
  const [selera, setSelera] = useState<Record<string, number>>(DEFAULT_SELERA)

  const fetchAll = useCallback(async () => {
    const sb = createClient()
    const [{ data: p }, { data: r }, { data: sr }] = await Promise.all([
      sb.from('rals_participant').select('id, nama, konteks').eq('session_id', sessionId),
      sb.from('rals_risk').select('id, kode, pernyataan, kategori, dampak_uraian, penyebab, participant_id')
        .eq('session_id', sessionId).order('created_at', { ascending: true }),
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
        sb.from('rals_analysis').select('*').in('risk_id', ids),
        sb.from('rals_treatment').select('*').in('risk_id', ids),
      ])
      setAnalyses(Object.fromEntries((a ?? []).map((it) => [it.risk_id, it])))
      setTreatments(Object.fromEntries((t ?? []).map((it) => [it.risk_id, it])))
    } else {
      setAnalyses({}); setTreatments({})
    }
  }, [sessionId])

  useEffect(() => {
    fetchAll()
    const sb = createClient()
    const channel = sb.channel(`rals_tables:${sessionId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_participant', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_risk', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_analysis' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_treatment' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rals_selera_risiko', filter: `session_id=eq.${sessionId}` }, fetchAll)
      .subscribe()
    const poll = setInterval(fetchAll, 4000)
    return () => { clearInterval(poll); sb.removeChannel(channel) }
  }, [fetchAll, sessionId])

  const namaOf = (pid: string) => participants.find((p) => p.id === pid)?.nama ?? '—'
  const th = 'border border-slate-300 px-2 py-1.5 text-center font-semibold'
  const td = 'border border-slate-200 px-2 py-1.5 align-top'

  return (
    <div className="mt-4 space-y-3 border-t pt-4">
      <div className="flex items-center gap-1 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              tab === t.key ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
            }`}>{t.label}</button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        {tab === 'konteks' && (
          <table className="w-full text-[11px] border-collapse min-w-[760px]">
            <thead><tr className="bg-slate-100 text-slate-600">
              <th className={th}>Peserta</th><th className={th}>Proses Bisnis</th><th className={th}>Subproses Bisnis</th>
              <th className={th}>Pemangku Kepentingan</th><th className={th}>Harapan</th><th className={th}>Kebutuhan</th>
            </tr></thead>
            <tbody>
              {participants.filter((p) => p.konteks).length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada peserta mengisi konteks.</td></tr>
              ) : participants.filter((p) => p.konteks).map((p) => {
                const k = parseKonteks(p.konteks)
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className={td + ' font-medium text-slate-800'}>{p.nama}</td>
                    <td className={td}>{k ? `${k.l1Kode} — ${k.l1Nama}` : '-'}</td>
                    <td className={td}>{k ? `${k.l2Kode} — ${k.l2Nama}` : '-'}</td>
                    <td className={td}>{k?.pemangkuNama || '-'}</td>
                    <td className={td}>{k?.harapan || '-'}</td>
                    <td className={td}>{k?.kebutuhan || '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {tab === 'identifikasi' && (
          <table className="w-full text-[11px] border-collapse min-w-[900px]">
            <thead><tr className="bg-slate-100 text-slate-600">
              <th className={th}>Peserta</th><th className={th}>Kode</th><th className={th}>Pernyataan Risiko</th>
              <th className={th}>Kategori</th><th className={th}>Uraian Dampak</th><th className={th}>Penyebab</th>
            </tr></thead>
            <tbody>
              {risks.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Belum ada risiko masuk.</td></tr>
              ) : risks.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className={td + ' font-medium text-slate-800'}>{namaOf(r.participant_id)}</td>
                  <td className={td + ' font-mono text-center'}>{r.kode}</td>
                  <td className={td}>{r.pernyataan}</td>
                  <td className={td}>{r.kategori || '-'}</td>
                  <td className={td}>{r.dampak_uraian || '-'}</td>
                  <td className={td}>{r.penyebab || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'analisis' && (
          <table className="w-full text-[10px] border-collapse min-w-[1100px]">
            <thead>
              <tr className="text-[10px]">
                <th className={th + ' bg-slate-200'} rowSpan={2}>Peserta</th>
                <th className={th + ' bg-slate-200'} rowSpan={2}>Kode</th>
                <th className={th + ' bg-slate-200'} rowSpan={2}>Pernyataan Risiko</th>
                <th className={th + ' bg-sky-100 text-sky-800'} colSpan={4}>Risiko Melekat</th>
                <th className={th + ' bg-amber-100 text-amber-800'} colSpan={2}>Pengendalian</th>
                <th className={th + ' bg-indigo-100 text-indigo-800'} colSpan={4}>Risiko Residu</th>
              </tr>
              <tr className="text-[10px]">
                <th className={th + ' bg-sky-50'}>K</th><th className={th + ' bg-sky-50'}>D</th>
                <th className={th + ' bg-sky-100'}>Besaran</th><th className={th + ' bg-sky-50'}>Level</th>
                <th className={th + ' bg-amber-50'}>Ada?</th><th className={th + ' bg-amber-50'}>Memadai?</th>
                <th className={th + ' bg-indigo-50'}>K</th><th className={th + ' bg-indigo-50'}>D</th>
                <th className={th + ' bg-indigo-100'}>Besaran</th><th className={th + ' bg-indigo-50'}>Level</th>
              </tr>
            </thead>
            <tbody>
              {risks.filter((r) => analyses[r.id]).length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-8 text-center text-slate-400">Belum ada risiko yang dianalisis.</td></tr>
              ) : risks.filter((r) => analyses[r.id]).map((r) => {
                const a = analyses[r.id]
                const besInheren = getBesaran(a.k_inheren, a.d_inheren)
                const besResidu = getBesaran(a.k_residu, a.d_residu)
                return (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className={td + ' font-medium text-slate-800'}>{namaOf(r.participant_id)}</td>
                    <td className={td + ' font-mono text-center'}>{r.kode}</td>
                    <td className={td}>{r.pernyataan}</td>
                    <td className={td + ' text-center'}>{a.k_inheren ?? '-'}</td>
                    <td className={td + ' text-center'}>{a.d_inheren ?? '-'}</td>
                    <td className={td + ' text-center font-semibold'}>{besInheren ?? '-'}</td>
                    <td className={td + ' text-center'}>{getLevel(besInheren).label}</td>
                    <td className={td + ' text-center'}>{a.ada_pengendalian === true ? 'Ya' : a.ada_pengendalian === false ? 'Belum' : '-'}</td>
                    <td className={td + ' text-center'}>{a.pengendalian_memadai === true ? 'Memadai' : a.pengendalian_memadai === false ? 'Kurang' : '-'}</td>
                    <td className={td + ' text-center'}>{a.k_residu ?? '-'}</td>
                    <td className={td + ' text-center'}>{a.d_residu ?? '-'}</td>
                    <td className={td + ' text-center font-semibold'}>{besResidu ?? '-'}</td>
                    <td className={td + ' text-center'}>{getLevel(besResidu).label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {tab === 'evaluasi' && (() => {
          const rows = risks
            .filter((r) => analyses[r.id])
            .map((r) => {
              const a = analyses[r.id]
              const besaran = getBesaran(a.k_residu, a.d_residu)
              const key = getKategoriKey(r.kategori)
              const threshold = key ? selera[key] ?? null : null
              const prioritas = besaran != null && threshold != null && besaran > threshold
              return { r, besaran, threshold, prioritas }
            })
            .sort((a, b) => (b.besaran ?? 0) - (a.besaran ?? 0))
          return (
            <table className="w-full text-[11px] border-collapse min-w-[900px]">
              <thead><tr className="bg-slate-100 text-slate-600">
                <th className={th}>Peserta</th><th className={th}>Kode</th><th className={th}>Pernyataan Risiko</th>
                <th className={th}>Kategori</th><th className={th}>Besaran Residu</th><th className={th}>Level</th>
                <th className={th}>Selera</th><th className={th}>Status</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Belum ada risiko yang dievaluasi.</td></tr>
                ) : rows.map(({ r, besaran, threshold, prioritas }) => (
                  <tr key={r.id} className={prioritas ? 'bg-red-50/40 hover:bg-red-50' : 'hover:bg-slate-50'}>
                    <td className={td + ' font-medium text-slate-800'}>{namaOf(r.participant_id)}</td>
                    <td className={td + ' font-mono text-center'}>{r.kode}</td>
                    <td className={td}>{r.pernyataan}</td>
                    <td className={td}>{r.kategori || '-'}</td>
                    <td className={td + ' text-center font-semibold'}>{besaran ?? '-'}</td>
                    <td className={td + ' text-center'}>{getLevel(besaran).label}</td>
                    <td className={td + ' text-center'}>{threshold ?? '-'}</td>
                    <td className={td + ' text-center'}>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${prioritas ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {prioritas ? 'Prioritas' : 'Dalam Selera'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        })()}

        {tab === 'penanganan' && (() => {
          const rows = risks
            .filter((r) => {
              const a = analyses[r.id]
              if (!a) return false
              const besaran = getBesaran(a.k_residu, a.d_residu)
              const key = getKategoriKey(r.kategori)
              const threshold = key ? selera[key] ?? null : null
              return besaran != null && threshold != null && besaran > threshold
            })
            .sort((a, b) => {
              const bb = getBesaran(analyses[b.id]?.k_residu, analyses[b.id]?.d_residu) ?? 0
              const ba = getBesaran(analyses[a.id]?.k_residu, analyses[a.id]?.d_residu) ?? 0
              return bb - ba
            })
          return (
            <table className="w-full text-[11px] border-collapse min-w-[1200px]">
              <thead><tr className="bg-slate-100 text-slate-600">
                <th className={th}>Peserta</th><th className={th}>Kode</th><th className={th}>Pernyataan Risiko</th>
                <th className={th}>Kegiatan Pengendalian</th><th className={th}>Unsur SPIP</th><th className={th}>Subunsur SPIP</th>
                <th className={th}>PIC</th><th className={th}>Target Waktu</th><th className={th}>Rencana Besaran</th><th className={th}>Level</th>
              </tr></thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">Belum ada risiko prioritas yang perlu ditangani.</td></tr>
                ) : rows.map((r) => {
                  const t = treatments[r.id]
                  const besRencana = getBesaran(t?.frekuensi_rencana ?? null, t?.dampak_rencana ?? null)
                  return (
                    <tr key={r.id} className={!t ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-slate-50'}>
                      <td className={td + ' font-medium text-slate-800'}>{namaOf(r.participant_id)}</td>
                      <td className={td + ' font-mono text-center'}>{r.kode}</td>
                      <td className={td}>{r.pernyataan}</td>
                      <td className={td}>{t?.kegiatan_pengendalian || <span className="text-amber-600 italic">Belum ada rencana</span>}</td>
                      <td className={td}>{t?.unsur_spip || '-'}</td>
                      <td className={td}>{t?.subunsur_spip || '-'}</td>
                      <td className={td}>{t?.penanggung_jawab || '-'}</td>
                      <td className={td}>{t?.target_waktu || '-'}</td>
                      <td className={td + ' text-center font-semibold'}>{besRencana ?? '-'}</td>
                      <td className={td + ' text-center'}>{getLevel(besRencana).label}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}
      </div>
    </div>
  )
}
