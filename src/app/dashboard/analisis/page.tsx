import { createClient } from '@/utils/supabase/server'

export const dynamic = 'force-dynamic'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, ArrowRight, BarChart2 } from 'lucide-react'
import ReferenceButtons from './ReferenceButtons'
import AnalisisTable from './AnalisisTable'

export default async function AnalisisPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  const { data: konteksData } = konteksId
    ? await supabase
        .from('penetapan_konteks')
        .select('*, unit:unit_kerja_id(nama_unit)')
        .eq('id', konteksId)
        .single()
    : { data: null }

  const { data: risikoRaw } = konteksId
    ? await supabase
        .from('risiko')
        .select('*')
        .eq('konteks_id', konteksId)
        .order('created_at', { ascending: true })
    : { data: [] }

  // Fetch analisis records separately to avoid unreliable PostgREST join
  const risikoIds = (risikoRaw ?? []).map((r: any) => r.id)
  const { data: analisisRaw } = risikoIds.length > 0
    ? await supabase
        .from('analisis_risiko')
        .select('*')
        .in('risiko_id', risikoIds)
    : { data: [] }

  // Build a lookup map: risiko_id → analisis record
  const analisisMap: Record<string, any> = {}
  for (const a of analisisRaw ?? []) {
    analisisMap[a.risiko_id] = a
  }

  // Merge into a unified list
  const risikoList = (risikoRaw ?? []).map((r: any) => ({
    ...r,
    analisis: analisisMap[r.id] ? [analisisMap[r.id]] : [],
  }))

  if (!konteksId || !konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Konteks Tidak Ditemukan</h3>
        <p className="text-muted-foreground">Silakan kembali ke halaman Identifikasi Risiko.</p>
        <a href="/dashboard/konteks" className={buttonVariants({ className: 'mt-2' })}>← Kembali</a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama = konteksData.unit?.nama_unit || '–'
  const seleraRisiko: number = konteksData.selera_risiko ?? 3
  const analisisCount = risikoList?.filter(r => r.analisis && r.analisis.length > 0).length || 0

  // Normalise risikoList for the Client Component
  const rows = (risikoList ?? []).map((r) => ({
    id: r.id,
    kode_risiko: r.kode_risiko ?? null,
    pernyataan_risiko: r.pernyataan_risiko,
    kategori_risiko: r.kategori_risiko ?? null,
    analisis: r.analisis && r.analisis.length > 0 ? [r.analisis[0]] : null,
  }))

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href={`/dashboard/identifikasi?konteks=${konteksId}`}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Identifikasi Risiko"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-serif">Analisis Risiko</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lampiran Pedoman No. 6 · Konteks Tahun{' '}
            <strong>{konteksData.tahun_penerapan}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <ReferenceButtons />
          {(risikoList?.length ?? 0) > 0 && (
            <a
              href={`/dashboard/evaluasi?konteks=${konteksId}`}
              className={buttonVariants({
                variant: analisisCount >= 1 ? 'default' : 'outline',
                className: analisisCount >= 1
                  ? 'bg-red-700 hover:bg-red-800 gap-2'
                  : 'gap-2 text-slate-500',
              })}
              title={analisisCount === 0 ? 'Simpan minimal 1 analisis untuk melihat evaluasi' : undefined}
            >
              <BarChart2 className="w-4 h-4" />
              Evaluasi Risiko
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* ── Table (Client Component — manages counter & saves) ── */}
      <AnalisisTable
        konteksId={konteksId}
        seleraRisiko={seleraRisiko}
        risikoList={rows}
        initialAnalisisCount={analisisCount}
      />
    </div>
  )
}
