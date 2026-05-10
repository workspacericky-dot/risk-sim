import { createClient } from '@/utils/supabase/server'
import { notFound } from 'next/navigation'
import { ChevronLeft, Table2, FileText, BookOpen, LayoutGrid, Calendar, User, GraduationCap, Lightbulb } from 'lucide-react'
import KnowledgeViewer from './KnowledgeViewer'

const TIPE_META: Record<string, { icon: React.ReactNode; bg: string; text: string }> = {
  Matriks: { icon: <Table2 className="w-5 h-5" />,    bg: 'bg-violet-100', text: 'text-violet-600' },
  Artikel: { icon: <FileText className="w-5 h-5" />,   bg: 'bg-sky-100',    text: 'text-sky-600' },
  Panduan: { icon: <BookOpen className="w-5 h-5" />,   bg: 'bg-emerald-100', text: 'text-emerald-600' },
  Lainnya: { icon: <LayoutGrid className="w-5 h-5" />, bg: 'bg-slate-100',  text: 'text-slate-500' },
}

const KATEGORI_META: Record<string, { badge: string; bar: string; heroBg: string }> = {
  SMAP:  { badge: 'bg-orange-100 text-orange-700 border-orange-200', bar: 'from-orange-400 to-amber-400',   heroBg: 'from-orange-900 via-amber-900 to-slate-900' },
  MR:    { badge: 'bg-sky-100 text-sky-700 border-sky-200',          bar: 'from-sky-400 to-cyan-400',       heroBg: 'from-sky-900 via-cyan-900 to-slate-900' },
  Audit: { badge: 'bg-purple-100 text-purple-700 border-purple-200', bar: 'from-purple-400 to-violet-400',  heroBg: 'from-purple-900 via-violet-900 to-slate-900' },
  Umum:  { badge: 'bg-slate-100 text-slate-600 border-slate-200',    bar: 'from-slate-400 to-slate-500',    heroBg: 'from-slate-800 via-slate-700 to-slate-900' },
}

export default async function KnowledgeViewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { id } = await params

  const { data: item } = await supabase
    .from('knowledge_items')
    .select('*')
    .eq('id', id)
    .single()

  if (!item) notFound()

  const tipeMeta = TIPE_META[item.tipe] ?? TIPE_META.Lainnya
  const katMeta  = KATEGORI_META[item.kategori] ?? KATEGORI_META.Umum
  const dateStr  = new Date(item.created_at).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Back */}
      <a
        href="/dashboard/knowledge"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Kembali ke Knowledge
      </a>

      {/* Hero header */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${katMeta.heroBg} text-white shadow-lg px-7 py-7`}>
        {/* Decorative elements */}
        <div className="pointer-events-none absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-4 right-20 w-20 h-20 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-6 left-1/2 w-28 h-28 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-6 top-4 opacity-10">
          <GraduationCap className="w-16 h-16" />
        </div>
        <div className="pointer-events-none absolute right-24 bottom-3 opacity-10">
          <Lightbulb className="w-10 h-10" />
        </div>

        {/* Gradient bar at top */}
        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${katMeta.bar}`} />

        <div className="relative flex items-start gap-4">
          <span className={`p-3.5 rounded-2xl ${tipeMeta.bg} ${tipeMeta.text} shrink-0 shadow-sm`}>
            {tipeMeta.icon}
          </span>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold font-serif text-white leading-snug">{item.judul}</h1>
            {item.deskripsi && (
              <p className="text-sm text-white/70 mt-2 leading-relaxed max-w-2xl">{item.deskripsi}</p>
            )}
            <div className="flex items-center gap-3 mt-4 flex-wrap text-xs">
              <span className="flex items-center gap-1.5 text-white/60">
                <User className="w-3.5 h-3.5" />
                {item.penulis || '—'}
              </span>
              <span className="flex items-center gap-1.5 text-white/60">
                <Calendar className="w-3.5 h-3.5" />
                {dateStr}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${katMeta.badge}`}>
                {item.kategori}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 border border-white/20 text-white/80 text-[11px] font-medium">
                {item.tipe}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border shadow-sm px-6 py-6">
        <KnowledgeViewer content={item.konten} />
      </div>
    </div>
  )
}
