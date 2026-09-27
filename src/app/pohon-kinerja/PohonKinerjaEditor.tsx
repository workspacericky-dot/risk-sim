'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Save, Trash2, X } from 'lucide-react'
import { type Crosscut, type Indicator, type Level, type PohonNode, type PohonSource } from '@/lib/pohon-types'

const levels: { value: Level; label: string }[] = [
  { value: 'atas', label: 'Strategis' }, { value: 'menengah', label: 'Antara / wilayah' },
  { value: 'taktis', label: 'Taktis' }, { value: 'operasional', label: 'Operasional' },
]
const emptyIndicator = (): Exclude<Indicator, string> => ({ nama: '', satuan: '', baseline: '', target: '', tahun_target: '', sumber_data: '' })

type Props = {
  source: PohonSource; selected: string; dirty: boolean; busy: boolean; message: string;
  onChange: (source: PohonSource) => void; onSelect: (id: string) => void;
  onSave: () => void; onDiscard: () => void; onClose: () => void;
}

export default function PohonKinerjaEditor({ source, selected, dirty, busy, message, onChange, onSelect, onSave, onDiscard, onClose }: Props) {
  const [newId, setNewId] = useState('')
  const [codeDraft, setCodeDraft] = useState({ nodeId: '', value: '' })
  const [newTitle, setNewTitle] = useState('')
  const [crossName, setCrossName] = useState('')
  const [crossTarget, setCrossTarget] = useState('')
  const [crossType, setCrossType] = useState<'internal' | 'external'>('internal')
  const node = source.nodes.find(item => item.id === selected) ?? source.nodes[0]
  const parent = source.edges.find(edge => edge.to === node.id)?.from ?? ''
  const children = source.edges.filter(edge => edge.from === node.id).map(edge => edge.to)
  const descendants = new Set<string>([node.id])
  for (let i = 0; i < source.nodes.length; i++) for (const edge of source.edges) if (descendants.has(edge.from)) descendants.add(edge.to)

  function changeNode(patch: Partial<PohonNode>) {
    onChange({ ...source, nodes: source.nodes.map(item => item.id === node.id ? { ...item, ...patch } : item) })
  }
  function renameNode() {
    const id = (codeDraft.nodeId === node.id ? codeDraft.value : node.id).trim()
    if (!id || id === node.id) return
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return alert('Kode harus 1-40 karakter: huruf, angka, garis bawah, atau tanda hubung.')
    if (source.nodes.some(item => item.id === id)) return alert('Kode simpul sudah digunakan.')
    const oldId = node.id
    onChange({
      nodes: source.nodes.map(item => ({ ...item, id: item.id === oldId ? id : item.id,
        crosscuts: item.crosscuts?.map(cross => cross.targetId === oldId ? { ...cross, targetId: id } : cross) })),
      edges: source.edges.map(edge => ({ from: edge.from === oldId ? id : edge.from, to: edge.to === oldId ? id : edge.to })),
    })
    onSelect(id)
    setCodeDraft({ nodeId: '', value: '' })
  }
  function addNode() {
    const id = newId.trim()
    const title = newTitle.trim()
    if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return alert('Kode harus 1-40 karakter: huruf, angka, garis bawah, atau tanda hubung.')
    if (source.nodes.some(item => item.id === id)) return alert('Kode simpul sudah digunakan.')
    if (!title) return alert('Nama kinerja wajib diisi.')
    const nextLevel: Level = node.level === 'atas' ? 'menengah' : node.level === 'menengah' ? 'taktis' : 'operasional'
    onChange({ nodes: [...source.nodes, { id, title, level: nextLevel, indicators: [] }], edges: [...source.edges, { from: node.id, to: id }] })
    onSelect(id)
    setNewId(''); setNewTitle('')
  }
  function removeNode() {
    if (children.length) return alert('Pindahkan atau hapus seluruh simpul anak terlebih dahulu.')
    if (source.nodes.length === 1) return alert('Diagram harus memiliki minimal satu simpul.')
    if (!confirm(`Hapus kinerja ${node.id}?`)) return
    onChange({ nodes: source.nodes.filter(item => item.id !== node.id).map(item => ({ ...item, crosscuts: item.crosscuts?.filter(cross => cross.targetId !== node.id) })), edges: source.edges.filter(edge => edge.from !== node.id && edge.to !== node.id) })
    onSelect(parent || source.nodes.find(item => item.id !== node.id)!.id)
  }
  function changeParent(value: string) {
    onChange({ ...source, edges: [...source.edges.filter(edge => edge.to !== node.id), ...(value ? [{ from: value, to: node.id }] : [])] })
  }
  function moveSibling(direction: -1 | 1) {
    if (!parent) return
    const edges = [...source.edges]
    const positions = edges.map((edge, index) => edge.from === parent ? index : -1).filter(index => index >= 0)
    const current = positions.findIndex(index => edges[index].to === node.id)
    const other = current + direction
    if (other < 0 || other >= positions.length) return
    const a = positions[current], b = positions[other]
    ;[edges[a], edges[b]] = [edges[b], edges[a]]
    onChange({ ...source, edges })
  }
  function changeIndicator(index: number, patch: Partial<Exclude<Indicator, string>>) {
    changeNode({ indicators: node.indicators.map((item, i) => i === index ? { ...(typeof item === 'string' ? { nama: item } : item), ...patch } : item) })
  }
  function addCrosscut() {
    const name = crossName.trim()
    if (!name) return alert('Nama aktor atau unit wajib diisi.')
    const crosscut: Crosscut = { id: crypto.randomUUID(), name, type: crossType, targetId: crossTarget || undefined, outcome: '', color: crossType === 'internal' ? '#0369a1' : '#c2410c' }
    changeNode({ crosscuts: [...(node.crosscuts ?? []), crosscut] })
    setCrossName(''); setCrossTarget('')
  }
  function updateCrosscut(index: number, patch: Partial<Crosscut>) {
    changeNode({ crosscuts: (node.crosscuts ?? []).map((item, i) => i === index ? { ...item, ...patch } : item) })
  }
  const input = 'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-emerald-600'
  const label = 'block text-xs font-bold text-slate-600'

  return <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[520px] flex-col border-l border-slate-200 bg-white shadow-2xl" aria-label="Sunting pohon kinerja">
    <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4"><div><p className="text-xs font-bold uppercase tracking-wider text-emerald-700">Mode administrator</p><h2 className="font-serif text-xl font-bold text-slate-900">Sunting pohon kinerja</h2><p className="mt-1 text-xs text-slate-500">Perubahan tampil di diagram sebelum disimpan.</p></div><button onClick={onClose} className="rounded-lg p-2 hover:bg-slate-100" aria-label="Tutup editor"><X size={20} /></button></header>
    <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
      <label className={label}>Pilih kinerja<select className={input} value={node.id} onChange={event => onSelect(event.target.value)}>{source.nodes.map(item => <option key={item.id} value={item.id}>{item.id} - {item.title}</option>)}</select></label>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Kinerja {node.id}</h3>
        <div className="flex gap-2"><input className={input} value={codeDraft.nodeId === node.id ? codeDraft.value : node.id} onChange={event => setCodeDraft({ nodeId: node.id, value: event.target.value })} aria-label="Kode simpul" /><button onClick={renameNode} disabled={codeDraft.nodeId !== node.id || !codeDraft.value || codeDraft.value === node.id} className="mt-1 shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-50">Ubah kode</button></div>
        <label className={label}>Nama kinerja<textarea className={input} rows={3} value={node.title} onChange={event => changeNode({ title: event.target.value })} /></label>
        <label className={label}>Tingkat<select className={input} value={node.level} onChange={event => changeNode({ level: event.target.value as Level })}>{levels.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
        <label className={label}>Induk penjenjangan<select className={input} value={parent} onChange={event => changeParent(event.target.value)}><option value="">Tanpa induk (akar)</option>{source.nodes.filter(item => !descendants.has(item.id)).map(item => <option key={item.id} value={item.id}>{item.id} - {item.title}</option>)}</select></label>
        <label className={label}>Jabatan penanggung jawab<input className={input} value={node.owner ?? ''} onChange={event => changeNode({ owner: event.target.value })} placeholder="Contoh: Kepala Biro / Inspektur Wilayah" /></label>
        <div className="flex flex-wrap gap-2"><button onClick={() => moveSibling(-1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"><ArrowUp size={14} className="inline" /> Geser ke atas</button><button onClick={() => moveSibling(1)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold"><ArrowDown size={14} className="inline" /> Geser ke bawah</button><button onClick={removeNode} className="rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700"><Trash2 size={14} className="inline" /> Hapus simpul</button></div>
      </section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Indikator ({node.indicators.length})</h3>{node.indicators.map((item, index) => { const indicator = typeof item === 'string' ? { nama: item } : item; return <div key={index} className="space-y-2 rounded-lg bg-slate-50 p-3"><div className="flex justify-between"><strong className="text-xs text-slate-600">Indikator {index + 1}</strong><button onClick={() => changeNode({ indicators: node.indicators.filter((_, i) => i !== index) })} className="text-xs font-semibold text-rose-700">Hapus</button></div><label className={label}>Nama indikator<input className={input} value={indicator.nama} onChange={event => changeIndicator(index, { nama: event.target.value })} /></label><div className="grid grid-cols-2 gap-2">{(['satuan', 'baseline', 'target', 'tahun_target', 'sumber_data'] as const).map(key => <label key={key} className={`${label} ${key === 'sumber_data' ? 'col-span-2' : ''}`}>{({ satuan: 'Satuan', baseline: 'Baseline', target: 'Target', tahun_target: 'Tahun target', sumber_data: 'Sumber data' })[key]}<input className={input} value={indicator[key] ?? ''} onChange={event => changeIndicator(index, { [key]: event.target.value })} /></label>)}</div></div> })}<button onClick={() => changeNode({ indicators: [...node.indicators, emptyIndicator()] })} className="rounded-lg border border-emerald-300 px-3 py-2 text-xs font-bold text-emerald-800"><Plus size={14} className="inline" /> Tambah indikator</button></section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Crosscutting ({node.crosscuts?.length ?? 0})</h3><p className="text-xs leading-5 text-slate-500">Catat kontribusi unit internal atau lembaga luar yang berhubungan dengan kinerja ini.</p>{(node.crosscuts ?? []).map((item, index) => <div key={item.id} className="space-y-2 rounded-lg bg-slate-50 p-3"><div className="flex justify-between"><strong className="text-xs text-slate-600">{item.type === 'internal' ? 'Internal' : 'Eksternal'}</strong><button onClick={() => changeNode({ crosscuts: node.crosscuts?.filter((_, i) => i !== index) })} className="text-xs font-semibold text-rose-700">Hapus</button></div><label className={label}>Aktor / unit<input className={input} value={item.name} onChange={event => updateCrosscut(index, { name: event.target.value })} /></label><label className={label}>Kontribusi / hasil<input className={input} value={item.outcome ?? ''} onChange={event => updateCrosscut(index, { outcome: event.target.value })} /></label><label className={label}>Simpul terkait<select className={input} value={item.targetId ?? ''} onChange={event => updateCrosscut(index, { targetId: event.target.value || undefined })}><option value="">Tidak ditautkan</option>{source.nodes.filter(other => other.id !== node.id).map(other => <option key={other.id} value={other.id}>{other.id} - {other.title}</option>)}</select></label></div>)}<div className="grid grid-cols-2 gap-2"><input className={input} placeholder="Nama aktor / unit" value={crossName} onChange={event => setCrossName(event.target.value)} /><select className={input} value={crossType} onChange={event => setCrossType(event.target.value as 'internal' | 'external')}><option value="internal">Internal</option><option value="external">Eksternal</option></select><select className={`${input} col-span-2`} value={crossTarget} onChange={event => setCrossTarget(event.target.value)}><option value="">Simpul terkait (opsional)</option>{source.nodes.filter(other => other.id !== node.id).map(other => <option key={other.id} value={other.id}>{other.id} - {other.title}</option>)}</select></div><button onClick={addCrosscut} className="rounded-lg border border-sky-300 px-3 py-2 text-xs font-bold text-sky-800"><Plus size={14} className="inline" /> Tambah crosscutting</button></section>
      <section className="space-y-3 rounded-xl border border-slate-200 p-4"><h3 className="font-bold text-slate-900">Tambah anak dari {node.id}</h3><div className="grid grid-cols-3 gap-2"><input className={input} placeholder="Kode" value={newId} onChange={event => setNewId(event.target.value)} /><input className={`${input} col-span-2`} placeholder="Nama kinerja baru" value={newTitle} onChange={event => setNewTitle(event.target.value)} /></div><button onClick={addNode} className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white"><Plus size={14} className="inline" /> Tambah simpul</button></section>
    </div>
    <footer className="border-t border-slate-200 bg-white px-5 py-4"><p role="status" className={`mb-2 min-h-4 text-xs ${message.startsWith('Gagal') || message.startsWith('Diagram telah') ? 'text-rose-700' : 'text-slate-600'}`}>{message || (dirty ? 'Ada perubahan yang belum disimpan.' : 'Tidak ada perubahan.')}</p><div className="flex gap-2"><button disabled={!dirty || busy} onClick={onSave} className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><Save size={16} /> {busy ? 'Menyimpan...' : 'Simpan diagram'}</button><button disabled={!dirty || busy} onClick={onDiscard} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold disabled:opacity-50">Batalkan perubahan</button></div></footer>
  </aside>
}
