'use client'

import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { indicatorName, type Level, type PohonSource } from '@/lib/pohon-types'
import { savePohonKinerja } from './actions'
import PohonKinerjaEditor from './PohonKinerjaEditor'
import { ChevronDown, ChevronRight, Focus, Minus, Plus, Search, Waypoints, X } from 'lucide-react'
import styles from './pohon-kinerja.module.css'
import { useFloatingDetail } from './useFloatingDetail'

type Mode = 'ringkasan' | 'telusuri' | 'keselarasan'

const labels: Record<Level, string> = { atas: 'Strategis', menengah: 'Antara / wilayah', taktis: 'Taktis', operasional: 'Operasional' }
const reviewIds = new Set(['I2a', 'I2b', 'I2c', 'I2e', 'I2f', 'I2g'])

export default function PohonKinerjaExplorer({ source, revision, canEdit }: { source: PohonSource; revision: string; canEdit: boolean }) {
  const [draft, setDraft] = useState<PohonSource>(source)
  const [saved, setSaved] = useState<PohonSource>(source)
  const [currentRevision, setCurrentRevision] = useState(revision)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  const nodes = draft.nodes
  const byId = new Map(nodes.map(node => [node.id, node]))
  const children = new Map<string, string[]>()
  const parent = new Map<string, string>()
  for (const edge of draft.edges) {
    children.set(edge.from, [...(children.get(edge.from) ?? []), edge.to])
    parent.set(edge.to, edge.from)
  }
  const roots = nodes.filter(node => !parent.has(node.id))
  function pathTo(id: string) {
    const path: string[] = []
    let current: string | undefined = id
    while (current) {
      path.unshift(current)
      current = parent.get(current)
    }
    return path
  }

  const [selected, setSelected] = useState(source.nodes[0]?.id ?? '')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [mode, setMode] = useState<Mode>('telusuri')
  const [query, setQuery] = useState('')
  const [level, setLevel] = useState<'semua' | Level>('semua')
  const [region, setRegion] = useState('semua')
  const [zoom, setZoom] = useState(1)
  const [detailOpen, setDetailOpen] = useState(false)
  const { canvasScrollRef, detailSlotRef, position } = useFloatingDetail(selected, expanded, zoom, mode, region)

  const selectedNode = byId.get(selected) ?? roots[0]
  const selectedPath = pathTo(selected)
  const pathSet = new Set(selectedPath)
  const descendants = children.get(selected) ?? []

  const results = (() => {
    const term = query.trim().toLocaleLowerCase('id-ID')
    if (!term) return []
    return nodes.filter(node =>
      (level === 'semua' || node.level === level) &&
      (region === 'semua' || node.id.startsWith(`I${region}`) || node.id === `A${region}` || node.id === `B${region}`) &&
      (node.title.toLocaleLowerCase('id-ID').includes(term) || node.indicators.some(indicator => indicatorName(indicator).toLocaleLowerCase('id-ID').includes(term)))
    ).slice(0, 25)
  })()

  async function save() {
    if (!canEdit || !dirty || saving) return
    setSaving(true)
    setSaveMessage('')
    try {
      const result = await savePohonKinerja(draft, currentRevision)
      if (result.error) setSaveMessage(result.error)
      else if (result.revision) {
        setSaved(draft)
        setCurrentRevision(result.revision)
        setSaveMessage('Diagram berhasil disimpan.')
      }
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Gagal menyimpan diagram.')
    } finally { setSaving(false) }
  }

  function discard() {
    setDraft(saved)
    if (!saved.nodes.some(node => node.id === selected)) setSelected(saved.nodes[0]?.id ?? '')
    setSaveMessage('Perubahan dibatalkan.')
  }

  function select(id: string) {
    setSelected(id)
    setExpanded(previous => new Set([...previous, ...(byId.has(id) ? pathTo(id).slice(0, -1) : pathTo(selected))]))
    setDetailOpen(true)
  }

  function toggle(id: string) {
    setExpanded(previous => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function visibleChildren(id: string) {
    const all = children.get(id) ?? []
    if (region === 'semua' || !['A', 'B'].includes(id)) return all
    return all.filter(child => child === `${id}${region}`)
  }

  function branch(id: string): React.ReactNode {
    const node = byId.get(id)
    if (!node) return null
    const childIds = visibleChildren(id)
    const open = mode !== 'ringkasan' && expanded.has(id) && childIds.length > 0
    const active = selected === id
    const onPath = pathSet.has(id)
    return (
      <div className={styles.branch} key={id}>
        <div data-node-id={id} className={`${styles.node} ${styles[node.level]} ${active ? styles.active : ''} ${onPath && !active ? styles.onPath : ''} ${mode === 'keselarasan' && !reviewIds.has(id) && node.level === 'operasional' ? styles.dimmed : ''}`}>
          <button type="button" onClick={() => select(id)} className={styles.nodeMain} aria-pressed={active}>
            <span className={styles.nodeMeta}><span>{labels[node.level]}</span><span>{id}</span></span>
            <span className={styles.nodeTitle}>{node.title}</span>
            <span className={styles.nodeFoot}>{node.indicators.length} indikator {node.crosscuts?.length ? '| ' + node.crosscuts.length + ' crosscutting' : ''} {node.owner ? '| Penanggung jawab terisi' : ''} {reviewIds.has(id) && mode === 'keselarasan' ? '· Perlu telaah' : ''}</span>
          </button>
          {childIds.length > 0 && mode !== 'ringkasan' && <button type="button" onClick={() => toggle(id)} className={styles.expand} aria-label={`${open ? 'Tutup' : 'Buka'} ${childIds.length} cabang ${node.title}`} aria-expanded={open}>{open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}<span>{childIds.length}</span></button>}
        </div>
        {open && <div className={styles.children}>{childIds.map(branch)}</div>}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[1800px]">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-800">Peta kontribusi kinerja · 2025</p><h1 className="mt-1 font-serif text-3xl font-bold text-slate-900">Pohon Kinerja Bawas MA</h1><p className="mt-2 text-sm text-slate-600">{nodes.length} sasaran · {draft.edges.length} hubungan · {nodes.reduce((total, node) => total + node.indicators.length, 0)} indikator</p></div>
        {canEdit && <button type="button" onClick={() => setEditing(true)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-900"><Pencil size={16} /> Sunting diagram{dirty ? " *" : ""}</button>}
      </div>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Pencarian dan filter">
          <h2 className="text-sm font-bold text-slate-900">Temukan kinerja</h2>
          <label className="relative mt-4 block"><Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Cari sasaran atau indikator" className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-emerald-500" /></label>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className="text-xs font-semibold text-slate-500">Tingkat<select value={level} onChange={event => setLevel(event.target.value as 'semua' | Level)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal text-slate-700"><option value="semua">Semua</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
            <label className="text-xs font-semibold text-slate-500">Wilayah<select value={region} onChange={event => setRegion(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm font-normal text-slate-700"><option value="semua">Semua</option>{['I', 'II', 'III', 'IV'].map((name, i) => <option key={name} value={i + 1}>Wilayah {name}</option>)}</select></label>
          </div>
          {query.trim() ? <div className="mt-5"><p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{results.length} hasil teratas</p><div className={styles.results}>{results.map(node => <button key={node.id} onClick={() => select(node.id)} className="w-full rounded-xl border border-slate-100 bg-white p-3 text-left hover:border-emerald-300 hover:bg-emerald-50"><span className="text-[10px] font-bold uppercase text-emerald-700">{node.id} · {labels[node.level]}</span><span className="mt-1 block text-xs font-medium leading-5 text-slate-700">{node.title}</span></button>)}{results.length === 0 && <p className="text-xs text-slate-500">Tidak ada sasaran atau indikator yang cocok.</p>}</div></div> : <div className="mt-6 space-y-3 text-xs leading-5 text-slate-600"><p><strong className="text-slate-800">Cara membaca:</strong> buka cabang dari hasil strategis ke kontribusi operasional. Pilih simpul untuk melihat indikator lengkap dan jalur ke atas.</p><div className="rounded-xl bg-emerald-50 p-3 text-emerald-900">Empat simpul taktis pada cabang sekretariat adalah rumusan usulan dalam diagram sumber.</div></div>}
        </aside>

        <section className={styles.canvasPanel} aria-label="Pohon kinerja interaktif">
          <div className={styles.toolbar}><div className="flex flex-wrap gap-1">{([['ringkasan', 'Ringkasan'], ['telusuri', 'Telusuri cabang'], ['keselarasan', 'Periksa keselarasan']] as const).map(([value, label]) => <button key={value} onClick={() => setMode(value)} aria-pressed={mode === value} className={`${styles.modeButton} ${mode === value ? styles.modeActive : ''}`}>{label}</button>)}</div><div className="flex items-center gap-1"><button onClick={() => setZoom(value => Math.max(.7, +(value - .1).toFixed(1)))} aria-label="Perkecil" className={styles.toolButton}><Minus size={16} /></button><span className="w-10 text-center text-xs font-semibold text-slate-500">{Math.round(zoom * 100)}%</span><button onClick={() => setZoom(value => Math.min(1.3, +(value + .1).toFixed(1)))} aria-label="Perbesar" className={styles.toolButton}><Plus size={16} /></button><button onClick={() => { setZoom(1); setExpanded(new Set()); setSelected(roots[0]?.id ?? '') }} aria-label="Pusatkan kembali" className={styles.toolButton}><Focus size={16} /></button></div></div>
          <div ref={canvasScrollRef} className={styles.canvasScroll}><div className={styles.canvas} style={{ zoom }}>{roots.map(root => branch(root.id))}</div></div>
          <div className={styles.canvasFooter}><span><span className={styles.dotStrategic} /> Strategis</span><span><span className={styles.dotMiddle} /> Antara</span><span><span className={styles.dotTactical} /> Taktis (usulan)</span><span><span className={styles.dotOperational} /> Operasional</span></div>
        </section>

        <div ref={detailSlotRef} className={styles.detailSlot}>
        <aside className={`${styles.detail} ${detailOpen ? styles.detailOpen : ''}`} style={position ? { ...position, position: 'fixed', zIndex: 25, maxHeight: 'none' } : undefined} aria-label="Detail simpul kinerja">
          <button onClick={() => setDetailOpen(false)} className={styles.closeDetail} aria-label="Tutup detail"><X size={20} /></button>
          <p className="text-xs font-bold uppercase tracking-[.17em] text-emerald-700">Detail kinerja · {selectedNode.id}</p>
          <span className={`${styles.levelTag} ${styles[selectedNode.level]}`}>{labels[selectedNode.level]}</span>
          <h2 className="mt-4 font-serif text-xl font-bold leading-snug text-slate-900">{selectedNode.title}</h2>
          <p className="mt-3 text-xs text-slate-500">{selectedNode.level === 'taktis' ? 'Rumusan usulan dalam diagram 2025' : 'Sesuai diagram kinerja 2025'}</p>
          {reviewIds.has(selectedNode.id) && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900"><strong>Perlu telaah keselarasan.</strong> Indikator operasional Wilayah II ini belum memiliki padanan yang jelas pada rumusan indikator induk di diagram sumber. Perlu verifikasi dokumen PK.</div>}
          <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Indikator ({selectedNode.indicators.length})</h3><ol className="mt-3 space-y-2">{selectedNode.indicators.map((indicator, index) => <li key={index} className="flex gap-3 rounded-xl bg-slate-50 p-3 text-sm leading-5 text-slate-700"><span className="font-mono text-xs font-bold text-emerald-700">{String(index + 1).padStart(2, '0')}</span><span>{indicatorName(indicator)}{typeof indicator !== 'string' && <small className="mt-1 block text-slate-500">{[indicator.satuan, indicator.baseline && 'Baseline: ' + indicator.baseline, indicator.target && 'Target: ' + indicator.target, indicator.tahun_target && 'Tahun: ' + indicator.tahun_target, indicator.sumber_data && 'Sumber: ' + indicator.sumber_data].filter(Boolean).join(' | ')}</small>}</span></li>)}</ol></div>
          {selectedNode.owner && <div className="mt-5 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-900"><strong>Penanggung jawab:</strong> {selectedNode.owner}</div>}
          {(selectedNode.crosscuts?.length ?? 0) > 0 && <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Crosscutting</h3><div className="mt-3 space-y-2">{selectedNode.crosscuts?.map(cross => <div key={cross.id} className="rounded-xl border border-sky-100 bg-sky-50 p-3 text-xs text-slate-700"><strong>{cross.name}</strong> ({cross.type === 'internal' ? 'Internal' : 'Eksternal'}){cross.outcome && <p className="mt-1">{cross.outcome}</p>}{cross.targetId && <button onClick={() => select(cross.targetId!)} className="mt-1 font-bold text-sky-700">Lihat {cross.targetId}</button>}</div>)}</div></div>}
          <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500"><Waypoints size={15} /> Jalur kontribusi</h3><div className="mt-3 flex flex-wrap items-center gap-1">{selectedPath.map((id, index) => <span key={id} className="flex items-center gap-1"><button onClick={() => select(id)} className={`rounded-lg px-2 py-1 text-xs font-semibold ${id === selected ? 'bg-emerald-800 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'}`}>{id}</button>{index < selectedPath.length - 1 && <ChevronRight size={13} className="text-slate-400" />}</span>)}</div></div>
          <div className="mt-6 border-t border-slate-100 pt-5"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Kontribusi di bawahnya ({descendants.length})</h3>{descendants.length ? <div className="mt-3 space-y-2">{descendants.map(id => <button key={id} onClick={() => select(id)} className="w-full rounded-xl border border-slate-200 p-3 text-left text-xs leading-5 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50"><strong className="mr-2 text-emerald-700">{id}</strong>{byId.get(id)?.title}</button>)}</div> : <p className="mt-3 text-xs text-slate-500">Simpul operasional terakhir pada cabang ini.</p>}</div>
          <p className="mt-7 border-t border-slate-100 pt-4 text-[11px] leading-5 text-slate-500">Data awal: cascading-2025.md. Perubahan administrator ditampilkan setelah disimpan.</p>
        </aside>
        </div>
      </div>
      {editing && canEdit && <PohonKinerjaEditor source={draft} selected={selected} dirty={dirty} busy={saving} message={saveMessage} onChange={setDraft} onSelect={id => { setRegion('semua'); setMode('telusuri'); select(id) }} onSave={save} onDiscard={discard} onClose={() => setEditing(false)} />}
    </div>
  )
}
