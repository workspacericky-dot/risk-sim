'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Trash2, BookOpen, Table2, FileText, LayoutGrid, User, Calendar, Presentation } from 'lucide-react'
import { deleteKnowledgeItem } from './actions'

export type Item = {
  id: string
  judul: string
  deskripsi: string
  kategori: string
  tipe: string
  penulis: string
  created_at: string
}

const TIPE_META: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  Matriks: { icon: <Table2 className="w-4 h-4" />,    bg: 'bg-violet-100', text: 'text-violet-600' },
  Artikel: { icon: <FileText className="w-4 h-4" />,   bg: 'bg-sky-100',    text: 'text-sky-600' },
  Panduan: { icon: <BookOpen className="w-4 h-4" />,   bg: 'bg-emerald-100', text: 'text-emerald-600' },
  Lainnya: { icon: <LayoutGrid className="w-4 h-4" />, bg: 'bg-slate-100',  text: 'text-slate-500' },
}

const KATEGORI_META: Record<string, { badge: string; bar: string }> = {
  SMAP:  { badge: 'bg-orange-100 text-orange-700', bar: 'from-orange-400 to-amber-400' },
  MR:    { badge: 'bg-sky-100 text-sky-700',       bar: 'from-sky-400 to-cyan-400' },
  Audit: { badge: 'bg-purple-100 text-purple-700', bar: 'from-purple-400 to-violet-400' },
  Umum:  { badge: 'bg-slate-100 text-slate-600',   bar: 'from-slate-400 to-slate-500' },
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

type Props = { items: Item[]; isAdmin: boolean }

export default function KnowledgeGrid({ items, isAdmin }: Props) {
  const [deleting, setDeleting] = useState<string | null>(null)
  const [section, setSection] = useState<'notes' | 'decks'>('notes')

  async function handleDelete(id: string, judul: string) {
    if (!confirm(`Hapus item "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return
    setDeleting(id)
    await deleteKnowledgeItem(id)
    setDeleting(null)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="Jenis materi Knowledge">
        <button type="button" role="tab" aria-selected={section === 'notes'} aria-controls="knowledge-notes" onClick={() => setSection('notes')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${section === 'notes' ? 'border-slate-800 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <BookOpen className="size-4" /> Notes <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{items.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={section === 'decks'} aria-controls="knowledge-decks" onClick={() => setSection('decks')} className={`inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${section === 'decks' ? 'border-amber-500 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
          <Presentation className="size-4" /> Decks <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs">1</span>
        </button>
      </div>
      <div id="knowledge-decks" role="tabpanel" hidden={section !== 'decks'}>
        <div className="w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg">
          <div className="h-1.5 bg-gradient-to-r from-amber-400 to-yellow-300" />
          <div className="p-5">
            <div className="flex items-start gap-3">
              <span className="rounded-xl bg-amber-100 p-2.5 text-amber-700"><Presentation className="size-4" /></span>
              <div>
                <h3 className="text-sm font-bold leading-snug text-slate-800">Tinjauan Dokumen SMAP</h3>
                <span className="mt-2 inline-block rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold text-orange-700">SMAP · Deck</span>
              </div>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-slate-500">Paparan interaktif 60 slide tentang maksud, definisi, bobot penilaian, dan dokumen SMAP beserta contoh templatnya.</p>
            <div className="mt-5 flex items-center justify-between gap-2">
              <span className="text-[10px] text-slate-500">Ricky P. Hermawan</span>
              <Link href="/dashboard/knowledge/decks/tinjauan-dokumen" className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-700"><Eye className="size-3" /> View</Link>
            </div>
          </div>
        </div>
      </div>
      <div id="knowledge-notes" role="tabpanel" hidden={section !== 'notes'} className="flex flex-wrap gap-5">
      {items.length === 0 && <p className="py-12 text-sm text-slate-400">Belum ada Notes.</p>}
      {items.map(item => {
        const tipeMeta = TIPE_META[item.tipe] ?? TIPE_META.Lainnya
        const katMeta  = KATEGORI_META[item.kategori] ?? KATEGORI_META.Umum

        return (
          <div
            key={item.id}
            className="w-72 shrink-0 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col overflow-hidden group"
          >
            {/* Gradient accent bar */}
            <div className={`h-1.5 w-full bg-gradient-to-r ${katMeta.bar}`} />

            {/* Card header */}
            <div className="px-4 pt-4 pb-3">
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 p-2.5 rounded-xl ${tipeMeta.bg} ${tipeMeta.text} shrink-0`}>
                  {tipeMeta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-2 group-hover:text-slate-900">
                    {item.judul}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${katMeta.badge}`}>
                      {item.kategori}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-2 py-0.5">
                      {item.tipe}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 h-px bg-slate-100" />

            {/* Card body */}
            <div className="px-4 py-3 flex-1">
              <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{item.deskripsi}</p>
            </div>

            {/* Card footer */}
            <div className="px-4 pb-4 pt-2 flex items-end justify-between gap-2">
              <div className="min-w-0 space-y-0.5">
                <p className="text-[10px] text-slate-500 flex items-center gap-1 truncate">
                  <User className="w-3 h-3 shrink-0 text-slate-400" />
                  {item.penulis || '—'}
                </p>
                <p className="text-[10px] text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  {formatDate(item.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`/dashboard/knowledge/${item.id}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-semibold transition-colors"
                >
                  <Eye className="w-3 h-3" />
                  View
                </a>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id, item.judul)}
                    disabled={deleting === item.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-[11px] font-semibold transition-colors disabled:opacity-50"
                    title="Hapus item ini"
                  >
                    <Trash2 className="w-3 h-3" />
                    {deleting === item.id ? '...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
