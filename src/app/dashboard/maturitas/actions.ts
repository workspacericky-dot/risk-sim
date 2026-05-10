'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function deleteMaturitas(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('maturitas_penilaian')
    .delete()
    .eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/maturitas')
  return { success: true }
}
