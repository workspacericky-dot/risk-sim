'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requirePpgAccess } from '@/lib/ppg/access'
import { createPpgAdminClient } from '@/lib/ppg/scenario'
import { PPG_ASSESSMENT_PERIODS, PPG_RISK_CATEGORIES, PPG_RISK_CATEGORY_CODES, PPG_RISK_CLASSIFICATIONS, PPG_CAUSE_FACTORS, isValidPpgBusinessProcess } from '@/lib/ppg/references'
import { normalizeRiskText, parsePpgRiskRegisterWorkbook, riskSimilarity, type PpgRiskRegisterImportRow } from '@/lib/ppg/risk-register-workbook'
import { ppgAssessment } from '@/lib/ppg/scoring'
import type { RiskImportActionState } from './risk-import-state'

type ComparableRisk = Pick<PpgRiskRegisterImportRow, 'klasifikasi_risiko' | 'faktor_penyebab' | 'peristiwa' | 'penyebab' | 'dampak'>

export async function importPpgRiskRegister(_previous: RiskImportActionState, formData: FormData): Promise<RiskImportActionState> {
  const access = await requirePpgAccess()
  const mode = String(formData.get('mode') || 'bootstrap_library')
  if (!['bootstrap_library', 'operasional_assessment'].includes(mode)) return failure('Mode impor tidak valid.')
  if (mode === 'bootstrap_library' && !access.isPusat) return failure('Mode penyusunan Risk Library hanya tersedia bagi UPG Pusat dan Admin Sistem.')
  if (mode === 'operasional_assessment' && !access.isSatker && !access.isAdmin) return failure('Mode penilaian operasional hanya tersedia bagi UPG Satker dan Admin Sistem.')

  const file = formData.get('file')
  if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx')) return failure('Pilih berkas .xlsx dengan sheet Risk Register 2026.')
  if (file.size > 10 * 1024 * 1024) return failure('Ukuran berkas maksimum 10 MB.')

  const bytes = await file.arrayBuffer()
  let parsed
  try { parsed = parsePpgRiskRegisterWorkbook(bytes) } catch (error) {
    return failure(error instanceof Error ? error.message : 'Workbook tidak dapat dibaca.')
  }

  const admin = createPpgAdminClient(access.scenarioId)
  const fileHash = createHash('sha256').update(new Uint8Array(bytes)).digest('hex')
  const existingBatch = await admin.from('ppg_risk_import_batches').select('id').eq('file_hash', fileHash).eq('source_sheet', parsed.sheetName).eq('mode', mode).maybeSingle()
  if (existingBatch.data) return failure('Berkas yang sama sudah pernah diimpor pada mode ini.')

  const { data: batch, error: batchError } = await admin.from('ppg_risk_import_batches').insert({
    nama_file: file.name, file_hash: fileHash, source_sheet: parsed.sheetName, mode,
    tahun: parsed.tahun, periode: parsed.periode, status: 'diproses', total_baris: parsed.rows.length,
    created_by: access.user.id,
  }).select('id').single()
  if (batchError || !batch) return failure(`Batch impor gagal dibuat: ${batchError?.message || 'skema belum tersedia'}`)

  try {
    const [{ data: units }, { data: libraries }, { data: openCandidates }] = await Promise.all([
      admin.from('unit_kerja').select('id,nama_unit'),
      admin.from('ppg_risk_library').select('id,klasifikasi_risiko,faktor_penyebab,peristiwa,penyebab,dampak,status').neq('status', 'nonaktif'),
      admin.from('ppg_risk_candidates').select('id,klasifikasi_risiko,faktor_penyebab,peristiwa,penyebab,dampak,normalized_signature,status').in('status', ['usulan', 'review']),
    ])
    const unitMap = new Map((units ?? []).map((unit) => [normalizeRiskText(unit.nama_unit), String(unit.id)]))
    const candidates = [...(openCandidates ?? [])] as Array<Record<string, unknown>>
    let valid = 0
    let needsRepair = 0

    for (const source of parsed.rows) {
      const errors = [...source.validation_errors]
      const unitId = access.isSatker && access.unitId ? access.unitId : unitMap.get(normalizeRiskText(source.unit_nama_raw)) ?? null
      if (!unitId && !errors.includes('Unit kerja belum teridentifikasi')) errors.push('Nama unit kerja tidak cocok dengan master data')
      if (errors.length) needsRepair += 1; else valid += 1

      const bestLibrary = bestMatch(source, libraries ?? [])
      const libraryMatch = bestLibrary && bestLibrary.score >= 88 ? String(bestLibrary.item.id) : null
      const { data: inserted, error: rowError } = await admin.from('ppg_risk_import_rows').insert({
        batch_id: batch.id, source_row: source.source_row, unit_kerja_id: unitId, unit_nama_raw: source.unit_nama_raw,
        tahun: source.tahun, periode: source.periode, klasifikasi_risiko: source.klasifikasi_risiko,
        kategori: source.kategori, proses_bisnis: source.proses_bisnis, subproses_bisnis: source.subproses_bisnis,
        faktor_penyebab: source.faktor_penyebab, peristiwa: source.peristiwa, penyebab: source.penyebab, dampak: source.dampak,
        kemungkinan_inherent: source.kemungkinan_inherent, dampak_inherent: source.dampak_inherent,
        kemungkinan_residual: null, dampak_residual: null, kemungkinan_treated: null, dampak_treated: null,
        control_text: source.control_text, mitigation_text: source.mitigation_text,
        normalized_signature: source.normalized_signature, validation_errors: errors, raw_payload: source.raw_payload,
        match_status: libraryMatch ? 'cocok_library' : 'belum_diproses', matched_library_id: libraryMatch,
      }).select('id').single()
      if (rowError || !inserted) throw new Error(rowError?.message || `Baris ${source.source_row} gagal disimpan`)
      if (libraryMatch) continue

      const bestCandidate = bestMatch(source, candidates)
      let candidateId: string
      let similarity = bestCandidate?.score ?? 100
      if (bestCandidate && (bestCandidate.score >= 72 || String(bestCandidate.item.normalized_signature) === source.normalized_signature)) {
        candidateId = String(bestCandidate.item.id)
        await admin.from('ppg_risk_import_rows').update({ match_status: 'kandidat_tergabung' }).eq('id', inserted.id)
      } else {
        const { data: created, error } = await admin.from('ppg_risk_candidates').insert({
          klasifikasi_risiko: source.klasifikasi_risiko, kategori: '', proses_bisnis: '', subproses_bisnis: '',
          faktor_penyebab: source.faktor_penyebab, peristiwa: source.peristiwa, penyebab: source.penyebab,
          dampak: source.dampak, normalized_signature: source.normalized_signature, confidence: 100,
          status: 'usulan', created_by: access.user.id,
        }).select('*').single()
        if (error || !created) throw new Error(error?.message || 'Kandidat risiko gagal dibuat')
        candidateId = String(created.id); similarity = 100; candidates.push(created)
        await admin.from('ppg_risk_import_rows').update({ match_status: 'kandidat_baru' }).eq('id', inserted.id)
      }
      const { error: memberError } = await admin.from('ppg_risk_candidate_members').insert({ candidate_id: candidateId, import_row_id: inserted.id, similarity })
      if (memberError) throw new Error(memberError.message)
    }

    await admin.from('ppg_risk_import_batches').update({
      status: needsRepair ? 'selesai_dengan_error' : 'siap_dikurasi', baris_valid: valid,
      baris_perlu_perbaikan: needsRepair, completed_at: new Date().toISOString(),
      catatan: 'Residual risk dan treated risk tidak tersedia pada template dan sengaja dibiarkan kosong.',
    }).eq('id', batch.id)
    revalidatePpgImportPages()
    return { status: 'success', message: mode === 'bootstrap_library'
      ? `${parsed.rows.length} baris dibaca: ${valid} lengkap dan ${needsRepair} perlu dilengkapi. Kandidat tersedia pada antrean kurasi.`
      : `${parsed.rows.length} baris dibaca. Lengkapi generic risk dan residual risk pada draf hasil impor di bawah.` }
  } catch (error) {
    await admin.from('ppg_risk_import_batches').update({ status: 'gagal', catatan: error instanceof Error ? error.message : 'Proses impor gagal', completed_at: new Date().toISOString() }).eq('id', batch.id)
    return failure(error instanceof Error ? error.message : 'Proses impor gagal.')
  }
}

