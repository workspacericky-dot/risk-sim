import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { TrendingUp, ChevronLeft } from 'lucide-react'
import MaturitasForm from './MaturitasForm'

export const dynamic = 'force-dynamic'

export default async function MaturitasPenilaianPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  if (!konteksId) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <a href="/dashboard/maturitas" className={buttonVariants({ className: 'mt-2' })}>
          ← Pilih Konteks
        </a>
      </div>
    )
  }

  const { data: konteksData } = await supabase
    .from('penetapan_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .eq('id', konteksId)
    .single()

  if (!konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <a href="/dashboard/maturitas" className={buttonVariants({ className: 'mt-2' })}>
          ← Pilih Konteks
        </a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit || '–'
  const tahun: number    = konteksData.tahun_penerapan

  // Fetch existing maturitas record
  const { data: existing } = await supabase
    .from('maturitas_penilaian')
    .select('*')
    .eq('konteks_id', konteksId)
    .single()

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href="/dashboard/maturitas"
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Pilih konteks lain"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <TrendingUp className="w-5 h-5 text-teal-600" />
            <h2 className="text-2xl font-bold tracking-tight font-serif">Maturitas Manajemen Risiko</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Penilaian Tingkat Maturitas MR · Tahun <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
      </div>

      <MaturitasForm
        konteksId={konteksId}
        unitNama={unitNama}
        tahun={tahun}
        existingId={existing?.id ?? null}
        initialScores={existing?.scores ?? null}
      />
    </div>
  )
}
