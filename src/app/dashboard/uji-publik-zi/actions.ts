'use server'

import { createHash } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { analyzeZiResponse, calculateZiCri, DEFAULT_CRI_WEIGHTS, DEFAULT_HIGH_RISK_TAGS } from '@/lib/uji-publik-zi/analytics'
import { normalizeZiText, parseZiWorkbook } from '@/lib/uji-publik-zi/workbook'
import type { ZiImportState } from './import-state'

export async function importZiWorkbook(_previous: ZiImportState, formData: FormData): Promise<ZiImportState> {
  const access = await requireZiAccess()
  const file = formData.get('file')
  if (!(file instanceof File) || !file.name.toLocaleLowerCase('id-ID').endsWith('.xlsx')) return failure('Pilih file Excel berekstensi .xlsx.')
  if (file.size > 10 * 1024 * 1024) return failure('Ukuran file maksimum 10 MB.')
  const bytes = await file.arrayBuffer()
  let parsed
  try { parsed = parseZiWorkbook(bytes) } catch (error) { return failure(error instanceof Error ? error.message : 'Workbook tidak dapat dibaca.') }

  const fileHash = hashBytes(new Uint8Array(bytes))
  const existing = await access.supabase.from('zi_import_batches').select('id').eq('file_hash', fileHash).maybeSingle()
  if (existing.data) return failure('File yang sama sudah pernah diimpor.')
  const invalidRows = parsed.rows.filter((row) => row.errors.length)
  const validRows = parsed.rows.filter((row) => !row.errors.length && row.ratingBintang)

  const { data: batch, error: batchError } = await access.supabase.from('zi_import_batches').insert({
    nama_file: file.name, file_hash: fileHash, source_sheet: parsed.sheetName, status: 'diproses', total_baris: parsed.rows.length,
    baris_valid: validRows.length, baris_perlu_perbaikan: invalidRows.length, imported_by: access.user.id,
    catatan: invalidRows.length ? summarizeInvalidRows(invalidRows) : null,
  }).select('id').single()
  if (batchError || !batch) return failure(`Impor belum dapat dimulai: ${batchError?.message || 'database belum siap'}`)

  try {
    const { data: units, error: unitError } = await access.supabase.from('unit_kerja').select('id,nama_unit')
    if (unitError) throw new Error(unitError.message)
    const unitMap = new Map((units ?? []).map((unit) => [normalizeZiText(unit.nama_unit), String(unit.id)]))
    let insertedCount = 0
    let duplicateCount = 0
    const metrics = new Map<string, Array<{ starRating: number; sentimentScore: number | null; highRiskTags: string[] }>>()

    for (const chunk of chunks(validRows, 150)) {
      const payload = chunk.map((row) => ({
        batch_id: batch.id, source_row: row.sourceRow, respondent_name: row.nama, respondent_hash: hashText(normalizeZiText(row.nama)),
        age_group: row.usia, gender: row.kelamin, occupation: row.pekerjaan,
        unit_kerja_id: unitMap.get(normalizeZiText(row.unitKerja)) ?? null, unit_nama_raw: row.unitKerja,
        source_tags: row.sourceTags, opinion: row.pendapat, star_rating: row.ratingBintang,
        dedupe_hash: hashText([normalizeZiText(row.nama), normalizeZiText(row.unitKerja), normalizeZiText(row.pendapat), row.ratingBintang].join('|')),
        validation_warnings: unitMap.has(normalizeZiText(row.unitKerja)) ? [] : ['Nama unit kerja belum cocok dengan master data'],
      }))
      const { data: inserted, error } = await access.supabase
        .from('zi_responses')
        .upsert(payload, { onConflict: 'dedupe_hash', ignoreDuplicates: true })
        .select('id,unit_kerja_id,unit_nama_raw,source_tags,opinion,star_rating')
      if (error) throw new Error(error.message)
      const insertedRows = inserted ?? []
      insertedCount += insertedRows.length
      duplicateCount += payload.length - insertedRows.length
      if (!insertedRows.length) continue
      const analyses = insertedRows.map((row) => {
        const analysis = analyzeZiResponse({ id: row.id, unitId: row.unit_kerja_id, unitName: row.unit_nama_raw, sourceTags: row.source_tags ?? [], opinion: row.opinion, starRating: row.star_rating }, DEFAULT_HIGH_RISK_TAGS)
        if (row.unit_kerja_id) {
          const group = metrics.get(String(row.unit_kerja_id)) ?? []
          group.push({ starRating: row.star_rating, sentimentScore: analysis.sentimentScore, highRiskTags: analysis.highRiskTags })
          metrics.set(String(row.unit_kerja_id), group)
        }
        return { response_id: row.id, status: analysis.mismatch ? 'perlu_reviu' : 'selesai', sentiment_score: analysis.sentimentScore, sentiment_label: analysis.sentimentLabel, mismatch: analysis.mismatch, mismatch_reason: analysis.mismatchReason, ai_tags: analysis.aiTags, high_risk_tags: analysis.highRiskTags, confidence: analysis.confidence, model_name: analysis.modelName, model_version: '1', analyzed_at: new Date().toISOString() }
      })
      const analysisInsert = await access.supabase.from('zi_response_analysis').insert(analyses)
      if (analysisInsert.error) throw new Error(analysisInsert.error.message)
    }

    for (const [unitId, rows] of metrics) {
      const result = calculateZiCri(rows, DEFAULT_CRI_WEIGHTS)
      const { error } = await access.supabase.from('zi_unit_metrics').upsert({
        unit_kerja_id: unitId, batch_id: batch.id, sample_size: rows.length, average_rating: result.averageRating,
        low_rating_pct: result.lowRatingPct, high_risk_tag_pct: result.highRiskTagPct,
        negative_sentiment_intensity: result.negativeSentimentIntensity, cri_score: result.criScore, risk_level: result.riskLevel,
        cluster_label: result.riskLevel, breakdown: { weights: DEFAULT_CRI_WEIGHTS, baseline_model: 'rule-based-id-v1' },
      }, { onConflict: 'unit_kerja_id,batch_id' })
      if (error) throw new Error(error.message)
    }
    await access.supabase.from('zi_analysis_runs').insert({ batch_id: batch.id, status: 'menunggu', model_name: 'ollama/indobert', total_responses: insertedCount, created_by: access.user.id })
    await access.supabase.from('zi_import_batches').update({ status: 'menunggu_analisis', baris_valid: insertedCount, baris_perlu_perbaikan: invalidRows.length + duplicateCount, completed_at: new Date().toISOString(), catatan: [invalidRows.length ? summarizeInvalidRows(invalidRows) : '', duplicateCount ? `${duplicateCount} respons duplikat dilewati.` : ''].filter(Boolean).join(' ') || null }).eq('id', batch.id)
    await access.supabase.from('zi_audit_log').insert({ actor_id: access.user.id, action: 'import', entity_type: 'zi_import_batch', entity_id: batch.id, changes: { file_name: file.name, inserted: insertedCount, invalid: invalidRows.length, duplicates: duplicateCount } })
    revalidateZi()
    return { status: 'success', message: `${insertedCount} respons berhasil diimpor. ${invalidRows.length} baris tidak valid dan ${duplicateCount} duplikat dilewati. Analisis dasar sudah tersedia; worker NLP dapat memperkaya hasilnya.` }
  } catch (error) {
    await access.supabase.from('zi_import_batches').update({ status: 'gagal', catatan: error instanceof Error ? error.message : 'Kesalahan impor' }).eq('id', batch.id)
    return failure(error instanceof Error ? error.message : 'Impor gagal diproses.')
  }
}

