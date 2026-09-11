'use server'

import { createHash, randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requirePpgAccess, requirePpgAdmin } from '@/lib/ppg/access'
import { createPpgAdminClient } from '@/lib/ppg/scenario'
import { parsePpgWorkbook } from '@/lib/ppg/import-workbook'
import { ppgAssessment } from '@/lib/ppg/scoring'
import { PPG_ASSESSMENT_PERIODS, PPG_CAUSE_FACTORS, PPG_IMPACT_AREAS, PPG_RISK_CATEGORIES, PPG_RISK_CATEGORY_CODES, PPG_RISK_CLASSIFICATIONS, isValidPpgBusinessProcess } from '@/lib/ppg/references'
import { analyzePpgReports } from '@/lib/ppg/analytics'
import { fetchAllReports } from '@/lib/ppg/data'
import { buildPpgAssistedInsights } from '@/lib/ppg/insights'
import { matchLossEventReports } from '@/lib/ppg/led'
import { evaluatePpgAppetite } from '@/lib/ppg/risk-appetite'
import { isPpgProgramItemEligibleForPlanning } from '@/lib/ppg/program-eligibility'

function text(data: FormData, key: string) { return String(data.get(key) ?? '').trim() }
function integer(data: FormData, key: string, fallback = 0) { const value = Number(data.get(key)); return Number.isFinite(value) ? Math.trunc(value) : fallback }
function percentage(data: FormData, key: string, fallback: number | null = null) { const raw = text(data, key); if (!raw) return fallback; const value = Number(raw); return Number.isFinite(value) && value >= 0 && value <= 100 ? value : fallback }

