import { createClient } from '@/utils/supabase/server'
import Image from 'next/image'
import SmapKonteksClient from './SmapKonteksClient'

export default async function SmapPage() {
  const supabase = await createClient()

  const { data: units } = await supabase
    .from('unit_kerja')
    .select('id, nama_unit')
    .order('nama_unit')

  const { data: konteksList } = await supabase
    .from('smap_konteks')
    .select('*, unit:unit_kerja_id(nama_unit)')
    .order('tahun', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 shrink-0 relative">
          <Image src="/smap-logo.png" alt="SMAP Logo" fill className="object-contain" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-serif">Khusus SMAP</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Penilaian Risiko Penyuapan — Sistem Manajemen Anti Penyuapan (ISO 37001)
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-orange-100 bg-orange-50/60 px-4 py-3 text-xs text-orange-800 leading-relaxed">
        <strong>Alur pengisian:</strong> Tetapkan konteks (unit kerja &amp; tahun) → Identifikasi Risiko Penyuapan (Form 1) → Analisis Risiko (Form 2: Inherent + Existing Risk) → Evaluasi Risiko (Form 3: Residual Risk + Peta Risiko + Ekspor PDF)
      </div>

      <SmapKonteksClient
        units={units ?? []}
        konteksList={(konteksList ?? []) as any}
      />
    </div>
  )
}