export async function deleteZiImport(_previous: ZiImportState, formData: FormData): Promise<ZiImportState> {
  const access = await requireZiAccess()
  if (!access.isAdmin) return failure('Hanya admin yang dapat menghapus hasil impor.')

  const batchId = String(formData.get('batch_id') ?? '').trim()
  if (!isUuid(batchId)) return failure('ID riwayat impor tidak valid.')

  const { data: batch, error: batchError } = await access.supabase
    .from('zi_import_batches')
    .select('id,nama_file,total_baris,baris_valid,baris_perlu_perbaikan')
    .eq('id', batchId)
    .maybeSingle()
  if (batchError) return failure(`Riwayat impor gagal diperiksa: ${batchError.message}`)
  if (!batch) return failure('Riwayat impor tidak ditemukan atau sudah dihapus.')

  const { data: runs, error: runsError } = await access.supabase
    .from('zi_analysis_runs')
    .select('id')
    .eq('batch_id', batchId)
  if (runsError) return failure(`Antrean analisis gagal diperiksa: ${runsError.message}`)

  // Respons, analisis respons, dan metrik unit memakai ON DELETE CASCADE.
  const { error: deleteError } = await access.supabase.from('zi_import_batches').delete().eq('id', batchId)
  if (deleteError) return failure(`Hasil impor gagal dihapus: ${deleteError.message}`)

  const runIds = (runs ?? []).map((run) => String(run.id))
  if (runIds.length) {
    const { error: runDeleteError } = await access.supabase.from('zi_analysis_runs').delete().in('id', runIds)
    if (runDeleteError) {
      revalidateZi()
      return failure(`Hasil impor sudah dihapus, tetapi riwayat proses analisis gagal dibersihkan: ${runDeleteError.message}`)
    }
  }

  await access.supabase.from('zi_audit_log').insert({
    actor_id: access.user.id,
    action: 'delete',
    entity_type: 'zi_import_batch',
    entity_id: batchId,
    changes: {
      nama_file: batch.nama_file,
      total_baris: batch.total_baris,
      baris_valid: batch.baris_valid,
      baris_perlu_perbaikan: batch.baris_perlu_perbaikan,
    },
  })

  revalidateZi()
  return { status: 'success', message: `Hasil impor "${batch.nama_file}" berhasil dihapus.` }
}

function hashBytes(bytes: Uint8Array) { return createHash('sha256').update(bytes).digest('hex') }
function hashText(value: string) { return createHash('sha256').update(value).digest('hex') }
function isUuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function chunks<T>(values: T[], size: number) { const output: T[][] = []; for (let index = 0; index < values.length; index += size) output.push(values.slice(index, index + size)); return output }
function summarizeInvalidRows(rows: Array<{ sourceRow: number; errors: string[] }>) { return `Baris perlu perbaikan: ${rows.slice(0, 12).map((row) => `${row.sourceRow} (${row.errors.join('; ')})`).join(', ')}${rows.length > 12 ? ', dan lainnya' : ''}.` }
function failure(message: string): ZiImportState { return { status: 'error', message } }
function revalidateZi() { revalidatePath('/dashboard/uji-publik-zi'); revalidatePath('/dashboard/uji-publik-zi/impor'); revalidatePath('/dashboard/uji-publik-zi/respon') }