export async function addPpgRiskLibrary(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const peristiwa = text(formData, 'peristiwa')
  const klasifikasi = text(formData, 'klasifikasi_risiko'); const faktor = text(formData, 'faktor_penyebab')
  const kategori = text(formData, 'kategori'); const proses = text(formData, 'proses_bisnis'); const subproses = resolveSubprocess(formData)
  if (!peristiwa || !isAllowedString(PPG_RISK_CATEGORIES, kategori) || !isValidPpgBusinessProcess(proses, subproses) || !isReferenceLabel(PPG_RISK_CLASSIFICATIONS, klasifikasi) || !isReferenceLabel(PPG_CAUSE_FACTORS, faktor)) return
  const categoryCode = PPG_RISK_CATEGORY_CODES[kategori as keyof typeof PPG_RISK_CATEGORY_CODES]
  const { data: categoryRisks } = await supabase.from('ppg_risk_library').select('kode').eq('kategori', kategori)
  const lastSequence = (categoryRisks ?? []).reduce((highest, row) => {
    const match = String(row.kode).match(new RegExp(`^PPG\\.${categoryCode}\\.(\\d+)$`))
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0)
  const kode = `PPG.${categoryCode}.${lastSequence + 1}`
  const controlIds = uniqueUuids(formData.getAll('control_ids'))
  if (controlIds.length) {
    const { data: controls } = await supabase.from('ppg_control_library').select('id').in('id', controlIds).neq('status', 'nonaktif')
    if (!controls || controls.length !== controlIds.length) return
  }
  const { data: risk } = await supabase.from('ppg_risk_library').insert({ kode, proses_bisnis: proses, subproses_bisnis: subproses, kategori, klasifikasi_risiko: klasifikasi, faktor_penyebab: faktor, penyebab: text(formData, 'penyebab'), peristiwa, dampak: text(formData, 'dampak'), status: 'draft', created_by: user.id }).select('id').single()
  if (!risk) return
  if (controlIds.length) {
    const { error } = await supabase.from('ppg_library_risk_controls').insert(controlIds.map((control_id) => ({ risk_library_id: risk.id, control_id, created_by: user.id })))
    if (error) { await supabase.from('ppg_risk_library').delete().eq('id', risk.id); return }
  }
  revalidatePath('/dashboard/ppg/pustaka')
}

export async function addPpgControl(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const nama = text(formData, 'nama'); const jenis = text(formData, 'jenis')
  const riskIds = uniqueUuids(formData.getAll('risk_library_ids'))
  if (!nama || !['Preventif', 'Detektif', 'Korektif'].includes(jenis) || !riskIds.length) return
  const { data: validRisks } = await supabase.from('ppg_risk_library').select('id').in('id', riskIds).neq('status', 'nonaktif')
  if (!validRisks || validRisks.length !== riskIds.length) return
  const { data: controls } = await supabase.from('ppg_control_library').select('kode')
  const lastSequence = (controls ?? []).reduce((highest, row) => {
    const match = String(row.kode).match(/^PPG\.K\.(\d+)$/)
    return Math.max(highest, match ? Number(match[1]) : 0)
  }, 0)
  const kode = `PPG.K.${lastSequence + 1}`
  const { data: control } = await supabase.from('ppg_control_library').insert({ kode, nama, jenis, uraian: text(formData, 'uraian'), status: 'aktif', created_by: user.id }).select('id').single()
  if (!control) return
  const { error } = await supabase.from('ppg_library_risk_controls').insert(riskIds.map((risk_library_id) => ({ risk_library_id, control_id: control.id, created_by: user.id })))
  if (error) await supabase.from('ppg_control_library').delete().eq('id', control.id)
  revalidatePath('/dashboard/ppg/pustaka')
}

export async function updatePpgControlRisks(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const controlId = text(formData, 'control_id')
  const riskIds = uniqueUuids(formData.getAll('risk_library_ids'))
  if (!isUuid(controlId)) return
  const [{ data: control }, { data: risks }] = await Promise.all([
    supabase.from('ppg_control_library').select('id,status').eq('id', controlId).single(),
    riskIds.length ? supabase.from('ppg_risk_library').select('id').in('id', riskIds).neq('status', 'nonaktif') : Promise.resolve({ data: [], error: null }),
  ])
  if (!control || !risks || risks.length !== riskIds.length || (control.status === 'aktif' && !riskIds.length)) return
  await supabase.from('ppg_library_risk_controls').delete().eq('control_id', controlId)
  if (riskIds.length) await supabase.from('ppg_library_risk_controls').insert(riskIds.map((risk_library_id) => ({ risk_library_id, control_id: controlId, created_by: user.id })))
  revalidatePath('/dashboard/ppg/pustaka')
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}

export async function updatePpgRiskControls(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const riskId = text(formData, 'risk_library_id')
  const controlIds = uniqueUuids(formData.getAll('control_ids'))
  if (!isUuid(riskId)) return
  const [{ data: risk }, { data: controls }] = await Promise.all([
    supabase.from('ppg_risk_library').select('id,status').eq('id', riskId).single(),
    controlIds.length ? supabase.from('ppg_control_library').select('id').in('id', controlIds).neq('status', 'nonaktif') : Promise.resolve({ data: [], error: null }),
  ])
  if (!risk || risk.status === 'nonaktif' || !controls || controls.length !== controlIds.length) return
  await supabase.from('ppg_library_risk_controls').delete().eq('risk_library_id', riskId)
  if (controlIds.length) await supabase.from('ppg_library_risk_controls').insert(controlIds.map((control_id) => ({ risk_library_id: riskId, control_id, created_by: user.id })))
  revalidatePath('/dashboard/ppg/pustaka')
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}

export async function setPpgRiskLibraryStatus(formData: FormData) {
  const access = await requirePpgAccess()
  if (!access.isAdmin) return
  const { supabase, user } = access
  const id = text(formData, 'id')
  const status = text(formData, 'status')
  const reason = text(formData, 'alasan_nonaktif')
  if (!isUuid(id) || !['draft', 'review', 'aktif', 'nonaktif'].includes(status)) return
  if (status === 'nonaktif' && reason.length < 5) return
  const { data: risk } = await supabase.from('ppg_risk_library').select('id,status').eq('id', id).single()
  if (!risk) return
  const inactive = status === 'nonaktif'
  const { error } = await supabase.from('ppg_risk_library').update({ status, alasan_nonaktif: inactive ? reason : '', nonaktif_at: inactive ? new Date().toISOString() : null, nonaktif_by: inactive ? user.id : null, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return
  await supabase.from('ppg_audit_log').insert({ actor_id: user.id, entity_type: 'ppg_risk_library', entity_id: id, action: 'ubah_status', changes: { status_sebelumnya: risk.status, status_baru: status, alasan_nonaktif: inactive ? reason : null } })
  revalidatePath('/dashboard/ppg/pustaka')
  revalidatePath('/dashboard/ppg/penilaian')
}

export async function setPpgControlStatus(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const id = text(formData, 'id')
  const status = text(formData, 'status')
  const reason = text(formData, 'alasan_nonaktif')
  if (!isUuid(id) || !['draft', 'review', 'aktif', 'nonaktif'].includes(status) || (status === 'nonaktif' && reason.length < 5)) return
  if (status === 'aktif') {
    const { count } = await supabase.from('ppg_library_risk_controls').select('*', { count: 'exact', head: true }).eq('control_id', id)
    if (!count) return
  }
  const inactive = status === 'nonaktif'
  await supabase.from('ppg_control_library').update({ status, alasan_nonaktif: inactive ? reason : '', nonaktif_at: inactive ? new Date().toISOString() : null, nonaktif_by: inactive ? user.id : null, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/dashboard/ppg/pustaka')
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}

export async function addPpgRegister(formData: FormData) {
  const access = await requirePpgAccess()
  if (!access.isAdmin && !access.isSatker) return
  const admin = createPpgAdminClient(access.scenarioId)
  const kemungkinanInherent = integer(formData, 'kemungkinan_inherent'); const dampakInherent = integer(formData, 'dampak_inherent')
  const kemungkinanResidual = integer(formData, 'kemungkinan_residual'); const dampakResidual = integer(formData, 'dampak_residual')
  let inherentAssessment; let residualAssessment
  try { inherentAssessment = ppgAssessment(kemungkinanInherent, dampakInherent); residualAssessment = ppgAssessment(kemungkinanResidual, dampakResidual) } catch { return }
  const libraryId = text(formData, 'risk_library_id')
  const periode = text(formData, 'periode')
  const unitId = access.isSatker ? access.unitId : text(formData, 'unit_kerja_id')
  if (!isUuid(libraryId) || !unitId || !isUuid(unitId) || !isAllowedString(PPG_ASSESSMENT_PERIODS, periode)) return
  const [{ data: library }, { data: unit }] = await Promise.all([
    admin.from('ppg_risk_library').select('id,kode,kategori,proses_bisnis,subproses_bisnis,klasifikasi_risiko,faktor_penyebab,peristiwa,penyebab,dampak,status').eq('id', libraryId).single(),
    admin.from('unit_kerja').select('id,nama_unit').eq('id', unitId).single(),
  ])
  if (!library || library.status !== 'aktif' || !unit || (access.isSatker && unit.id !== access.unitId)) return
  const controlIds = uniqueUuids(formData.getAll('control_ids'))
  const controls = controlIds.map((controlId) => ({ controlId, efektivitas: text(formData, `efektivitas:${controlId}`), bukti: text(formData, `bukti:${controlId}`) }))
  if (controls.some((control) => !['belum_dinilai','tidak_efektif','sebagian','efektif'].includes(control.efektivitas) || (['sebagian','efektif'].includes(control.efektivitas) && !isHttpsUrl(control.bukti)) || (control.bukti && !isHttpsUrl(control.bukti)))) return
  if (controlIds.length) {
    const { data: mapped } = await admin.from('ppg_library_risk_controls').select('control_id,control:ppg_control_library!inner(status)').eq('risk_library_id', library.id).in('control_id', controlIds).eq('control.status', 'aktif')
    if (!mapped || mapped.length !== controlIds.length) return
  }
  const { data: register } = await admin.from('ppg_register').insert({ risk_library_id: library.id, kode: library.kode, tahun: integer(formData, 'tahun', new Date().getFullYear()), periode, unit_kerja_id: unit.id, unit_nama: unit.nama_unit, kategori: library.kategori, proses_bisnis: library.proses_bisnis, subproses_bisnis: library.subproses_bisnis, klasifikasi_risiko: library.klasifikasi_risiko, faktor_penyebab: library.faktor_penyebab, peristiwa: library.peristiwa, penyebab: library.penyebab, dampak: library.dampak, kemungkinan_inherent: kemungkinanInherent, dampak_inherent: dampakInherent, skor_inherent: inherentAssessment.score, level_inherent: inherentAssessment.level, kemungkinan_existing: kemungkinanResidual, dampak_existing: dampakResidual, skor_existing: residualAssessment.score, level_existing: residualAssessment.level, status: 'draft', created_by: access.user.id }).select('id').single()
  if (!register) return
  if (controls.length) {
    const { error } = await admin.from('ppg_risk_controls').insert(controls.map((control) => ({ risk_id: register.id, control_id: control.controlId, efektivitas: control.efektivitas, bukti_efektivitas_url: control.bukti, created_by: access.user.id })))
    if (error) { await admin.from('ppg_register').delete().eq('id', register.id); return }
  }
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg')
}

export type PpgProgramPhaseState = { status: 'idle' | 'success' | 'error'; message: string }

export async function savePpgSatkerProgramPlan(_previousState: PpgProgramPhaseState, formData: FormData): Promise<PpgProgramPhaseState> {
  const access = await requirePpgAccess()
  if (!access.isAdmin && !access.isSatker) return phaseError('Perencanaan Program PPG hanya dapat diisi oleh UPG Satker atau Admin Sistem.')
  const registerId = text(formData, 'register_id')
  const itemId = text(formData, 'program_item_id')
  const plannedStart = text(formData, 'planned_start')
  const plannedEnd = text(formData, 'planned_end')
  const pic = text(formData, 'pic_jabatan').slice(0, 500)
  if (!isUuid(registerId) || !isUuid(itemId)) return phaseError('Pilih Risk Register dan Program PPG yang akan dialokasikan.')
  if (!isIsoDate(plannedStart) || !isIsoDate(plannedEnd) || plannedStart > plannedEnd) return phaseError('Rentang waktu rencana tidak valid.')
  if (pic.length < 3) return phaseError('PIC program wajib diisi.')

  const admin = createPpgAdminClient(access.scenarioId)
  const [{ data: register }, { data: item }] = await Promise.all([
    admin.from('ppg_register').select('id,kode,unit_kerja_id,risk_library_id').eq('id', registerId).single(),
    admin.from('ppg_program_items').select('id,risk_library_id,program:ppg_programs(id,kode,status,ditetapkan_at,program_start,program_end),clusters:ppg_program_clusters(id,units:ppg_program_cluster_units(unit_kerja_id))').eq('id', itemId).single(),
  ])
  if (!register || (access.isSatker && register.unit_kerja_id !== access.unitId)) return phaseError('Risk Register tidak ditemukan atau bukan milik Satker Anda.')
  const program = relation(item?.program)
  if (!item || !isPpgProgramItemEligibleForPlanning({ ...program, items: [item] }, itemId, register)) return phaseError('Program belum ditetapkan, tidak menangani risiko ini, atau Satker tidak termasuk klaster penerima.')
  if (plannedStart < String(program.program_start) || plannedEnd > String(program.program_end)) return phaseError('Jadwal Satker harus berada dalam rentang pelaksanaan yang ditetapkan UPG Pusat.')
  const { data: existing } = await admin.from('ppg_satker_program_assignments').select('id,post_submitted_at').eq('program_item_id', itemId).eq('register_id', registerId).maybeSingle()
  if (existing?.post_submitted_at) return phaseError('Rencana tidak dapat diubah setelah realisasi diajukan. Gunakan fase Pasca Pelaksanaan untuk menindaklanjuti hasil review.')

  const now = new Date().toISOString()
  const { error } = await admin.from('ppg_satker_program_assignments').upsert({
    program_item_id: itemId,
    register_id: registerId,
    unit_kerja_id: register.unit_kerja_id,
    planned_start: plannedStart,
    planned_end: plannedEnd,
    pic_jabatan: pic,
    planning_notes: text(formData, 'planning_notes').slice(0, 1500),
    planned_by: access.user.id,
    planned_at: now,
    updated_at: now,
  }, { onConflict: 'program_item_id,register_id' })
  if (error) return phaseError(`Rencana Program PPG gagal disimpan: ${error.message}`)
  await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_satker_program_assignment', entity_id: `${itemId}:${registerId}`, action: 'rencanakan_program', changes: { kode_risiko: register.kode, program_item_id: itemId, planned_start: plannedStart, planned_end: plannedEnd, pic_jabatan: pic } })
  revalidatePpgProgramPhases()
  return { status: 'success', message: 'Rencana Program PPG tersimpan. Setelah pelaksanaan selesai, lanjutkan ke fase pascapelaksanaan.' }
}

export async function submitPpgSatkerProgramRealization(_previousState: PpgProgramPhaseState, formData: FormData): Promise<PpgProgramPhaseState> {
  const access = await requirePpgAccess()
  if (!access.isAdmin && !access.isSatker) return phaseError('Realisasi Program PPG hanya dapat diisi oleh UPG Satker atau Admin Sistem.')
  const assignmentId = text(formData, 'assignment_id')
  const actualEnd = text(formData, 'actual_end')
  const effectiveness = text(formData, 'efektivitas_program')
  const summary = text(formData, 'realization_summary').slice(0, 3000)
  const evidenceUrl = text(formData, 'evidence_url')
  if (!isUuid(assignmentId)) return phaseError('Referensi alokasi program tidak valid.')
  if (!isIsoDate(actualEnd)) return phaseError('Tanggal selesai aktual wajib diisi.')
  if (!['tidak_efektif','kurang_efektif','cukup_efektif','efektif'].includes(effectiveness)) return phaseError('Pilih efektivitas Program PPG.')
  if (summary.length < 10) return phaseError('Uraian realisasi wajib diisi sedikitnya 10 karakter.')
  if (!isHttpsUrl(evidenceUrl)) return phaseError('Evidence realisasi wajib berupa tautan HTTPS yang valid.')
  const treatedProbability = integer(formData, 'kemungkinan_treated')
  const treatedImpact = integer(formData, 'dampak_treated')
  let assessment
  try { assessment = ppgAssessment(treatedProbability, treatedImpact) } catch { return phaseError('Probabilitas dan dampak treated risk harus berada pada skala 1–5.') }

  const admin = createPpgAdminClient(access.scenarioId)
  const { data: assignment } = await admin.from('ppg_satker_program_assignments').select('id,register_id,unit_kerja_id,planned_start,program_item_id,register:ppg_register(id,skor_existing),item:ppg_program_items(id,program:ppg_programs(id,status,ditetapkan_at))').eq('id', assignmentId).single()
  if (!assignment || (access.isSatker && assignment.unit_kerja_id !== access.unitId)) return phaseError('Alokasi program tidak ditemukan atau bukan milik Satker Anda.')
  const program = relation(relation(assignment.item).program)
  if (!program.ditetapkan_at || program.status === 'dibatalkan') return phaseError('Program belum ditetapkan atau telah dibatalkan UPG Pusat.')
  if (actualEnd < String(assignment.planned_start)) return phaseError('Tanggal selesai aktual tidak boleh lebih awal dari tanggal mulai rencana.')
  const now = new Date().toISOString()
  const { error } = await admin.from('ppg_satker_program_assignments').update({
    actual_end: actualEnd,
    realization_summary: summary,
    efektivitas_program: effectiveness,
    evidence_url: evidenceUrl,
    kemungkinan_treated: treatedProbability,
    dampak_treated: treatedImpact,
    skor_treated: assessment.score,
    level_treated: assessment.level,
    post_submitted_by: access.user.id,
    post_submitted_at: now,
    validation_status: 'menunggu',
    validation_notes: '',
    validated_by: null,
    validated_at: null,
    updated_at: now,
  }).eq('id', assignmentId)
  if (error) return phaseError(`Realisasi Program PPG gagal disimpan: ${error.message}`)
  const register = relation(assignment.register)
  await admin.from('ppg_register').update({ kemungkinan_treated: treatedProbability, dampak_treated: treatedImpact, skor_treated: assessment.score, level_treated: assessment.level, treated_program_id: program.id, efektivitas_program: effectiveness, bukti_efektivitas_program_url: evidenceUrl, treated_assessed_by: access.user.id, treated_assessed_at: now, updated_at: now }).eq('id', assignment.register_id)
  await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_satker_program_assignment', entity_id: assignmentId, action: 'ajukan_realisasi_program', changes: { program_item_id: assignment.program_item_id, skor_residual: register.skor_existing, skor_treated: assessment.score, efektivitas_program: effectiveness, actual_end: actualEnd } })
  revalidatePpgProgramPhases()
  return { status: 'success', message: `Realisasi diajukan. Treated risk ${assessment.score} (${assessment.level}) menunggu validasi UPG Pusat.` }
}

export async function validatePpgSatkerProgramRealization(_previousState: PpgProgramPhaseState, formData: FormData): Promise<PpgProgramPhaseState> {
  const { supabase, user } = await requirePpgAdmin()
  const assignmentId = text(formData, 'assignment_id')
  const decision = text(formData, 'decision')
  const notes = text(formData, 'validation_notes').slice(0, 1500)
  if (!isUuid(assignmentId) || !['disetujui','perlu_perbaikan','ditolak'].includes(decision)) return phaseError('Keputusan validasi tidak valid.')
  if (decision !== 'disetujui' && notes.length < 5) return phaseError('Catatan wajib diisi untuk keputusan perbaikan atau penolakan.')
  const { data: assignment } = await supabase.from('ppg_satker_program_assignments').select('id,post_submitted_at,evidence_url,efektivitas_program,skor_treated').eq('id', assignmentId).single()
  if (!assignment?.post_submitted_at) return phaseError('Satker belum mengajukan realisasi program.')
  if (decision === 'disetujui' && (!assignment.evidence_url || !assignment.efektivitas_program || !assignment.skor_treated)) return phaseError('Realisasi belum lengkap dan tidak dapat disetujui.')
  const now = new Date().toISOString()
  const { error } = await supabase.from('ppg_satker_program_assignments').update({ validation_status: decision, validation_notes: notes, validated_by: user.id, validated_at: now, updated_at: now }).eq('id', assignmentId)
  if (error) return phaseError(`Validasi realisasi gagal disimpan: ${error.message}`)
  await supabase.from('ppg_audit_log').insert({ actor_id: user.id, entity_type: 'ppg_satker_program_assignment', entity_id: assignmentId, action: 'validasi_realisasi_program', changes: { status: decision, catatan: notes } })
  revalidatePpgProgramPhases()
  return { status: 'success', message: `Realisasi Program PPG ${decision.replaceAll('_', ' ')}.` }
}

function phaseError(message: string): PpgProgramPhaseState { return { status: 'error', message } }
function revalidatePpgProgramPhases() { revalidatePath('/dashboard/ppg/tindak-lanjut'); revalidatePath('/dashboard/ppg/penilaian'); revalidatePath('/dashboard/ppg') }

export async function deletePpgRegister(formData: FormData) {
  const access = await requirePpgAccess()
  if (!access.isAdmin && !access.isSatker) return
  const id = text(formData, 'id')
  if (!isUuid(id)) return
  const admin = createPpgAdminClient(access.scenarioId)
  const { data: register } = await admin.from('ppg_register').select('id,unit_kerja_id').eq('id', id).single()
  if (!register || (access.isSatker && register.unit_kerja_id !== access.unitId)) return
  const { error } = await admin.from('ppg_register').delete().eq('id', id)
  if (error) return
  revalidatePath('/dashboard/ppg/penilaian')
  revalidatePath('/dashboard/ppg/tindak-lanjut')
  revalidatePath('/dashboard/ppg')
}

export type PpgControlValidationState = { status: 'idle' | 'success' | 'error'; message: string }

export async function validatePpgRiskControlEvidence(_previousState: PpgControlValidationState, formData: FormData): Promise<PpgControlValidationState> {
  const { supabase, user } = await requirePpgAdmin()
  const riskId = text(formData, 'risk_id'); const controlId = text(formData, 'control_id'); const status = text(formData, 'status')
  if (!isUuid(riskId) || !isUuid(controlId) || !['belum_ditinjau','disetujui','perlu_perbaikan','ditolak'].includes(status)) return { status: 'error', message: 'Data validasi tidak valid.' }
  const { data: relation } = await supabase.from('ppg_risk_controls').select('bukti_efektivitas_url').eq('risk_id', riskId).eq('control_id', controlId).single()
  if (!relation) return { status: 'error', message: 'Penerapan kontrol tidak ditemukan.' }
  if (status === 'disetujui' && !relation.bukti_efektivitas_url) return { status: 'error', message: 'Tidak dapat disetujui: Satker belum menyertakan tautan bukti.' }
  const { error } = await supabase.from('ppg_risk_control_validations').upsert({ risk_id: riskId, control_id: controlId, status, catatan: text(formData, 'catatan'), validated_by: user.id, validated_at: status === 'belum_ditinjau' ? null : new Date().toISOString() })
  if (error) return { status: 'error', message: `Validasi gagal disimpan: ${error.message}` }
  await supabase.from('ppg_audit_log').insert({ actor_id: user.id, entity_type: 'ppg_risk_control', entity_id: `${riskId}:${controlId}`, action: 'validasi_bukti_efektivitas', changes: { status, catatan: text(formData, 'catatan') } })
  revalidatePath('/dashboard/ppg/penilaian')
  return { status: 'success', message: `Validasi tersimpan: ${status.replaceAll('_', ' ')}.` }
}

export async function updatePpgRiskControlEvidence(formData: FormData) {
  const access = await requirePpgAccess()
  if (!access.isAdmin && !access.isSatker) return
  const riskId = text(formData, 'risk_id'); const controlId = text(formData, 'control_id'); const efektivitas = text(formData, 'efektivitas'); const bukti = text(formData, 'bukti_efektivitas_url')
  if (!isUuid(riskId) || !isUuid(controlId) || !['belum_dinilai','tidak_efektif','sebagian','efektif'].includes(efektivitas) || (['sebagian','efektif'].includes(efektivitas) && !isHttpsUrl(bukti)) || (bukti && !isHttpsUrl(bukti))) return
  const admin = createPpgAdminClient(access.scenarioId)
  const { data: register } = await admin.from('ppg_register').select('id,unit_kerja_id').eq('id', riskId).single()
  if (!register || (access.isSatker && register.unit_kerja_id !== access.unitId)) return
  const { error } = await admin.from('ppg_risk_controls').update({ efektivitas, bukti_efektivitas_url: bukti, updated_at: new Date().toISOString() }).eq('risk_id', riskId).eq('control_id', controlId)
  if (!error) {
    await admin.from('ppg_risk_control_validations').delete().eq('risk_id', riskId).eq('control_id', controlId)
    await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_risk_control', entity_id: `${riskId}:${controlId}`, action: 'kirim_ulang_bukti_efektivitas', changes: { efektivitas, memiliki_bukti: Boolean(bukti) } })
  }
  revalidatePath('/dashboard/ppg/penilaian')
}

function isReferenceLabel(items: readonly { label: string }[], value: string) {
  return items.some((item) => item.label === value)
}

function isAllowedString(items: readonly string[], value: string) {
  return items.some((item) => item === value)
}

function resolveSubprocess(formData: FormData) {
  const value = text(formData, 'subproses_bisnis')
  return value === '__other__' ? text(formData, 'subproses_bisnis_custom') : value
}

export async function addPpgMitigation(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const registerId = text(formData, 'register_id'); const tindakan = text(formData, 'tindakan')
  if (!registerId || !tindakan) return
  await supabase.from('ppg_mitigations').insert({ register_id: registerId, tindakan, pic_jabatan: text(formData, 'pic_jabatan'), tenggat: text(formData, 'tenggat') || null, status: 'belum_dimulai', created_by: user.id })
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}

export async function createPpgProgram(formData: FormData) {
  const access = await requirePpgAdmin()
  const { supabase, user } = access
  const actionId = text(formData, 'action_catalog_id')
  const controlIds = uniqueUuids(formData.getAll('control_ids'))
  const riskLibraryId = text(formData, 'risk_library_id')
  const analysisYear = integer(formData, 'analysis_year')
  const quarterValue = integer(formData, 'analysis_quarter')
  const quarter = quarterValue >= 1 && quarterValue <= 4 ? quarterValue : null
  const programStart = text(formData, 'program_start')
  const programEnd = text(formData, 'program_end')
  const kriGreen = text(formData, 'kri_ambang_hijau')
  const kriWarning = text(formData, 'kri_ambang_waspada')
  const kriRed = text(formData, 'kri_ambang_merah')
  const outcomeATarget = percentage(formData, 'outcome_a_target_pct')
  const outcomeBTarget = percentage(formData, 'outcome_b_target_pct')
  if (!isUuid(actionId) || !controlIds.length || !isUuid(riskLibraryId) || analysisYear < 2000 || analysisYear > 2200 || !isIsoDate(programStart) || !isIsoDate(programEnd) || programStart > programEnd || !kriGreen || !kriWarning || !kriRed || outcomeATarget === null || outcomeBTarget === null) return

  const [{ data: action }, { data: controls }, { data: risk }, reports, { data: units }] = await Promise.all([
    supabase.from('ppg_action_catalog').select('*').eq('id', actionId).eq('status', 'aktif').single(),
    supabase.from('ppg_control_library').select('id,kode,nama,jenis').in('id', controlIds).eq('status', 'aktif'),
    supabase.from('ppg_risk_library').select('id,kode,kategori,peristiwa').eq('id', riskLibraryId).eq('status', 'aktif').single(),
    fetchAllReports(supabase),
    supabase.from('unit_kerja').select('id,nama_unit'),
  ])
  if (!action || !controls || controls.length !== controlIds.length || !risk || !units) return
  const { data: mappedControls } = await supabase.from('ppg_library_risk_controls').select('control_id').eq('risk_library_id', risk.id).in('control_id', controlIds)
  if (!mappedControls || mappedControls.length !== controlIds.length) return
  const allowedRiskCategories = Array.isArray(action.risk_categories) ? action.risk_categories.map(String) : []
  if (allowedRiskCategories.length && !allowedRiskCategories.includes(String(risk.kategori))) return
  const aiRunId = text(formData, 'ai_run_id')
  const aiRecommendationKey = text(formData, 'ai_recommendation_key')
  let aiRecommendation: Record<string, unknown> | null = null
  if (access.isDemo && isUuid(aiRunId) && aiRecommendationKey) {
    const { data: aiRun } = await supabase.from('ppg_ai_recommendation_runs').select('id,model,prompt_version,recommendations').eq('id', aiRunId).single()
    const candidate = (Array.isArray(aiRun?.recommendations) ? aiRun.recommendations : []).map(record).find((item) => item.key === aiRecommendationKey && item.linked_risk_id === risk.id)
    if (candidate && aiRun) {
      const matchesExisting = candidate.existing_action_code === action.kode
      const { data: promoted } = matchesExisting ? { data: null } : await supabase.from('ppg_ai_action_candidates').select('id').eq('run_id', aiRunId).eq('recommendation_key', aiRecommendationKey).eq('status', 'disetujui').eq('promoted_action_id', action.id).maybeSingle()
      if (matchesExisting || promoted) aiRecommendation = { ...candidate, run_id: aiRun.id, model: aiRun.model, prompt_version: aiRun.prompt_version }
    }
  }
  const analytics = analyzePpgReports(reports, analysisYear, quarter)
  const [{ data: lossEvents }, { data: riskRegisters }, { data: riskAppetites }] = await Promise.all([
    supabase.from('ppg_loss_events').select('id,unit_kerja_id,level_dampak,kegagalan_kontrol,klasifikasi_limit').eq('risk_library_id', riskLibraryId).gte('tanggal_kejadian', analytics.period.start).lte('tanggal_kejadian', analytics.period.end).in('status', ['tervalidasi','tindak_lanjut','ditutup']),
    supabase.from('ppg_register').select('unit_kerja_id,kategori,skor_existing').eq('risk_library_id', riskLibraryId).eq('tahun', analysisYear),
    supabase.from('ppg_risk_appetites').select('*').eq('tahun', analysisYear),
  ])
  const recommendation = analytics.recommendations.find((item) => item.actionCode === action.kode)
  const eventsByUnit = new Map<string, NonNullable<typeof lossEvents>>()
  ;(lossEvents ?? []).forEach((event) => {
    const unitId = String(event.unit_kerja_id)
    eventsByUnit.set(unitId, [...(eventsByUnit.get(unitId) ?? []), event])
  })
  const affectedSatkers = eventsByUnit.size
  const measuredUnitIds = new Set([...(riskRegisters ?? []).map((register) => String(register.unit_kerja_id)), ...eventsByUnit.keys()])
  const measuredUnits = units.filter((unit) => measuredUnitIds.has(String(unit.id)))
  const observedDenominator = measuredUnitIds.size
  const observedPct = (value: number) => observedDenominator ? Math.round(value / observedDenominator * 10_000) / 100 : 0
  const affectedPct = observedPct(affectedSatkers)
  const highImpactSatkers = [...eventsByUnit.values()].filter((items) => items.some((event) => Number(event.level_dampak) >= 4)).length
  const recurringSatkers = [...eventsByUnit.values()].filter((items) => items.length >= 2).length
  const controlFailureSatkers = [...eventsByUnit.values()].filter((items) => items.some((event) => String(event.kegagalan_kontrol || '').trim())).length
  const upperLimitSatkers = new Set((lossEvents ?? []).filter((event) => event.klasifikasi_limit === 'upper_limit').map((event) => String(event.unit_kerja_id))).size
  const appetiteByUnit = new Map((riskAppetites ?? []).map((row) => [String(row.unit_kerja_id), row]))
  const appetiteSetUnitIds = new Set((riskRegisters ?? []).filter((register) => appetiteByUnit.has(String(register.unit_kerja_id))).map((register) => String(register.unit_kerja_id)))
  const appetiteSetSatkers = appetiteSetUnitIds.size
  const aboveAppetiteSatkers = new Set((riskRegisters ?? []).filter((register) => evaluatePpgAppetite(register.skor_existing, register.kategori, appetiteByUnit.get(String(register.unit_kerja_id))).status === 'di_atas_selera').map((register) => String(register.unit_kerja_id))).size
  const appetitePct = (value: number) => appetiteSetSatkers ? Math.round(value / appetiteSetSatkers * 10_000) / 100 : 0
  const clusterCounts = { kritis: 0, preventif: 0, monitoring: 0 }
  measuredUnits.forEach((unit) => {
    const items = eventsByUnit.get(String(unit.id)) ?? []
    if (items.length >= 2 || items.some((event) => Number(event.level_dampak) >= 4)) clusterCounts.kritis += 1
    else if (items.length) clusterCounts.preventif += 1
    else clusterCounts.monitoring += 1
  })
  const machineInsight = buildPpgAssistedInsights(analytics, [{
    risk_library_id: String(risk.id), kode: String(risk.kode), kategori: String(risk.kategori), peristiwa: String(risk.peristiwa),
    eligible_satkers: observedDenominator, affected_satkers: affectedSatkers, affected_pct: affectedPct,
    high_impact_satkers: highImpactSatkers, high_impact_pct: observedPct(highImpactSatkers),
    recurring_satkers: recurringSatkers, recurring_pct: observedPct(recurringSatkers),
    control_failure_satkers: controlFailureSatkers, control_failure_pct: observedPct(controlFailureSatkers),
    cluster_1_satkers: clusterCounts.kritis, cluster_2_satkers: clusterCounts.preventif, cluster_3_satkers: clusterCounts.monitoring,
    appetite_set_satkers: appetiteSetSatkers, above_appetite_satkers: aboveAppetiteSatkers, above_appetite_pct: appetitePct(aboveAppetiteSatkers),
    upper_limit_satkers: upperLimitSatkers, recommended_for_program: aboveAppetiteSatkers > 0 || upperLimitSatkers > 0,
    data_confidence: lossEvents?.length ? 'tinggi' : 'terbatas',
  }])[0]
  const snapshotSummary = {
    coverage: analytics.coverage,
    summary: analytics.summary,
    yearly: analytics.yearly,
    monthly: analytics.monthly,
    topRoles: analytics.roles.slice(0, 10),
    topObjects: analytics.objects.slice(0, 10),
    topScenarios: analytics.scenarios.slice(0, 10),
    associations: analytics.associations,
    insightB: {
      risk_library_id: risk.id, risk_code: risk.kode, eligible_satkers: observedDenominator,
      affected_satkers: affectedSatkers, affected_satkers_pct: affectedPct,
      appetite_set_satkers: appetiteSetSatkers, above_appetite_satkers: aboveAppetiteSatkers,
      above_appetite_satkers_pct: appetitePct(aboveAppetiteSatkers), upper_limit_satkers: upperLimitSatkers,
      recommended_for_program: aboveAppetiteSatkers > 0 || upperLimitSatkers > 0,
      cluster_counts: clusterCounts,
      metric_basis: 'persentase_satker_terukur',
      denominator_note: 'Loss event memakai Satker yang memiliki register risiko atau event pada periode; appetite memakai Satker yang telah menetapkan appetite untuk register tersebut.',
    },
    assistedInsight: machineInsight,
    aiRecommendation,
  }
  const { data: snapshot } = await supabase.from('ppg_analysis_snapshots').insert({
    analysis_start: analytics.period.start,
    analysis_end: analytics.period.end,
    baseline_start: analytics.period.baselineStart,
    baseline_end: analytics.period.baselineEnd,
    period_label: analytics.period.label,
    program_label: analytics.period.programLabel,
    method_version: 'combined-a-b-v3',
    summary: snapshotSummary,
    recommendations: aiRecommendation ? [aiRecommendation] : analytics.recommendations,
    created_by: user.id,
  }).select('id').single()
  if (!snapshot) return

  const code = `PPG-${programStart.slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`
  const { data: program } = await supabase.from('ppg_programs').insert({
    kode: code,
    nama: text(formData, 'nama') || `${action.nama} - ${analytics.period.programLabel}`,
    snapshot_id: snapshot.id,
    analysis_start: analytics.period.start,
    analysis_end: analytics.period.end,
    program_start: programStart,
    program_end: programEnd,
    period_label: analytics.period.programLabel,
    cakupan_model: 'nasional_berklaster',
    status: 'dirancang',
    created_by: user.id,
  }).select('id').single()
  if (!program) return

  const { data: programItem } = await supabase.from('ppg_program_items').insert({
    program_id: program.id,
    register_id: null,
    risk_library_id: risk.id,
    control_id: controls[0].id,
    action_catalog_id: action.id,
    rationale: `${String(aiRecommendation?.reasoning_summary || recommendation?.rationale || `Tindakan katalog dipilih untuk risiko ${risk.kode}: ${risk.peristiwa}`)} Insight B menunjukkan ${affectedPct.toFixed(1)}% Satker mengalami loss event tervalidasi pada risiko generik ini.`,
    target: text(formData, 'target') || recommendation?.target || action.target_default,
    sasaran_program: text(formData, 'sasaran_program'),
    indikator_program: machineInsight.suggested_outcome_b,
    baseline_indikator: String(machineInsight.suggested_outcome_b_baseline),
    target_indikator: String(outcomeBTarget),
    satuan_indikator: '% Satker',
    arah_target: 'maksimal',
    sumber_data_indikator: 'Advanced analytics PPG · laporan gratifikasi dan LED tervalidasi',
    frekuensi_pengukuran: text(formData, 'frekuensi_pengukuran'),
    target_cakupan_satker: percentage(formData, 'target_cakupan_satker', 100),
    kri_indikator: machineInsight.suggested_kri,
    kri_ambang_hijau: kriGreen,
    kri_ambang_waspada: kriWarning,
    kri_ambang_merah: kriRed,
    outcome_a_indikator: machineInsight.suggested_outcome_a,
    outcome_a_baseline_pct: machineInsight.suggested_outcome_a_baseline,
    outcome_a_target_pct: outcomeATarget,
    outcome_b_indikator: machineInsight.suggested_outcome_b,
    outcome_b_baseline_pct: machineInsight.suggested_outcome_b_baseline,
    outcome_b_target_pct: outcomeBTarget,
    catatan_keputusan: text(formData, 'catatan_keputusan'),
    pic_jabatan: text(formData, 'pic_jabatan'),
    mulai: programStart,
    selesai_rencana: programEnd,
    output_target: text(formData, 'output_target') || action.output_indicator,
    outcome_target: text(formData, 'outcome_target') || action.outcome_indicator,
    created_by: user.id,
  }).select('id').single()
  if (!programItem) { await supabase.from('ppg_programs').delete().eq('id', program.id); await supabase.from('ppg_analysis_snapshots').delete().eq('id', snapshot.id); return }
  const { error: controlLinkError } = await supabase.from('ppg_program_item_controls').insert(controlIds.map((control_id) => ({ program_item_id: programItem.id, control_id })))
  if (controlLinkError) { await supabase.from('ppg_programs').delete().eq('id', program.id); await supabase.from('ppg_analysis_snapshots').delete().eq('id', snapshot.id); return }
  const clusterDefinitions = [
    { kode: 1, nama: 'Realisasi kritis', kriteria: 'Dampak level 4–5 atau kejadian berulang pada periode analisis.', fokus_tindakan: text(formData, 'cluster_1_focus') || 'Perbaikan kontrol, RCA, validasi intensif, dan tindak lanjut.' },
    { kode: 2, nama: 'Realisasi terbatas/preventif', kriteria: 'Memiliki satu kejadian tervalidasi dengan dampak di bawah level 4.', fokus_tindakan: text(formData, 'cluster_2_focus') || 'Pencegahan, penguatan KRI, komunikasi periode rawan, dan deteksi dini.' },
    { kode: 3, nama: 'Terkendali/monitoring', kriteria: 'Belum memiliki loss event tervalidasi untuk risiko generik pada periode analisis.', fokus_tindakan: text(formData, 'cluster_3_focus') || 'Mempertahankan kontrol, monitoring berkala, dan penguatan kualitas data.' },
  ]
  const { data: clusters, error: clusterError } = await supabase.from('ppg_program_clusters').insert(clusterDefinitions.map((cluster) => ({ ...cluster, program_item_id: programItem.id, target_cakupan_satker: percentage(formData, `cluster_${cluster.kode}_target_pct`, 100) }))).select('id,kode')
  if (clusterError || !clusters) { await supabase.from('ppg_programs').delete().eq('id', program.id); await supabase.from('ppg_analysis_snapshots').delete().eq('id', snapshot.id); return }
  const clusterIdByCode = new Map(clusters.map((cluster) => [Number(cluster.kode), String(cluster.id)]))
  const assignments = measuredUnits.map((unit) => {
    const items = eventsByUnit.get(String(unit.id)) ?? []
    const code = items.length >= 2 || items.some((event) => Number(event.level_dampak) >= 4) ? 1 : items.length ? 2 : 3
    return { program_cluster_id: clusterIdByCode.get(code), unit_kerja_id: unit.id, basis: { event_count: items.length, highest_impact: items.reduce((highest, event) => Math.max(highest, Number(event.level_dampak || 0)), 0), source: 'insight_b' } }
  }).filter((assignment) => assignment.program_cluster_id)
  if (assignments.length) await supabase.from('ppg_program_cluster_units').insert(assignments)
  const lossEventId = text(formData, 'loss_event_id')
  if (isUuid(lossEventId)) {
    const { data: lossEvent } = await supabase.from('ppg_loss_events').select('id').eq('id', lossEventId).eq('risk_library_id', risk.id).eq('klasifikasi_limit', 'upper_limit').in('status', ['tervalidasi','tindak_lanjut','ditutup']).maybeSingle()
    if (lossEvent) await supabase.from('ppg_program_loss_events').insert({ program_item_id: programItem.id, loss_event_id: lossEvent.id })
  }
  revalidatePath('/dashboard/ppg/tindak-lanjut')
  revalidatePath('/dashboard/ppg/analitik')
}

export type PpgProgramApprovalState = { status: 'idle' | 'success' | 'error'; message: string }

export async function approvePpgProgram(_previousState: PpgProgramApprovalState, formData: FormData): Promise<PpgProgramApprovalState> {
  const { supabase, user } = await requirePpgAdmin()
  const programId = text(formData, 'program_id')
  const note = text(formData, 'catatan_penetapan').slice(0, 1500)
  if (!isUuid(programId)) return programApprovalError('Referensi Program PPG tidak valid.')
  if (note.length < 10) return programApprovalError('Catatan penetapan wajib diisi sedikitnya 10 karakter.')
  const { data: program, error: loadError } = await supabase.from('ppg_programs').select('id,kode,status,ditetapkan_at,items:ppg_program_items(id)').eq('id', programId).single()
  if (loadError || !program) return programApprovalError('Program PPG tidak ditemukan pada save slot aktif.')
  if (program.ditetapkan_at) return programApprovalError('Program PPG ini sudah pernah ditetapkan.')
  if (program.status === 'dibatalkan') return programApprovalError('Program yang dibatalkan tidak dapat ditetapkan.')
  if (!Array.isArray(program.items) || !program.items.length) return programApprovalError('Program belum mempunyai item tindakan yang dapat ditetapkan.')
  const now = new Date().toISOString()
  const { data: established, error } = await supabase.from('ppg_programs').update({
    status: program.status === 'dirancang' ? 'ditetapkan' : program.status,
    ditetapkan_by: user.id,
    ditetapkan_at: now,
    catatan_penetapan: note,
    updated_at: now,
  }).eq('id', programId).is('ditetapkan_at', null).select('id').maybeSingle()
  if (error) return programApprovalError(`Penetapan program gagal disimpan: ${error.message}`)
  if (!established) return programApprovalError('Program telah ditetapkan oleh pengguna lain. Muat ulang halaman untuk melihat status terbaru.')
  await supabase.from('ppg_audit_log').insert({ actor_id: user.id, entity_type: 'ppg_program', entity_id: programId, action: 'tetapkan', changes: { kode: program.kode, status_sebelum: program.status, status_sesudah: program.status === 'dirancang' ? 'ditetapkan' : program.status, catatan_penetapan: note } })
  revalidatePath('/dashboard/ppg/tindak-lanjut')
  revalidatePath('/dashboard/ppg')
  return { status: 'success', message: 'Program PPG telah ditetapkan dan dapat memasuki tahap pelaksanaan.' }
}

export async function addPpgProgramUpdate(formData: FormData) {
  const access = await requirePpgAccess()
  if (!access.isAdmin) return
  const { supabase, user } = access
  const itemId = text(formData, 'program_item_id')
  const status = text(formData, 'status')
  const progress = integer(formData, 'progres')
  const allowed = ['belum_dimulai', 'berjalan', 'terhambat', 'selesai', 'dibatalkan']
  if (!isUuid(itemId) || !allowed.includes(status) || progress < 0 || progress > 100) return
  const { data: item } = await supabase.from('ppg_program_items').select('id,program_id,program:ppg_programs(id,ditetapkan_at,status)').eq('id', itemId).single()
  const parent = relation(item?.program)
  if (!item || !parent.ditetapkan_at || parent.status === 'dibatalkan') return
  const payload = {
    program_item_id: itemId,
    tanggal: text(formData, 'tanggal') || new Date().toISOString().slice(0, 10),
    status,
    progres: progress,
    realisasi_indikator: text(formData, 'realisasi_indikator'),
    output_realisasi: text(formData, 'output_realisasi'),
    outcome_realisasi: text(formData, 'outcome_realisasi'),
    catatan: text(formData, 'catatan'),
    bukti_url: text(formData, 'bukti_url') || null,
    created_by: user.id,
  }
  const { error } = await supabase.from('ppg_program_updates').insert(payload)
  if (error) return
  await supabase.from('ppg_program_items').update({ status, progres: progress, updated_at: new Date().toISOString() }).eq('id', itemId)
  const { data: siblings } = await supabase.from('ppg_program_items').select('status').eq('program_id', item.program_id)
  const statuses = (siblings ?? []).map((row) => String(row.status))
  const programStatus = statuses.length && statuses.every((value) => value === 'dibatalkan') ? 'dibatalkan'
    : statuses.length && statuses.every((value) => ['selesai', 'dibatalkan'].includes(value)) ? 'selesai'
      : statuses.includes('terhambat') ? 'terhambat'
        : statuses.some((value) => ['berjalan', 'selesai'].includes(value)) ? 'berjalan'
          : 'ditetapkan'
  await supabase.from('ppg_programs').update({ status: programStatus, updated_at: new Date().toISOString() }).eq('id', item.program_id)
  revalidatePath('/dashboard/ppg/tindak-lanjut')
}

export type PpgLedLimitActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function savePpgLedLimit(_previousState: PpgLedLimitActionState, formData: FormData): Promise<PpgLedLimitActionState> {
  const { supabase, user } = await requirePpgAdmin()
  const year = integer(formData, 'tahun')
  const impactUpperLevel = integer(formData, 'level_dampak_upper', 4)
  if (year < 2000 || year > 2200 || impactUpperLevel < 1 || impactUpperLevel > 5) return { status: 'error', message: 'Tahun atau level batas tidak valid.' }
  const { error } = await supabase.from('ppg_led_limit_versions').upsert({ tahun: year, level_dampak_upper: impactUpperLevel, status: 'aktif', created_by: user.id, updated_at: new Date().toISOString() }, { onConflict: 'tahun' })
  if (error) return { status: 'error', message: `Konfigurasi limit gagal disimpan: ${error.message}` }
  revalidatePath('/dashboard/ppg/loss-event')
  return { status: 'success', message: `Konfigurasi ${year} tersimpan: upper limit dimulai dari Level ${impactUpperLevel}.` }
}

export type PpgLossEventActionState = { status: 'idle' | 'success' | 'error'; message: string }

export async function createPpgLossEvent(_previousState: PpgLossEventActionState, formData: FormData): Promise<PpgLossEventActionState> {
  const access = await requirePpgAccess()
  if (!access.isSatker && !access.isAdmin) return lossEventError('Pembuatan Loss Event hanya tersedia bagi UPG Satker. Admin Sistem tetap dapat mengaksesnya untuk debugging dan pengembangan.')
  const admin = createPpgAdminClient(access.scenarioId)
  const unitId = access.isSatker ? access.unitId : text(formData, 'unit_kerja_id')
  const eventDate = text(formData, 'tanggal_kejadian')
  const name = text(formData, 'nama_peristiwa')
  const chronology = text(formData, 'kronologi')
  const requestedStatus = text(formData, 'submit_mode') === 'draft' ? 'draft' : 'diajukan'
  if (!unitId || !isUuid(unitId)) return lossEventError('Pilih Satker pelapor terlebih dahulu.')
  if (!isIsoDate(eventDate) || !name || !chronology) return lossEventError('Nama loss event, tanggal kejadian, dan kronologi wajib diisi.')
  const { data: unit, error: unitError } = await admin.from('unit_kerja').select('id,nama_unit').eq('id', unitId).single()
  if (unitError || !unit || (access.isSatker && unit.id !== access.unitId)) return lossEventError('Satker pelapor tidak valid atau tidak sesuai dengan akun Anda.')
  const source = text(formData, 'sumber_informasi') || 'laporan_gratifikasi'
  const riskLibraryId = text(formData, 'risk_library_id')
  if (!isUuid(riskLibraryId)) return lossEventError('Pilih satu risiko generik utama untuk loss event ini.')
  const { data: genericRisk } = await admin.from('ppg_risk_library').select('id,kategori,status').eq('id', riskLibraryId).eq('status', 'aktif').single()
  if (!genericRisk) return lossEventError('Risiko generik utama tidak valid atau sudah nonaktif.')
  const registerId = text(formData, 'register_id')
  const failedControlIds = uniqueUuids(formData.getAll('failed_control_ids'))
  if (failedControlIds.length && !isUuid(registerId)) return lossEventError('Pilih Risk Register terlebih dahulu sebelum memilih kontrol yang gagal.')
  if (isUuid(registerId)) {
    const { data: register } = await admin.from('ppg_register').select('id,unit_kerja_id,risk_library_id').eq('id', registerId).single()
    if (!register || register.unit_kerja_id !== unit.id) return lossEventError('Risk Register yang dipilih bukan milik Satker pelapor.')
    if (register.risk_library_id !== riskLibraryId) return lossEventError('Risk Register operasional harus berasal dari risiko generik utama yang dipilih.')
    if (failedControlIds.length) {
      const { data: appliedControls } = await admin.from('ppg_risk_controls').select('control_id').eq('risk_id', registerId).in('control_id', failedControlIds)
      if (!appliedControls || appliedControls.length !== failedControlIds.length) return lossEventError('Kontrol gagal harus berasal dari kontrol yang digunakan pada Risk Register tersebut.')
    }
  }
  const explicitReportId = text(formData, 'report_id')
  let explicitReport: Record<string, unknown> | null = null
  if (isUuid(explicitReportId)) {
    const { data: report } = await admin.from('ppg_reports').select('id,unit_kerja_id,unit_nama,tanggal_penerimaan,objek,nilai_penetapan,label_skenario,kategori_objek,kegiatan,dugaan_momen').eq('id', explicitReportId).single()
    const sameUnit = report && (report.unit_kerja_id === unit.id || (!report.unit_kerja_id && normalizeLabel(report.unit_nama) === normalizeLabel(unit.nama_unit)))
    if (!sameUnit) return lossEventError('Laporan gratifikasi yang dipilih tidak berasal dari Satker pelapor.')
    explicitReport = report as Record<string, unknown>
  }
  if (requestedStatus === 'diajukan' && source === 'laporan_gratifikasi' && !explicitReport) return lossEventError('Pilih laporan gratifikasi terkait sebelum mengajukan loss event. Untuk penyimpanan draf, hubungan laporan boleh dilengkapi kemudian.')
  const impactArea = text(formData, 'jenis_dampak')
  const impactLevel = integer(formData, 'level_dampak', 1)
  const impactDescription = text(formData, 'uraian_dampak')
  if (!isAllowedString(PPG_IMPACT_AREAS, impactArea) || impactLevel < 1 || impactLevel > 5 || !impactDescription) return lossEventError('Pilih jenis dan level dampak resmi, lalu isi uraian dampak aktual.')
  const eventId = randomUUID()
  let evidencePath: string | null = null
  const evidence = formData.get('bukti')
  if (evidence instanceof File && evidence.size > 0) {
    const allowedTypes: Record<string, string> = { 'application/pdf': 'pdf', 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    const extension = allowedTypes[evidence.type]
    if (!extension || evidence.size > 10 * 1024 * 1024) return lossEventError('Bukti harus berupa PDF/JPG/PNG/WebP dengan ukuran maksimal 10 MB.')
    evidencePath = `${unit.id}/${eventId}/${randomUUID()}.${extension}`
    const upload = await admin.storage.from('ppg-led-bukti').upload(evidencePath, evidence, { contentType: evidence.type, upsert: false })
    if (upload.error) return lossEventError(`Bukti gagal diunggah: ${upload.error.message}`)
  }
  const { data: limit, error: limitError } = await admin.from('ppg_led_limit_versions').select('*').eq('tahun', Number(eventDate.slice(0, 4))).eq('status', 'aktif').maybeSingle()
  if (limitError) { if (evidencePath) await admin.storage.from('ppg-led-bukti').remove([evidencePath]); return lossEventError(`Konfigurasi limit gagal dibaca: ${limitError.message}`) }
  const classification = limit ? (impactLevel >= Number(limit.level_dampak_upper) ? 'upper_limit' : 'under_limit') : 'belum_dinilai'
  const payload = {
    id: eventId, unit_kerja_id: unit.id, unit_nama: unit.nama_unit,
    nama_peristiwa: name, tanggal_kejadian: eventDate, tanggal_diketahui: text(formData, 'tanggal_diketahui') || null,
    tanggal_dilaporkan: new Date().toISOString().slice(0, 10), sumber_informasi: source,
    lokasi: text(formData, 'lokasi'), kategori_risiko: genericRisk.kategori, proses_bisnis: text(formData, 'proses_bisnis'), kronologi: chronology,
    register_id: isUuid(registerId) ? registerId : null, risk_library_id: riskLibraryId,
    metode_rca: text(formData, 'metode_rca'), akar_masalah: text(formData, 'akar_masalah'), kegagalan_kontrol: text(formData, 'kegagalan_kontrol'),
    jenis_dampak: impactArea, level_dampak: impactLevel, uraian_dampak: impactDescription,
    limit_version_id: limit?.id ?? null, klasifikasi_limit: classification, lesson_learned: text(formData, 'lesson_learned'), bukti_path: evidencePath,
    status: requestedStatus, created_by: access.user.id, submitted_at: requestedStatus === 'diajukan' ? new Date().toISOString() : null,
  }
  const inserted = await admin.from('ppg_loss_events').insert(payload)
  if (inserted.error) { if (evidencePath) await admin.storage.from('ppg-led-bukti').remove([evidencePath]); return lossEventError(`Loss event gagal disimpan: ${inserted.error.message}`) }
  if (failedControlIds.length) {
    const failedControlInsert = await admin.from('ppg_loss_event_controls').insert(failedControlIds.map((control_id) => ({ loss_event_id: eventId, control_id, created_by: access.user.id })))
    if (failedControlInsert.error) {
      await admin.from('ppg_loss_events').delete().eq('id', eventId)
      if (evidencePath) await admin.storage.from('ppg-led-bukti').remove([evidencePath])
      return lossEventError(`Referensi kontrol gagal disimpan: ${failedControlInsert.error.message}`)
    }
  }
  const { data: reports } = await admin.from('ppg_reports').select('id,unit_kerja_id,unit_nama,tanggal_penerimaan,objek,nilai_penetapan,label_skenario,kategori_objek,kegiatan,dugaan_momen').order('tanggal_penerimaan', { ascending: false }).limit(3000)
  const reportRows = (reports ?? []) as Record<string, unknown>[]
  if (explicitReport && !reportRows.some((report) => report.id === explicitReport?.id)) reportRows.push(explicitReport)
  const eligibleReports = reportRows.filter((report) => report.unit_kerja_id === unit.id || (!report.unit_kerja_id && normalizeLabel(report.unit_nama) === normalizeLabel(unit.nama_unit)))
  const candidates = matchLossEventReports(payload, eligibleReports)
  const links: Record<string, unknown>[] = []
  if (explicitReport) links.push({ loss_event_id: eventId, report_id: explicitReportId, link_type: 'dilaporkan_satker', created_by: access.user.id })
  candidates.filter((candidate) => candidate.reportId !== explicitReportId).forEach((candidate) => links.push({ loss_event_id: eventId, report_id: candidate.reportId, link_type: 'kandidat_mesin', match_score: candidate.score, match_reasons: candidate.reasons, created_by: access.user.id }))
  if (links.length) await admin.from('ppg_loss_event_report_links').insert(links)
  revalidatePath('/dashboard/ppg/loss-event')
  revalidatePath('/dashboard/ppg/analitik')
  return { status: 'success', message: requestedStatus === 'draft' ? 'Draf loss event berhasil disimpan dan sudah muncul pada daftar di bawah.' : 'Loss event berhasil diajukan ke UPG Pusat.' }
}

export async function validatePpgLossEvent(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const id = text(formData, 'loss_event_id'); const decision = text(formData, 'decision')
  const riskLibraryId = text(formData, 'risk_library_id')
  if (!isUuid(id) || !isUuid(riskLibraryId) || !['tervalidasi','perlu_perbaikan','tindak_lanjut','ditutup'].includes(decision)) return
  const { data: risk } = await supabase.from('ppg_risk_library').select('id,kategori').eq('id', riskLibraryId).eq('status', 'aktif').single()
  if (!risk) return
  const { data: event } = await supabase.from('ppg_loss_events').select('tanggal_kejadian,level_dampak,risk_library_id,register_id').eq('id', id).single()
  if (!event) return
  const { data: limit } = await supabase.from('ppg_led_limit_versions').select('*').eq('tahun', Number(String(event.tanggal_kejadian).slice(0, 4))).eq('status', 'aktif').maybeSingle()
  const classification = limit ? (Number(event.level_dampak) >= Number(limit.level_dampak_upper) ? 'upper_limit' : 'under_limit') : 'belum_dinilai'
  const riskChanged = Boolean(event.risk_library_id && event.risk_library_id !== risk.id)
  const { error } = await supabase.from('ppg_loss_events').update({ risk_library_id: risk.id, register_id: riskChanged ? null : event.register_id, kategori_risiko: risk.kategori, status: decision, klasifikasi_limit: classification, limit_version_id: limit?.id ?? null, catatan_validasi: text(formData, 'catatan_validasi'), validated_by: user.id, validated_at: decision === 'tervalidasi' || decision === 'tindak_lanjut' || decision === 'ditutup' ? new Date().toISOString() : null, closed_at: decision === 'ditutup' ? new Date().toISOString() : null, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return
  if (riskChanged) await supabase.from('ppg_loss_event_controls').delete().eq('loss_event_id', id)
  revalidatePath('/dashboard/ppg/loss-event')
  revalidatePath('/dashboard/ppg/analitik')
}

export async function reviewPpgLossEventLink(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const eventId = text(formData, 'loss_event_id'); const reportId = text(formData, 'report_id'); const decision = text(formData, 'decision')
  if (!isUuid(eventId) || !isUuid(reportId) || !['terkonfirmasi','ditolak'].includes(decision)) return
  await supabase.from('ppg_loss_event_report_links').update({ link_type: decision, reviewed_by: user.id, reviewed_at: new Date().toISOString() }).eq('loss_event_id', eventId).eq('report_id', reportId)
  revalidatePath('/dashboard/ppg/loss-event')
  revalidatePath('/dashboard/ppg/analitik')
}

export async function importPpgWorkbook(formData: FormData) {
  const { supabase, user } = await requirePpgAdmin()
  const file = formData.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx')) return
  if (file.size > 10 * 1024 * 1024) return
  const bytes = await file.arrayBuffer()
  const fileHash = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
  let parsed
  try { parsed = parsePpgWorkbook(bytes) } catch { return }
  const { data: batch, error: batchError } = await supabase.from('ppg_import_batches').insert({ nama_file: file.name, file_hash: fileHash, source_sheet: parsed.sheetName, status: 'diproses', total_baris: parsed.totalRows, catatan: `Format ${parsed.format}; header baris ${parsed.headerRow}`, created_by: user.id }).select('id').single()
  if (batchError || !batch) return
  const sanitized = parsed.rows.map((row) => ({ ...row, import_batch_id: batch.id }))
  let accepted = 0
  for (let start = 0; start < sanitized.length; start += 250) {
    const chunk = sanitized.slice(start, start + 250)
    const { error } = await supabase.from('ppg_reports').insert(chunk)
    if (!error) accepted += chunk.length
  }
  await supabase.from('ppg_import_batches').update({ status: accepted === parsed.totalRows ? 'selesai' : 'selesai_dengan_error', baris_diterima: accepted, baris_ditolak: parsed.totalRows - accepted, completed_at: new Date().toISOString() }).eq('id', batch.id)
  revalidatePath('/dashboard/ppg')
  revalidatePath('/dashboard/ppg/analitik')
  revalidatePath('/dashboard/ppg/referensi')
}

export async function deletePpgImport(formData: FormData) {
  const { supabase } = await requirePpgAdmin()
  const batchId = text(formData, 'batch_id')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(batchId)) return

  // ppg_reports memakai ON DELETE CASCADE sehingga batch dan seluruh laporan
  // sumbernya dihapus dalam satu operasi database.
  const { error } = await supabase.from('ppg_import_batches').delete().eq('id', batchId)
  if (error) return

  revalidatePath('/dashboard/ppg')
  revalidatePath('/dashboard/ppg/analitik')
  revalidatePath('/dashboard/ppg/referensi')
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function uniqueUuids(values: FormDataEntryValue[]) {
  return [...new Set(values.map(String).filter(isUuid))]
}

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:' } catch { return false }
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
}

function lossEventError(message: string): PpgLossEventActionState {
  return { status: 'error', message }
}

function normalizeLabel(value: unknown) {
  return String(value ?? '').toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, ' ').trim()
}

function programApprovalError(message: string): PpgProgramApprovalState {
  return { status: 'error', message }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function relation(value: unknown): Record<string, unknown> {
  return Array.isArray(value) ? record(value[0]) : record(value)
}
