'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { emptySnapshot } from '@/lib/wawancara-zi/questions'
import type { InterviewSnapshot } from '@/lib/wawancara-zi/types'

export type InterviewActionState = { ok: boolean; message: string }

function clean(value: FormDataEntryValue | null, max = 200) {
  return String(value ?? '').trim().slice(0, max) || null
}

export async function createInterviewSession(_previous: InterviewActionState, formData: FormData): Promise<InterviewActionState> {
  const unitName = clean(formData.get('unit_name'), 240)
  if (!unitName || unitName.length < 3) return { ok: false, message: 'Nama satuan kerja wajib diisi.' }

  const { supabase, user, name } = await requireZiAccess()
  const snapshot = emptySnapshot()
  snapshot.metadata = {
    ketua: clean(formData.get('ketua')) ?? '',
    wakilKetua: clean(formData.get('wakil_ketua')) ?? '',
    panitera: clean(formData.get('panitera')) ?? '',
    sekretarisSatker: clean(formData.get('sekretaris_satker')) ?? '',
    evaluator: name ?? '',
  }
  const interviewDate = clean(formData.get('interview_date'), 10)
  const { data, error } = await supabase.from('zi_interview_sessions').insert({
    unit_name: unitName,
    court_type: clean(formData.get('court_type')),
    interview_date: interviewDate,
    candidate_stage: clean(formData.get('candidate_stage')),
    kke_number: clean(formData.get('kke_number')),
    team_name: clean(formData.get('team_name')) ?? 'TIM 4',
    secretary_name: clean(formData.get('secretary_name')),
    snapshot,
    created_by: user.id,
    updated_by: user.id,
  }).select('id').single()

  if (error || !data) {
    const missing = error?.code === '42P01' || error?.code === 'PGRST205'
    return { ok: false, message: missing ? 'Database Wawancara ZI belum disiapkan. Jalankan migration_wawancara_zi.sql.' : `Sesi gagal dibuat: ${error?.message ?? 'respons database kosong'}` }
  }
  revalidatePath('/dashboard/wawancara-zi')
  redirect(`/dashboard/wawancara-zi/${data.id}`)
}

export async function saveInterviewSnapshot(id: string, snapshot: InterviewSnapshot, status: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, message: 'ID sesi tidak valid.' }
  const serialized = JSON.stringify(snapshot)
  if (serialized.length > 1_800_000) return { ok: false, message: 'Catatan sesi terlalu besar untuk disimpan.' }
  const allowedStatus = ['persiapan', 'berlangsung', 'rekonsiliasi', 'selesai'].includes(status) ? status : 'berlangsung'
  const { supabase, user } = await requireZiAccess()
  const { error } = await supabase.from('zi_interview_sessions').update({
    snapshot,
    status: allowedStatus,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  }).eq('id', id)
  if (error) return { ok: false, message: `Autosave gagal: ${error.message}` }
  return { ok: true, message: 'Tersimpan', savedAt: new Date().toISOString() }
}
