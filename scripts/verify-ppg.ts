import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as XLSX from 'xlsx'
import { parseMoney, parsePpgWorkbook } from '../src/lib/ppg/import-workbook.ts'
import { ppgAssessment, ppgRiskLevel, ppgScore } from '../src/lib/ppg/scoring.ts'
import { PPG_ASSESSMENT_PERIODS, PPG_BUSINESS_PROCESSES, PPG_CAUSE_FACTORS, PPG_IMPACT_AREAS, PPG_IMPACT_KNOWLEDGE_ID, PPG_IMPACT_LEVELS, PPG_IMPACT_OPTIONS, PPG_PROBABILITY_OPTIONS, PPG_RISK_CATEGORIES, PPG_RISK_CLASSIFICATIONS, isValidPpgBusinessProcess } from '../src/lib/ppg/references.ts'
import { analyzePpgReports } from '../src/lib/ppg/analytics.ts'
import { buildPpgAssistedInsights, calculateInsightA } from '../src/lib/ppg/insights.ts'
import { matchLossEventReports } from '../src/lib/ppg/led.ts'
import { parsePpgRiskRegisterWorkbook, riskSimilarity } from '../src/lib/ppg/risk-register-workbook.ts'
import { calculatePpgControlEffectiveness, normalizePpgControlText } from '../src/lib/ppg/control-effectiveness.ts'
import { evaluatePpgAppetite } from '../src/lib/ppg/risk-appetite.ts'
import { buildPpgAiAggregateInput, parsePpgAiJsonText, parsePpgAiRecommendations } from '../src/lib/ppg/ai-recommendations.ts'
import { eligiblePpgProgramItemsForPlanning, isPpgProgramEligibleForTreatedRisk } from '../src/lib/ppg/program-eligibility.ts'

assert.equal(ppgRiskLevel(5), 'Sangat Rendah')
assert.equal(ppgRiskLevel(6), 'Rendah')
assert.equal(ppgRiskLevel(11), 'Rendah')
assert.equal(ppgRiskLevel(12), 'Sedang')
assert.equal(ppgRiskLevel(15), 'Sedang')
assert.equal(ppgRiskLevel(16), 'Tinggi')
assert.equal(ppgRiskLevel(19), 'Tinggi')
assert.equal(ppgRiskLevel(20), 'Sangat Tinggi')
assert.equal(ppgScore(5, 5), 25)
assert.deepEqual(ppgAssessment(3, 4), { score: 12, level: 'Sedang' })
assert.throws(() => ppgScore(0, 5), RangeError)
assert.equal(PPG_RISK_CLASSIFICATIONS.length, 6)
assert.equal(PPG_RISK_CATEGORIES.length, 7)
assert.equal(PPG_BUSINESS_PROCESSES.length, 7)
assert.equal(PPG_CAUSE_FACTORS.length, 5)
assert.deepEqual(PPG_PROBABILITY_OPTIONS.map((item) => item.value), [1, 2, 3, 4, 5])
assert.deepEqual(PPG_IMPACT_OPTIONS.map((item) => item.value), [1, 2, 3, 4, 5])
assert.equal(PPG_IMPACT_AREAS.length, 6)
assert.deepEqual(PPG_IMPACT_LEVELS.map((item) => item.value), [1, 2, 3, 4, 5])
assert.equal(PPG_IMPACT_KNOWLEDGE_ID, '47500000-0000-4000-8000-000000000001')
assert.equal(PPG_ASSESSMENT_PERIODS.length, 19)
assert.ok(PPG_ASSESSMENT_PERIODS.includes('Tahunan'))
assert.ok(PPG_ASSESSMENT_PERIODS.includes('Triwulan IV'))
assert.ok(PPG_ASSESSMENT_PERIODS.includes('Bulanan - Desember'))
assert.equal([5, 4, 3, 2, 1].flatMap((k) => [1, 2, 3, 4, 5].map((d) => ppgScore(k, d))).length, 25)
assert.equal(isValidPpgBusinessProcess('Manajemen Peradilan', ''), true)
assert.equal(isValidPpgBusinessProcess('Manajemen Peradilan', 'Tidak boleh'), false)
assert.equal(isValidPpgBusinessProcess('Administrasi Umum', 'SDM'), true)
assert.equal(isValidPpgBusinessProcess('Administrasi Umum', 'Subproses tambahan'), true)
assert.equal(normalizePpgControlText('  Verifikasi   Berjenjang '), 'verifikasi berjenjang')
assert.deepEqual(
  calculatePpgControlEffectiveness(
    [
      { efektivitas: 'efektif', registerId: 'register-a' },
      { efektivitas: 'sebagian', registerId: 'register-b' },
      { efektivitas: 'belum_dinilai', registerId: 'register-c' },
    ],
    new Map([['register-a', 1], ['register-b', 2]]),
  ),
  { efektif: 1, sebagian: 1, tidakEfektif: 0, belumDinilai: 1, totalRated: 2, totalFailures: 3, baseScore: 75, cei: 60 },
)
assert.equal(calculatePpgControlEffectiveness([{ efektivitas: 'belum_dinilai', registerId: 'register-a' }], new Map()).cei, null)
assert.equal(parseMoney('50,000'), 50000)
assert.equal(parseMoney('Rp1.500.000,00'), 1500000)
assert.deepEqual(evaluatePpgAppetite(12, 'Risiko Kecurangan', { kecurangan: 4 }), { status: 'di_atas_selera', threshold: 4, residualScore: 12 })
assert.deepEqual(evaluatePpgAppetite(4, 'Risiko Kecurangan', { kecurangan: 4 }), { status: 'dalam_selera', threshold: 4, residualScore: 4 })
assert.equal(evaluatePpgAppetite(12, 'Risiko Kecurangan', null).status, 'belum_ditetapkan')