export async function reviewPpgRiskCandidate(_previous: RiskImportActionState, formData: FormData): Promise<RiskImportActionState> {
  const access = await requirePpgAccess()
  if (!access.isPusat) return failure('Kurasi hanya tersedia bagi UPG Pusat dan Admin Sistem.')
  const admin = createPpgAdminClient(access.scenarioId)
  const candidateId = String(formData.get('candidate_id') || '')
  const decision = String(formData.get('decision') || '')
  if (!isUuid(candidateId) || !['approve_new', 'merge_existing', 'reject'].includes(decision)) return failure('Keputusan kurasi tidak valid.')
  const { data: candidate } = await admin.from('ppg_risk_candidates').select('*').eq('id', candidateId).in('status', ['usulan', 'review']).single()
  if (!candidate) return failure('Kandidat sudah diproses atau tidak ditemukan.')

  if (decision === 'reject') {
    await admin.from('ppg_risk_candidates').update({ status: 'ditolak', catatan_keputusan: field(formData, 'catatan_keputusan'), reviewed_by: access.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', candidateId)
    revalidatePpgImportPages()
    return { status: 'success', message: 'Usulan ditolak; seluruh baris sumber tetap tersimpan.' }
  }

  let libraryId = field(formData, 'library_id')
  if (decision === 'merge_existing') {
    if (!isUuid(libraryId)) return failure('Pilih risiko library tujuan penggabungan.')
    const { data: library } = await admin.from('ppg_risk_library').select('id').eq('id', libraryId).neq('status', 'nonaktif').single()
    if (!library) return failure('Risiko library tujuan tidak tersedia.')
  } else {
    const kategori = field(formData, 'kategori'); const proses = field(formData, 'proses_bisnis'); const subproses = field(formData, 'subproses_bisnis')
    const klasifikasi = field(formData, 'klasifikasi_risiko'); const faktor = field(formData, 'faktor_penyebab'); const peristiwa = field(formData, 'peristiwa')
    if (!PPG_RISK_CATEGORIES.includes(kategori as never) || !isValidPpgBusinessProcess(proses, subproses) || !PPG_RISK_CLASSIFICATIONS.some((item) => item.label === klasifikasi) || !PPG_CAUSE_FACTORS.some((item) => item.label === faktor) || !peristiwa) {
      return failure('Lengkapi kategori, proses, klasifikasi, faktor penyebab, dan peristiwa sebelum menyetujui.')
    }
    const categoryCode = PPG_RISK_CATEGORY_CODES[kategori as keyof typeof PPG_RISK_CATEGORY_CODES]
    const { data: categoryRisks } = await admin.from('ppg_risk_library').select('kode').eq('kategori', kategori)
    const sequence = (categoryRisks ?? []).reduce((highest, row) => Math.max(highest, Number(String(row.kode).match(new RegExp(`^PPG\\.${categoryCode}\\.(\\d+)$`))?.[1] || 0)), 0) + 1
    const { data: created, error } = await admin.from('ppg_risk_library').insert({
      kode: `PPG.${categoryCode}.${sequence}`, kategori, proses_bisnis: proses, subproses_bisnis: subproses,
      klasifikasi_risiko: klasifikasi, faktor_penyebab: faktor, peristiwa,
      penyebab: field(formData, 'penyebab'), dampak: field(formData, 'dampak'), status: 'aktif', created_by: access.user.id,
    }).select('id').single()
    if (error || !created) return failure(error?.message || 'Risiko generik gagal dibuat.')
    libraryId = String(created.id)
  }

  const { data: members } = await admin.from('ppg_risk_candidate_members').select('import_row_id').eq('candidate_id', candidateId)
  const rowIds = (members ?? []).map((member) => member.import_row_id)
  if (rowIds.length) await admin.from('ppg_risk_import_rows').update({ matched_library_id: libraryId, match_status: 'cocok_library' }).in('id', rowIds)
  await admin.from('ppg_risk_candidates').update({ status: decision === 'merge_existing' ? 'digabung' : 'disetujui', library_id: libraryId, catatan_keputusan: field(formData, 'catatan_keputusan'), reviewed_by: access.user.id, reviewed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', candidateId)
  await admin.from('ppg_audit_log').insert({ actor_id: access.user.id, entity_type: 'ppg_risk_candidate', entity_id: candidateId, action: decision, changes: { library_id: libraryId } })
  revalidatePpgImportPages()
  return { status: 'success', message: decision === 'merge_existing' ? 'Usulan digabungkan ke risiko yang dipilih.' : 'Risiko generik disetujui dan diaktifkan dalam Risk Library.' }
}

export async function createPpgRegisterFromImport(_previous: RiskImportActionState, formData: FormData): Promise<RiskImportActionState> {
  const access = await requirePpgAccess()
  if (!access.isSatker && !access.isAdmin) return failure('Pembuatan penilaian tersedia bagi UPG Satker dan Admin Sistem.')
  const admin = createPpgAdminClient(access.scenarioId)
  const rowId = field(formData, 'import_row_id'); const libraryId = field(formData, 'risk_library_id')
  if (!isUuid(rowId) || !isUuid(libraryId)) return failure('Pilih risiko generik yang sudah aktif.')
  const { data: row } = await admin.from('ppg_risk_import_rows').select('*,batch:ppg_risk_import_batches(created_by,mode)').eq('id', rowId).is('created_register_id', null).single()
  if (!row) return failure('Baris staging tidak ditemukan atau sudah dibuat menjadi penilaian.')
  const batch = Array.isArray(row.batch) ? row.batch[0] : row.batch
  if (batch?.mode !== 'operasional_assessment' || (access.isSatker && batch?.created_by !== access.user.id)) return failure('Anda tidak berwenang memproses baris staging ini.')
  const unitId = access.isSatker ? access.unitId : String(row.unit_kerja_id || '')
  const tahun = Number(row.tahun); const periode = String(row.periode || '')
  if (!unitId || !isUuid(unitId) || !Number.isInteger(tahun) || !PPG_ASSESSMENT_PERIODS.includes(periode as never)) return failure('Unit, tahun, atau periode belum lengkap.')

  const kInherent = Number(formData.get('kemungkinan_inherent')); const dInherent = Number(formData.get('dampak_inherent'))
  const kResidual = Number(formData.get('kemungkinan_residual')); const dResidual = Number(formData.get('dampak_residual'))
  let inherent; let residual
  try { inherent = ppgAssessment(kInherent, dInherent); residual = ppgAssessment(kResidual, dResidual) } catch { return failure('Lengkapi nilai inherent dan residual pada skala 1–5.') }
  const [{ data: library }, { data: unit }] = await Promise.all([
    admin.from('ppg_risk_library').select('*').eq('id', libraryId).eq('status', 'aktif').single(),
    admin.from('unit_kerja').select('id,nama_unit').eq('id', unitId).single(),
  ])
  if (!library || !unit) return failure('Risiko generik atau unit kerja tidak tersedia.')
  const { data: register, error } = await admin.from('ppg_register').insert({
    risk_library_id: library.id, kode: library.kode, unit_kerja_id: unit.id, unit_nama: unit.nama_unit, tahun, periode,
    kategori: library.kategori, proses_bisnis: library.proses_bisnis, subproses_bisnis: library.subproses_bisnis,
    klasifikasi_risiko: library.klasifikasi_risiko, faktor_penyebab: library.faktor_penyebab,
    peristiwa: library.peristiwa, penyebab: library.penyebab, dampak: library.dampak,
    kemungkinan_inherent: kInherent, dampak_inherent: dInherent, skor_inherent: inherent.score, level_inherent: inherent.level,
    kemungkinan_existing: kResidual, dampak_existing: dResidual, skor_existing: residual.score, level_existing: residual.level,
    status: 'draft', source_sheet: 'Risk Register 2026', source_row: row.source_row, created_by: access.user.id,
  }).select('id').single()
  if (error || !register) return failure(error?.message || 'Draf penilaian gagal dibuat.')
  if (String(row.mitigation_text || '').trim()) await admin.from('ppg_mitigations').insert({ register_id: register.id, tindakan: String(row.mitigation_text), status: 'belum_dimulai', created_by: access.user.id })
  await admin.from('ppg_risk_import_rows').update({ created_register_id: register.id, matched_library_id: library.id, match_status: 'register_dibuat' }).eq('id', rowId)
  revalidatePpgImportPages()
  return { status: 'success', message: 'Draf Penilaian Risiko berhasil dibuat. Treated risk tetap kosong sampai Program PPG dilaksanakan.' }
}

export async function deletePpgRiskImport(_previous: RiskImportActionState, formData: FormData): Promise<RiskImportActionState> {
  const access = await requirePpgAccess()
  if (!access.isPusat) return failure('Penghapusan riwayat impor hanya tersedia bagi UPG Pusat dan Admin Sistem.')

  const batchId = field(formData, 'batch_id')
  if (!isUuid(batchId)) return failure('Riwayat impor tidak valid.')

  const admin = createPpgAdminClient(access.scenarioId)
  const { data: batch, error: batchError } = await admin
    .from('ppg_risk_import_batches')
    .select('id,nama_file,mode,total_baris')
    .eq('id', batchId)
    .single()
  if (batchError || !batch) return failure('Riwayat impor tidak ditemukan atau sudah dihapus.')

  const { data: rows, error: rowsError } = await admin.from('ppg_risk_import_rows').select('id').eq('batch_id', batchId)
  if (rowsError) return failure(`Baris sumber gagal diperiksa: ${rowsError.message}`)

  const rowIds = (rows ?? []).map((row) => String(row.id))
  const candidateIds = new Set<string>()
  for (const ids of chunks(rowIds, 250)) {
    const { data: members, error } = await admin.from('ppg_risk_candidate_members').select('candidate_id').in('import_row_id', ids)
    if (error) return failure(`Relasi kandidat gagal diperiksa: ${error.message}`)
    for (const member of members ?? []) candidateIds.add(String(member.candidate_id))
  }

  const rowIdSet = new Set(rowIds)
  const candidatesWithOtherSources = new Set<string>()
  const candidateIdList = [...candidateIds]
  for (const ids of chunks(candidateIdList, 250)) {
    const { data: relatedMembers, error } = await admin
      .from('ppg_risk_candidate_members')
      .select('candidate_id,import_row_id')
      .in('candidate_id', ids)
    if (error) return failure(`Keanggotaan kandidat gagal diperiksa: ${error.message}`)
    for (const member of relatedMembers ?? []) {
      if (!rowIdSet.has(String(member.import_row_id))) candidatesWithOtherSources.add(String(member.candidate_id))
    }
  }
  const orphanCandidateIds = candidateIdList.filter((id) => !candidatesWithOtherSources.has(id))

  const { error: deleteError } = await admin.from('ppg_risk_import_batches').delete().eq('id', batchId)
  if (deleteError) return failure(`Riwayat impor gagal dihapus: ${deleteError.message}`)

  await admin.from('ppg_audit_log').insert({
    actor_id: access.user.id,
    entity_type: 'ppg_risk_import_batch',
    entity_id: batchId,
    action: 'delete',
    changes: { nama_file: batch.nama_file, mode: batch.mode, total_baris: batch.total_baris },
  })

  for (const ids of chunks(orphanCandidateIds, 250)) {
    const { error } = await admin.from('ppg_risk_candidates').delete().in('id', ids).in('status', ['usulan', 'review'])
    if (error) {
      revalidatePpgImportPages()
      return failure(`Riwayat terhapus, tetapi kandidat tanpa sumber gagal dibersihkan: ${error.message}`)
    }
  }

  revalidatePpgImportPages()
  return { status: 'success', message: 'Riwayat impor berhasil dihapus.' }
}

function bestMatch(source: ComparableRisk, items: Array<Record<string, unknown>>) {
  return items.reduce<{ item: Record<string, unknown>; score: number } | null>((best, item) => {
    const score = riskSimilarity(source, {
      klasifikasi_risiko: String(item.klasifikasi_risiko || ''), faktor_penyebab: String(item.faktor_penyebab || ''),
      peristiwa: String(item.peristiwa || ''), penyebab: String(item.penyebab || ''), dampak: String(item.dampak || ''),
    })
    return !best || score > best.score ? { item, score } : best
  }, null)
}

function field(formData: FormData, name: string) { return String(formData.get(name) || '').trim() }
function failure(message: string): RiskImportActionState { return { status: 'error', message } }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function chunks<T>(values: T[], size: number) {
  const result: T[][] = []
  for (let start = 0; start < values.length; start += size) result.push(values.slice(start, start + size))
  return result
}
function revalidatePpgImportPages() {
  revalidatePath('/dashboard/ppg/pustaka'); revalidatePath('/dashboard/ppg/penilaian'); revalidatePath('/dashboard/ppg/referensi')
}
