import { updatePpgRiskControlEvidence, validatePpgRiskControlEvidence } from '../actions'

type EvidenceRow = {
  risk_id: string
  control_id: string
  efektivitas: string
  bukti_efektivitas_url: string
  register: { kode: string; unit_nama: string; peristiwa: string }
  control: { kode: string; nama: string; jenis: string }
  validation?: { status: string; catatan: string; validated_at: string | null } | null
}

export function RiskControlEvidencePanel({ rows, canValidate, canEdit }: { rows: EvidenceRow[]; canValidate: boolean; canEdit: boolean }) {
  if (!rows.length) return null
  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="border-b border-slate-200 p-5"><h3 className="font-bold text-slate-900">Monitoring bukti efektivitas kontrol</h3><p className="mt-1 text-xs text-slate-500">Kontrol aktual yang dinilai UPG Satker. Validasi bukti tidak mengubah skor risiko satker.</p></div>
    <div className="overflow-x-auto"><table className="w-full min-w-[1250px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{['Satker / risiko','Kontrol','Efektivitas','Bukti','Pembaruan bukti','Validasi UPG Pusat'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={`${row.risk_id}-${row.control_id}`} className="border-t border-slate-100 align-top">
      <td className="max-w-xs p-3"><b>{row.register.unit_nama}</b><span className="mt-1 block font-mono text-xs text-indigo-700">{row.register.kode}</span><span className="mt-1 block text-xs text-slate-500">{row.register.peristiwa}</span></td>
      <td className="p-3"><b className="font-mono text-indigo-700">{row.control.kode}</b><span className="ml-1">· {row.control.nama}</span><span className="mt-1 block text-xs text-slate-500">{row.control.jenis}</span></td>
      <td className="p-3 capitalize">{row.efektivitas.replaceAll('_', ' ')}</td>
      <td className="p-3">{row.bukti_efektivitas_url ? <a href={row.bukti_efektivitas_url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-700 underline">Buka bukti</a> : <span className="text-slate-400">Belum ada</span>}</td>
      <td className="p-3">{canEdit ? <details><summary className="cursor-pointer text-xs font-semibold text-indigo-700">Ubah penilaian/bukti</summary><form action={updatePpgRiskControlEvidence} className="mt-2 grid min-w-64 gap-2"><input type="hidden" name="risk_id" value={row.risk_id} /><input type="hidden" name="control_id" value={row.control_id} /><select name="efektivitas" defaultValue={row.efektivitas} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="belum_dinilai">Belum dinilai</option><option value="tidak_efektif">Tidak efektif</option><option value="sebagian">Sebagian efektif</option><option value="efektif">Efektif</option></select><input name="bukti_efektivitas_url" type="url" defaultValue={row.bukti_efektivitas_url} placeholder="Tautan Drive/OneDrive" className="h-8 rounded-lg border border-slate-300 px-2 text-xs" /><button className="rounded-lg bg-indigo-700 px-2 py-1.5 text-xs font-semibold text-white">Kirim ulang bukti</button></form></details> : <span className="text-xs text-slate-400">Oleh UPG Satker</span>}</td>
      <td className="p-3">{canValidate ? <form action={validatePpgRiskControlEvidence} className="grid min-w-56 gap-2"><input type="hidden" name="risk_id" value={row.risk_id} /><input type="hidden" name="control_id" value={row.control_id} /><select name="status" defaultValue={row.validation?.status ?? 'belum_ditinjau'} className="h-8 rounded-lg border border-slate-300 bg-white px-2 text-xs"><option value="belum_ditinjau">Belum ditinjau</option><option value="disetujui">Disetujui</option><option value="perlu_perbaikan">Perlu perbaikan</option><option value="ditolak">Ditolak</option></select><input name="catatan" defaultValue={row.validation?.catatan ?? ''} placeholder="Catatan validasi" className="h-8 rounded-lg border border-slate-300 px-2 text-xs" /><button className="rounded-lg bg-cyan-700 px-2 py-1.5 text-xs font-semibold text-white">Simpan validasi</button></form> : <div><b className="capitalize">{(row.validation?.status ?? 'belum_ditinjau').replaceAll('_', ' ')}</b>{row.validation?.catatan && <p className="mt-1 text-xs text-slate-500">{row.validation.catatan}</p>}</div>}</td>
    </tr>)}</tbody></table></div>
  </section>
}
