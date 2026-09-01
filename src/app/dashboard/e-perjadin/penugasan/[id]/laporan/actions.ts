'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { catatLog } from '@/lib/e-perjadin/log'
import { formatNomor } from '@/lib/e-perjadin/penugasan'
import { SEGMEN, laporanSiapFinal, segmenTerkunci } from '@/lib/e-perjadin/laporan'

type Gagal = { error: string }

async function ctx(penugasanId: string) {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return { supabase, akses, peserta: null as null | { id: string; peran_tim: string } }
  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, peran_tim').eq('penugasan_id', penugasanId).eq('user_id', akses.userId).maybeSingle()
  return { supabase, akses, peserta }
}

const bolehSunting = (akses: { isAdmin: boolean; peran: string[] }, peserta: unknown) =>
  !!peserta || akses.isAdmin || akses.peran.includes('pengelola_kegiatan')
const bolehKetua = (akses: { isAdmin: boolean; peran: string[] }, peserta: { peran_tim: string } | null) =>
  akses.isAdmin || akses.peran.includes('pengelola_kegiatan') || peserta?.peran_tim === 'Ketua Tim'

const J = (id: string) => `/dashboard/e-perjadin/penugasan/${id}/laporan`

/** Get-or-create laporan + 6 segmen. Idempoten. */
export async function pastikanLaporan(penugasanId: string): Promise<Gagal | { success: true; laporanId: string }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehSunting(akses, peserta)) return { error: 'Hanya anggota tim / pengelola yang dapat menyusun laporan.' }

  const { data: ada } = await supabase.from('perjadin_laporan').select('id').eq('penugasan_id', penugasanId).maybeSingle()
  let laporanId = ada?.id as string | null
  if (!laporanId) {
    const { data, error } = await supabase.from('perjadin_laporan').insert({ penugasan_id: penugasanId }).select('id').single()
    if (error || !data) return { error: error?.message ?? 'Gagal membuat laporan.' }
    laporanId = data.id as string
  }

  const { data: segmenAda } = await supabase.from('perjadin_laporan_segmen').select('kunci').eq('laporan_id', laporanId)
  const adaKunci = new Set((segmenAda ?? []).map((s) => s.kunci))
  const kurang = SEGMEN.filter((s) => !adaKunci.has(s.kunci)).map((s) => ({ laporan_id: laporanId, kunci: s.kunci }))
  if (kurang.length > 0) {
    const { error } = await supabase.from('perjadin_laporan_segmen').insert(kurang)
    if (error) return { error: error.message }
  }

  revalidatePath(J(penugasanId))
  return { success: true, laporanId }
}

export async function simpanSegmen(
  penugasanId: string, segmenId: string, isi: string,
): Promise<Gagal | { success: true; tersimpanPada: string; versi: number; peringatan?: string }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehSunting(akses, peserta)) return { error: 'Akses ditolak.' }

  const { data: seg } = await supabase.from('perjadin_laporan_segmen')
    .select('id, isi, versi, disunting_oleh, disunting_pada, laporan:laporan_id(status)')
    .eq('id', segmenId).single()
  if (!seg) return { error: 'Segmen tidak ditemukan.' }
  if ((seg.laporan as { status?: string } | null)?.status === 'final') return { error: 'Laporan sudah final — tidak dapat diubah.' }

  const lock = segmenTerkunci(seg.disunting_oleh as string | null, seg.disunting_pada as string | null, akses.userId)

  // Snapshot isi lama sebelum ditimpa (F-4.1) — lewati bila masih kosong.
  if (((seg.isi as string) ?? '').trim()) {
    await supabase.from('perjadin_laporan_segmen_versi').insert({
      segmen_id: segmenId, isi: seg.isi, versi: seg.versi, disimpan_oleh: akses.userId,
    })
  }

  const now = new Date().toISOString()
  const versiBaru = (seg.versi as number) + 1
  const { error } = await supabase.from('perjadin_laporan_segmen').update({
    isi, versi: versiBaru, disunting_oleh: akses.userId, disunting_pada: now, updated_at: now,
  }).eq('id', segmenId)
  if (error) return { error: error.message }

  return {
    success: true, tersimpanPada: now, versi: versiBaru,
    peringatan: lock.olehOrangLain ? 'Segmen ini baru saja disunting orang lain — perubahan Anda menimpanya.' : undefined,
  }
}

export async function tugaskanSegmen(penugasanId: string, segmenId: string, userId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehKetua(akses, peserta)) return { error: 'Hanya Ketua Tim yang dapat menugaskan segmen.' }

  const { error } = await supabase.from('perjadin_laporan_segmen')
    .update({ ditugaskan_ke: userId || null }).eq('id', segmenId)
  if (error) return { error: error.message }
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function pulihkanVersi(
  penugasanId: string, segmenId: string, versiId: string,
): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehSunting(akses, peserta)) return { error: 'Akses ditolak.' }

  const [{ data: seg }, { data: ver }] = await Promise.all([
    supabase.from('perjadin_laporan_segmen').select('isi, versi, laporan:laporan_id(status)').eq('id', segmenId).single(),
    supabase.from('perjadin_laporan_segmen_versi').select('isi').eq('id', versiId).single(),
  ])
  if (!seg || !ver) return { error: 'Versi tidak ditemukan.' }
  if ((seg.laporan as { status?: string } | null)?.status === 'final') return { error: 'Laporan sudah final.' }

  const now = new Date().toISOString()
  if (((seg.isi as string) ?? '').trim()) {
    await supabase.from('perjadin_laporan_segmen_versi').insert({
      segmen_id: segmenId, isi: seg.isi, versi: seg.versi, disimpan_oleh: akses.userId,
    })
  }
  const { error } = await supabase.from('perjadin_laporan_segmen').update({
    isi: ver.isi, versi: (seg.versi as number) + 1, disunting_oleh: akses.userId, disunting_pada: now, updated_at: now,
  }).eq('id', segmenId)
  if (error) return { error: error.message }
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function ambilRiwayat(
  penugasanId: string, segmenId: string,
): Promise<Gagal | { success: true; versi: { id: string; versi: number; isi: string; disimpan_pada: string }[] }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehSunting(akses, peserta)) return { error: 'Akses ditolak.' }

  const { data } = await supabase.from('perjadin_laporan_segmen_versi')
    .select('id, versi, isi, disimpan_pada').eq('segmen_id', segmenId)
    .order('versi', { ascending: false }).limit(10)
  return { success: true, versi: (data ?? []) as { id: string; versi: number; isi: string; disimpan_pada: string }[] }
}

