import 'server-only'

import { requirePpgAccess, requirePpgAdmin } from './access'
import { createPpgAdminClient } from './scenario'
import { analyzePpgReports } from './analytics'
import { calculatePpgControlEffectiveness, normalizePpgControlText } from './control-effectiveness'

export async function getPpgOverview() {
  const { supabase } = await requirePpgAdmin()
  const [register, mitigations, programItems, laporan, imports] = await Promise.all([
    supabase.from('ppg_register').select('id,level_existing,status', { count: 'exact' }),
    supabase.from('ppg_mitigations').select('id,status,tenggat', { count: 'exact' }),
    supabase.from('ppg_program_items').select('id,status,selesai_rencana,progres', { count: 'exact' }),
    fetchAllReports(supabase),
    supabase.from('ppg_import_batches').select('id,status,created_at,nama_file').order('created_at', { ascending: false }).limit(1),
  ])
  const risiko = register.data ?? []
  const tindakan = mitigations.data ?? []
  const program = programItems.data ?? []
  const today = new Date().toISOString().slice(0, 10)
  return {
    migrationReady: !register.error,
    programReady: !programItems.error,
    risikoTotal: register.count ?? 0,
    risikoPrioritas: risiko.filter((row) => row.level_existing === 'Tinggi' || row.level_existing === 'Sangat Tinggi').length,
    mitigasiTerbuka: tindakan.filter((row) => row.status !== 'selesai').length,
    mitigasiTerlambat: tindakan.filter((row) => row.status !== 'selesai' && row.tenggat && row.tenggat < new Date().toISOString().slice(0, 10)).length,
    programTerbuka: program.filter((row) => !['selesai', 'dibatalkan'].includes(row.status)).length,
    programTerlambat: program.filter((row) => !['selesai', 'dibatalkan'].includes(row.status) && row.selesai_rencana && row.selesai_rencana < today).length,
    laporanTotal: laporan.length,
    nilaiTotal: laporan.reduce((total, row) => total + Number(row.nilai_penetapan ?? 0), 0),
    terakhirImpor: imports.data?.[0] ?? null,
  }
}

type PpgSupabase = Awaited<ReturnType<typeof requirePpgAdmin>>['supabase']

export async function fetchAllReports(supabase: PpgSupabase) {
  const result: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('ppg_reports').select('*').order('created_at', { ascending: false }).range(from, from + 999)
    if (error || !data?.length) break
    result.push(...data)
    if (data.length < 1000) break
  }
  return result
}

export async function getPpgReportsForAnalytics() {
  const { supabase } = await requirePpgAdmin()
  return fetchAllReports(supabase)
}

export async function getPpgAnalytics(year?: number, quarter?: number | null) {
  const rows = await getPpgReportsForAnalytics()
  return analyzePpgReports(rows, year, quarter)
}

export async function getPpgLedAnalytics(start: string, end: string) {
  const { supabase } = await requirePpgAdmin()
  const [events, links, reports] = await Promise.all([
    supabase.from('ppg_loss_events').select('id,unit_nama,tanggal_kejadian,kategori_risiko,jenis_dampak,level_dampak,klasifikasi_limit,status').gte('tanggal_kejadian', start).lte('tanggal_kejadian', end).in('status', ['tervalidasi','tindak_lanjut','ditutup']),
    supabase.from('ppg_loss_event_report_links').select('loss_event_id,report_id,link_type,report:ppg_reports(label_skenario,objek)').eq('link_type', 'terkonfirmasi'),
    supabase.from('ppg_reports').select('id,tanggal_penerimaan').gte('tanggal_penerimaan', start).lte('tanggal_penerimaan', end),
  ])
  const rows = events.data ?? []
  const eventIds = new Set(rows.map((row) => row.id))
  const confirmed = (links.data ?? []).filter((link) => eventIds.has(link.loss_event_id))
  const scenarios = new Map<string, number>()
  confirmed.forEach((link) => { const report = Array.isArray(link.report) ? link.report[0] : link.report; const label = String(report?.label_skenario || report?.objek || 'Tidak teridentifikasi'); scenarios.set(label, (scenarios.get(label) || 0) + 1) })
  return { ready: !events.error, events: rows.length, upperLimit: rows.filter((row) => row.klasifikasi_limit === 'upper_limit').length, highImpact: rows.filter((row) => Number(row.level_dampak || 0) >= 4).length, highestImpact: rows.reduce((highest, row) => Math.max(highest, Number(row.level_dampak || 0)), 0), confirmedReports: new Set(confirmed.map((link) => link.report_id)).size, reportsWithoutConfirmedLoss: Math.max(0, (reports.data?.length ?? 0) - new Set(confirmed.map((link) => link.report_id)).size), scenarios: [...scenarios].sort((a, b) => b[1] - a[1]).slice(0, 8) }
}

