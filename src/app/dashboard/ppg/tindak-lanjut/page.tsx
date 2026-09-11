import Link from 'next/link'
import { createPpgProgram } from '../actions'
import { getPpgActionCatalog, getPpgAiRecommendationWorkspace, getPpgAnalytics, getPpgControlLibraryOptions, getPpgNationalRiskInsights, getPpgProgramLossEventOptions, getPpgPrograms, getPpgTreatedRiskWorkspace } from '@/lib/ppg/data'
import { requirePpgAccess } from '@/lib/ppg/access'
import { buildPpgAssistedInsights } from '@/lib/ppg/insights'
import { EmptyState, SectionHeading } from '../_components'
import { ProgramRiskControls } from './ProgramRiskControls'
import { ProgramEffectivenessPanel } from './ProgramEffectivenessPanel'
import { ProgramApprovalForm } from './ProgramApprovalForm'

const input = 'h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm font-normal outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/50 placeholder:font-normal placeholder:text-muted-foreground'
type Props = { searchParams: Promise<{ action?: string; risk?: string; tahun?: string; triwulan?: string; ai_run?: string; ai_rec?: string }> }

export default async function ProgramPpgPage({ searchParams }: Props) {
  const access = await requirePpgAccess()
  const treatedRisk = await getPpgTreatedRiskWorkspace()
  if (access.isSatker) return <div className="space-y-6">
    <SectionHeading eyebrow="Siklus pelaksanaan Satker" title="Program PPG: Perencanaan & Pascapelaksanaan" description="Alokasikan program pada risiko dan susun rencana terlebih dahulu; setelah kegiatan selesai, ajukan realisasi, efektivitas, evidence, dan treated risk." />
    {treatedRisk.error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Data evaluasi Program PPG belum dapat dimuat: {treatedRisk.error}. Jalankan migration_ppg.sql terbaru.</div>}
    <ProgramEffectivenessPanel registers={treatedRisk.registers} programs={treatedRisk.programs} assignments={treatedRisk.assignments} canEdit />
  </div>
  const query = await searchParams
  const year = Number(query.tahun) || undefined
  const quarter = query.triwulan ? Number(query.triwulan) : null
  const analytics = await getPpgAnalytics(year, quarter)
  const [catalog, controls, programs, lossEvents, riskInsights, ai] = await Promise.all([getPpgActionCatalog(), getPpgControlLibraryOptions(), getPpgPrograms(), getPpgProgramLossEventOptions(), getPpgNationalRiskInsights(analytics.period.start, analytics.period.end), getPpgAiRecommendationWorkspace(analytics.period.year, analytics.period.quarter)])
  const dates = programDates(analytics.period.year, analytics.period.quarter)
  const recommendedCodes = new Set(analytics.recommendations.map((item) => item.actionCode))
  const sortedActions = [...catalog.rows].sort((a, b) => Number(recommendedCodes.has(String(b.kode))) - Number(recommendedCodes.has(String(a.kode))))
  const selectedAction = sortedActions.find((row) => String(row.kode) === query.action)
  const selectedCategories = new Set<string>(Array.isArray(selectedAction?.risk_categories) ? selectedAction.risk_categories.map(String) : [])
  const sortedRisks = [...riskInsights.rows].sort((a, b) => Number(b.recommended_for_program) - Number(a.recommended_for_program) || Number(selectedCategories.has(b.kategori)) - Number(selectedCategories.has(a.kategori)) || b.above_appetite_pct - a.above_appetite_pct || b.affected_pct - a.affected_pct)
  const assistedInsights = buildPpgAssistedInsights(analytics, sortedRisks)
  const selectedInsight = assistedInsights.find((item) => item.risk_library_id === query.risk)
  const aiRun = ai.run
  const selectedAi = aiRun && aiRun.id === query.ai_run ? aiRun.recommendations.find((item) => item.key === query.ai_rec && item.linked_risk_id === query.risk) : undefined
  const dataErrors = [
    catalog.error && `Katalog tindakan: ${catalog.error}`,
    controls.error && `Katalog kontrol: ${controls.error}`,
    riskInsights.error && `Insight risiko nasional: ${riskInsights.error}`,
    programs.error && `Daftar program: ${programs.error}`,
    lossEvents.error && `Loss event: ${lossEvents.error}`,
  ].filter(Boolean)

  return <div className="space-y-6">
    <SectionHeading eyebrow="Assisted generation" title="Program PPG & Monitoring" description="Tinjau Insight A dan B yang dibuat mesin, lalu konfirmasi atau sesuaikan tindakan, kontrol, target, dan klaster sebelum UPG Pusat menetapkan program." />
    {treatedRisk.error && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Data evaluasi Program PPG belum dapat dimuat: {treatedRisk.error}. Jalankan migration_ppg.sql terbaru.</div>}
    {dataErrors.length > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Beberapa data Program PPG gagal dimuat.</strong><ul className="mt-2 list-disc space-y-1 pl-5">{dataErrors.map((message) => <li key={message}>{message}</li>)}</ul></div>}
    <form action={createPpgProgram} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      <div className="md:col-span-2 xl:col-span-4"><h3 className="font-bold text-slate-900">Draf program berbantuan analitik</h3><p className="mt-1 text-xs text-slate-500">Dasar {analytics.period.label}; periode program yang disarankan {analytics.period.programLabel}. Insight dan baseline tidak perlu diisi manual.</p></div>
      <input type="hidden" name="analysis_year" value={analytics.period.year} /><input type="hidden" name="analysis_quarter" value={analytics.period.quarter ?? ''} />
      {selectedAi && <><input type="hidden" name="ai_run_id" value={aiRun?.id} /><input type="hidden" name="ai_recommendation_key" value={selectedAi.key} /></>}
      {selectedAi && <div className="rounded-xl border border-violet-200 bg-violet-50 p-3 text-xs text-violet-950 md:col-span-2 xl:col-span-4"><strong>Draf berasal dari snapshot AI:</strong> {selectedAi.title}. Seluruh isian tetap harus direview dan dapat disesuaikan UPG Pusat sebelum disimpan.</div>}
      <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2">Nama program<input name="nama" defaultValue={selectedAi?.title || (selectedInsight ? `${String(selectedAction?.nama || 'Program PPG')} — ${selectedInsight.kode}` : '')} placeholder={`Program PPG ${analytics.period.programLabel}`} className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Mulai<input required name="program_start" type="date" defaultValue={dates.start} className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Selesai<input required name="program_end" type="date" defaultValue={dates.end} className={input} /></label>
      <ProgramRiskControls initialRiskId={query.risk} recommendedCategories={[...selectedCategories]} risks={assistedInsights} controls={controls.rows.map((row) => ({ id: String(row.id), kode: String(row.kode), nama: String(row.nama), jenis: String(row.jenis), uraian: String(row.uraian || ''), risk_library_ids: row.risk_library_ids }))} lossEvents={lossEvents.rows.map((row) => ({ id: String(row.id), kode: String(row.kode), nama: String(row.nama_peristiwa), unit: String(row.unit_nama), level: Number(row.level_dampak || 1), risk_library_id: String(row.risk_library_id || '') }))} />
      <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2">Rencana tindakan<select required name="action_catalog_id" defaultValue={selectedAction?.id ? String(selectedAction.id) : ''} className={input}><option value="">Pilih tindakan katalog</option>{sortedActions.map((row) => <option key={String(row.id)} value={String(row.id)}>{recommendedCodes.has(String(row.kode)) ? '★ REKOMENDASI · ' : ''}{String(row.kode)} · {String(row.nama)}</option>)}</select></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Target cakupan nasional (%)<input name="target_cakupan_satker" type="number" min="0" max="100" step="0.01" required defaultValue="100" className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">PIC (jabatan)<input name="pic_jabatan" placeholder="Contoh: Koordinator UPG Satker" className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Kelompok sasaran<input name="target" defaultValue={selectedAi?.target_roles.join('; ') || String(selectedAction?.target_default || '')} placeholder="Contoh: masyarakat pencari keadilan" className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2">Sasaran program<input name="sasaran_program" required defaultValue={selectedAi ? `${selectedAi.finding} Aksi: ${selectedAi.concrete_actions.join('; ')}` : selectedInsight ? `Menurunkan paparan dan realisasi ${selectedInsight.kode} melalui penguatan kontrol nasional yang disesuaikan menurut klaster Satker.` : ''} placeholder="Perubahan yang ingin dicapai" className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Frekuensi pengukuran<select name="frekuensi_pengukuran" required defaultValue="akhir_program" className={input}><option value="bulanan">Bulanan</option><option value="triwulanan">Triwulanan</option><option value="semesteran">Semesteran</option><option value="akhir_program">Akhir program</option></select></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Target output<input name="output_target" defaultValue={String(selectedAction?.output_indicator || '')} placeholder="Diisi dari katalog jika kosong" className={input} /></label>
      <label className="grid gap-1 text-xs font-semibold text-slate-600">Target outcome<input name="outcome_target" defaultValue={String(selectedAction?.outcome_indicator || '')} placeholder="Diisi dari katalog jika kosong" className={input} /></label>
      <section className="grid gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 md:col-span-2 xl:col-span-4 xl:grid-cols-3">
        <div className="xl:col-span-3"><h4 className="text-sm font-bold text-indigo-950">Modul tematik tiga klaster</h4><p className="mt-1 text-xs text-indigo-800">Seluruh Satker menerima paket inti nasional. Sistem membekukan keanggotaan klaster berdasarkan Insight B pada snapshot program.</p></div>
        <ClusterInput code="1" title="Realisasi kritis" defaultFocus="Perbaikan kontrol, RCA, validasi intensif, dan tindak lanjut." inputClass={input} />
        <ClusterInput code="2" title="Realisasi terbatas/preventif" defaultFocus="Pencegahan, penguatan KRI, komunikasi periode rawan, dan deteksi dini." inputClass={input} />
        <ClusterInput code="3" title="Terkendali/monitoring" defaultFocus="Mempertahankan kontrol, monitoring berkala, dan penguatan kualitas data." inputClass={input} />
      </section>
      <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-4">Catatan keputusan UPG Pusat <span className="font-normal text-slate-400">(wajib diisi secara substantif apabila tindakan, kontrol, target, atau klaster menyimpang dari rekomendasi mesin)</span><textarea name="catatan_keputusan" defaultValue={selectedAi ? `Basis rekomendasi AI (${aiRun?.model}; ${aiRun?.prompt_version}): ${selectedAi.reasoning_summary}\nEvidence: ${selectedAi.evidence.join('; ')}\nBatas interpretasi: ${selectedAi.limitations.join('; ') || 'Tidak dinyatakan model.'}` : ''} placeholder="Pertimbangan profesional atau kebijakan UPG Pusat" className={`${input} h-auto min-h-20 py-2`} /></label>
      <button disabled={!riskInsights.rows.length || !catalog.rows.length || !controls.rows.length} className="md:col-span-2 xl:col-span-4 rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Simpan rancangan Program PPG nasional berklaster</button>
    </form>

    {programs.rows.length ? <div className="space-y-4">{programs.rows.map((raw) => {
      const program = raw as Record<string, unknown>
      const items = arrayRecords(program.items)
      return <article key={String(program.id)} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-bold text-indigo-700">{String(program.kode)} · {String(program.period_label)}</p><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${program.ditetapkan_at ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{program.ditetapkan_at ? `Ditetapkan · ${String(program.status).replaceAll('_', ' ')}` : 'Belum ditetapkan'}</span></div><h3 className="mt-1 font-bold text-slate-900">{String(program.nama)}</h3><p className="mt-1 text-xs text-slate-500">Pelaksanaan {dateLabel(program.program_start)}—{dateLabel(program.program_end)} · Analisis {dateLabel(program.analysis_start)}—{dateLabel(program.analysis_end)}</p>{Boolean(program.ditetapkan_at) && <p className="mt-1 text-xs text-emerald-700">Ditetapkan UPG Pusat pada {dateTime(program.ditetapkan_at)} · {String(program.catatan_penetapan || 'tanpa catatan')}</p>}</div><div className="flex flex-wrap gap-2"><Link href={`/dashboard/ppg/tindak-lanjut/laporan/perencanaan?program=${program.id}`} className="rounded-lg border border-indigo-200 px-3 py-2 text-xs font-semibold text-indigo-700">Laporan perencanaan</Link><Link href={`/dashboard/ppg/tindak-lanjut/laporan/pelaksanaan?program=${program.id}`} className="rounded-lg border border-cyan-200 px-3 py-2 text-xs font-semibold text-cyan-700">Laporan pelaksanaan</Link></div></div>
        {!Boolean(program.ditetapkan_at) && String(program.status) !== 'dibatalkan' && <ProgramApprovalForm programId={String(program.id)} />}
        <div className="mt-4 space-y-3">{items.map((item) => { const action = record(item.action); const legacyControl = record(item.control); const itemControls = arrayRecords(item.controls).map((link) => record(link.control)); const linkedControls = itemControls.length ? itemControls : (Object.keys(legacyControl).length ? [legacyControl] : []); const risk = record(item.risk); const clusters = arrayRecords(item.clusters).sort((a, b) => Number(a.kode) - Number(b.kode)); const updates = arrayRecords(item.updates).sort((a, b) => String(b.tanggal).localeCompare(String(a.tanggal))); const linkedLosses = arrayRecords(item.loss_events).map((link) => record(link.loss_event)); return <div key={String(item.id)} className="rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{String(action.kode || '')} · {String(action.nama || 'Tindakan katalog')}</p><p className="mt-1 text-sm text-slate-600">Risiko {String(risk.kode || '—')}: {String(risk.peristiwa || 'Tidak tersedia')}</p><p className="mt-1 text-xs text-slate-500"><b>Kontrol terkait:</b> {linkedControls.length ? linkedControls.map((control) => `${String(control.kode)} · ${String(control.nama)} (${String(control.jenis)})`).join('; ') : 'Belum dikaitkan'}</p><p className="mt-1 text-xs text-slate-500">Dasar: {String(item.rationale || '—')}</p></div><span className="h-fit rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase text-indigo-700">Paket nasional · {String(item.status).replaceAll('_', ' ')}</span></div>
          <div className="mt-3 grid gap-2 rounded-xl bg-indigo-50 p-3 text-xs md:grid-cols-2"><Info label="Sasaran" value={item.sasaran_program} /><Info label="Indikator program" value={item.indikator_program} /><Info label="Baseline" value={`${String(item.baseline_indikator || '—')} ${String(item.satuan_indikator || '')}`} /><Info label="Target" value={`${targetSymbol(String(item.arah_target))}${String(item.target_indikator || '—')} ${String(item.satuan_indikator || '')}`} /><Info label="Sumber data" value={item.sumber_data_indikator} /><Info label="Frekuensi" value={item.frekuensi_pengukuran} /></div>
          <div className="mt-3 grid gap-2 rounded-xl bg-amber-50 p-3 text-xs md:grid-cols-2"><Info label="KRI" value={item.kri_indikator} /><Info label="Ambang KRI" value={`Hijau ${String(item.kri_ambang_hijau || '—')} · Waspada ${String(item.kri_ambang_waspada || '—')} · Merah ${String(item.kri_ambang_merah || '—')}`} /><Info label="Outcome A" value={`${String(item.outcome_a_indikator || '—')} · ${String(item.outcome_a_baseline_pct ?? '—')}% → ${String(item.outcome_a_target_pct ?? '—')}%`} /><Info label="Outcome B" value={`${String(item.outcome_b_indikator || '—')} · ${String(item.outcome_b_baseline_pct ?? '—')}% → ${String(item.outcome_b_target_pct ?? '—')}%`} /></div>
          {clusters.length > 0 && <div className="mt-3 grid gap-2 md:grid-cols-3">{clusters.map((cluster) => <div key={String(cluster.id)} className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-xs"><b className="text-cyan-950">Klaster {String(cluster.kode)} · {String(cluster.nama)}</b><p className="mt-1 text-cyan-800">{String(cluster.fokus_tindakan)}</p><p className="mt-2 font-semibold text-cyan-900">{arrayRecords(cluster.units).length} Satker · target cakupan {String(cluster.target_cakupan_satker)}%</p></div>)}</div>}
          {Boolean(item.catatan_keputusan) && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><b>Catatan keputusan UPG Pusat:</b> {String(item.catatan_keputusan)}</p>}
          {linkedLosses.length > 0 && <p className="mt-2 text-xs text-rose-700"><b>Dasar LED:</b> {linkedLosses.map((loss) => `${String(loss.kode)} · ${String(loss.nama_peristiwa)}`).join('; ')}</p>}
          <p className="mt-4 rounded-lg bg-cyan-50 p-3 text-xs text-cyan-800">Pelaksanaan dicatat oleh masing-masing UPG Satker melalui fase Pra Pelaksanaan dan Pasca Pelaksanaan di bawah. UPG Pusat memonitor tanpa mengubah data Satker.</p>
          {updates[0] && <p className="mt-3 text-xs text-slate-500">Pembaruan terakhir {dateLabel(updates[0].tanggal)}: {String(updates[0].catatan || updates[0].output_realisasi || 'tanpa catatan')}.</p>}
        </div>})}</div>
      </article>
    })}</div> : <EmptyState title="Belum ada rancangan Program PPG" description="Pilih rekomendasi pada Analisis Titik Rawan atau gunakan formulir di atas. Rencana tindakan tidak lagi berupa teks bebas." />}
    <ProgramEffectivenessPanel registers={treatedRisk.registers} programs={treatedRisk.programs} assignments={treatedRisk.assignments} canEdit={access.isAdmin} canValidate={access.isPusat} />
  </div>
}

function programDates(year: number, quarter: number | null) { if (!quarter) return { start: `${year + 1}-01-01`, end: `${year + 1}-12-31` }; const next = quarter === 4 ? 1 : quarter + 1; const programYear = quarter === 4 ? year + 1 : year; const firstMonth = (next - 1) * 3 + 1; const lastMonth = firstMonth + 2; const day = new Date(Date.UTC(programYear, lastMonth, 0)).getUTCDate(); return { start: `${programYear}-${String(firstMonth).padStart(2, '0')}-01`, end: `${programYear}-${String(lastMonth).padStart(2, '0')}-${day}` } }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function arrayRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : [] }
function dateLabel(value: unknown) { const source = String(value || ''); if (!source) return '—'; return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${source.slice(0, 10)}T00:00:00Z`)) }
function dateTime(value: unknown) { const source = String(value || ''); if (!source) return '—'; return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(source)) }
function Info({ label, value }: { label: string; value: unknown }) { return <div><b className="text-indigo-900">{label}: </b><span className="text-indigo-800">{String(value || '—').replaceAll('_', ' ')}</span></div> }
function targetSymbol(direction: string) { return direction === 'minimal' ? '≥ ' : direction === 'maksimal' ? '≤ ' : direction === 'meningkat' ? '↑ ' : direction === 'menurun' ? '↓ ' : '= ' }
function ClusterInput({ code, title, defaultFocus, inputClass }: { code: string; title: string; defaultFocus: string; inputClass: string }) { return <div className="rounded-xl bg-white p-3"><b className="text-xs text-indigo-950">Klaster {code} · {title}</b><textarea name={`cluster_${code}_focus`} defaultValue={defaultFocus} className={`${inputClass} mt-2 h-auto min-h-20 py-2`} /><label className="mt-2 grid gap-1 text-xs font-semibold text-slate-600">Target cakupan anggota (%)<input name={`cluster_${code}_target_pct`} type="number" min="0" max="100" step="0.01" defaultValue="100" className={inputClass} /></label></div> }
