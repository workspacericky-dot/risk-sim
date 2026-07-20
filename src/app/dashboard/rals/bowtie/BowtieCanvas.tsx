'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Check, ChevronLeft, ChevronsLeftRight, Plus, Shield, Trash2, X, Zap } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import type { Bowtie, BowtieElement, BowtieBarrier, BowtieEscalation, BowtieElementType, BowtieRisk } from '@/lib/rals-bowtie'

export default function BowtieCanvas({ bowtieId, onBack }: {
  bowtieId: string; sessionId: string; participantId: string; onBack: () => void
}) {
  const [bowtie, setBowtie] = useState<Bowtie | null>(null)
  const [risk, setRisk] = useState<BowtieRisk | null>(null)
  const [elements, setElements] = useState<BowtieElement[]>([])
  const [barriers, setBarriers] = useState<BowtieBarrier[]>([])
  const [escalations, setEscalations] = useState<BowtieEscalation[]>([])
  const [editingBarrierId, setEditingBarrierId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const fetchGraph = useCallback(async () => {
    const sb = createClient()
    const { data: bt } = await sb.from('rals_bowtie').select('*').eq('id', bowtieId).single()
    setBowtie(bt as Bowtie)

    if ((bt as Bowtie)?.risk_id) {
      const { data: rk } = await sb.from('rals_risk').select('id, kode, pernyataan, kategori, penyebab, dampak_uraian').eq('id', (bt as Bowtie).risk_id).single()
      setRisk(rk as BowtieRisk)
    }

    const { data: els } = await sb.from('rals_bowtie_element').select('*').eq('bowtie_id', bowtieId).order('created_at', { ascending: true })
    const elRows = (els ?? []) as BowtieElement[]
    setElements(elRows)

    if (elRows.length) {
      const { data: brs } = await sb.from('rals_bowtie_barrier').select('*').in('element_id', elRows.map((e) => e.id)).order('created_at', { ascending: true })
      const brRows = (brs ?? []) as BowtieBarrier[]
      setBarriers(brRows)
      if (brRows.length) {
        const { data: esc } = await sb.from('rals_bowtie_escalation').select('*').in('barrier_id', brRows.map((b) => b.id)).order('created_at', { ascending: true })
        setEscalations((esc ?? []) as BowtieEscalation[])
      } else setEscalations([])
    } else { setBarriers([]); setEscalations([]) }
  }, [bowtieId])

  useEffect(() => { fetchGraph() }, [fetchGraph])

  const threats = elements.filter((e) => e.tipe === 'THREAT')
  const consequences = elements.filter((e) => e.tipe === 'CONSEQUENCE')
  const barriersFor = (elId: string) => barriers.filter((b) => b.element_id === elId)
  const escalationsFor = (barrierId: string) => escalations.filter((e) => e.barrier_id === barrierId)

  const sb = () => createClient()

  async function addElement(tipe: BowtieElementType, deskripsi: string) {
    await sb().from('rals_bowtie_element').insert({ bowtie_id: bowtieId, tipe, deskripsi })
    fetchGraph()
  }
  async function deleteElement(id: string) {
    await sb().from('rals_bowtie_element').delete().eq('id', id)
    fetchGraph()
  }
  async function addBarrier(elementId: string, deskripsi: string) {
    await sb().from('rals_bowtie_barrier').insert({ element_id: elementId, deskripsi })
    fetchGraph()
  }

  async function handleSaveAnalysis() {
    if (!risk || !bowtie) return
    const newPenyebab = threats.map((t) => t.deskripsi).join('; ')
    const newDampak = consequences.map((c) => c.deskripsi).join('; ')
    const overwriting = (risk.penyebab && risk.penyebab !== newPenyebab) || (risk.dampak_uraian && risk.dampak_uraian !== newDampak)
    if (overwriting && !confirm('Ini akan mengganti isi Penyebab & Dampak yang sudah ada pada risiko ini dengan hasil analisis bowtie. Lanjutkan?')) return
    setSaving(true)
    await sb().from('rals_risk').update({ penyebab: newPenyebab, dampak_uraian: newDampak }).eq('id', risk.id)
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
    fetchGraph()
  }

  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'
  const canSave = threats.length > 0 && consequences.length > 0
  const editingBarrier = barriers.find((b) => b.id === editingBarrierId) ?? null

  if (!bowtie || !risk) return <div className="rounded-2xl border bg-white shadow-sm p-8 text-center text-sm text-muted-foreground">Memuat...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <ChevronLeft className="w-4 h-4" /> Daftar Bowtie
        </button>
        {risk.kode && <p className="text-[11px] font-mono font-semibold text-indigo-600">{risk.kode}</p>}
      </div>

      {/* Kanvas Bowtie */}
      <div className="rounded-2xl border bg-gradient-to-b from-slate-50 to-white shadow-sm p-4 overflow-x-auto">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center min-w-full">

          {/* ── KIRI: Ancaman ── */}
          <div className="space-y-2 order-2 lg:order-1">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-sky-600 font-bold">Ancaman (Threats)</p>
              <InlineAdd label="Ancaman" placeholder="Penyebab yang bisa memicu kejadian" onAdd={(v) => addElement('THREAT', v)} />
            </div>
            {threats.length === 0 && <p className="text-[11px] text-slate-400 italic">Tambahkan penyebab di sisi kiri.</p>}
            {threats.map((t) => (
              <ElementCard key={t.id} el={t} side="threat"
                barriers={barriersFor(t.id)} escalationsFor={escalationsFor}
                onDelete={() => deleteElement(t.id)} onAddBarrier={(v) => addBarrier(t.id, v)}
                onOpenBarrier={setEditingBarrierId} />
            ))}
          </div>

          {/* ── TENGAH: Top Event ── */}
          <div className="order-1 lg:order-2 flex items-center justify-center lg:flex-col gap-2">
            <ChevronsLeftRight className="hidden lg:block w-5 h-5 text-red-300" />
            <div className="rounded-2xl bg-red-600 text-white shadow-lg px-4 py-4 text-center w-full lg:w-56 border-4 border-red-200">
              <p className="text-[10px] uppercase tracking-widest text-red-100 font-bold mb-1">Kejadian Utama</p>
              <p className="text-sm font-semibold">{risk.pernyataan}</p>
              {risk.kategori && <p className="text-[10px] text-red-100 mt-1.5">{risk.kategori}</p>}
            </div>
          </div>

          {/* ── KANAN: Dampak ── */}
          <div className="space-y-2 order-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-widest text-orange-600 font-bold">Dampak (Consequences)</p>
              <InlineAdd label="Dampak" placeholder="Akibat jika kejadian terjadi" onAdd={(v) => addElement('CONSEQUENCE', v)} />
            </div>
            {consequences.length === 0 && <p className="text-[11px] text-slate-400 italic">Tambahkan akibat di sisi kanan.</p>}
            {consequences.map((c) => (
              <ElementCard key={c.id} el={c} side="consequence"
                barriers={barriersFor(c.id)} escalationsFor={escalationsFor}
                onDelete={() => deleteElement(c.id)} onAddBarrier={(v) => addBarrier(c.id, v)}
                onOpenBarrier={setEditingBarrierId} />
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[10px] text-slate-500 justify-center border-t pt-3">
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-green-600" /> Kontrol memadai</span>
          <span className="inline-flex items-center gap-1"><Shield className="w-3 h-3 text-amber-500" /> Kurang memadai</span>
          <span className="inline-flex items-center gap-1"><Zap className="w-3 h-3 text-amber-500" /> Ada faktor eskalasi (perisai retak)</span>
        </div>
      </div>

      {/* Promote */}
      <div className="rounded-2xl border bg-white shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-slate-600">Simpan Hasil Analisis</p>
        <p className="text-[11px] text-slate-500 -mt-2">
          Ancaman akan mengisi kolom <span className="font-semibold">Penyebab</span>, dan Dampak akan mengisi kolom{' '}
          <span className="font-semibold">Uraian Dampak</span> pada risiko &quot;{risk.pernyataan}&quot; di register Anda.
        </p>
        <button onClick={handleSaveAnalysis} disabled={!canSave || saving}
          className="px-5 py-2 rounded-lg bg-green-700 text-white text-sm font-semibold hover:bg-green-800 disabled:opacity-50 transition-colors inline-flex items-center gap-2">
          {saved ? <><Check className="w-4 h-4" /> Tersimpan</> : saving ? 'Menyimpan...' : 'Simpan Analisis ke Risiko'}
        </button>
        {!canSave && <p className="text-[11px] text-slate-400">Butuh minimal 1 ancaman dan 1 dampak.</p>}
      </div>

      {editingBarrier && (
        <BarrierModal barrier={editingBarrier} escalations={escalationsFor(editingBarrier.id)}
          onClose={() => setEditingBarrierId(null)} onChanged={fetchGraph} />
      )}
    </div>
  )
}

// ── Kartu elemen (ancaman/dampak) + strip perisai ──────────────────────────
function ElementCard({ el, side, barriers, escalationsFor, onDelete, onAddBarrier, onOpenBarrier }: {
  el: BowtieElement; side: 'threat' | 'consequence'
  barriers: BowtieBarrier[]; escalationsFor: (id: string) => BowtieEscalation[]
  onDelete: () => void; onAddBarrier: (v: string) => void; onOpenBarrier: (id: string) => void
}) {
  const accent = side === 'threat' ? 'border-sky-200 bg-sky-50/50' : 'border-orange-200 bg-orange-50/50'
  const barrierLabel = side === 'threat' ? 'Kontrol Pencegahan' : 'Kontrol Pemulihan'
  return (
    <div className={`rounded-xl border ${accent} p-3 space-y-2`}>
      <div className="flex items-start gap-2">
        <p className="flex-1 text-sm text-slate-800">{el.deskripsi}</p>
        <button onClick={onDelete} className="shrink-0 text-slate-300 hover:text-red-500 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
      <div className="border-t border-white/60 pt-2">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">{barrierLabel}</p>
          <InlineAdd label="Perisai" placeholder="Nama kontrol" onAdd={onAddBarrier} small />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {barriers.length === 0 && <span className="text-[10px] text-slate-300 italic">Belum ada perisai</span>}
          {barriers.map((b) => {
            const cracked = escalationsFor(b.id).length > 0
            const memadai = b.efektivitas === 'Memadai'
            const color = memadai ? 'text-green-700 border-green-300 bg-green-50' : 'text-amber-700 border-amber-300 bg-amber-50'
            return (
              <button key={b.id} onClick={() => onOpenBarrier(b.id)} title={`${b.efektivitas}${cracked ? ' · ada faktor eskalasi' : ''}`}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-semibold transition-all ${color} ${cracked ? 'ring-2 ring-amber-300 animate-pulse' : ''}`}>
                <Shield className="w-3 h-3" /> {b.deskripsi}
                {cracked && <Zap className="w-3 h-3 text-amber-500" />}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Modal edit perisai: efektivitas + faktor eskalasi ──────────────────────
function BarrierModal({ barrier, escalations, onClose, onChanged }: {
  barrier: BowtieBarrier; escalations: BowtieEscalation[]; onClose: () => void; onChanged: () => void
}) {
  const [faktor, setFaktor] = useState('')
  const [rekomendasi, setRekomendasi] = useState('')
  const sb = () => createClient()
  const inputCls = 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200'

  async function setEfektivitas(v: 'Memadai' | 'Kurang Memadai') {
    await sb().from('rals_bowtie_barrier').update({ efektivitas: v }).eq('id', barrier.id)
    onChanged()
  }
  async function deleteBarrier() {
    await sb().from('rals_bowtie_barrier').delete().eq('id', barrier.id)
    onChanged(); onClose()
  }
  async function addEscalation() {
    if (!faktor.trim()) return
    await sb().from('rals_bowtie_escalation').insert({ barrier_id: barrier.id, faktor: faktor.trim(), rekomendasi: rekomendasi.trim() })
    setFaktor(''); setRekomendasi(''); onChanged()
  }
  async function deleteEscalation(id: string) {
    await sb().from('rals_bowtie_escalation').delete().eq('id', id)
    onChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b bg-slate-50">
          <h3 className="text-sm font-serif font-semibold text-slate-800 inline-flex items-center gap-2"><Shield className="w-4 h-4 text-indigo-500" /> {barrier.deskripsi}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Efektivitas Kontrol</label>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs font-semibold w-fit">
              <button onClick={() => setEfektivitas('Memadai')}
                className={`px-3 py-1.5 ${barrier.efektivitas === 'Memadai' ? 'bg-green-600 text-white' : 'bg-white text-slate-500'}`}>Memadai</button>
              <button onClick={() => setEfektivitas('Kurang Memadai')}
                className={`px-3 py-1.5 ${barrier.efektivitas === 'Kurang Memadai' ? 'bg-amber-500 text-white' : 'bg-white text-slate-500'}`}>Kurang Memadai</button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-600 inline-flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Faktor Eskalasi (pelemah kontrol)
            </label>
            {escalations.map((e) => (
              <div key={e.id} className="rounded-lg bg-amber-50 border border-amber-100 p-2.5 flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-800">{e.faktor}</p>
                  {e.rekomendasi && <p className="text-[11px] text-slate-500 mt-0.5"><span className="font-semibold">Tindak lanjut:</span> {e.rekomendasi}</p>}
                </div>
                <button onClick={() => deleteEscalation(e.id)} className="shrink-0 text-slate-300 hover:text-red-500 p-0.5"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
            <input value={faktor} onChange={(e) => setFaktor(e.target.value)} placeholder="Kondisi yang melemahkan kontrol ini..." className={inputCls} />
            <textarea value={rekomendasi} onChange={(e) => setRekomendasi(e.target.value)} rows={2} placeholder="Rekomendasi tindak lanjut (opsional)" className={inputCls} />
            <button onClick={addEscalation} disabled={!faktor.trim()}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 disabled:opacity-40">
              <Plus className="w-3 h-3" /> Tambah Faktor Eskalasi
            </button>
          </div>

          <button onClick={deleteBarrier} className="text-[11px] font-semibold text-red-500 hover:text-red-700 inline-flex items-center gap-1">
            <Trash2 className="w-3 h-3" /> Hapus Perisai
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tombol + input inline untuk menambah item ──────────────────────────────
function InlineAdd({ label, placeholder, onAdd, small }: {
  label: string; placeholder: string; onAdd: (v: string) => void; small?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [val, setVal] = useState('')
  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-0.5 font-semibold text-indigo-600 hover:text-indigo-800 ${small ? 'text-[10px]' : 'text-[11px]'}`}>
        <Plus className={small ? 'w-3 h-3' : 'w-3.5 h-3.5'} /> {label}
      </button>
    )
  }
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (val.trim()) { onAdd(val.trim()); setVal(''); setOpen(false) } }}
      className="flex items-center gap-1 w-full">
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder}
        className="flex-1 min-w-0 text-xs border border-slate-200 rounded-lg px-2 py-1 outline-none focus:border-indigo-400" />
      <button type="submit" className="shrink-0 text-green-600 hover:text-green-800 text-xs font-bold px-1">✓</button>
      <button type="button" onClick={() => { setOpen(false); setVal('') }} className="shrink-0 text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
    </form>
  )
}