const rekapitulasi = parsePpgWorkbook(fs.readFileSync('ref/PPG/Rekapitulasi_contoh.xlsx'))
assert.equal(rekapitulasi.format, 'rekapitulasi_kpk')
assert.equal(rekapitulasi.sheetName, 'Worksheet')
assert.equal(rekapitulasi.headerRow, 4)
assert.equal(rekapitulasi.totalRows, 1)
assert.equal(rekapitulasi.rows.length, 1)
assert.equal(rekapitulasi.rows[0].source_row, 5)
assert.equal(rekapitulasi.rows[0].nilai_penetapan, 50000)
assert.equal(rekapitulasi.rows[0].tanggal_penerimaan, '2026-07-30')
assert.equal(rekapitulasi.rows[0].tanggal_pelaporan, '2026-07-31')
assert.equal('nama' in rekapitulasi.rows[0], false)
assert.equal('nik' in rekapitulasi.rows[0], false)
assert.equal('nama_pemberi' in rekapitulasi.rows[0], false)

const worksheetGol = parsePpgWorkbook(fs.readFileSync('ref/PPG/Template_RiskLibrary_Sektor_Publik_Redesign_.xlsx'))
assert.equal(worksheetGol.format, 'worksheet_gol')
assert.equal(worksheetGol.sheetName, 'Worksheet (GOL)')
assert.equal(worksheetGol.headerRow, 1)
assert.equal(worksheetGol.rows.length, 1079)
assert.equal(worksheetGol.rows[1].nilai_penetapan, 245000)

