'use server'

import { revalidatePath } from 'next/cache'
import { getSiwasUser } from '@/lib/siwas-access'
import { savePohonDocument, validatePohonSource, type PohonSource } from '@/lib/pohon-document'

export async function savePohonKinerja(source: PohonSource, expectedRevision: string) {
  const user = await getSiwasUser()
  if (!user || user.role !== 'admin_sistem') return { error: 'Hanya Administrator Sistem yang dapat menyunting diagram.' }
  if (typeof expectedRevision !== 'string' || expectedRevision.length > 100) return { error: 'Revisi diagram tidak valid.' }
  const problem = validatePohonSource(source)
  if (problem) return { error: problem }
  try {
    const document = await savePohonDocument(source, expectedRevision, user.id)
    revalidatePath('/pohon-kinerja')
    return { revision: document.revision, updatedAt: document.updatedAt }
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Diagram gagal disimpan.' }
  }
}
