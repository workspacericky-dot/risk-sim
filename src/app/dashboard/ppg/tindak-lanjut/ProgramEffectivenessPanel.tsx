'use client'

import { useActionState, useMemo, useState } from 'react'
import { savePpgSatkerProgramPlan, submitPpgSatkerProgramRealization, validatePpgSatkerProgramRealization, type PpgProgramPhaseState } from '../actions'
import { PpgCombobox } from '../PpgCombobox'
import { PPG_IMPACT_OPTIONS, PPG_PROBABILITY_OPTIONS } from '@/lib/ppg/references'
import { eligiblePpgProgramItemsForPlanning } from '@/lib/ppg/program-eligibility'

type Row = Record<string, unknown>
const initialState: PpgProgramPhaseState = { status: 'idle', message: '' }
const input = 'h-9 w-full rounded-lg border border-input bg-white px-3 text-sm font-normal outline-none transition-colors hover:border-ring focus:border-ring focus:ring-2 focus:ring-ring/50'

export function ProgramEffectivenessPanel({ registers, programs, assignments, canEdit, canValidate = false }: { registers: Row[]; programs: Row[]; assignments: Row[]; canEdit: boolean; canValidate?: boolean }) {
  const [planState, planAction, planPending] = useActionState(savePpgSatkerProgramPlan, initialState)
  const [registerId, setRegisterId] = useState('')
  const [itemId, setItemId] = useState('')
  const selectedRegister = registers.find((row) => String(row.id) === registerId)
  const eligibleItems = useMemo(() => selectedRegister ? programs.flatMap((program) => eligiblePpgProgramItemsForPlanning(program, selectedRegister).map((item) => ({ program, item }))) : [], [programs, selectedRegister])
  const selected = eligibleItems.find(({ item }) => String(item.id) === itemId)

  return <div className="space-y-6">
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-700">Fase 1 · Pra Pelaksanaan</p><h3 className="mt-1 font-bold text-indigo-950">Alokasi dan rencana Program PPG Satker</h3><p className="mt-1 text-xs text-indigo-800">Kaitkan program yang telah ditetapkan UPG Pusat dengan risiko Satker, lalu tentukan jadwal rencana dan PIC. Belum ada penilaian efektivitas pada fase ini.</p></div>
      {canEdit ? <form action={planAction} className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Risk Register Satker</span><PpgCombobox name="register_id" required searchable value={registerId} onValueChange={(value) => { setRegisterId(value); setItemId('') }} placeholder="Pilih risiko yang akan dialokasikan Program PPG" options={registers.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.unit_nama)}`, description: `${String(row.peristiwa)} · residual ${String(row.skor_existing)} (${String(row.level_existing)})` }))} /></div>
        <div className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Program PPG yang dialokasikan</span><PpgCombobox name="program_item_id" required searchable value={itemId} onValueChange={setItemId} disabled={!registerId || !eligibleItems.length} placeholder={!registerId ? 'Pilih Risk Register terlebih dahulu' : eligibleItems.length ? 'Pilih Program PPG yang ditetapkan untuk Satker ini' : 'Tidak ada program yang sesuai dengan risiko dan klaster Satker'} options={eligibleItems.map(({ program, item }) => { const action = relation(item.action); return { value: String(item.id), label: `${String(program.kode)} · ${String(program.nama)}`, description: `${String(action.kode || 'Program')} · ${String(action.nama || 'Tindakan PPG')} · periode ${dateLabel(program.program_start)}—${dateLabel(program.program_end)}` } })} /></div>
        {selected && <p className="rounded-xl bg-white p-3 text-xs text-indigo-900 sm:col-span-2"><b>Jendela program UPG Pusat:</b> {dateLabel(selected.program.program_start)}—{dateLabel(selected.program.program_end)}. Jadwal Satker harus berada dalam rentang ini.</p>}
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Mulai rencana<input name="planned_start" type="date" required min={String(selected?.program.program_start || '')} max={String(selected?.program.program_end || '')} className={input} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Selesai rencana<input name="planned_end" type="date" required min={String(selected?.program.program_start || '')} max={String(selected?.program.program_end || '')} className={input} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">PIC program<input name="pic_jabatan" required placeholder="Contoh: Ketua UPG / Panitera / Koordinator PTSP" className={input} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Catatan perencanaan<textarea name="planning_notes" maxLength={1500} placeholder="Pembagian tugas, lokasi, atau kesiapan awal (opsional)" className={`${input} h-auto min-h-20 py-2`} /></label>
        <button disabled={planPending || !eligibleItems.length} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{planPending ? 'Menyimpan…' : 'Simpan rencana pra pelaksanaan'}</button>
        <ActionMessage state={planState} />
      </form> : <ReadOnlyNotice text="UPG Pusat memonitor rencana seluruh Satker. Pengisian dan perubahan dilakukan oleh UPG Satker; Admin Sistem dapat membantu untuk debugging." />}
    </section>

    <section className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Fase 2 · Pasca Pelaksanaan</p><h3 className="mt-1 font-bold text-emerald-950">Realisasi, efektivitas, dan treated risk</h3><p className="mt-1 text-xs text-emerald-800">Setelah program benar-benar selesai, Satker mencatat tanggal aktual, uraian hasil, evidence, efektivitas program, dan nilai treated risk. UPG Pusat kemudian memvalidasi hasilnya.</p></div>
      {assignments.length ? <div className="mt-4 space-y-4">{assignments.map((assignment) => <AssignmentCard key={String(assignment.id)} assignment={assignment} canEdit={canEdit} canValidate={canValidate} />)}</div> : <p className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-600">Belum ada rencana Program PPG yang dialokasikan oleh Satker.</p>}
    </section>
  </div>
}

function AssignmentCard({ assignment, canEdit, canValidate }: { assignment: Row; canEdit: boolean; canValidate: boolean }) {
  const item = relation(assignment.item); const program = relation(item.program); const action = relation(item.action); const register = relation(assignment.register)
  const submitted = Boolean(assignment.post_submitted_at)
  return <article className="rounded-xl border border-emerald-200 bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{String(program.kode)} · {String(program.nama)}</p><p className="mt-1 text-xs text-slate-600">{String(register.unit_nama)} · {String(register.kode)} · {String(register.peristiwa)}</p><p className="mt-1 text-xs text-slate-500">{String(action.kode || '')} {String(action.nama || '')}</p></div><StatusBadge status={String(assignment.validation_status)} submitted={submitted} /></div>
    <div className="mt-3 grid gap-2 rounded-xl bg-indigo-50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><Info label="Mulai rencana" value={dateLabel(assignment.planned_start)} /><Info label="Selesai rencana" value={dateLabel(assignment.planned_end)} /><Info label="PIC" value={assignment.pic_jabatan} /><Info label="Catatan" value={assignment.planning_notes || '—'} /></div>
    {submitted && <div className="mt-3 grid gap-2 rounded-xl bg-emerald-50 p-3 text-xs sm:grid-cols-2 lg:grid-cols-4"><Info label="Selesai aktual" value={dateLabel(assignment.actual_end)} /><Info label="Efektivitas" value={String(assignment.efektivitas_program).replaceAll('_', ' ')} /><Info label="Treated risk" value={`${String(assignment.skor_treated)} · ${String(assignment.level_treated)}`} /><Info label="Perubahan" value={riskDeltaText(Number(register.skor_existing), Number(assignment.skor_treated))} /><div className="sm:col-span-2 lg:col-span-3"><Info label="Uraian realisasi" value={assignment.realization_summary} /></div><a href={String(assignment.evidence_url)} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">Buka evidence</a>{Boolean(assignment.validation_notes) && <div className="sm:col-span-2 lg:col-span-4"><Info label="Catatan UPG Pusat" value={assignment.validation_notes} /></div>}</div>}
    {canEdit && <RealizationForm assignment={assignment} />}
    {canValidate && submitted && <ValidationForm assignment={assignment} />}
  </article>
}

function RealizationForm({ assignment }: { assignment: Row }) {
  const [state, action, pending] = useActionState(submitPpgSatkerProgramRealization, initialState)
  return <details className="mt-4" open={String(assignment.validation_status) === 'perlu_perbaikan'}><summary className="cursor-pointer text-sm font-semibold text-emerald-800">{assignment.post_submitted_at ? 'Perbarui realisasi pascapelaksanaan' : 'Isi realisasi pascapelaksanaan'}</summary><form action={action} className="mt-3 grid gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3 sm:grid-cols-2">
    <input type="hidden" name="assignment_id" value={String(assignment.id)} />
    <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Tanggal selesai aktual<input name="actual_end" type="date" required min={String(assignment.planned_start)} defaultValue={String(assignment.actual_end || '')} className={input} /></label>
    <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Uraian realisasi<textarea name="realization_summary" required minLength={10} maxLength={3000} defaultValue={String(assignment.realization_summary || '')} placeholder="Jelaskan kegiatan yang terlaksana, capaian, kendala, dan hasilnya" className={`${input} h-auto min-h-24 py-2`} /></label>
    <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Efektivitas Program PPG<select name="efektivitas_program" required defaultValue={String(assignment.efektivitas_program || '')} className={input}><option value="" disabled>Pilih efektivitas</option><option value="tidak_efektif">Tidak efektif</option><option value="kurang_efektif">Kurang efektif</option><option value="cukup_efektif">Cukup efektif</option><option value="efektif">Efektif</option></select></label>
    <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Probabilitas treated</span><PpgCombobox name="kemungkinan_treated" required defaultValue={String(assignment.kemungkinan_treated || '')} placeholder="Pilih probabilitas" options={PPG_PROBABILITY_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
    <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Dampak treated</span><PpgCombobox name="dampak_treated" required defaultValue={String(assignment.dampak_treated || '')} placeholder="Pilih dampak" options={PPG_IMPACT_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
    <label className="grid gap-1 text-xs font-semibold text-slate-600 sm:col-span-2">Evidence pelaksanaan<input name="evidence_url" type="url" required defaultValue={String(assignment.evidence_url || '')} placeholder="https://drive.google.com/... atau OneDrive" className={input} /></label>
    <button disabled={pending} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 sm:col-span-2">{pending ? 'Mengajukan…' : 'Ajukan realisasi untuk validasi UPG Pusat'}</button><ActionMessage state={state} />
  </form></details>
}

function ValidationForm({ assignment }: { assignment: Row }) {
  const [state, action, pending] = useActionState(validatePpgSatkerProgramRealization, initialState)
  return <form action={action} className="mt-4 grid gap-2 rounded-xl border border-cyan-200 bg-cyan-50 p-3 md:grid-cols-[180px_1fr_auto]"><input type="hidden" name="assignment_id" value={String(assignment.id)} /><select name="decision" required defaultValue={String(assignment.validation_status) === 'menunggu' ? 'disetujui' : String(assignment.validation_status)} className={input}><option value="disetujui">Disetujui</option><option value="perlu_perbaikan">Perlu perbaikan</option><option value="ditolak">Ditolak</option></select><input name="validation_notes" defaultValue={String(assignment.validation_notes || '')} placeholder="Catatan validasi UPG Pusat" className={input} /><button disabled={pending} className="rounded-lg bg-cyan-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{pending ? 'Menyimpan…' : 'Validasi realisasi'}</button><ActionMessage state={state} /></form>
}

function ActionMessage({ state }: { state: PpgProgramPhaseState }) { return state.message ? <p aria-live="polite" className={`rounded-lg px-3 py-2 text-xs md:col-span-full ${state.status === 'success' ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-50 text-rose-800'}`}>{state.message}</p> : null }
function ReadOnlyNotice({ text }: { text: string }) { return <p className="mt-4 rounded-xl bg-white p-3 text-xs text-slate-600">{text}</p> }
function relation(value: unknown): Row { const candidate = Array.isArray(value) ? value[0] : value; return candidate && typeof candidate === 'object' ? candidate as Row : {} }
function dateLabel(value: unknown) { const source = String(value || ''); return source ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${source.slice(0, 10)}T00:00:00Z`)) : '—' }
function Info({ label, value }: { label: string; value: unknown }) { return <div><b className="text-slate-700">{label}: </b><span className="text-slate-600">{String(value || '—')}</span></div> }
function StatusBadge({ status, submitted }: { status: string; submitted: boolean }) { const label = !submitted ? 'Pra pelaksanaan' : status.replaceAll('_', ' '); const tone = status === 'disetujui' ? 'bg-emerald-100 text-emerald-800' : status === 'ditolak' ? 'bg-rose-100 text-rose-800' : status === 'perlu_perbaikan' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'; return <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase ${tone}`}>{label}</span> }
function riskDeltaText(residual: number, treated: number) { const delta = treated - residual; return delta < 0 ? `Turun ${Math.abs(delta)} poin` : delta > 0 ? `Naik ${delta} poin` : 'Tetap' }
