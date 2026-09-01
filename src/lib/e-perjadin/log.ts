import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Sisipkan satu baris ke jejak audit append-only `perjadin_log` (PRD F-6.3).
 * Kegagalan penulisan log tidak membatalkan aksi utama — hanya dicatat ke konsol.
 */
export async function catatLog(
  supabase: SupabaseClient,
  entri: {
    aktorId: string
    aksi: string
    entitas?: string
    entitasId?: string
    penugasanId?: string
    nilaiLama?: unknown
    nilaiBaru?: unknown
  },
): Promise<void> {
  const { error } = await supabase.from('perjadin_log').insert({
    aktor_id: entri.aktorId,
    aksi: entri.aksi,
    entitas: entri.entitas ?? null,
    entitas_id: entri.entitasId ?? null,
    penugasan_id: entri.penugasanId ?? null,
    nilai_lama: entri.nilaiLama ?? null,
    nilai_baru: entri.nilaiBaru ?? null,
  })
  if (error) console.error('perjadin_log gagal:', error.message)
}
