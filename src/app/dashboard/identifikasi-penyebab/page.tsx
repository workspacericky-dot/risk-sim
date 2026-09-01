import { createClient } from '@/utils/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { ChevronLeft, Network } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import PenyebabTable from './PenyebabTable'

export const dynamic = 'force-dynamic'

export default async function IdentifikasiPenyebabPage({
  searchParams,
}: {
  searchParams: Promise<{ risiko?: string; konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const risikoId  = p?.risiko
  const konteksId = p?.konteks

  // Fetch risiko record
  const { data: risikoData } = risikoId
    ? await supabase
        .from('risiko')
        .select('*, konteks:konteks_id(id, tahun_penerapan, unit:unit_kerja_id(nama_unit))')
        .eq('id', risikoId)
        .single()
    : { data: null }

  if (!risikoId || !risikoData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">Risiko Tidak Ditemukan</h3>
        <p className="text-muted-foreground">Silakan kembali ke Identifikasi Risiko dan pilih risiko yang akan dianalisis penyebabnya.</p>
        <a
          href={konteksId ? `/dashboard/identifikasi?konteks=${konteksId}` : '/dashboard/konteks'}
          className={buttonVariants({ className: 'mt-2' })}
        >
          ← Kembali
        </a>
      </div>
    )
  }

  // @ts-ignore
  const konteks = risikoData.konteks
  // @ts-ignore
  const unitNama: string = konteks?.unit?.nama_unit || '–'
  const tahun = konteks?.tahun_penerapan

  // Fetch existing penyebab rows
  const { data: penyebabRaw } = await supabase
    .from('penyebab_risiko_detail')
    .select('*')
    .eq('risiko_id', risikoId)
    .order('created_at', { ascending: true })

  const backHref = konteksId
    ? `/dashboard/identifikasi?konteks=${konteksId}`
    : '/dashboard/konteks'

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href={backHref}
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Identifikasi Risiko"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-0.5">
            <Network className="w-5 h-5 text-indigo-600" />
            <h2 className="text-2xl font-bold tracking-tight font-serif">
              Identifikasi Penyebab Risiko
            </h2>
          </div>
          <p className="text-muted-foreground text-sm mt-0.5">
            Analisis Akar Masalah (Root Cause Analysis) · Lampiran Pedoman No. 9 ·
            Tahun <strong>{tahun}</strong> — <strong>{unitNama}</strong>
          </p>
        </div>
        <Badge variant="outline" className="mt-1">
          {penyebabRaw?.length ?? 0} penyebab
        </Badge>
      </div>

      {/* ── Risk Context Banner ───────────────────────── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-5 py-3 space-y-1">
        <p className="text-[10px] font-mono uppercase tracking-widest text-indigo-500">Risiko yang Dianalisis</p>
        <div className="flex items-start gap-3">
          <span className="font-mono text-xs text-slate-500 shrink-0 mt-0.5">{risikoData.kode_risiko || '–'}</span>
          <p className="font-semibold text-slate-800 leading-relaxed">{risikoData.pernyataan_risiko}</p>
        </div>
        {risikoData.kategori_risiko && (
          <span className="inline-block px-2 py-0.5 rounded bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-medium">
            {risikoData.kategori_risiko}
          </span>
        )}
      </div>

      {/* ── Main Table ───────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="font-serif font-semibold text-slate-800">
              Matriks Analisis Akar Masalah (5 Whys)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Satu baris untuk satu akar penyebab. Kode penyebab digenerate otomatis dari kode risiko + kategori 5M+EX + nomor urut.
            </p>
          </div>
        </div>

        <div className="p-4">
          <PenyebabTable
            risikoId={risikoId}
            kodeRisiko={risikoData.kode_risiko ?? null}
            pernyataanRisiko={risikoData.pernyataan_risiko}
            konteksId={konteksId ?? ''}
            initialRows={penyebabRaw ?? []}
          />
        </div>

        {/* Keterangan */}
        <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 leading-relaxed">
          <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-0.5">
            <p>Kolom 1 : Kode risiko (lookup otomatis)</p>
            <p>Kolom 2 : Pernyataan risiko (dari register identifikasi)</p>
            <p>Kolom 3 : Penyebab langsung terjadinya risiko (why 1)</p>
            <p>Kolom 4–7 : Alasan terjadinya penyebab sebelumnya (why 2–5)</p>
            <p>Kolom 8 : Akar penyebab terakhir (penyebab final)</p>
            <p>Kolom 9 : Kode penyebab = [kode risiko].[kategori 5M+EX].[nomor urut]</p>
            <p>Kolom 10 : Kegiatan pengendalian yang dirancang untuk mengatasi akar penyebab</p>
            <p>Kategori 5M+EX: MN=Orang, MY=Dana, MD=Metode, MR=Bahan, MC=Mesin, EX=Eksternal</p>
          </div>
        </div>
      </div>
    </div>
  )
}
