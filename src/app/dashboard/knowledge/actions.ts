'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

export async function deleteKnowledgeItem(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('knowledge_items').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath('/dashboard/knowledge')
  return { success: true }
}
