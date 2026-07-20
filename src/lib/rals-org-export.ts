// Ekspor "Form ... Kepaniteraan MA" — versi seluruh organisasi (semua
// peserta dalam satu sesi), dipakai bersama oleh PDF (print?scope=org) dan
// Excel (export?scope=org) agar tidak drift. Kolom sengaja meniru persis
// apa yang tampil di Tabel Live instruktur (LiveTablesPanel.tsx).
import type { SupabaseClient } from '@supabase/supabase-js'
import { getBesaran, getLevel, getKategoriKey } from './risk-engine'
import { DEFAULT_SELERA, parseKonteks } from './rals-probis'
import { STAGE_TITLES, type ExportStage, type ExportSheet, type ExportColumn, type ExportRow } from './rals-export'

export async function buildOrgStageExport(
  supabase: SupabaseClient, sessionId: string, stage: ExportStage,
): Promise<ExportSheet> {
  const { data: participants } = await supabase.from('rals_participant').select('id, nama, konteks').eq('session_id', sessionId)
  const pList = participants ?? []
  const namaOf = (pid: string) => pList.find((p) => p.id === pid)?.nama ?? '—'

  if (stage === 'konteks') {
    const columns: ExportColumn[] = [
      { header: 'Peserta', key: 'peserta', width: 20 }, { header: 'Proses Bisnis', key: 'l1', width: 30 },
      { header: 'Subproses Bisnis', key: 'l2', width: 35 }, { header: 'Pemangku Kepentingan', key: 'pihak', width: 25 },
      { header: 'Harapan', key: 'harapan', width: 35 }, { header: 'Kebutuhan', key: 'kebutuhan', width: 35 },
    ]
    const rows: ExportRow[] = pList.filter((p) => p.konteks).map((p) => {
      const k = parseKonteks(p.konteks)
      return {
        peserta: p.nama, l1: k ? `${k.l1Kode} — ${k.l1Nama}` : '-', l2: k ? `${k.l2Kode} — ${k.l2Nama}` : '-',
        pihak: k?.pemangkuNama || '-', harapan: k?.harapan || '-', kebutuhan: k?.kebutuhan || '-',
      }
    })
    return { title: STAGE_TITLES.konteks, columns, rows }
  }

  const { data: risks } = await supabase.from('rals_risk')
    .select('id, kode, pernyataan, kategori, dampak_uraian, penyebab, participant_id')
    .eq('session_id', sessionId).order('created_at', { ascending: true })
  const rRows = risks ?? []

  if (stage === 'identifikasi') {
    const columns: ExportColumn[] = [
      { header: 'Peserta', key: 'peserta', width: 20 }, { header: 'Kode', key: 'kode', width: 10 },
      { header: 'Pernyataan Risiko', key: 'pernyataan', width: 40 }, { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Uraian Dampak', key: 'dampak_uraian', width: 30 }, { header: 'Penyebab', key: 'penyebab', width: 30 },
    ]
    const rows: ExportRow[] = rRows.map((r) => ({
      peserta: namaOf(r.participant_id), kode: r.kode, pernyataan: r.pernyataan,
      kategori: r.kategori ?? '', dampak_uraian: r.dampak_uraian ?? '', penyebab: r.penyebab ?? '',
    }))
    return { title: STAGE_TITLES.identifikasi, columns, rows }
  }

  const ids = rRows.map((r) => r.id)
  const { data: analyses } = ids.length ? await supabase.from('rals_analysis').select('*').in('risk_id', ids) : { data: [] as any[] }
  const aMap = new Map((analyses ?? []).map((a) => [a.risk_id, a]))

  if (stage === 'analisis') {
    const columns: ExportColumn[] = [
      { header: 'Peserta', key: 'peserta', width: 20 }, { header: 'Kode', key: 'kode', width: 10 },
      { header: 'Pernyataan Risiko', key: 'pernyataan', width: 35 },
      { header: 'K Melekat', key: 'kI', width: 10 }, { header: 'D Melekat', key: 'dI', width: 10 },
      { header: 'Besaran Melekat', key: 'besI', width: 14 }, { header: 'Level Melekat', key: 'lvlI', width: 14 },
      { header: 'Ada Pengendalian', key: 'ada', width: 14 }, { header: 'Memadai', key: 'memadai', width: 12 },
      { header: 'K Residu', key: 'kR', width: 10 }, { header: 'D Residu', key: 'dR', width: 10 },
      { header: 'Besaran Residu', key: 'besR', width: 14 }, { header: 'Level Residu', key: 'lvlR', width: 14 },
    ]
    const rows: ExportRow[] = rRows.filter((r) => aMap.has(r.id)).map((r) => {
      const a = aMap.get(r.id)
      const besI = getBesaran(a.k_inheren, a.d_inheren)
      const besR = getBesaran(a.k_residu, a.d_residu)
      return {
        peserta: namaOf(r.participant_id), kode: r.kode, pernyataan: r.pernyataan,
        kI: a.k_inheren ?? '', dI: a.d_inheren ?? '', besI: besI ?? '', lvlI: getLevel(besI).label,
        ada: a.ada_pengendalian === true ? 'Ya' : a.ada_pengendalian === false ? 'Belum' : '-',
        memadai: a.pengendalian_memadai === true ? 'Memadai' : a.pengendalian_memadai === false ? 'Kurang' : '-',
        kR: a.k_residu ?? '', dR: a.d_residu ?? '', besR: besR ?? '', lvlR: getLevel(besR).label,
      }
    })
    return { title: STAGE_TITLES.analisis, columns, rows }
  }

  const { data: selera } = await supabase.from('rals_selera_risiko').select('*').eq('session_id', sessionId).maybeSingle()
  const seleraMap: Record<string, number> = selera
    ? { strategis: selera.strategis, kebijakan: selera.kebijakan, kecurangan: selera.kecurangan, bencana: selera.bencana,
        kepatuhan: selera.kepatuhan, operasional: selera.operasional, kemitraan: selera.kemitraan }
    : DEFAULT_SELERA

  const evaluated = rRows.filter((r) => aMap.has(r.id)).map((r) => {
    const a = aMap.get(r.id)
    const besaran = getBesaran(a.k_residu, a.d_residu)
    const key = getKategoriKey(r.kategori)
    const threshold = key ? seleraMap[key] ?? null : null
    return { r, a, besaran, threshold, prioritas: besaran != null && threshold != null && besaran > threshold }
  }).sort((x, y) => (y.besaran ?? 0) - (x.besaran ?? 0))

  if (stage === 'evaluasi') {
    const columns: ExportColumn[] = [
      { header: 'Peserta', key: 'peserta', width: 20 }, { header: 'Kode', key: 'kode', width: 10 },
      { header: 'Pernyataan Risiko', key: 'pernyataan', width: 40 }, { header: 'Kategori', key: 'kategori', width: 20 },
      { header: 'Besaran Residu', key: 'besaran', width: 14 }, { header: 'Level', key: 'level', width: 14 },
      { header: 'Selera', key: 'selera', width: 12 }, { header: 'Status', key: 'status', width: 16 },
    ]
    const rows: ExportRow[] = evaluated.map((x) => ({
      peserta: namaOf(x.r.participant_id), kode: x.r.kode, pernyataan: x.r.pernyataan, kategori: x.r.kategori ?? '',
      besaran: x.besaran ?? '', level: getLevel(x.besaran).label, selera: x.threshold ?? '-',
      status: x.prioritas ? 'Prioritas' : 'Dalam Selera',
    }))
    return { title: STAGE_TITLES.evaluasi, columns, rows }
  }

  // penanganan — hanya risiko prioritas, konsisten dgn LiveTablesPanel & PenangananForm
  const prioritasList = evaluated.filter((x) => x.prioritas)
  const prioritasIds = prioritasList.map((x) => x.r.id)
  const { data: treatments } = prioritasIds.length
    ? await supabase.from('rals_treatment').select('*').in('risk_id', prioritasIds) : { data: [] as any[] }
  const tMap = new Map((treatments ?? []).map((t) => [t.risk_id, t]))

  const columns: ExportColumn[] = [
    { header: 'Peserta', key: 'peserta', width: 20 }, { header: 'Kode', key: 'kode', width: 10 },
    { header: 'Pernyataan Risiko', key: 'pernyataan', width: 35 }, { header: 'Kegiatan Pengendalian', key: 'kegiatan', width: 30 },
    { header: 'Unsur SPIP', key: 'unsur', width: 25 }, { header: 'Subunsur SPIP', key: 'subunsur', width: 30 },
    { header: 'PIC', key: 'pic', width: 18 }, { header: 'Target Waktu', key: 'target', width: 14 },
    { header: 'Rencana Besaran', key: 'besRencana', width: 14 }, { header: 'Level Rencana', key: 'lvlRencana', width: 14 },
  ]
  const rows: ExportRow[] = prioritasList.map((x) => {
    const t = tMap.get(x.r.id)
    const besRencana = getBesaran(t?.frekuensi_rencana ?? null, t?.dampak_rencana ?? null)
    return {
      peserta: namaOf(x.r.participant_id), kode: x.r.kode, pernyataan: x.r.pernyataan,
      kegiatan: t?.kegiatan_pengendalian || '', unsur: t?.unsur_spip || '', subunsur: t?.subunsur_spip || '',
      pic: t?.penanggung_jawab || '', target: t?.target_waktu || '',
      besRencana: besRencana ?? '', lvlRencana: getLevel(besRencana).label,
    }
  })
  return { title: STAGE_TITLES.penanganan, columns, rows }
}
