'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export interface SeleraRisikoData {
  strategis:   number
  kebijakan:   number
  kecurangan:  number
  bencana:     number
  kepatuhan:   number
  operasional: number
  kemitraan:   number
  catatan?:    string
}

export async function saveSeleraRisiko(konteksId: string, data: SeleraRisikoData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('selera_risiko_kategori')
    .upsert(
      {
        konteks_id:  konteksId,
        strategis:   data.strategis,
        kebijakan:   data.kebijakan,
        kecurangan:  data.kecurangan,
        bencana:     data.bencana,
        kepatuhan:   data.kepatuhan,
        operasional: data.operasional,
        kemitraan:   data.kemitraan,
        catatan:     data.catatan ?? null,
        updated_at:  new Date().toISOString(),
      },
      { onConflict: 'konteks_id' }
    )

  if (error) throw new Error(error.message)

  revalidatePath(`/dashboard/selera-risiko`)
  revalidatePath(`/dashboard/evaluasi`)
}