export async function finalkanLaporan(penugasanId: string): Promise<Gagal | { success: true; nomor: string }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehKetua(akses, peserta)) return { error: 'Hanya Ketua Tim yang dapat menyatakan laporan final.' }

  const { data: lap } = await supabase.from('perjadin_laporan')
    .select('id, status, penugasan:penugasan_id(tahun_anggaran)').eq('penugasan_id', penugasanId).single()
  if (!lap) return { error: 'Laporan belum dibuat.' }
  if (lap.status === 'final') return { error: 'Laporan sudah final.' }

  const { data: segmen } = await supabase.from('perjadin_laporan_segmen')
    .select('kunci, isi').eq('laporan_id', lap.id)
  const cek = laporanSiapFinal((segmen ?? []) as { kunci: string; isi: string }[])
  if (!cek.siap) return { error: `Segmen belum lengkap: ${cek.kurang.join(', ')}.` }

  const tahun = Number((lap.penugasan as { tahun_anggaran?: number } | null)?.tahun_anggaran ?? new Date().getFullYear())
  const now = new Date().toISOString()

  const { error: errUpd } = await supabase.from('perjadin_laporan').update({
    status: 'final', difinalkan_oleh: akses.userId, difinalkan_pada: now, updated_at: now,
  }).eq('id', lap.id)
  if (errUpd) return { error: errUpd.message }

  // Terbitkan dokumen Laporan ber-QR sekali saja (idempoten bila pernah final lalu di-un-final).
  const admin: SupabaseClient = createAdminClient()
  const { data: dokAda } = await admin.from('perjadin_dokumen')
    .select('nomor').eq('penugasan_id', penugasanId).eq('jenis', 'Laporan').maybeSingle()
  let nomor = dokAda?.nomor as string | undefined
  if (!nomor) {
    const { data: seq } = await admin.rpc('perjadin_next_nomor', { p_jenis: 'LHPD', p_tahun: tahun })
    nomor = formatNomor('LHPD', Number(seq ?? 0), tahun)
    const { error: errDok } = await admin.from('perjadin_dokumen').insert({
      penugasan_id: penugasanId, peserta_id: null, jenis: 'Laporan', nomor,
      token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
    })
    if (errDok) return { error: `Laporan difinalkan, tetapi penerbitan dokumen gagal: ${errDok.message}` }
  }

  await catatLog(supabase, {
    aktorId: akses.userId, aksi: 'finalkan_laporan', entitas: 'perjadin_laporan', entitasId: lap.id as string, nilaiBaru: { nomor },
  })
  revalidatePath(J(penugasanId))
  revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`)
  return { success: true, nomor }
}

export async function batalFinal(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehKetua(akses, peserta)) return { error: 'Hanya Ketua Tim yang dapat membuka kembali laporan.' }

  const { data: lap } = await supabase.from('perjadin_laporan').select('id, status').eq('penugasan_id', penugasanId).single()
  if (lap?.status !== 'final') return { error: 'Laporan tidak berstatus final.' }

  // Tidak boleh dibuka bila E-SPJ sudah lewat tahap draf (laporan final jadi prasyarat pengajuan).
  const { data: espj } = await supabase.from('perjadin_espj').select('status').eq('penugasan_id', penugasanId).maybeSingle()
  if (espj && !['draf', 'dikembalikan'].includes(espj.status)) {
    return { error: 'E-SPJ sudah diajukan — laporan tidak dapat dibuka kembali.' }
  }

  const { error } = await supabase.from('perjadin_laporan')
    .update({ status: 'draf', difinalkan_oleh: null, difinalkan_pada: null, updated_at: new Date().toISOString() }).eq('id', lap.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'batal_final_laporan', entitas: 'perjadin_laporan', entitasId: lap.id })
  revalidatePath(J(penugasanId)); revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`)
  return { success: true }
}

export async function tandaiDiteruskan(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!bolehKetua(akses, peserta)) return { error: 'Akses ditolak.' }

  const { data: lap } = await supabase.from('perjadin_laporan').select('id, status').eq('penugasan_id', penugasanId).single()
  if (lap?.status !== 'final') return { error: 'Tandai hanya setelah laporan final.' }

  const { error } = await supabase.from('perjadin_laporan')
    .update({ diteruskan_pada: new Date().toISOString() }).eq('id', lap.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'tandai_laporan_diteruskan', entitas: 'perjadin_laporan', entitasId: lap.id })
  revalidatePath(J(penugasanId))
  return { success: true }
}