const riskRegister = parsePpgRiskRegisterWorkbook(fs.readFileSync('ref/PPG/Template_RiskLibrary_Sektor_Publik_Redesign_.xlsx'))
assert.equal(riskRegister.format, 'risk_register_2026')
assert.equal(riskRegister.sheetName, 'Risk Register 2026')
assert.equal(riskRegister.tahun, 2026)
assert.equal(riskRegister.periode, 'Triwulan III')
assert.ok(riskRegister.rows.length >= 29)
assert.equal(riskRegister.rows[0].unit_nama_raw, 'Pengadilan Negeri Palembang')
assert.equal(riskRegister.rows[0].kemungkinan_inherent, 1)
assert.equal(riskRegister.rows[0].dampak_inherent, 2)
assert.equal(riskRegister.rows[0].kemungkinan_residual, null)
assert.equal(riskRegister.rows[0].kemungkinan_treated, null)
assert.equal(riskRegister.rows[2].unit_nama_raw, 'Pengadilan Negeri Palembang')
assert.ok(riskSimilarity(riskRegister.rows[0], riskRegister.rows[0]) >= 99)

const blankTemplate = XLSX.read(fs.readFileSync('public/templates/Template_Risk_Register_PPG_2026_Kosong.xlsx'), { cellFormula: true })
assert.deepEqual(blankTemplate.SheetNames, ['Risk Register 2026'])
const blankTemplateSheet = blankTemplate.Sheets['Risk Register 2026']
assert.equal(blankTemplateSheet.A1?.v, 'FORM RISK REGISTER 2026 — TEMPLATE KOSONG')
assert.equal(blankTemplateSheet.C4?.v, 'Potensi Terjadinya Gratifikasi')
assert.equal(blankTemplateSheet.E2?.v, 1)
assert.equal(blankTemplateSheet.G2?.v, 2026)
assert.equal(blankTemplateSheet.C6?.v, undefined)
assert.match(blankTemplateSheet.L6?.f ?? '', /^IF\(/)
const unexpectedTemplateData = Object.entries(blankTemplateSheet).filter(([address, cell]) => {
  if (address.startsWith('!')) return false
  const decoded = XLSX.utils.decode_cell(address)
  return decoded.r >= 5 && decoded.c !== 11 && cell?.v !== undefined && cell.v !== ''
})
assert.deepEqual(unexpectedTemplateData, [])

const analytics = analyzePpgReports([
  { nomor_laporan: 'A', tanggal_penerimaan: '2022-04-01', tanggal_pelaporan: '2022-04-10', jabatan_penerima: 'Hakim', objek: 'Uang tunai', nilai_penetapan: 100000, jenis_penerimaan: 'Ditolak' },
  { nomor_laporan: 'B', tanggal_penerimaan: '2025-12-20', tanggal_pelaporan: '2026-02-01', jabatan_penerima: 'Ketua', objek: 'Parsel hari raya', nilai_penetapan: 250000 },
  { nomor_laporan: 'C', tanggal_penerimaan: '2026-03-01', tanggal_pelaporan: '2026-03-03', jabatan_penerima: 'Hakim', objek: 'Uang tunai', nilai_penetapan: 500000 },
  { nomor_laporan: 'C', tanggal_penerimaan: '2026-03-01', tanggal_pelaporan: '2026-03-03', jabatan_penerima: 'Hakim', objek: 'Voucher', nilai_penetapan: 50000 },
  { nomor_laporan: 'D', tanggal_penerimaan: '2026-03-02', tanggal_pelaporan: '2026-03-03', jabatan_penerima: 'Hakim', objek: 'Uang tunai', nilai_penetapan: 25000 },
], 2026)
assert.equal(analytics.summary.uniqueReports, 2)
assert.equal(analytics.summary.itemCount, 3)
assert.deepEqual(analytics.coverage.baselineYears, [2022, 2025, 2026])
assert.equal(analytics.period.programLabel, 'Tahun 2027')
assert.equal(analytics.objects[0].label, 'Uang & Setara Uang')
assert.ok(analytics.recommendations.some((item) => item.actionCode === 'PPG-UANG-01'))
const insightA = calculateInsightA(analytics)
assert.equal(insightA.components.length, 5)
assert.equal(insightA.components.reduce((sum, item) => sum + item.weight, 0), 1)
assert.equal(insightA.score, Math.round(insightA.components.reduce((sum, item) => sum + item.contribution, 0) * 10) / 10)
assert.ok(insightA.score >= 0 && insightA.score <= 100)
const assisted = buildPpgAssistedInsights(analytics, [{ risk_library_id: 'risk-1', kode: 'PPG.3.1', kategori: 'Risiko Kecurangan', peristiwa: 'Penerimaan gratifikasi', eligible_satkers: 100, affected_satkers: 12, affected_pct: 12, high_impact_satkers: 4, high_impact_pct: 4, recurring_satkers: 3, recurring_pct: 3, control_failure_satkers: 5, control_failure_pct: 5, cluster_1_satkers: 5, cluster_2_satkers: 7, cluster_3_satkers: 88, appetite_set_satkers: 90, above_appetite_satkers: 14, above_appetite_pct: 14, upper_limit_satkers: 2, recommended_for_program: true, data_confidence: 'tinggi' }])
assert.equal(assisted.length, 1)
assert.equal(assisted[0].insight_a_method_version, 'exposure-components-v2')
assert.equal(assisted[0].insight_a_components.length, 5)
assert.equal(assisted[0].insight_b_score, 5.9)
assert.equal(assisted[0].suggested_outcome_b_baseline, 12)
assert.ok(assisted[0].insight_a_narrative.length > 0)
assert.ok(assisted[0].suggested_kri.length > 0)
const aiInput = buildPpgAiAggregateInput(analytics, assisted, [{ kode: 'PPG-UANG-01', nama: 'Simulasi penolakan', uraian: 'Latihan langsung', risk_categories: ['Risiko Kecurangan'] }])
assert.equal(aiInput.privacy_notice.includes('tidak memuat nama'), true)
assert.equal('rows' in aiInput, false)
assert.equal(JSON.stringify(aiInput).includes('Pengadilan Negeri Contoh'), false)
const parsedAi = parsePpgAiRecommendations({ recommendations: [1, 2, 3].map((index) => ({
  key: `rec-${index}`, title: `Program ${index}`, finding: 'Paparan dan realisasi membutuhkan intervensi.', evidence: ['12% Satker terdampak', '14% Satker di atas selera'], reasoning_summary: 'Intervensi spesifik lebih relevan daripada himbauan umum.', timing: 'Empat minggu sebelum periode puncak', target_roles: ['Petugas PTSP'], concrete_actions: ['Simulasi penolakan', 'Uji kepatuhan'], linked_risk_id: 'risk-1', linked_risk_code: 'PPG.3.1', existing_action_code: index === 1 ? 'PPG-UANG-01' : '', proposed_action: index === 1 ? null : { name: `Tindakan ${index}`, description: 'Tindakan baru berbasis pola agregat.', control_type: 'preventif', risk_categories: ['Risiko Kecurangan'], target_default: 'Petugas layanan', lead_time_days: 30, output_indicator: 'Cakupan simulasi', outcome_indicator: 'Penurunan paparan' }, limitations: ['Data agregat tidak membuktikan kausalitas.'], confidence: 'sedang',
})) }, assisted, ['PPG-UANG-01'])
assert.equal(parsedAi.length, 3)
assert.equal(parsedAi[0].existing_action_code, 'PPG-UANG-01')
assert.equal(parsedAi[1].proposed_action?.name, 'Tindakan 2')
assert.deepEqual(parsePpgAiJsonText('```json\n{"recommendations":[]}\n```'), { recommendations: [] })
assert.deepEqual(parsePpgAiJsonText('Berikut hasilnya: {"recommendations":[]} selesai.'), { recommendations: [] })
assert.throws(() => parsePpgAiJsonText('{"recommendations":['), SyntaxError)

const treatedRegister = { unit_kerja_id: 'unit-1', risk_library_id: 'risk-1' }
const assignedCompletedProgram = { status: 'selesai', ditetapkan_at: '2026-08-31T08:00:00Z', items: [{ risk_library_id: 'risk-1', status: 'selesai', clusters: [{ units: [{ unit_kerja_id: 'unit-1' }] }] }] }
assert.equal(isPpgProgramEligibleForTreatedRisk(assignedCompletedProgram, treatedRegister), true)
assert.equal(isPpgProgramEligibleForTreatedRisk({ ...assignedCompletedProgram, ditetapkan_at: null }, treatedRegister), false)
assert.equal(isPpgProgramEligibleForTreatedRisk({ ...assignedCompletedProgram, status: 'berjalan' }, treatedRegister), false)
assert.equal(isPpgProgramEligibleForTreatedRisk({ ...assignedCompletedProgram, items: [{ risk_library_id: 'risk-1', status: 'selesai', clusters: [{ units: [{ unit_kerja_id: 'unit-2' }] }] }] }, treatedRegister), false)
assert.equal(eligiblePpgProgramItemsForPlanning({ ...assignedCompletedProgram, status: 'ditetapkan', items: [{ id: 'item-1', risk_library_id: 'risk-1', status: 'belum_dimulai', clusters: [{ units: [{ unit_kerja_id: 'unit-1' }] }] }] }, treatedRegister).length, 1)
assert.equal(eligiblePpgProgramItemsForPlanning({ ...assignedCompletedProgram, status: 'dibatalkan' }, treatedRegister).length, 0)

const candidates = matchLossEventReports({
  unit_nama: 'Pengadilan Negeri Contoh',
  tanggal_kejadian: '2026-08-11',
  nama_peristiwa: 'Penerimaan parsel oleh petugas PTSP',
  kronologi: 'Parsel diberikan setelah pelayanan selesai',
  jenis_dampak: 'Penurunan Reputasi',
  level_dampak: 3,
  uraian_dampak: 'Keluhan dari pemangku kepentingan',
}, [
  { id: 'match', unit_nama: 'Pengadilan Negeri Contoh', tanggal_penerimaan: '2026-08-12', label_skenario: 'Pemberian parsel kepada petugas PTSP', objek: 'Parsel', nilai_penetapan: 500000 },
  { id: 'wrong-unit', unit_nama: 'Pengadilan Negeri Lain', tanggal_penerimaan: '2026-08-12', label_skenario: 'Pemberian parsel kepada petugas PTSP', objek: 'Parsel', nilai_penetapan: 500000 },
  { id: 'other', unit_nama: 'Pengadilan Tinggi Lain', tanggal_penerimaan: '2025-01-01', label_skenario: 'Pemberian uang kepada hakim', objek: 'Uang', nilai_penetapan: 5000000 },
])
assert.equal(candidates.length, 1)
assert.equal(candidates[0].reportId, 'match')
assert.ok(candidates[0].score >= 80)
assert.ok(candidates[0].reasons.includes('satker sama'))

const migration = fs.readFileSync('supabase/migration_ppg.sql', 'utf8')
const libraryDefinition = migration.slice(migration.indexOf('create table if not exists public.ppg_risk_library'), migration.indexOf('create table if not exists public.ppg_control_library'))
const registerDefinition = migration.slice(migration.indexOf('create table if not exists public.ppg_register'), migration.indexOf('create table if not exists public.ppg_risk_controls'))
assert.doesNotMatch(libraryDefinition, /unit_kerja_id|unit_nama/)
assert.match(registerDefinition, /unit_kerja_id uuid not null/)
assert.match(registerDefinition, /unit_nama text not null/)
assert.match(migration, /indikator_program text not null/)
assert.match(migration, /create table if not exists public\.ppg_loss_events/)
assert.match(migration, /create table if not exists public\.ppg_loss_event_report_links/)
assert.match(migration, /ppg-led-bukti/)
assert.match(migration, /upg_pusat/)
assert.match(migration, /upg_satker/)
assert.match(migration, /create policy "ppg register insert"/)
assert.match(migration, /drop policy if exists "ppg register select"/)
assert.match(migration, /drop policy if exists "ppg loss select"/)
assert.match(migration, /role in \('admin_sistem','upg_pusat'\)/)
assert.match(migration, /unit_kerja_id = public\.ppg_user_unit_id\(\)/)
assert.match(libraryDefinition, /alasan_nonaktif text not null/)
assert.match(libraryDefinition, /nonaktif_at timestamptz/)
assert.match(migration, /control_id uuid references public\.ppg_control_library/)
assert.match(migration, /ppg_control_library_jenis_check/)
assert.match(migration, /create table if not exists public\.ppg_library_risk_controls/)
assert.match(migration, /create table if not exists public\.ppg_program_item_controls/)
assert.match(migration, /create table if not exists public\.ppg_risk_control_validations/)
assert.match(migration, /bukti_efektivitas_url text not null/)
assert.match(migration, /create policy "ppg risk control insert"/)
assert.match(migration, /ppg_register_periode_check/)
assert.match(migration, /jenis_dampak text not null/)
assert.match(migration, /level_dampak smallint not null/)
assert.match(migration, /uraian_dampak text not null/)
assert.match(migration, /level_dampak_upper smallint not null/)
assert.match(migration, new RegExp(PPG_IMPACT_KNOWLEDGE_ID))
assert.match(migration, /create table if not exists public\.ppg_loss_event_code_counters/)
assert.match(migration, /create table if not exists public\.ppg_loss_event_controls/)
assert.match(migration, /treated_program_id uuid references public\.ppg_programs/)
assert.match(migration, /ppg_register_efektivitas_program_check/)
assert.match(migration, /bukti_efektivitas_program_url text not null/)
assert.match(migration, /create or replace function public\.ppg_assign_loss_event_code\(\)/)
assert.match(migration, /create trigger ppg_loss_event_code_trigger/)
assert.match(migration, /new\.kode := 'LED-' \|\| event_year::text/)
assert.match(migration, /risk_library_id uuid not null references public\.ppg_risk_library\(id\)/)
assert.match(migration, /ppg_loss_events_primary_risk_required/)
assert.match(migration, /ppg_program_items_generic_risk_required/)
assert.match(migration, /create table if not exists public\.ppg_program_clusters/)
assert.match(migration, /create table if not exists public\.ppg_program_cluster_units/)
assert.match(migration, /target_cakupan_satker numeric\(5,2\)/)
assert.match(migration, /kri_indikator text not null/)
assert.match(migration, /outcome_a_indikator text not null/)
assert.match(migration, /outcome_b_indikator text not null/)
assert.match(migration, /catatan_keputusan text not null/)
assert.match(migration, /create table if not exists public\.ppg_risk_import_batches/)
assert.match(migration, /create table if not exists public\.ppg_risk_import_rows/)
assert.match(migration, /create table if not exists public\.ppg_risk_candidates/)
assert.match(migration, /create table if not exists public\.ppg_risk_candidate_members/)
assert.match(migration, /kemungkinan_treated smallint/)
assert.match(migration, /create table if not exists public\.ppg_scenarios/)
assert.match(migration, /create table if not exists public\.ppg_risk_appetites/)
assert.match(migration, /create table if not exists public\.ppg_ai_recommendation_runs/)
assert.match(migration, /create table if not exists public\.ppg_ai_action_candidates/)
assert.match(migration, /create table if not exists public\.ppg_satker_program_assignments/)
assert.match(migration, /ditetapkan_by uuid references auth\.users/)
assert.match(migration, /ditetapkan_at timestamptz/)
assert.match(migration, /catatan_penetapan text not null/)
assert.match(migration, /ppg_programs_status_check[\s\S]*'ditetapkan'/)
assert.match(migration, /unique\(scenario_id,run_id,recommendation_key\)/)
assert.match(migration, /create policy "ppg ai runs pusat"/)
assert.match(migration, /unique\(scenario_id,unit_kerja_id,tahun\)/)
assert.match(migration, /alter table public\.ppg_risk_appetites enable row level security/)
assert.match(migration, /grant select, insert, update, delete on table public\.ppg_risk_appetites to authenticated/)
assert.match(migration, /create table if not exists public\.ppg_user_scenario_preferences/)
assert.match(migration, /create or replace function public\.ppg_current_scenario_id\(\)/)
assert.match(migration, /create policy "ppg scenario isolation"[\s\S]*as restrictive/)
assert.match(migration, /ppg_register_scenario_business_key unique\(scenario_id,kode,tahun,periode,unit_nama\)/)
assert.match(migration, /ppg_loss_event_code_counters_pkey primary key\(scenario_id,tahun\)/)
assert.match(migration, /values \(new\.scenario_id, event_year, 1\)/)
assert.doesNotMatch(migration.slice(0, migration.indexOf('create table if not exists public.ppg_scenarios')), /on conflict \(kode\)/)
assert.doesNotMatch(migration.slice(0, migration.indexOf('create table if not exists public.ppg_scenarios')), /on conflict \(tahun\)/)
assert.match(fs.readFileSync('src/lib/ppg/scenario.ts', 'utf8'), /scenario_id: scenarioId/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/layout.tsx', 'utf8'), /MODE SIMULASI AKTIF/)
assert.match(fs.readFileSync('src/lib/ppg/demo-seed.ts', 'utf8'), /length: 369/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/risk-import-actions.ts', 'utf8'), /export async function deletePpgRiskImport/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/pustaka/page.tsx', 'utf8'), /Antrean kurasi bottom-up \(\{riskImport\.candidates\.length\}\)/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/pustaka/page.tsx', 'utf8'), /DeleteRiskRegisterImportButton/)
assert.doesNotMatch(fs.readFileSync('src/app/dashboard/ppg/actions.ts', 'utf8'), /kode: `LED-\$\{eventDate/)
assert.doesNotMatch(fs.readFileSync('src/lib/ppg/insights.ts', 'utf8'), /tinggi:\s*82|sedang:\s*58|normal:\s*35/)
assert.match(fs.readFileSync('src/lib/ppg/data.ts', 'utf8'), /ppg_control_library!ppg_program_items_control_id_fkey/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/penilaian/RiskControlEvidencePanel.tsx', 'utf8'), /useActionState\(validatePpgRiskControlEvidence/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/penilaian/ImportedRiskDraftReview.tsx', 'utf8'), /<details className="group/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/loss-event/LossEventControlFields.tsx', 'utf8'), /failed_control_ids/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/actions.ts', 'utf8'), /Pembuatan Loss Event hanya tersedia bagi UPG Satker/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/loss-event/page.tsx', 'utf8'), /data\.access\.isSatker \|\| data\.access\.isAdmin/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/analitik/AiRecommendationPanel.tsx', 'utf8'), /Rekomendasi Program PPG dengan AI/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/tindak-lanjut/ProgramEffectivenessPanel.tsx', 'utf8'), /Fase 1 · Pra Pelaksanaan/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/tindak-lanjut/ProgramEffectivenessPanel.tsx', 'utf8'), /Fase 2 · Pasca Pelaksanaan/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/tindak-lanjut/ProgramEffectivenessPanel.tsx', 'utf8'), /eligiblePpgProgramItemsForPlanning/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/actions.ts', 'utf8'), /validatePpgSatkerProgramRealization/)
assert.match(fs.readFileSync('src/lib/ppg/data.ts', 'utf8'), /const denominator = measuredUnits\.size/)
assert.match(fs.readFileSync('src/lib/ppg/data.ts', 'utf8'), /value \/ appetiteSetUnits\.size/)
assert.doesNotMatch(fs.readFileSync('src/app/dashboard/ppg/PpgModuleNav.tsx', 'utf8'), /overflow-x-auto/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/PpgModuleNav.tsx', 'utf8'), /grid-cols-2/)
assert.match(fs.readFileSync('src/app/dashboard/ppg/actions.ts', 'utf8'), /action: 'tetapkan'/)
console.log('PPG scoring, workbook import, analytics, LED matching, and migration verification passed.')