export type PpgNationalRiskInsight = {
  risk_library_id: string
  kode: string
  kategori: string
  peristiwa: string
  eligible_satkers: number
  affected_satkers: number
  affected_pct: number
  high_impact_satkers: number
  high_impact_pct: number
  recurring_satkers: number
  recurring_pct: number
  control_failure_satkers: number
  control_failure_pct: number
  cluster_1_satkers: number
  cluster_2_satkers: number
  cluster_3_satkers: number
  data_confidence: 'tinggi' | 'terbatas'
}

export async function getPpgNationalRiskInsights(start: string, end: string) {
  const { supabase } = await requirePpgAdmin()
  const [risks, units, events] = await Promise.all([
    supabase.from('ppg_risk_library').select('id,kode,kategori,peristiwa').eq('status', 'aktif').order('kode'),
    supabase.from('unit_kerja').select('id'),
    supabase.from('ppg_loss_events')
      .select('id,risk_library_id,unit_kerja_id,level_dampak,kegagalan_kontrol,status')
      .gte('tanggal_kejadian', start).lte('tanggal_kejadian', end)
      .in('status', ['tervalidasi', 'tindak_lanjut', 'ditutup']),
  ])
  const denominator = units.data?.length ?? 0
  const eventRows = events.data ?? []
  const rows: PpgNationalRiskInsight[] = (risks.data ?? []).map((risk) => {
    const relevant = eventRows.filter((event) => event.risk_library_id === risk.id)
    const byUnit = new Map<string, typeof relevant>()
    relevant.forEach((event) => {
      const key = String(event.unit_kerja_id)
      byUnit.set(key, [...(byUnit.get(key) ?? []), event])
    })
    const affected = byUnit.size
    const highImpact = [...byUnit.values()].filter((items) => items.some((item) => Number(item.level_dampak) >= 4)).length
    const recurring = [...byUnit.values()].filter((items) => items.length >= 2).length
    const controlFailure = [...byUnit.values()].filter((items) => items.some((item) => String(item.kegagalan_kontrol || '').trim())).length
    const cluster1 = [...byUnit.values()].filter((items) => items.length >= 2 || items.some((item) => Number(item.level_dampak) >= 4)).length
    const cluster2 = Math.max(0, affected - cluster1)
    const percentage = (value: number) => denominator ? Math.round(value / denominator * 10_000) / 100 : 0
    return {
      risk_library_id: String(risk.id), kode: String(risk.kode), kategori: String(risk.kategori), peristiwa: String(risk.peristiwa),
      eligible_satkers: denominator, affected_satkers: affected, affected_pct: percentage(affected),
      high_impact_satkers: highImpact, high_impact_pct: percentage(highImpact),
      recurring_satkers: recurring, recurring_pct: percentage(recurring),
      control_failure_satkers: controlFailure, control_failure_pct: percentage(controlFailure),
      cluster_1_satkers: cluster1, cluster_2_satkers: cluster2, cluster_3_satkers: Math.max(0, denominator - affected),
      data_confidence: relevant.length && relevant.every((event) => event.risk_library_id && event.unit_kerja_id) ? 'tinggi' : 'terbatas',
    }
  })
  return { rows, error: risks.error?.message ?? units.error?.message ?? events.error?.message ?? null }
}

export async function getPpgActionCatalog() {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase.from('ppg_action_catalog').select('*').eq('status', 'aktif').order('kode')
  return { rows: data ?? [], error: error?.message ?? null }
}

export async function getPpgControlLibraryOptions() {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase.from('ppg_control_library').select('id,kode,nama,jenis,uraian,risk_links:ppg_library_risk_controls(risk_library_id)').eq('status', 'aktif').order('kode')
  const rows = (data ?? []).map((row) => ({ ...row, risk_library_ids: (row.risk_links ?? []).map((link) => String(link.risk_library_id)) }))
  return { rows, error: error?.message ?? null }
}

