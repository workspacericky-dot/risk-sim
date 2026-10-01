import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import DeckViewer from './DeckViewer'

export default function TinjauanDokumenPage() {
  return (
    <div className="space-y-4">
      <Link href="/dashboard/knowledge" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ChevronLeft className="size-4" /> Kembali ke Knowledge
      </Link>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Knowledge / Decks</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Tinjauan Dokumen SMAP</h1>
        <p className="mt-1 text-sm text-slate-500">Paparan interaktif oleh Ricky P. Hermawan</p>
      </div>
      <DeckViewer />
    </div>
  )
}
