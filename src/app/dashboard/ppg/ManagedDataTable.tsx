'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Link2, Search, Trash2, X } from 'lucide-react'
import { deletePpgRegister, setPpgControlStatus, setPpgRiskLibraryStatus, updatePpgControlRisks, updatePpgRiskControls } from './actions'
import { PpgMultiCombobox } from './PpgMultiCombobox'

type Row = { id: string; [key: string]: string | number | boolean | string[] | null | undefined }
type Column = { key: string; label: string; className?: string; searchable?: boolean }
type DeleteKind = 'risk_library' | 'control_library' | 'register'
type Relationship = { kind: 'risk_controls' | 'control_risks'; options: { value: string; label: string; description?: string }[] }

const deleteActions = { risk_library: setPpgRiskLibraryStatus, control_library: setPpgControlStatus, register: deletePpgRegister }

export function ManagedDataTable({ title, rows, columns, deleteKind, emptyMessage, canDelete = true, relationship }: { title: string; rows: Row[]; columns: Column[]; deleteKind: DeleteKind; emptyMessage: string; canDelete?: boolean; relationship?: Relationship }) {
  const [pageSize, setPageSize] = useState(5)
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const filtered = useMemo(() => rows.filter((row) => columns.every((column) => {
    const keyword = (filters[column.key] || '').trim().toLocaleLowerCase('id-ID')
    return !keyword || String(row[column.key] ?? '').toLocaleLowerCase('id-ID').includes(keyword)
  })), [columns, filters, rows])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const displayed = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  return <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5">
      <div><h3 className="font-bold text-slate-900">{title}</h3><p className="mt-1 text-xs text-slate-500">Menampilkan {displayed.length} dari {filtered.length} hasil · {rows.length} entri seluruhnya</p></div>
      <label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Tampilkan<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="5">5</option><option value="10">10</option><option value="100">100</option></select>entri</label>
    </div>
    {rows.length ? <>
      <div className="overflow-x-auto"><table className="w-full min-w-max text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>
        {columns.map((column) => <th key={column.key} className={`p-3 align-top ${column.className || ''}`}><span className="font-semibold">{column.label}</span>{column.searchable !== false && <label className="mt-2 flex min-w-28 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5"><Search className="h-3.5 w-3.5 shrink-0 text-slate-400" /><input value={filters[column.key] || ''} onChange={(event) => { const value = event.target.value; setFilters((current) => ({ ...current, [column.key]: value })); setPage(1) }} aria-label={`Cari berdasarkan ${column.label}`} placeholder={`Cari ${column.label.toLowerCase()}`} className="w-full bg-transparent text-xs font-normal text-slate-700 outline-none placeholder:text-slate-400" /></label>}</th>)}
        {canDelete && <th className="p-3 text-center">Aksi</th>}
      </tr></thead><tbody>{displayed.map((row) => <tr key={row.id} className="border-t border-slate-100 align-top hover:bg-slate-50/70">
        {columns.map((column) => <td key={column.key} className={`max-w-md whitespace-pre-line p-3 ${column.className || ''}`}>{String(row[column.key] ?? '—')}</td>)}
        {canDelete && <td className="p-3 text-center"><RowAction row={row} kind={deleteKind} title={title} label={String(row[columns[0]?.key] || 'entri')} relationship={relationship} /></td>}
      </tr>)}</tbody></table></div>
      {!filtered.length && <p className="p-8 text-center text-sm text-slate-500">Tidak ada entri yang cocok dengan kombinasi filter.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4"><p className="text-xs text-slate-500">Halaman {currentPage} dari {pageCount}</p><nav aria-label={`Halaman ${title}`} className="flex items-center gap-1"><PageButton label="Sebelumnya" disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}><ChevronLeft className="h-4 w-4" /></PageButton>{pageNumbers(currentPage, pageCount).map((value, index) => value === '…' ? <span key={`ellipsis-${index}`} className="px-2 text-slate-400">…</span> : <button key={value} type="button" onClick={() => setPage(value)} aria-current={value === currentPage ? 'page' : undefined} className={`h-8 min-w-8 rounded-lg px-2 text-xs font-semibold ${value === currentPage ? 'bg-indigo-700 text-white' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>{value}</button>)}<PageButton label="Berikutnya" disabled={currentPage === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}><ChevronRight className="h-4 w-4" /></PageButton></nav></div>
    </> : <p className="p-8 text-center text-sm text-slate-500">{emptyMessage}</p>}
  </section>
}

function RowAction({ row, kind, title, label, relationship }: { row: Row; kind: DeleteKind; title: string; label: string; relationship?: Relationship }) {
  const [editingRelationship, setEditingRelationship] = useState(false)
  if (kind === 'risk_library' || kind === 'control_library') return <div className="grid min-w-44 gap-2 text-left">
    <form action={deleteActions[kind]} onSubmit={(event) => handleAction(event, kind, title)} className="grid gap-1.5">
      <input type="hidden" name="id" value={row.id} />
      <select name="status" defaultValue={String(row.status_raw || 'draft')} aria-label={`Status ${label}`} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"><option value="draft">Draf</option><option value="review">Review</option><option value="aktif">Aktif</option><option value="nonaktif">Nonaktif</option></select>
      <input name="alasan_nonaktif" defaultValue={row.status_raw === 'nonaktif' ? String(row.alasan_nonaktif || '') : ''} placeholder="Alasan jika nonaktif" className="rounded-lg border border-slate-300 px-2 py-1.5 text-xs" />
      <button type="submit" className="rounded-lg bg-indigo-700 px-2 py-1.5 text-xs font-semibold text-white hover:bg-indigo-800">Simpan status</button>
    </form>
    {relationship && !row.relation_disabled && <button type="button" onClick={() => setEditingRelationship(true)} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-indigo-200 px-2 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><Link2 className="size-3.5" />Edit keterkaitan</button>}
    {editingRelationship && relationship && <RelationshipDialog row={row} relationship={relationship} onClose={() => setEditingRelationship(false)} />}
  </div>
  return <form action={deleteActions[kind]} onSubmit={(event) => handleAction(event, kind, title)}>
    <input type="hidden" name="id" value={row.id} />
    <button type="submit" title="Hapus entri" aria-label={`Hapus ${label}`} className="inline-flex rounded-lg border border-rose-200 p-2 text-rose-700 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button>
  </form>
}

function RelationshipDialog({ row, relationship, onClose }: { row: Row; relationship: Relationship; onClose: () => void }) {
  const riskMode = relationship.kind === 'risk_controls'
  const action = riskMode ? updatePpgRiskControls : updatePpgControlRisks
  return <div role="dialog" aria-modal="true" aria-label={`Edit keterkaitan ${String(row.kode || row.nama || '')}`} className="fixed inset-0 z-[100] flex items-center justify-center p-4">
    <button type="button" aria-label="Tutup dialog" onClick={onClose} className="absolute inset-0 bg-slate-950/45" />
    <form action={action} onSubmit={onClose} className="relative z-10 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
      <div className="flex items-start justify-between gap-4"><div><h3 className="font-bold text-slate-900">Edit keterkaitan</h3><p className="mt-1 text-xs text-slate-500">{String(row.kode || '')} · {String(row.nama || row.peristiwa || '')}</p></div><button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="size-4" /></button></div>
      <input type="hidden" name={riskMode ? 'risk_library_id' : 'control_id'} value={row.id} />
      <label className="mt-4 grid min-w-0 gap-1 text-xs font-semibold text-slate-600">{riskMode ? 'Kontrol terkait' : 'Risiko terkait'}
        <PpgMultiCombobox name={riskMode ? 'control_ids' : 'risk_library_ids'} required={!riskMode && row.status_raw === 'aktif'} defaultValues={Array.isArray(row.relation_values) ? row.relation_values : []} placeholder={riskMode ? 'Pilih satu atau beberapa kontrol' : 'Pilih satu atau beberapa risiko'} options={relationship.options} />
      </label>
      <p className="mt-2 text-xs text-slate-500">{riskMode ? 'Draf risiko boleh disimpan tanpa kontrol dan dilengkapi kemudian.' : row.status_raw === 'aktif' ? 'Kontrol aktif harus tetap memiliki minimal satu risiko terkait.' : 'Relasi dapat dikosongkan selama kontrol belum aktif.'}</p>
      <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600">Batal</button><button className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Simpan keterkaitan</button></div>
    </form>
  </div>
}

function handleAction(event: React.FormEvent<HTMLFormElement>, kind: DeleteKind, title: string) {
  if (kind === 'risk_library' || kind === 'control_library') {
    const statusField = event.currentTarget.elements.namedItem('status')
    const reasonField = event.currentTarget.elements.namedItem('alasan_nonaktif')
    const status = statusField instanceof HTMLSelectElement ? statusField.value : ''
    const reason = reasonField instanceof HTMLInputElement ? reasonField.value.trim() : ''
    if (status === 'nonaktif' && reason.length < 5) { window.alert('Alasan penonaktifan wajib diisi minimal 5 karakter.'); event.preventDefault(); return }
    if (!window.confirm(`Ubah status ${kind === 'risk_library' ? 'risiko' : 'kontrol'} menjadi ${status.toUpperCase()}?`)) event.preventDefault()
    return
  }
  if (!window.confirm(`Hapus entri ini dari ${title}? Tindakan tidak dapat dibatalkan.`)) event.preventDefault()
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: React.ReactNode }) { return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">{children}</button> }
function pageNumbers(current: number, count: number): (number | '…')[] { if (count <= 7) return Array.from({ length: count }, (_, index) => index + 1); if (current <= 4) return [1, 2, 3, 4, 5, '…', count]; if (current >= count - 3) return [1, '…', count - 4, count - 3, count - 2, count - 1, count]; return [1, '…', current - 1, current, current + 1, '…', count] }
