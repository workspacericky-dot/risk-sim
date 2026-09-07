import { addPpgRegister } from '../actions'
import { getPpgAssessmentWorkspace } from '@/lib/ppg/data'
import { PPG_ASSESSMENT_PERIODS, PPG_IMPACT_OPTIONS, PPG_PROBABILITY_OPTIONS } from '@/lib/ppg/references'
import { EmptyState, SectionHeading } from '../_components'
import { RiskLibrarySelect } from '../RiskLibrarySelect'
import { PpgCombobox } from '../PpgCombobox'
import { SearchableUnitSelect } from '@/components/SearchableUnitSelect'
import { ManagedDataTable } from '../ManagedDataTable'
import { PpgRiskMatrixExplorer } from './PpgRiskMatrixExplorer'
import { RiskControlEvidencePanel } from './RiskControlEvidencePanel'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
type LibraryOptions = Parameters<typeof RiskLibrarySelect>[0]['options']
type MatrixProps = Parameters<typeof PpgRiskMatrixExplorer>[0]

export default async function PenilaianPage() {
  const data = await getPpgAssessmentWorkspace()
  const canInput = data.access.isAdmin || data.access.isSatker
  const ownUnit = data.units[0]
  const tableRows = data.rows.map((row) => ({ id: String(row.id), kode: String(row.kode || ''), satker: String(row.unit_nama || ''), tahun: Number(row.tahun || 0), periode: String(row.periode || ''), kategori: String(row.kategori || ''), proses: `${String(row.proses_bisnis || '')}${row.subproses_bisnis ? ` / ${String(row.subproses_bisnis)}` : ''}`, klasifikasi: String(row.klasifikasi_risiko || ''), peristiwa: String(row.peristiwa || ''), kemungkinan: Number(row.kemungkinan_existing || 0), dampak: Number(row.dampak_existing || 0), skor: Number(row.skor_existing || 0), level: String(row.level_existing || '') }))
  const evidenceRows = data.rows.flatMap((register) => (Array.isArray(register.controls) ? register.controls : []).map((raw) => {
    const relation = record(raw); const control = record(relation.control); const validationRaw = relation.validation; const validation = record(Array.isArray(validationRaw) ? validationRaw[0] : validationRaw)
    return { risk_id: String(relation.risk_id), control_id: String(relation.control_id), efektivitas: String(relation.efektivitas || 'belum_dinilai'), bukti_efektivitas_url: String(relation.bukti_efektivitas_url || ''), register: { kode: String(register.kode), unit_nama: String(register.unit_nama), peristiwa: String(register.peristiwa) }, control: { kode: String(control.kode), nama: String(control.nama), jenis: String(control.jenis) }, validation: Object.keys(validation).length ? { status: String(validation.status), catatan: String(validation.catatan || ''), validated_at: validation.validated_at ? String(validation.validated_at) : null } : null }
  }))

  return <div className="space-y-6">
    <SectionHeading eyebrow="Matriks Risiko UPG KPK 5×5" title="Penilaian Risiko" description={data.access.isUpgPusat ? 'UPG Pusat memantau hasil penilaian dan peta risiko setiap satker dalam mode hanya-baca.' : 'UPG Satker mengadopsi risiko generik dari library UPG Pusat dan menilainya sesuai konteks unitnya.'} />
    {data.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Data penilaian belum dapat dimuat: {data.error}</div>}

    {canInput ? <form action={addPpgRegister} className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2">
      <div className="sm:col-span-2"><h3 className="font-bold">Tambah penilaian risiko</h3><p className="mt-1 text-xs text-slate-500">{data.access.isAdmin ? 'Mode Admin Sistem: dapat menambahkan penilaian untuk satker mana pun.' : 'Penilaian otomatis dicatat atas nama satker akun Anda.'}</p></div>
      {data.access.isAdmin ? <div className="space-y-1 sm:col-span-2"><span className="text-xs font-semibold text-slate-600">Satker penilai</span><SearchableUnitSelect units={data.units as { id: string; nama_unit: string }[]} name="unit_kerja_id" required /></div> : <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 sm:col-span-2"><b>Satker penilai</b><p>{String(ownUnit?.nama_unit || 'Unit akun belum tersedia')}</p></div>}
      {data.libraryOptions.length ? <RiskLibrarySelect options={data.libraryOptions as LibraryOptions} /> : <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">Risk and Control Library masih kosong. UPG Pusat perlu menambahkan referensi risiko terlebih dahulu.</div>}
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Tahun</span><input name="tahun" type="number" min="2000" max="2200" defaultValue={new Date().getFullYear()} required className={input} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Periode</span><PpgCombobox name="periode" required defaultValue="Tahunan" placeholder="Pilih periode penilaian" options={PPG_ASSESSMENT_PERIODS.map((periode) => ({ value: periode, label: periode }))} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Probabilitas potensi gratifikasi</span><PpgCombobox name="kemungkinan" required defaultValue="1" placeholder="Pilih probabilitas" options={PPG_PROBABILITY_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
      <label className="space-y-1 text-xs font-semibold text-slate-600"><span>Dampak gratifikasi</span><PpgCombobox name="dampak" required defaultValue="1" placeholder="Pilih dampak" options={PPG_IMPACT_OPTIONS.map((item) => ({ value: String(item.value), label: item.label }))} /></label>
      <button disabled={!data.libraryOptions.length || (data.access.isSatker && !ownUnit)} className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40 sm:col-span-2">Simpan penilaian</button>
    </form> : <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-950"><b>Mode hanya-baca UPG Pusat.</b> Input dan perubahan penilaian dilakukan oleh UPG Satker. Admin Sistem tetap dapat melakukan koreksi penuh bila diperlukan.</div>}

    <PpgRiskMatrixExplorer units={data.units as MatrixProps['units']} risks={data.rows as MatrixProps['risks']} fixedUnitId={data.access.isSatker ? data.access.unitId : null} />

    <RiskControlEvidencePanel rows={evidenceRows} canValidate={data.access.isPusat} canEdit={data.access.isAdmin || data.access.isSatker} />

    {tableRows.length ? <ManagedDataTable title={data.access.isSatker ? 'Hasil penilaian risiko satker Anda' : 'Hasil penilaian risiko seluruh satker'} deleteKind="register" canDelete={data.access.isAdmin || data.access.isSatker} emptyMessage="Belum ada penilaian risiko." rows={tableRows} columns={[{ key: 'kode', label: 'Kode', className: 'font-mono font-semibold' }, { key: 'satker', label: 'Satker penilai' }, { key: 'tahun', label: 'Tahun' }, { key: 'periode', label: 'Periode' }, { key: 'kategori', label: 'Kategori' }, { key: 'proses', label: 'Proses / Subproses' }, { key: 'klasifikasi', label: 'Klasifikasi' }, { key: 'peristiwa', label: 'Peristiwa' }, { key: 'kemungkinan', label: 'K' }, { key: 'dampak', label: 'D' }, { key: 'skor', label: 'Skor' }, { key: 'level', label: 'Level' }]} /> : <EmptyState title="Belum ada penilaian" description={data.access.isUpgPusat ? 'Belum ada hasil penilaian risiko yang dikirimkan UPG Satker.' : 'Pilih risiko dari library untuk memulai penilaian.'} />}
  </div>
}

function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
