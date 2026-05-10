import { createClient } from '@/utils/supabase/server'
import { ChevronLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import SmapEvaluasiClient from './SmapEvaluasiClient'

export default async function SmapEvaluasiPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  const { data: konteks } = konteksId
    ? await supabase
        .from('smap_konteks')
        .select('*, unit:unit_kerja_id(nama_unit)')
        .eq('id', konteksId)
        .single()
    : { data: null }

  if (!konteksId || !konteks) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Pilih Konteks SMAP Terlebih Dahulu</h3>
        <a href="/dashboard/smap" className={buttonVariants({ className: 'bg-orange-600 hover:bg-orange-700' })}>
          ← Kembali ke Khusus SMAP
        </a>
      </div>
    )
  }

  const { data: risikoList } = await supabase
    .from('smap_risiko')
    .select('id, no_urut, uraian_risiko_final, jenis_korupsi')
    .eq('konteks_id', konteksId)
    .order('no_urut', { ascending: true })

  const risikoIds = (risikoList ?? []).map(r => r.id)

  const [{ data: analisisList }, { data: evaluasiList }] = await Promise.all([
    risikoIds.length > 0
      ? supabase.from('smap_analisis').select('risiko_id, status_existing, kemungkinan_existing, dampak_existing').in('risiko_id', risikoIds)
      : { data: [] },
    risikoIds.length > 0
      ? supabase.from('smap_evaluasi').select('*, efektif_level').in('risiko_id', risikoIds)
      : { data: [] },
  ])

  const namaUnit = (konteks as any).unit?.nama_unit ?? '–'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <a
          href={`/dashboard/smap/analisis?konteks=${konteksId}`}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0 print:hidden"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-serif">Evaluasi Risiko Penyuapan</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Form 3 · Tahun <strong>{konteks.tahun}</strong> — <strong>{namaUnit}</strong>
          </p>
        </div>
      </div>

      <SmapEvaluasiClient
        konteksId={konteksId}
        namaUnit={namaUnit}
        tahun={konteks.tahun}
        namaPemilik={konteks.nama_pemilik_risiko ?? ''}
        jabatanPemilik={konteks.jabatan_pemilik_risiko ?? ''}
        risikoList={(risikoList ?? []) as any}
        analisisList={(analisisList ?? []) as any}
        evaluasiList={(evaluasiList ?? []) as any}
      />
    </div>
  )
}