export async function getPpgLibraryWorkspace() {
  const { supabase } = await requirePpgAdmin()
  const [risk, control, links] = await Promise.all([
    getPpgRows('ppg_risk_library'),
    getPpgRows('ppg_control_library'),
    supabase.from('ppg_library_risk_controls').select('risk_library_id,control_id,catatan_keterkaitan'),
  ])
  return { risk, control, links: (links.data ?? []) as Record<string, unknown>[], error: risk.error ?? control.error ?? links.error?.message ?? null }
}

export async function getPpgRiskImportWorkspace() {
  const { supabase } = await requirePpgAdmin()
  const [batches, candidates, libraries] = await Promise.all([
    supabase.from('ppg_risk_import_batches').select('*').order('created_at', { ascending: false }).limit(20),
    supabase.from('ppg_risk_candidates')
      .select('*,members:ppg_risk_candidate_members(similarity,row:ppg_risk_import_rows(id,source_row,unit_kerja_id,unit_nama_raw,tahun,periode,peristiwa,penyebab,dampak,control_text,mitigation_text,kemungkinan_inherent,dampak_inherent,validation_errors))')
      .in('status', ['usulan', 'review']).order('created_at', { ascending: false }).limit(100),
    supabase.from('ppg_risk_library').select('id,kode,peristiwa,kategori,status').neq('status', 'nonaktif').order('kode'),
  ])
  return {
    batches: (batches.data ?? []) as Record<string, unknown>[],
    candidates: (candidates.data ?? []) as Record<string, unknown>[],
    libraries: (libraries.data ?? []) as Record<string, unknown>[],
    error: batches.error?.message ?? candidates.error?.message ?? libraries.error?.message ?? null,
  }
}

export async function getPpgProgramLossEventOptions() {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase.from('ppg_loss_events').select('id,kode,nama_peristiwa,unit_nama,jenis_dampak,level_dampak,risk_library_id').eq('klasifikasi_limit', 'upper_limit').in('status', ['tervalidasi','tindak_lanjut','ditutup']).order('tanggal_kejadian', { ascending: false }).limit(500)
  return { rows: data ?? [], error: error?.message ?? null }
}

export async function getPpgPrograms() {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase
    .from('ppg_programs')
    .select('*,snapshot:ppg_analysis_snapshots(*),items:ppg_program_items(*,action:ppg_action_catalog(*),control:ppg_control_library!ppg_program_items_control_id_fkey(id,kode,nama,jenis,uraian),controls:ppg_program_item_controls(control:ppg_control_library(id,kode,nama,jenis,uraian)),risk:ppg_risk_library!ppg_program_items_risk_library_id_fkey(id,kode,peristiwa,kategori),clusters:ppg_program_clusters(*,units:ppg_program_cluster_units(unit_kerja_id,basis)),updates:ppg_program_updates(*),loss_events:ppg_program_loss_events(loss_event:ppg_loss_events(id,kode,nama_peristiwa,unit_nama,jenis_dampak,level_dampak,uraian_dampak,klasifikasi_limit)))')
    .order('created_at', { ascending: false })
    .limit(100)
  return { rows: data ?? [], error: error?.message ?? null }
}

export async function getPpgProgram(id: string) {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase
    .from('ppg_programs')
    .select('*,snapshot:ppg_analysis_snapshots(*),items:ppg_program_items(*,action:ppg_action_catalog(*),control:ppg_control_library!ppg_program_items_control_id_fkey(id,kode,nama,jenis,uraian),controls:ppg_program_item_controls(control:ppg_control_library(id,kode,nama,jenis,uraian)),risk:ppg_risk_library!ppg_program_items_risk_library_id_fkey(id,kode,peristiwa,kategori),clusters:ppg_program_clusters(*,units:ppg_program_cluster_units(unit_kerja_id,basis)),updates:ppg_program_updates(*),loss_events:ppg_program_loss_events(loss_event:ppg_loss_events(id,kode,nama_peristiwa,unit_nama,jenis_dampak,level_dampak,uraian_dampak,klasifikasi_limit)))')
    .eq('id', id)
    .single()
  if (data && Array.isArray(data.items)) {
    data.items.forEach((item: { risk?: Record<string, unknown> | Record<string, unknown>[] | null }) => {
      const risk = Array.isArray(item.risk) ? item.risk[0] : item.risk
      if (risk) Object.assign(risk, { unit_nama: 'Seluruh Satker (nasional berklaster)' })
    })
  }
  return { row: data as Record<string, unknown> | null, error: error?.message ?? null }
}

