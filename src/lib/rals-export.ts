// Sumber tunggal query + perhitungan untuk ekspor RALS (PDF & Excel) per
// tahap, dipakai bersama oleh /api/rals/export (Excel),
// /dashboard/rals/print (PDF via cetak browser), dan generator template
// (scripts/gen-rals-templates.mjs) agar tidak drift. Definisi kolom & judul
// tinggal di rals-export-columns.json — satu sumber untuk app & generator.
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBesaran, getLevel, getKategoriKey } from './risk-engine'
import { DEFAULT_SELERA, parseKonteks } from './rals-probis'
import stageDefs from './rals-export-columns.json'

export const EXPORT_STAGES = ['konteks', 'identifikasi', 'analisis', 'evaluasi', 'penanganan'] as const
export type ExportStage = (typeof EXPORT_STAGES)[number]

export type ExportColumn = { header: string; key: string; width?: number }
export type ExportRow = Record<string, string | number>
export type ExportSheet = { title: string; columns: ExportColumn[]; rows: ExportRow[] }

export const STAGE_TITLES = Object.fromEntries(
  EXPORT_STAGES.map((s) => [s, stageDefs[s].title]),
) as Record<ExportStage, string>

type Participant = { id: string; nama: string; session_id: string; konteks: string | null }

export async function buildStageExport(
  supabase: SupabaseClient, participant: Participant, stage: ExportStage,
): Promise<ExportSheet> {
  return {
    title: stageDefs[stage].title,
    columns: stageDefs[stage].columns as ExportColumn[],
    rows: await buildRows(supabase, participant, stage),
  }
}

