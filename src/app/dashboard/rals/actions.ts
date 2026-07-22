'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/utils/supabase/server'

type Stage = 'lobby' | 'konteks' | 'identifikasi' | 'analisis' | 'evaluasi' | 'penanganan' | 'selesai'

// Instruktur = pengguna terautentikasi yang BUKAN peserta_consulting.
async function assertInstruktur() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.', supabase: null, userId: null }
  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (profile?.role === 'peserta_consulting') return { error: 'Akses ditolak.', supabase: null, userId: null }
  return { error: null, supabase, userId: user.id }
}

function genKode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // tanpa karakter ambigu (0/O, 1/I/L)
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function createSession(judul: string, mode: 'terkontrol' | 'mandiri' = 'terkontrol'): Promise<{ error?: string; kode?: string }> {
  const { error, supabase, userId } = await assertInstruktur()
  if (error || !supabase) return { error: error ?? 'Akses ditolak.' }
  if (!judul.trim()) return { error: 'Judul sesi wajib diisi.' }

  // Coba beberapa kali jika kode bentrok (unique).
  for (let i = 0; i < 5; i++) {
    const kode = genKode()
    const { error: insErr } = await supabase.from('rals_session').insert({
      kode, judul: judul.trim(), created_by: userId, mode,
    })
    if (!insErr) {
      revalidatePath('/dashboard/rals')
      return { kode }
    }
    if (!insErr.message.includes('duplicate')) return { error: insErr.message }
  }
  return { error: 'Gagal membuat kode unik, coba lagi.' }
}

export async function setStage(sessionId: string, tahap: Stage): Promise<{ error?: string }> {
  const { error, supabase } = await assertInstruktur()
  if (error || !supabase) return { error: error ?? 'Akses ditolak.' }
  const { error: updErr } = await supabase.from('rals_session').update({ tahap }).eq('id', sessionId)
  if (updErr) return { error: updErr.message }
  revalidatePath('/dashboard/rals')
  return {}
}

export async function setSessionMode(sessionId: string, mode: 'terkontrol' | 'mandiri'): Promise<{ error?: string }> {
  const { error, supabase } = await assertInstruktur()
  if (error || !supabase) return { error: error ?? 'Akses ditolak.' }
  const { error: updErr } = await supabase.from('rals_session').update({ mode }).eq('id', sessionId)
  if (updErr) return { error: updErr.message }
  revalidatePath('/dashboard/rals')
  return {}
}

export async function deleteSession(sessionId: string): Promise<{ error?: string }> {
  const { error, supabase } = await assertInstruktur()
  if (error || !supabase) return { error: error ?? 'Akses ditolak.' }
  const { error: delErr } = await supabase.from('rals_session').delete().eq('id', sessionId)
  if (delErr) return { error: delErr.message }
  revalidatePath('/dashboard/rals')
  return {}
}

export async function joinSession(kode: string): Promise<{ error?: string; participantId?: string; sessionId?: string; nama?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }
  if (!kode.trim()) return { error: 'Kode sesi wajib diisi.' }

  const { data: profile } = await supabase.from('users').select('nama_lengkap').eq('id', user.id).single()
  const nama = profile?.nama_lengkap?.trim() || user.email || 'Peserta'

  const { data: session } = await supabase
    .from('rals_session').select('id').eq('kode', kode.trim().toUpperCase()).single()
  if (!session) return { error: 'Kode sesi tidak ditemukan.' }

  // Satu peserta = satu baris per sesi → pakai ulang jika sudah ada (lanjut lintas perangkat).
  const { data: existing } = await supabase
    .from('rals_participant').select('id').eq('session_id', session.id).eq('user_id', user.id).maybeSingle()
  if (existing) return { participantId: existing.id, sessionId: session.id, nama }

  const { data: participant, error: insErr } = await supabase
    .from('rals_participant').insert({ session_id: session.id, user_id: user.id, nama }).select('id').single()
  if (insErr || !participant) return { error: insErr?.message ?? 'Gagal bergabung.' }

  return { participantId: participant.id, sessionId: session.id, nama }
}

// Hanya untuk sesi bermode 'mandiri' — peserta berpindah tahap sendiri tanpa izin instruktur.
export async function setParticipantStage(participantId: string, tahap: Stage): Promise<{ error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Tidak terautentikasi.' }

  const { data: participant } = await supabase
    .from('rals_participant').select('id, user_id, session_id').eq('id', participantId).single()
  if (!participant || participant.user_id !== user.id) return { error: 'Akses ditolak.' }

  const { data: session } = await supabase.from('rals_session').select('mode').eq('id', participant.session_id).single()
  if (session?.mode !== 'mandiri') return { error: 'Sesi ini tidak mengizinkan navigasi bebas.' }

  const { error: updErr } = await supabase.from('rals_participant').update({ tahap }).eq('id', participantId)
  if (updErr) return { error: updErr.message }
  return {}
}