export async function getPpgLossEventWorkspace() {
  const access = await requirePpgAccess()
  const admin = createPpgAdminClient(access.scenarioId)
  const { data: ownUnit } = access.unitId ? await admin.from('unit_kerja').select('id,nama_unit').eq('id', access.unitId).single() : { data: null }
  let eventQuery = admin.from('ppg_loss_events').select('*,risk:ppg_risk_library(id,kode,kategori,peristiwa),register:ppg_register(id,kode,peristiwa),failed_controls:ppg_loss_event_controls(control_id,control:ppg_control_library(id,kode,nama,jenis,status)),links:ppg_loss_event_report_links(*,report:ppg_reports(id,nomor_laporan,unit_nama,tanggal_penerimaan,objek,label_skenario,nilai_penetapan))').order('tanggal_kejadian', { ascending: false }).limit(500)
  if (access.isSatker && access.unitId) eventQuery = eventQuery.eq('unit_kerja_id', access.unitId)
  let reportQuery = admin.from('ppg_reports').select('id,nomor_laporan,unit_nama,tanggal_penerimaan,objek,label_skenario,nilai_penetapan').order('tanggal_penerimaan', { ascending: false }).limit(1000)
  if (access.isSatker && ownUnit?.nama_unit) reportQuery = reportQuery.ilike('unit_nama', ownUnit.nama_unit)
  let registerQuery = admin.from('ppg_register').select('id,kode,unit_kerja_id,unit_nama,risk_library_id,kategori,peristiwa,controls:ppg_risk_controls(control_id,control:ppg_control_library(id,kode,nama,jenis,status))').order('created_at', { ascending: false }).limit(1000)
  if (access.isSatker && access.unitId) registerQuery = registerQuery.eq('unit_kerja_id', access.unitId)
  const [events, reports, registers, riskLibrary, limits, units] = await Promise.all([
    eventQuery, reportQuery, registerQuery,
    admin.from('ppg_risk_library').select('id,kode,kategori,peristiwa,status').eq('status', 'aktif').order('kode'),
    admin.from('ppg_led_limit_versions').select('*').order('tahun', { ascending: false }),
    access.isPusat ? admin.from('unit_kerja').select('id,kode_unit,nama_unit,tingkat').order('nama_unit') : Promise.resolve({ data: ownUnit ? [ownUnit] : [], error: null }),
  ])
  const rows = (events.data ?? []) as Record<string, unknown>[]
  for (const row of rows) {
    if (!row.bukti_path) continue
    const { data } = await admin.storage.from('ppg-led-bukti').createSignedUrl(String(row.bukti_path), 3600)
    row.bukti_url = data?.signedUrl ?? null
  }
  return { access, events: rows, reports: reports.data ?? [], registers: registers.data ?? [], riskLibrary: riskLibrary.data ?? [], limits: limits.data ?? [], units: units.data ?? [], error: events.error?.message ?? reports.error?.message ?? riskLibrary.error?.message ?? null }
}

export async function getPpgAssessmentWorkspace() {
  const access = await requirePpgAccess()
  const admin = createPpgAdminClient(access.scenarioId)
  let batchQuery = admin.from('ppg_risk_import_batches').select('id').eq('mode', 'operasional_assessment').order('created_at', { ascending: false }).limit(20)
  if (access.isSatker) batchQuery = batchQuery.eq('created_by', access.user.id)
  const importedBatches = await batchQuery
  const batchIds = (importedBatches.data ?? []).map((batch) => String(batch.id))
  const importedRowsPromise = batchIds.length
    ? admin.from('ppg_risk_import_rows').select('id,source_row,unit_nama_raw,tahun,periode,peristiwa,kemungkinan_inherent,dampak_inherent,kemungkinan_residual,dampak_residual,matched_library_id,match_status,validation_errors,control_text,mitigation_text').in('batch_id', batchIds).is('created_register_id', null).order('created_at', { ascending: false }).limit(200)
    : Promise.resolve({ data: [], error: null })
  let registerQuery = admin.from('ppg_register').select('*,controls:ppg_risk_controls(*,control:ppg_control_library(id,kode,nama,jenis),validation:ppg_risk_control_validations(status,catatan,validated_at))').order('created_at', { ascending: false }).limit(5000)
  if (access.isSatker && access.unitId) registerQuery = registerQuery.eq('unit_kerja_id', access.unitId)
  const [registers, library, units, importedRows] = await Promise.all([
    registerQuery,
    admin.from('ppg_risk_library').select('id,kode,kategori,proses_bisnis,subproses_bisnis,peristiwa,status,control_links:ppg_library_risk_controls(control:ppg_control_library(id,kode,nama,jenis,uraian,status))').eq('status', 'aktif').order('kode').limit(5000),
    access.isSatker && access.unitId
      ? admin.from('unit_kerja').select('id,nama_unit,kode_unit,tingkat').eq('id', access.unitId)
      : admin.from('unit_kerja').select('id,nama_unit,kode_unit,tingkat').order('nama_unit'),
    importedRowsPromise,
  ])
  return {
    access,
    rows: (registers.data ?? []) as Record<string, unknown>[],
    libraryOptions: (library.data ?? []).map((row) => ({ ...row, controls: (row.control_links ?? []).map((link) => Array.isArray(link.control) ? link.control[0] : link.control).filter((control) => control?.status === 'aktif') })) as Record<string, unknown>[],
    units: (units.data ?? []) as Record<string, unknown>[],
    importedRows: (importedRows.data ?? []) as Record<string, unknown>[],
    importError: importedBatches.error?.message ?? importedRows.error?.message ?? null,
    error: registers.error?.message ?? library.error?.message ?? units.error?.message ?? null,
  }
}

