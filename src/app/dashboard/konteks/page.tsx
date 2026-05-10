import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Target, FileText } from 'lucide-react'
import KonteksForm from './KonteksForm'
import DeleteKonteksButton from './DeleteKonteksButton'

export default async function KonteksPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }
  const isAdmin = profile?.role === 'admin_sistem'

  const { data: units } = await supabase
    .from('unit_kerja')
    .select('*')
    .order('tingkat', { ascending: false })

  const { data: konteksList } = await supabase
    .from('penetapan_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .order('tahun_penerapan', { ascending: false })

  return (
    <div className="space-y-6">

      {/* ── Page title ─────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight font-serif">Penetapan Konteks</h2>
        <p className="text-muted-foreground text-sm mt-0.5">
          Langkah 1: Tetapkan sasaran dan parameter risiko tahunan satuan kerja.
        </p>
      </div>

      {/* ── Existing contexts — compact list ───────────────────────────── */}
      {konteksList && konteksList.length > 0 && (
        <div
          className="rounded-2xl border border-white/60 shadow-sm overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)' }}
        >
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-slate-50/80">
            <FileText className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-700">Daftar Dokumen Konteks</h3>
            <span className="ml-auto text-[11px] text-slate-400">{konteksList.length} dokumen</span>
          </div>

          <div className="divide-y divide-slate-100">
            {konteksList.map((k) => (
              <div key={k.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                {/* Tahun pill */}
                <span className="shrink-0 w-12 text-center text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg py-0.5">
                  {k.tahun_penerapan}
                </span>

                {/* Unit name */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {/* @ts-ignore */}
                    {k.unit?.nama_unit}
                  </p>
                  {(k.nama_pemilik_risiko || k.periode_mulai) && (
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                      {k.nama_pemilik_risiko && <span>{k.nama_pemilik_risiko}</span>}
                      {k.periode_mulai && k.periode_selesai && (
                        <span className="ml-2">
                          {new Date(k.periode_mulai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          {' — '}
                          {new Date(k.periode_selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      )}
                    </p>
                  )}
                </div>

                {/* Status badge */}
                <Badge
                  variant={k.status === 'Disetujui' ? 'default' : 'secondary'}
                  className="shrink-0 text-[10px]"
                >
                  {k.status}
                </Badge>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`/dashboard/selera-risiko?konteks=${k.id}`}
                    className="group relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-600 hover:text-slate-800 hover:border-slate-300 hover:bg-slate-50 transition-all"
                    title="Tetapkan selera risiko per kategori"
                  >
                    <Target className="w-3 h-3" />
                    Selera
                  </a>
                  <a
                    href={`/dashboard/identifikasi?konteks=${k.id}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 transition-all"
                  >
                    Identifikasi Risiko →
                  </a>
                  {isAdmin && (
                    // @ts-ignore
                    <DeleteKonteksButton id={k.id} unitName={(k.unit as any)?.nama_unit ?? ''} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Form ─────────────────────────────────────────────────────────── */}
      <KonteksForm units={units ?? []} />

    </div>
  )
}
