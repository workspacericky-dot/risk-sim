import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Target } from 'lucide-react'
import { SeleraRisikoEditor } from './SeleraRisikoEditor'

export default async function SeleraRisikoPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase   = await createClient()
  const p          = await searchParams
  const konteksId  = p?.konteks

  const { data: konteksData } = konteksId
    ? await supabase
        .from('penetapan_konteks')
        .select('*, unit:unit_kerja_id(nama_unit)')
        .eq('id', konteksId)
        .single()
    : { data: null }

  const { data: seleraData } = konteksId
    ? await supabase
        .from('selera_risiko_kategori')
        .select('*')
        .eq('konteks_id', konteksId)
        .single()
    : { data: null }

  if (!konteksId || !konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <Target className="w-10 h-10 mx-auto text-slate-300" />
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <p className="text-muted-foreground">Silakan kembali ke halaman Penetapan Konteks dan pilih konteks yang valid.</p>
        <a href="/dashboard/konteks" className={buttonVariants({ className: 'mt-2' })}>
          ← Kembali ke Konteks
        </a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama: string = konteksData.unit?.nama_unit ?? '–'
  const tahun: number    = konteksData.tahun_penerapan

  const initialData = seleraData
    ? {
        strategis:   seleraData.strategis,
        kebijakan:   seleraData.kebijakan,
        kecurangan:  seleraData.kecurangan,
        bencana:     seleraData.bencana,
        kepatuhan:   seleraData.kepatuhan,
        operasional: seleraData.operasional,
        kemitraan:   seleraData.kemitraan,
        catatan:     seleraData.catatan ?? '',
      }
    : null

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-start gap-4">
        <a
          href="/dashboard/konteks"
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Penetapan Konteks"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-green-700" />
            <h2 className="text-2xl font-bold tracking-tight font-serif">Penetapan Selera Risiko</h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Tetapkan ambang batas nilai risiko per kategori · Konteks Tahun{' '}
            <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
      </div>

      {/* ── Editor (client component: form + live matrices) ── */}
      <SeleraRisikoEditor
        konteksId={konteksId}
        unitNama={unitNama}
        tahun={tahun}
        initial={initialData}
      />

    </div>
  )
}