async function buildRows(supabase: SupabaseClient, participant: Participant, stage: ExportStage): Promise<ExportRow[]> {
  if (stage === 'konteks') {
    const k = parseKonteks(participant.konteks)
    return [
      { item: 'Nama Peserta', val: participant.nama },
      { item: 'Proses Bisnis', val: k ? `${k.l1Kode} — ${k.l1Nama}` : '-' },
      { item: 'Subproses Bisnis', val: k ? `${k.l2Kode} — ${k.l2Nama}` : '-' },
      { item: 'Pemangku Kepentingan', val: k?.pemangkuNama || '-' },
      { item: 'Harapan', val: k?.harapan || '-' },
      { item: 'Kebutuhan', val: k?.kebutuhan || '-' },
    ]
  }

  if (stage === 'identifikasi') {
    const { data } = await supabase.from('rals_risk')
      .select('kode, pernyataan, kategori, dampak_uraian, penyebab')
      .eq('participant_id', participant.id).order('created_at', { ascending: true })
    return (data ?? []).map((r) => ({
      kode: r.kode, pernyataan: r.pernyataan, kategori: r.kategori ?? '',
      dampak_uraian: r.dampak_uraian ?? '', penyebab: r.penyebab ?? '',
    }))
  }

  if (stage === 'analisis') {
    const { data: risks } = await supabase.from('rals_risk').select('id, kode, pernyataan')
      .eq('participant_id', participant.id).order('created_at', { ascending: true })
    const rows = risks ?? []
    const { data: analyses } = rows.length
      ? await supabase.from('rals_analysis').select('*').in('risk_id', rows.map((r) => r.id)) : { data: [] as any[] }
    const aMap = new Map((analyses ?? []).map((a) => [a.risk_id, a]))

    return rows.map((r) => {
      const a = aMap.get(r.id)
      const besInheren = getBesaran(a?.k_inheren ?? null, a?.d_inheren ?? null)
      const besResidu = getBesaran(a?.k_residu ?? null, a?.d_residu ?? null)
      return {
        kode: r.kode, pernyataan: r.pernyataan,
        kI: a?.k_inheren ?? '', dI: a?.d_inheren ?? '', besInheren: besInheren ?? '', lvlInheren: getLevel(besInheren).label,
        ada: a?.ada_pengendalian === true ? 'Ya' : a?.ada_pengendalian === false ? 'Belum' : '',
        unsur: a?.unsur_spip ?? '', subunsur: a?.subunsur_spip ?? '', uraian: a?.uraian_pengendalian ?? '',
        evAda: a?.evidence_keberadaan ?? '',
        memadai: a?.pengendalian_memadai === true ? 'Memadai' : a?.pengendalian_memadai === false ? 'Kurang Memadai' : '',
        evMemadai: a?.evidence_kememadaian ?? '',
        kR: a?.k_residu ?? '', dR: a?.d_residu ?? '', besResidu: besResidu ?? '', lvlResidu: getLevel(besResidu).label,
      }
    })
  }

  // evaluasi & penanganan berbagi perhitungan prioritas (besaran residu > selera)
  const { data: risks } = await supabase.from('rals_risk').select('id, kode, pernyataan, kategori')
    .eq('participant_id', participant.id).order('created_at', { ascending: true })
  const rows = risks ?? []
  const ids = rows.map((r) => r.id)
  const [{ data: analyses }, { data: selera }] = await Promise.all([
    ids.length ? supabase.from('rals_analysis').select('*').in('risk_id', ids) : Promise.resolve({ data: [] as any[] }),
    supabase.from('rals_selera_risiko').select('*').eq('session_id', participant.session_id).maybeSingle(),
  ])
  const aMap = new Map((analyses ?? []).map((a) => [a.risk_id, a]))
  const seleraMap: Record<string, number> = selera
    ? { strategis: selera.strategis, kebijakan: selera.kebijakan, kecurangan: selera.kecurangan, bencana: selera.bencana,
        kepatuhan: selera.kepatuhan, operasional: selera.operasional, kemitraan: selera.kemitraan }
    : DEFAULT_SELERA

  const evaluated = rows
    .map((r) => {
      const a = aMap.get(r.id)
      const besaran = getBesaran(a?.k_residu ?? null, a?.d_residu ?? null)
      const key = getKategoriKey(r.kategori)
      const threshold = key ? seleraMap[key] ?? null : null
      return { r, a, besaran, threshold, prioritas: besaran != null && threshold != null && besaran > threshold }
    })
    .filter((x) => x.a && x.besaran != null)
    .sort((a, b) => (b.besaran ?? 0) - (a.besaran ?? 0))

  if (stage === 'evaluasi') {
    return evaluated.map((x) => ({
      kode: x.r.kode, pernyataan: x.r.pernyataan, kategori: x.r.kategori ?? '', besaran: x.besaran ?? '',
      level: getLevel(x.besaran).label, threshold: x.threshold ?? '-', status: x.prioritas ? 'Prioritas' : 'Dalam Selera',
    }))
  }

  // penanganan — hanya risiko prioritas
  const prioritasList = evaluated.filter((x) => x.prioritas)
  const prioritasIds = prioritasList.map((x) => x.r.id)
  const { data: treatments } = prioritasIds.length
    ? await supabase.from('rals_treatment').select('*').in('risk_id', prioritasIds) : { data: [] as any[] }
  const tMap = new Map((treatments ?? []).map((t) => [t.risk_id, t]))

  return prioritasList.map((x) => {
    const t = tMap.get(x.r.id)
    const besRencana = getBesaran(t?.frekuensi_rencana ?? null, t?.dampak_rencana ?? null)
    const respon = (x.a?.k_residu ?? 0) >= (x.a?.d_residu ?? 0) ? 'Mengurangi Frekuensi' : 'Mengurangi Dampak'
    return {
      kode: x.r.kode, pernyataan: x.r.pernyataan, respon, kegiatan: t?.kegiatan_pengendalian ?? '',
      unsur: t?.unsur_spip ?? '', subunsur: t?.subunsur_spip ?? '', pic: t?.penanggung_jawab ?? '',
      indikator: t?.indikator_keluaran ?? '', target: t?.target_waktu ?? '',
      rK: t?.frekuensi_rencana ?? '', rD: t?.dampak_rencana ?? '', besRencana: besRencana ?? '', lvlRencana: getLevel(besRencana).label,
    }
  })
}