export async function getPpgUnits() {
  const { supabase } = await requirePpgAdmin()
  const { data, error } = await supabase.from('unit_kerja').select('id,nama_unit,kode_unit,tingkat').order('nama_unit')
  return { units: data ?? [], error: error?.message ?? null }
}

export async function getPpgRiskLibraryOptions() {
  const { supabase } = await requirePpgAdmin()
  const options: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('ppg_risk_library').select('id,kode,kategori,proses_bisnis,subproses_bisnis,peristiwa,status').eq('status', 'aktif').order('kode').range(from, from + 999)
    if (error || !data?.length) break
    options.push(...data)
    if (data.length < 1000) break
  }
  return options
}

export async function getPpgRows(table: 'ppg_risk_library' | 'ppg_control_library' | 'ppg_register' | 'ppg_mitigations' | 'ppg_import_batches' | 'ppg_reports') {
  const { supabase } = await requirePpgAdmin()
  const managedTables = ['ppg_risk_library', 'ppg_control_library', 'ppg_register']
  if (!managedTables.includes(table)) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).limit(200)
    return { rows: data ?? [], error: error?.message ?? null }
  }
  const rows: Record<string, unknown>[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false }).range(from, from + 999)
    if (error) return { rows, error: error.message }
    if (!data?.length) break
    rows.push(...data)
    if (data.length < 1000) break
  }
  return { rows, error: null }
}

export async function getPpgControlEffectiveness() {
  const { supabase } = await requirePpgAdmin()
  const [controls, riskControls, lossEvents] = await Promise.all([
    supabase.from('ppg_control_library').select('id,kode,nama,jenis,status').eq('status', 'aktif').order('kode'),
    supabase.from('ppg_risk_controls').select('control_id,efektivitas,risk_id'),
    supabase.from('ppg_loss_events').select('id,register_id,failed_controls:ppg_loss_event_controls(control_id)').not('register_id', 'is', null).in('status', ['tervalidasi', 'tindak_lanjut', 'ditutup']),
  ])

  const queryError = controls.error ?? riskControls.error ?? lossEvents.error
  if (queryError) return { rows: [], error: queryError.message }

  const rcData = riskControls.data ?? []
  const leData = lossEvents.data ?? []
  const legacyFailuresByRegister = new Map<string, number>()
  const failuresByControlAndRegister = new Map<string, number>()
  for (const le of leData) {
    if (!le.register_id) continue
    const registerId = String(le.register_id)
    const failedControls = Array.isArray(le.failed_controls) ? le.failed_controls : []
    if (!failedControls.length) {
      legacyFailuresByRegister.set(registerId, (legacyFailuresByRegister.get(registerId) ?? 0) + 1)
      continue
    }
    for (const link of failedControls) {
      const key = `${String(link.control_id)}::${registerId}`
      failuresByControlAndRegister.set(key, (failuresByControlAndRegister.get(key) ?? 0) + 1)
    }
  }

  const usagesByControl = new Map<string, { efektivitas: string | null; registerId: string }[]>()
  for (const usage of rcData) {
    const controlId = String(usage.control_id)
    const values = usagesByControl.get(controlId) ?? []
    values.push({ efektivitas: usage.efektivitas, registerId: String(usage.risk_id) })
    usagesByControl.set(controlId, values)
  }

  const rows = (controls.data ?? []).map(control => {
    const usages = usagesByControl.get(String(control.id)) ?? []
    const failuresForControl = new Map(usages.map((usage) => [
      usage.registerId,
      (legacyFailuresByRegister.get(usage.registerId) ?? 0) + (failuresByControlAndRegister.get(`${String(control.id)}::${usage.registerId}`) ?? 0),
    ]))
    const metrics = calculatePpgControlEffectiveness(usages, failuresForControl)

    return {
      id: control.id,
      kode: control.kode,
      nama: control.nama,
      jenis: control.jenis,
      status: control.status,
      pengguna: usages.length,
      ...metrics,
    }
  })

  rows.sort((a, b) => {
    if (a.cei === null) return b.cei === null ? b.pengguna - a.pengguna : 1
    if (b.cei === null) return -1
    if (a.cei !== b.cei) return a.cei - b.cei
    return b.pengguna - a.pengguna
  })

  return { rows, error: null }
}

