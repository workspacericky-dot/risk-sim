import { addPpgControl, addPpgRiskLibrary } from '../actions'
import { getPpgLibraryWorkspace, getPpgRiskImportWorkspace } from '@/lib/ppg/data'
import { PPG_CAUSE_FACTORS, PPG_RISK_CATEGORIES, PPG_RISK_CLASSIFICATIONS } from '@/lib/ppg/references'
import { SectionHeading } from '../_components'
import { ProcessBusinessFields } from '../ProcessBusinessFields'
import { PpgCombobox } from '../PpgCombobox'
import { PpgMultiCombobox } from '../PpgMultiCombobox'
import { ManagedDataTable } from '../ManagedDataTable'
import { requirePpgAccess } from '@/lib/ppg/access'
import { RiskRegisterImportForm } from '../RiskRegisterImportForm'
import { RiskCandidateReview } from '../RiskCandidateReview'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export default async function PustakaPage() {
  const access = await requirePpgAccess()
  const [{ risk, control, links, error }, riskImport] = await Promise.all([getPpgLibraryWorkspace(), getPpgRiskImportWorkspace()])
  const riskById = new Map(risk.rows.map((row) => [String(row.id), row]))
  const controlById = new Map(control.rows.map((row) => [String(row.id), row]))
  const selectableRisks = risk.rows.filter((row) => String(row.status) !== 'nonaktif')
  const selectableControls = control.rows.filter((row) => String(row.status) !== 'nonaktif')
  const riskIdsForControl = (controlId: string) => links.filter((link) => String(link.control_id) === controlId).map((link) => String(link.risk_library_id))
  const controlIdsForRisk = (riskId: string) => links.filter((link) => String(link.risk_library_id) === riskId).map((link) => String(link.control_id))
  const riskCodesForControl = (controlId: string) => riskIdsForControl(controlId).map((riskId) => String(riskById.get(riskId)?.kode || '')).filter(Boolean).join(', ')
  const controlCodesForRisk = (riskId: string) => controlIdsForRisk(riskId).map((controlId) => String(controlById.get(controlId)?.kode || '')).filter(Boolean).join(', ')
  const controlOptions = selectableControls.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.nama)}`, description: `${String(row.jenis)} · ${String(row.status)}` }))
  const riskOptions = selectableRisks.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.peristiwa)}`, description: `${String(row.kategori)} · ${String(row.status)}` }))

  return <div className="space-y-6">
    <SectionHeading eyebrow="Referensi UPG Pusat" title="Risk and Control Library" description="Himpunan risiko dan kontrol generik lintas satker. Pemetaan library menjadi referensi; penerapan dan efektivitas aktual tetap dinilai oleh masing-masing satker." />
    {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Skema relasi risiko–kontrol belum tersedia. Jalankan migration_ppg.sql terbaru.</div>}
    {riskImport.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Skema impor Risk Register belum tersedia: {riskImport.error}. Jalankan migration_ppg.sql terbaru.</div>}
    <RiskRegisterImportForm />
    <section className="space-y-3"><div><h3 className="font-bold text-slate-900">Antrean kurasi bottom-up</h3><p className="mt-1 text-sm text-slate-500">Mesin mengusulkan pengelompokan. UPG Pusat atau Admin Sistem tetap menentukan redaksi dan keputusan akhirnya.</p></div><RiskCandidateReview candidates={riskImport.candidates} libraries={riskImport.libraries} /></section>
    {riskImport.batches.length ? <details className="rounded-2xl border border-slate-200 bg-white p-5"><summary className="cursor-pointer font-bold text-slate-800">Riwayat impor Risk Register ({riskImport.batches.length})</summary><div className="mt-3 space-y-2">{riskImport.batches.map((batch) => <div key={String(batch.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 p-3 text-sm"><div><b>{String(batch.nama_file)}</b><p className="text-xs text-slate-500">{String(batch.mode)} · {String(batch.periode || 'periode belum terbaca')} {String(batch.tahun || '')}</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">{String(batch.status)} · {String(batch.total_baris)} baris</span></div>)}</div></details> : null}
    <div className="grid gap-5 xl:grid-cols-2">
      <form action={addPpgRiskLibrary} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold">Tambah draf risiko</h3>
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Kategori risiko</span><PpgCombobox name="kategori" required placeholder="Pilih kategori risiko" options={PPG_RISK_CATEGORIES.map((item) => ({ value: item, label: item }))} /></label>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Kode referensi dibuat otomatis: <code>PPG.[kode kategori].[nomor urut]</code>. Risiko dapat digunakan oleh lebih dari satu satker.</p>
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Kontrol terkait (opsional)</span><PpgMultiCombobox name="control_ids" placeholder="Pilih kontrol yang sudah tersedia" options={controlOptions} /></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Klasifikasi risiko</span><PpgCombobox name="klasifikasi_risiko" required placeholder="Pilih klasifikasi risiko" options={PPG_RISK_CLASSIFICATIONS.map((item) => ({ value: item.label, label: item.label }))} /></label>
        <ProcessBusinessFields />
        <textarea name="peristiwa" required placeholder="Peristiwa risiko" className={input} />
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Faktor penyebab</span><PpgCombobox name="faktor_penyebab" required placeholder="Pilih faktor penyebab" options={PPG_CAUSE_FACTORS.map((item) => ({ value: item.label, label: item.label }))} /></label>
        <textarea name="penyebab" placeholder="Keterangan penyebab" className={input} />
        <textarea name="dampak" placeholder="Uraian dampak" className={input} />
        <button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800">Simpan draf</button>
      </form>
      <form action={addPpgControl} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-bold">Tambah kontrol</h3>
        <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">Kode dibuat otomatis dan permanen dengan format <code>PPG.K.[nomor urut]</code>.</p>
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Risiko terkait</span><PpgMultiCombobox name="risk_library_ids" required placeholder="Pilih satu atau beberapa risiko" options={riskOptions} /></label>
        <label className="block space-y-1 text-xs font-semibold text-slate-600"><span>Jenis kontrol</span><select name="jenis" required defaultValue="" className={`${input} font-normal`}><option value="" disabled>Pilih jenis kontrol</option><option value="Preventif">Preventif</option><option value="Detektif">Detektif</option><option value="Korektif">Korektif</option></select></label>
        <input name="nama" required placeholder="Nama kontrol" className={input} />
        <textarea name="uraian" placeholder="Uraian pelaksanaan kontrol" className={`${input} min-h-28`} />
        <button disabled={!selectableRisks.length} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-40">Simpan kontrol</button>
      </form>
    </div>
    <ManagedDataTable
      title="Pustaka risiko generik" deleteKind="risk_library" canDelete={access.isAdmin} emptyMessage="Belum ada pustaka risiko."
      relationship={{ kind: 'risk_controls', options: controlOptions }}
      rows={risk.rows.map((row) => ({ id: String(row.id), kode: String(row.kode || ''), kategori: String(row.kategori || ''), proses: `${String(row.proses_bisnis || '')}${row.subproses_bisnis ? ` / ${String(row.subproses_bisnis)}` : ''}`, klasifikasi: String(row.klasifikasi_risiko || ''), peristiwa: String(row.peristiwa || ''), kontrol: controlCodesForRisk(String(row.id)) || '—', penyebab: `${String(row.faktor_penyebab || '')}${row.penyebab ? ` · ${String(row.penyebab)}` : ''}`, dampak: String(row.dampak || ''), status: String(row.status || 'draft'), alasan_nonaktif: String(row.alasan_nonaktif || '—'), status_raw: String(row.status || 'draft'), relation_values: controlIdsForRisk(String(row.id)), relation_disabled: row.status === 'nonaktif' }))}
      columns={[{ key: 'kode', label: 'Kode', className: 'font-mono font-semibold' }, { key: 'kategori', label: 'Kategori' }, { key: 'proses', label: 'Proses / Subproses' }, { key: 'klasifikasi', label: 'Klasifikasi' }, { key: 'peristiwa', label: 'Peristiwa' }, { key: 'kontrol', label: 'Kontrol terkait' }, { key: 'penyebab', label: 'Penyebab' }, { key: 'dampak', label: 'Dampak' }, { key: 'status', label: 'Status' }, { key: 'alasan_nonaktif', label: 'Alasan nonaktif' }]}
    />
    <ManagedDataTable
      title="Katalog kontrol" deleteKind="control_library" emptyMessage="Belum ada kontrol."
      relationship={{ kind: 'control_risks', options: riskOptions }}
      rows={control.rows.map((row) => ({ id: String(row.id), kode: String(row.kode || ''), nama: String(row.nama || ''), risiko: riskCodesForControl(String(row.id)) || '—', jenis: String(row.jenis || ''), uraian: String(row.uraian || ''), status: String(row.status || ''), alasan_nonaktif: String(row.alasan_nonaktif || '—'), status_raw: String(row.status || 'aktif'), relation_values: riskIdsForControl(String(row.id)), relation_disabled: row.status === 'nonaktif' }))}
      columns={[{ key: 'kode', label: 'Kode', className: 'font-mono font-semibold' }, { key: 'nama', label: 'Nama kontrol' }, { key: 'risiko', label: 'Risiko terkait' }, { key: 'jenis', label: 'Jenis' }, { key: 'uraian', label: 'Uraian' }, { key: 'status', label: 'Status' }, { key: 'alasan_nonaktif', label: 'Alasan nonaktif' }]}
    />
  </div>
}
