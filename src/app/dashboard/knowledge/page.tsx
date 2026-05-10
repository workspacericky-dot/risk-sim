import { createClient } from '@/utils/supabase/server'
import { BookOpen, Lightbulb, GraduationCap, Share2 } from 'lucide-react'
import KnowledgeGrid from './KnowledgeGrid'

export default async function KnowledgePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  const isAdmin = profile?.role === 'admin'

  const { data: items } = await supabase
    .from('knowledge_items')
    .select('id, judul, deskripsi, kategori, tipe, penulis, created_at')
    .order('created_at', { ascending: false })

  const total = items?.length ?? 0

  return (
    <div className="space-y-6">

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 px-7 py-7 text-white shadow-lg">
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute top-8 right-16 w-24 h-24 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 w-32 h-32 rounded-full bg-white/5" />

        {/* Floating icons */}
        <div className="pointer-events-none absolute right-8 top-5 opacity-10">
          <GraduationCap className="w-20 h-20" />
        </div>
        <div className="pointer-events-none absolute right-28 bottom-4 opacity-10">
          <Lightbulb className="w-12 h-12" />
        </div>

        <div className="relative flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-sm shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold font-serif tracking-tight">Knowledge Base</h1>
            <p className="text-slate-300 text-sm mt-1 max-w-lg">
              Media berbagi pengetahuan, referensi, dan panduan manajemen risiko untuk seluruh unit kerja.
            </p>
            {/* Stats row */}
            <div className="flex items-center gap-5 mt-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">{total}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Item tersedia</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xl font-bold leading-none">Open</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Akses bebas</p>
                </div>
              </div>
            </div>
          </div>
          {isAdmin && (
            <span className="shrink-0 text-[10px] text-slate-400 bg-white/10 border border-white/20 rounded-full px-3 py-1 font-medium">
              Admin — Delete aktif
            </span>
          )}
        </div>
      </div>

      {/* Items section */}
      <div className="bg-white rounded-2xl border shadow-sm p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Lightbulb className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-700">Semua Item</h3>
            <p className="text-[11px] text-slate-400 mt-0.5">{total} konten tersedia untuk dibaca</p>
          </div>
        </div>
        <KnowledgeGrid items={(items ?? []) as any} isAdmin={isAdmin} />
      </div>

    </div>
  )
}