export async function getPpgTreatedRiskWorkspace() {
  const access = await requirePpgAccess()
  const admin = createPpgAdminClient(access.scenarioId)
  let registerQuery = admin
    .from('ppg_register')
    .select('id,kode,unit_kerja_id,unit_nama,risk_library_id,peristiwa,skor_existing,level_existing,kemungkinan_treated,dampak_treated,skor_treated,level_treated,treated_program_id,efektivitas_program,bukti_efektivitas_program_url,treated_assessed_at')
    .order('created_at', { ascending: false })
    .limit(5000)
  if (access.isSatker && access.unitId) registerQuery = registerQuery.eq('unit_kerja_id', access.unitId)

  const [registers, programs] = await Promise.all([
    registerQuery,
    admin.from('ppg_programs').select('id,kode,nama,status,program_start,program_end,items:ppg_program_items(id,risk_library_id,status)').order('created_at', { ascending: false }).limit(500),
  ])
  return {
    access,
    registers: (registers.data ?? []) as Record<string, unknown>[],
    programs: (programs.data ?? []) as Record<string, unknown>[],
    error: registers.error?.message ?? programs.error?.message ?? null,
  }
}

export async function getPpgEmergingControls() {
  const { supabase } = await requirePpgAdmin()
  const [mitigations, existingLinks] = await Promise.all([
    supabase
      .from('ppg_mitigations')
      .select('id,tindakan,status,register:ppg_register(id,risk_library_id,unit_kerja_id,risk:ppg_risk_library(id,kode,peristiwa))')
      .eq('status', 'selesai')
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('ppg_library_risk_controls')
      .select('risk_library_id,control:ppg_control_library(id,nama,status)'),
  ])

  const queryError = mitigations.error ?? existingLinks.error
  if (queryError) return { rows: [], error: queryError.message }

  const existingKeys = new Set((existingLinks.data ?? []).flatMap((link) => {
    const control = Array.isArray(link.control) ? link.control[0] : link.control
    if (!control || control.status === 'nonaktif') return []
    return [`${String(link.risk_library_id)}::${normalizePpgControlText(String(control.nama))}`]
  }))
  const groups = new Map<string, { risk_library_id: string; risk_kode: string; risk_peristiwa: string; tindakan: string; unitIds: Set<string>; mitigationCount: number }>()

  for (const m of (mitigations.data ?? [])) {
     if (!m.tindakan) continue
     const reg = Array.isArray(m.register) ? m.register[0] : m.register
     if (!reg || !reg.risk_library_id || !reg.unit_kerja_id) continue
     const risk = Array.isArray(reg.risk) ? reg.risk[0] : reg.risk
     if (!risk) continue

     const normalized = normalizePpgControlText(m.tindakan)
     const key = String(reg.risk_library_id) + '::' + normalized
     if (existingKeys.has(key)) continue

     if (!groups.has(key)) {
        groups.set(key, {
           risk_library_id: String(reg.risk_library_id),
           risk_kode: String(risk.kode),
           risk_peristiwa: String(risk.peristiwa),
           tindakan: m.tindakan,
           unitIds: new Set<string>(),
           mitigationCount: 0,
        })
     }
     const g = groups.get(key)!
     g.unitIds.add(String(reg.unit_kerja_id))
     g.mitigationCount++
  }

  const rows = Array.from(groups.values())
    .map(({ unitIds, ...group }) => ({ ...group, count: unitIds.size }))
    .sort((a, b) => b.count - a.count || b.mitigationCount - a.mitigationCount)

  return { rows, error: null }
}
