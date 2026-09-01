'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin, type AksesEPerjadin } from '@/lib/e-perjadin/akses'
import { catatLog } from '@/lib/e-perjadin/log'
import { hitungHakKeuangan } from '@/lib/e-perjadin/sbm'
import {
  cekTumpangTindih, cekAntiBackdate, cekPagu, hitungSaldoPagu, alokasiKomitmen, formatNomor,
} from '@/lib/e-perjadin/penugasan'
import { JENIS_DINAS } from '@/lib/e-perjadin/konstanta'
import {
  paramDanom, tarifSbmUntuk, inputDanom, recomputeEstimasi, kumpulkanKandidatIrisan, tulisTemuan,
  type HeaderPn, type PesertaDanom, type PesertaRingkas,
} from '@/lib/e-perjadin/danom-helper'

const LIST = '/dashboard/e-perjadin/penugasan'
type Gagal = { error: string }
type Sukses<T = unknown> = { success: true } & T

async function konteks() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  return { supabase, akses }
}
const bolehKelola = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('pengelola_kegiatan')
const bolehPemberiTugas = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('pemberi_tugas')
const bolehPpk = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('ppk')
const bolehKpa = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('kpa')
const bolehBendahara = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('bendahara')

// ── Header draf ─────────────────────────────────────────────────────
function bacaHeader(fd: FormData) {
  return {
    jenis_alur: String(fd.get('jenis_alur') ?? 'Non-Rampung'),
    jenis_dinas: String(fd.get('jenis_dinas') ?? 'Luar Kota'),
    maksud: String(fd.get('maksud') ?? '').trim(),
    unit_tujuan_id: String(fd.get('unit_tujuan_id') ?? '') || null,
    provinsi: String(fd.get('provinsi') ?? '').trim(),
    pka_id: String(fd.get('pka_id') ?? '') || null,
    tanggal_berangkat: String(fd.get('tanggal_berangkat') ?? ''),
    tanggal_kembali: String(fd.get('tanggal_kembali') ?? ''),
    tahun_anggaran: Number(fd.get('tahun_anggaran')),
    uang_muka_persen: Number(fd.get('uang_muka_persen') ?? 0),
  }
}
function validasiHeader(h: ReturnType<typeof bacaHeader>): string | null {
  if (!['Non-Rampung', 'Rampung'].includes(h.jenis_alur)) return 'Jenis alur tidak sah.'
  if (!(JENIS_DINAS as readonly string[]).includes(h.jenis_dinas)) return 'Jenis dinas tidak sah.'
  if (!h.maksud) return 'Maksud penugasan wajib diisi.'
  if (!h.provinsi) return 'Provinsi tujuan wajib diisi (acuan tarif SBM).'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.tanggal_berangkat)) return 'Tanggal berangkat wajib diisi.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(h.tanggal_kembali)) return 'Tanggal kembali wajib diisi.'
  if (h.tanggal_kembali < h.tanggal_berangkat) return 'Tanggal kembali mendahului tanggal berangkat.'
  if (!Number.isInteger(h.tahun_anggaran) || h.tahun_anggaran < 2000) return 'Tahun anggaran tidak sah.'
  if (![0, 50, 100].includes(h.uang_muka_persen)) return 'Uang muka harus 0, 50, atau 100.'
  return null
}

export async function buatDraf(fd: FormData): Promise<Gagal | Sukses<{ id: string }>> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Hanya Pengelola Kegiatan yang dapat membuat penugasan.' }
  const h = bacaHeader(fd)
  const galat = validasiHeader(h)
  if (galat) return { error: galat }
  const af2 = cekAntiBackdate(h.jenis_alur as 'Non-Rampung' | 'Rampung', { berangkat: h.tanggal_berangkat, kembali: h.tanggal_kembali })
  if (!af2.ok) return { error: af2.error }
  if (h.jenis_alur === 'Rampung') h.uang_muka_persen = 0

  const { data, error } = await supabase.from('perjadin_penugasan')
    .insert({ ...h, status: 'Draf', dibuat_oleh: akses.userId }).select('id').single()
  if (error || !data) return { error: error?.message ?? 'Gagal menyimpan.' }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'buat_draf_penugasan', entitas: 'perjadin_penugasan', entitasId: data.id, penugasanId: data.id, nilaiBaru: h })
  revalidatePath(LIST)
  return { success: true, id: data.id }
}

export async function perbaruiDraf(id: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: lama } = await supabase.from('perjadin_penugasan').select('st_status, danom_status').eq('id', id).single()
  if (!lama) return { error: 'Penugasan tidak ditemukan.' }
  if (lama.st_status !== 'draf') return { error: 'Header terkunci — Surat Tugas sudah diajukan/terbit.' }

  const h = bacaHeader(fd)
  const galat = validasiHeader(h)
  if (galat) return { error: galat }
  const af2 = cekAntiBackdate(h.jenis_alur as 'Non-Rampung' | 'Rampung', { berangkat: h.tanggal_berangkat, kembali: h.tanggal_kembali })
  if (!af2.ok) return { error: af2.error }
  if (h.jenis_alur === 'Rampung') h.uang_muka_persen = 0

  const { error } = await supabase.from('perjadin_penugasan').update({ ...h, updated_at: new Date().toISOString() }).eq('id', id)
  if (error) return { error: error.message }
  const errRecompute = await recomputeEstimasi(supabase, id)
  if (errRecompute) return { error: `Header tersimpan, tetapi kalkulasi ulang gagal: ${errRecompute}` }

  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'perbarui_draf_penugasan', entitas: 'perjadin_penugasan', entitasId: id, penugasanId: id, nilaiBaru: h })
  revalidatePath(LIST); revalidatePath(`${LIST}/${id}`)
  return { success: true }
}

export async function hapusDraf(id: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: p } = await supabase.from('perjadin_penugasan').select('st_status, danom_status').eq('id', id).single()
  if (!p) return { error: 'Penugasan tidak ditemukan.' }
  if (p.st_status !== 'draf' || p.danom_status !== 'draf') return { error: 'Hanya draf (kedua jalur belum diajukan) yang dapat dihapus.' }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'hapus_draf_penugasan', entitas: 'perjadin_penugasan', entitasId: id })
  const { error } = await supabase.from('perjadin_penugasan').delete().eq('id', id)
  if (error) return { error: error.message }
  revalidatePath(LIST)
  return { success: true }
}

// ── Peserta & tim ──────────────────────────────────────────────────
export async function tambahPeserta(penugasanId: string, fd: FormData): Promise<Gagal | (Sukses & { peringatan?: string })> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, st_status, jenis_dinas, provinsi, tahun_anggaran, tanggal_berangkat, tanggal_kembali').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.st_status !== 'draf') return { error: 'Tim terkunci — Surat Tugas sudah diajukan.' }

  const eksternal = fd.get('eksternal') === '1'
  const pegawaiNip = String(fd.get('pegawai_nip') ?? '').trim() || null
  // Tautkan akun login hanya bila NIP pegawai cocok dengan users.nip → bisa presensi sendiri.
  let user_id: string | null = null
  if (!eksternal && pegawaiNip) {
    const { data: akun } = await supabase.from('users').select('id').eq('nip', pegawaiNip).eq('status_aktif', true).maybeSingle()
    user_id = akun?.id ?? null
  }
  const nama = String(fd.get('nama') ?? '').trim()
  const nip = String(fd.get('nip') ?? '').trim() || null
  const jabatan = String(fd.get('jabatan') ?? '').trim() || null
  const peran_tim = String(fd.get('peran_tim') ?? '')
  const kategori = String(fd.get('kategori') ?? '1')
  const penginapan_mode = String(fd.get('penginapan_mode') ?? 'hotel')
  const homebase_jabodetabek = fd.get('homebase_jabodetabek') === 'on'
  const berhak_representasi = fd.get('berhak_representasi') === 'on'
  const transport_lokal_riil = fd.get('transport_lokal_riil') === 'on'
  const pakai_kendaraan_dinas = fd.get('pakai_kendaraan_dinas') === 'on'
  const rute_pesawat = String(fd.get('rute_pesawat') ?? '-') || '-'
  const estimasi_pesawat = Math.max(0, Math.round(Number(fd.get('estimasi_pesawat') ?? 0)))
  const param = await paramDanom(supabase)
  const estimasi_dpr = Math.max(0, Math.round(Number(fd.get('estimasi_dpr') ?? param.dprDefault)))

  if (!nama) return { error: 'Nama peserta wajib diisi.' }
  if (!['Pengendali Mutu', 'Pengendali Teknis', 'Ketua Tim', 'Anggota Tim'].includes(peran_tim)) return { error: 'Peran tim tidak sah.' }
  if (!['1', '2'].includes(kategori)) return { error: 'Kategori pelaksana tidak sah.' }

  const tarif = await tarifSbmUntuk(supabase, pn.tahun_anggaran, pn.provinsi)
  const pdanom: PesertaDanom = {
    tingkat_biaya: kategori, penginapan_mode, homebase_jabodetabek,
    berhak_representasi, transport_lokal_riil, pakai_kendaraan_dinas,
    estimasi_pesawat, estimasi_dpr, rute_pesawat,
  }
  let rincian
  try {
    rincian = hitungHakKeuangan(inputDanom(pn as HeaderPn, pdanom, param), tarif)
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Kalkulasi DANOM gagal.' }
  }

  const { data: baru, error } = await supabase.from('perjadin_peserta').insert({
    penugasan_id: penugasanId, user_id, nama, nip, jabatan, peran_tim,
    tingkat_biaya: kategori, penginapan_mode, homebase_jabodetabek,
    berhak_representasi, transport_lokal_riil, pakai_kendaraan_dinas,
    estimasi_pesawat, estimasi_dpr, rute_pesawat, pegawai_nip: pegawaiNip ?? nip,
    eksternal, estimasi_rincian: rincian, estimasi_total: rincian.kwitansi,
  }).select('id').single()
  if (error || !baru) return { error: error?.message ?? 'Gagal menambah peserta.' }

  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'tambah_peserta', entitas: 'perjadin_peserta', entitasId: baru.id, penugasanId, nilaiBaru: { nama, peran_tim, kwitansi: rincian.kwitansi } })
  revalidatePath(`${LIST}/${penugasanId}`)
  const peringatan = await deteksiIrisanDini(supabase, penugasanId, { user_id, nip, nama }, pn)
  return peringatan ? { success: true, peringatan } : { success: true }
}

export async function hapusPeserta(pesertaId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: ps } = await supabase.from('perjadin_peserta')
    .select('id, penugasan_id, penugasan:penugasan_id(st_status)').eq('id', pesertaId).single()
  if (!ps) return { error: 'Peserta tidak ditemukan.' }
  if ((ps.penugasan as { st_status?: string } | null)?.st_status !== 'draf') return { error: 'Tim terkunci — Surat Tugas sudah diajukan.' }
  const { error } = await supabase.from('perjadin_peserta').delete().eq('id', pesertaId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'hapus_peserta', entitas: 'perjadin_peserta', entitasId: pesertaId, penugasanId: ps.penugasan_id })
  revalidatePath(`${LIST}/${ps.penugasan_id}`)
  return { success: true }
}

// ── Pemetaan pagu ─────────────────────────────────────────────────
export async function petakanPagu(penugasanId: string, paguIds: string[]): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  const boleh = akses.isAdmin || akses.peran.includes('staf_ppk') || akses.peran.includes('pengelola_kegiatan')
  if (!akses.bisaAkses || !boleh) return { error: 'Hanya Staf PPK / Pengelola yang dapat memetakan pagu.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('danom_status').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (!['draf', 'diajukan_ppk'].includes(pn.danom_status)) return { error: 'Pagu tidak dapat diubah setelah DANOM disetujui PPK.' }

  await supabase.from('perjadin_penugasan_pagu').delete().eq('penugasan_id', penugasanId)
  const bersih = [...new Set(paguIds)].filter(Boolean)
  if (bersih.length > 0) {
    const { error } = await supabase.from('perjadin_penugasan_pagu')
      .insert(bersih.map((pagu_id, i) => ({ penugasan_id: penugasanId, pagu_id, urutan: i })))
    if (error) return { error: error.message }
  }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'petakan_pagu', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: bersih })
  revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

// ── Alur Rampung: unggah berkas ST eksternal (F-1.4) ───────────────
export async function unggahStRampung(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('jenis_alur, st_status').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.jenis_alur !== 'Rampung') return { error: 'Hanya untuk penugasan alur Rampung.' }
  if (pn.st_status !== 'draf') return { error: 'Berkas ST tidak dapat diubah setelah jalur ST diajukan.' }

  const berkas = fd.get('berkas') as File | null
  if (!berkas || berkas.size === 0) return { error: 'Pilih berkas ST (PDF/foto).' }

  const admin = createAdminClient()
  const ext = berkas.type === 'application/pdf' ? 'pdf' : 'jpg'
  const up = await admin.storage.from('perjadin-dokumen').upload(`${penugasanId}/st-rampung/${randomUUID()}.${ext}`, berkas, { contentType: berkas.type })
  if (up.error) return { error: `Unggah gagal: ${up.error.message}` }

  const { error } = await supabase.from('perjadin_penugasan')
    .update({ st_rampung_path: up.data.path, updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'unggah_st_rampung', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId })
  revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

// ── Jalur ST: Pengelola → Pemberi Tugas ─────────────────────────────
export async function ajukanST(penugasanId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('st_status, jenis_alur, st_rampung_path').eq('id', penugasanId).single()
  if (pn?.st_status !== 'draf') return { error: 'Jalur ST tidak sedang draf.' }
  if (pn.jenis_alur === 'Rampung' && !pn.st_rampung_path) return { error: 'Alur Rampung: unggah berkas ST eksternal lebih dulu.' }
  const { data: peserta } = await supabase.from('perjadin_peserta').select('id').eq('penugasan_id', penugasanId)
  if (!peserta || peserta.length === 0) return { error: 'Tambahkan minimal satu peserta.' }

  const { error } = await supabase.from('perjadin_penugasan')
    .update({ st_status: 'diajukan', updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'ajukan_st', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

export async function setujuiST(penugasanId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehPemberiTugas(akses)) return { error: 'Hanya Pemberi Tugas (Inspektur) yang menerbitkan Surat Tugas.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, st_status, danom_status, jenis_alur, st_rampung_path, tanggal_berangkat, tanggal_kembali, tahun_anggaran').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.st_status !== 'diajukan') return { error: `Jalur ST berstatus "${pn.st_status}".` }
  if (pn.jenis_alur === 'Rampung' && !pn.st_rampung_path) return { error: 'Alur Rampung: lampirkan berkas ST eksternal lebih dulu.' }

  const rentang = { berangkat: pn.tanggal_berangkat, kembali: pn.tanggal_kembali }
  const { data: peserta } = await supabase.from('perjadin_peserta').select('id, user_id, nip, nama').eq('penugasan_id', penugasanId)
  if (!peserta || peserta.length === 0) return { error: 'Penugasan tidak memiliki peserta.' }

  const af1 = cekTumpangTindih(rentang, await kumpulkanKandidatIrisan(supabase, penugasanId, peserta as PesertaRingkas[]))
  if (!af1.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-1', 'blocking', af1.error); return { error: af1.error } }
  const af2 = cekAntiBackdate(pn.jenis_alur as 'Non-Rampung' | 'Rampung', rentang)
  if (!af2.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-2', 'blocking', af2.error); return { error: af2.error } }

  const { data: seqSt } = await supabase.rpc('perjadin_next_nomor', { p_jenis: 'ST', p_tahun: pn.tahun_anggaran })
  const nomorST = formatNomor('ST', Number(seqSt ?? 0), pn.tahun_anggaran)
  const { error: errDok } = await supabase.from('perjadin_dokumen').insert({
    penugasan_id: penugasanId, peserta_id: null, jenis: 'ST', nomor: nomorST, token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
  })
  if (errDok) return { error: `Gagal menerbitkan ST: ${errDok.message}` }
  for (const p of peserta as { id: string }[]) {
    const { data: seqSpd } = await supabase.rpc('perjadin_next_nomor', { p_jenis: 'SPD', p_tahun: pn.tahun_anggaran })
    await supabase.from('perjadin_dokumen').insert({
      penugasan_id: penugasanId, peserta_id: p.id, jenis: 'SPD',
      nomor: formatNomor('SPD', Number(seqSpd ?? 0), pn.tahun_anggaran), token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
    })
  }

  const now = new Date().toISOString()
  const status = pn.danom_status === 'disetujui' ? 'Berjalan' : 'Draf'
  const { error } = await supabase.from('perjadin_penugasan').update({
    st_status: 'terbit', nomor: nomorST, pemberi_tugas_oleh: akses.userId, pemberi_tugas_pada: now,
    status, updated_at: now,
  }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'terbitkan_st', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { nomorST } })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

export async function kembalikanST(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehPemberiTugas(akses)) return { error: 'Hanya Pemberi Tugas.' }
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!alasan) return { error: 'Alasan pengembalian wajib diisi.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('st_status').eq('id', penugasanId).single()
  if (pn?.st_status !== 'diajukan') return { error: 'Jalur ST tidak sedang diajukan.' }
  const { error } = await supabase.from('perjadin_penugasan').update({ st_status: 'draf', updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'kembalikan_st', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { alasan } })
  revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

// ── Jalur DANOM: Pengelola → PPK → KPA ─────────────────────────────
export async function ajukanDanom(penugasanId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('danom_status').eq('id', penugasanId).single()
  if (!['draf'].includes(pn?.danom_status ?? '')) return { error: 'Jalur DANOM tidak sedang draf.' }

  const [{ data: peserta }, { data: pagu }] = await Promise.all([
    supabase.from('perjadin_peserta').select('estimasi_total').eq('penugasan_id', penugasanId),
    supabase.from('perjadin_penugasan_pagu').select('id').eq('penugasan_id', penugasanId),
  ])
  if (!peserta || peserta.length === 0) return { error: 'Tambahkan minimal satu peserta.' }
  if (peserta.some((p) => !p.estimasi_total || p.estimasi_total <= 0)) return { error: 'Ada peserta tanpa estimasi (kwitansi) DANOM.' }
  if (!pagu || pagu.length === 0) return { error: 'Petakan penugasan ke minimal satu mata anggaran (pagu).' }

  const { error } = await supabase.from('perjadin_penugasan')
    .update({ danom_status: 'diajukan_ppk', updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'ajukan_danom', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

export async function setujuiDanomPpk(penugasanId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehPpk(akses)) return { error: 'Hanya PPK yang menyetujui DANOM & memesan pagu.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('danom_status, tahun_anggaran').eq('id', penugasanId).single()
  if (pn?.danom_status !== 'diajukan_ppk') return { error: 'DANOM tidak sedang menunggu PPK.' }

  const { data: peserta } = await supabase.from('perjadin_peserta').select('estimasi_total').eq('penugasan_id', penugasanId)
  const estimasiTotal = (peserta ?? []).reduce((s, p) => s + Number(p.estimasi_total ?? 0), 0)

  const { data: mapRows } = await supabase.from('perjadin_penugasan_pagu')
    .select('pagu_id, urutan, pagu:pagu_id(pagu)').eq('penugasan_id', penugasanId).order('urutan', { ascending: true })
  if (!mapRows || mapRows.length === 0) return { error: 'Penugasan belum dipetakan ke pagu.' }
  const paguIds = mapRows.map((r) => r.pagu_id as string)
  const { data: komitmenSemua } = await supabase.from('perjadin_komitmen').select('pagu_id, jenis, jumlah').in('pagu_id', paguIds)
  const saldoPerPagu = mapRows.map((r) => {
    const paguNilai = Number((r.pagu as { pagu?: number } | null)?.pagu ?? 0)
    const kom = (komitmenSemua ?? []).filter((k) => k.pagu_id === r.pagu_id).map((k) => ({ jenis: k.jenis as 'pesan' | 'lepas', jumlah: Number(k.jumlah) }))
    return { paguId: r.pagu_id as string, tersedia: hitungSaldoPagu(paguNilai, kom).tersedia }
  })
  const af6 = cekPagu(estimasiTotal, saldoPerPagu.reduce((s, p) => s + p.tersedia, 0))
  if (!af6.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-6', 'blocking', af6.error); return { error: af6.error } }

  let alokasi
  try { alokasi = alokasiKomitmen(estimasiTotal, saldoPerPagu) } catch (e) { return { error: e instanceof Error ? e.message : 'Alokasi pagu gagal.' } }
  if (alokasi.length > 0) {
    const { error } = await supabase.from('perjadin_komitmen').insert(alokasi.map((a) => ({
      pagu_id: a.paguId, penugasan_id: penugasanId, jenis: 'pesan', jumlah: a.jumlah,
      keterangan: 'Komitmen persetujuan DANOM (PPK)', dibuat_oleh: akses.userId,
    })))
    if (error) return { error: `Gagal memesan pagu: ${error.message}` }
  }

  const admin = createAdminClient()
  const { data: seq } = await admin.rpc('perjadin_next_nomor', { p_jenis: 'DANOM', p_tahun: pn.tahun_anggaran })
  await admin.from('perjadin_dokumen').insert({
    penugasan_id: penugasanId, peserta_id: null, jenis: 'DANOM',
    nomor: formatNomor('DANOM', Number(seq ?? 0), pn.tahun_anggaran), token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
  })

  const now = new Date().toISOString()
  const { error } = await supabase.from('perjadin_penugasan')
    .update({ danom_status: 'diajukan_kpa', disetujui_oleh: akses.userId, disetujui_pada: now, updated_at: now }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'setujui_danom_ppk', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { estimasiTotal, alokasi } })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

export async function setujuiDanomKpa(penugasanId: string): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehKpa(akses)) return { error: 'Hanya KPA (Sekretaris) yang menyetujui anggaran.' }
  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('danom_status, st_status, uang_muka_persen').eq('id', penugasanId).single()
  if (pn?.danom_status !== 'diajukan_kpa') return { error: 'DANOM tidak sedang menunggu KPA.' }

  const { data: peserta } = await supabase.from('perjadin_peserta').select('estimasi_total').eq('penugasan_id', penugasanId)
  const total = (peserta ?? []).reduce((s, p) => s + Number(p.estimasi_total ?? 0), 0)
  const uangMuka = Math.round((total * Number(pn.uang_muka_persen ?? 0)) / 100)

  const now = new Date().toISOString()
  const status = pn.st_status === 'terbit' ? 'Berjalan' : 'Draf'
  const { error } = await supabase.from('perjadin_penugasan').update({
    danom_status: 'disetujui', kpa_oleh: akses.userId, kpa_pada: now, uang_muka_total: uangMuka, status, updated_at: now,
  }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'setujui_danom_kpa', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { uangMuka } })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`); revalidatePath('/dashboard/e-perjadin/penyelesaian')
  return { success: true }
}

export async function kembalikanDanom(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || (!bolehPpk(akses) && !bolehKpa(akses))) return { error: 'Hanya PPK / KPA.' }
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!alasan) return { error: 'Alasan pengembalian wajib diisi.' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('danom_status').eq('id', penugasanId).single()
  if (!['diajukan_ppk', 'diajukan_kpa'].includes(pn?.danom_status ?? '')) return { error: 'DANOM tidak dalam tahap yang dapat dikembalikan.' }

  // Bila komitmen sudah dipesan (dikembalikan dari KPA), lepas kembali.
  const admin = createAdminClient()
  const { data: kom } = await supabase.from('perjadin_komitmen').select('pagu_id, jenis, jumlah').eq('penugasan_id', penugasanId)
  const net = new Map<string, number>()
  for (const k of kom ?? []) net.set(k.pagu_id, (net.get(k.pagu_id) ?? 0) + (k.jenis === 'pesan' ? Number(k.jumlah) : -Number(k.jumlah)))
  const lepas = [...net.entries()].filter(([, n]) => n > 0).map(([pagu_id, n]) => ({
    pagu_id, penugasan_id: penugasanId, jenis: 'lepas', jumlah: n, keterangan: 'Pelepasan — DANOM dikembalikan', dibuat_oleh: akses.userId,
  }))
  if (lepas.length > 0) await admin.from('perjadin_komitmen').insert(lepas)

  const { error } = await supabase.from('perjadin_penugasan')
    .update({ danom_status: 'draf', updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'kembalikan_danom', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { alasan, dilepas: lepas.length } })
  revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

export async function bayarUangMuka(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || !bolehBendahara(akses)) return { error: 'Hanya Bendahara yang mencatat pembayaran uang muka.' }
  const tanggal = String(fd.get('tanggal') ?? '')
  const bukti = fd.get('bukti') as File | null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal wajib diisi.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('danom_status, uang_muka_persen, uang_muka_dibayar_pada').eq('id', penugasanId).single()
  if (pn?.danom_status !== 'disetujui') return { error: 'DANOM belum disetujui KPA.' }
  if (Number(pn.uang_muka_persen ?? 0) === 0) return { error: 'Penugasan ini tanpa uang muka (0%).' }
  if (pn.uang_muka_dibayar_pada) return { error: 'Uang muka sudah tercatat dibayar.' }

  let path: string | null = null
  if (bukti && bukti.size > 0) {
    const admin = createAdminClient()
    const ext = bukti.type === 'application/pdf' ? 'pdf' : 'jpg'
    const up = await admin.storage.from('perjadin-bukti').upload(`${penugasanId}/uang-muka/${randomUUID()}.${ext}`, bukti, { contentType: bukti.type })
    if (up.error) return { error: `Unggah bukti gagal: ${up.error.message}` }
    path = up.data.path
  }
  const { error } = await supabase.from('perjadin_penugasan')
    .update({ uang_muka_dibayar_pada: `${tanggal}T00:00:00Z`, uang_muka_bukti_path: path, updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'bayar_uang_muka', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { tanggal } })
  revalidatePath(`${LIST}/${penugasanId}`); revalidatePath('/dashboard/e-perjadin/penyelesaian')
  return { success: true }
}

// ── Pembatalan ─────────────────────────────────────────────────────
export async function batalkanPenugasan(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const { supabase, akses } = await konteks()
  if (!akses.bisaAkses || (!bolehPpk(akses) && !bolehPemberiTugas(akses))) return { error: 'Hanya PPK / Pemberi Tugas dapat membatalkan.' }
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!alasan) return { error: 'Alasan pembatalan wajib diisi (F-1.4).' }
  const { data: pn } = await supabase.from('perjadin_penugasan').select('status').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (['Selesai', 'Dibatalkan'].includes(pn.status)) return { error: `Penugasan berstatus "${pn.status}" tidak dapat dibatalkan.` }

  const admin = createAdminClient()
  const { data: kom } = await supabase.from('perjadin_komitmen').select('pagu_id, jenis, jumlah').eq('penugasan_id', penugasanId)
  const net = new Map<string, number>()
  for (const k of kom ?? []) net.set(k.pagu_id, (net.get(k.pagu_id) ?? 0) + (k.jenis === 'pesan' ? Number(k.jumlah) : -Number(k.jumlah)))
  const lepas = [...net.entries()].filter(([, n]) => n > 0).map(([pagu_id, n]) => ({
    pagu_id, penugasan_id: penugasanId, jenis: 'lepas', jumlah: n, keterangan: 'Pelepasan — pembatalan penugasan', dibuat_oleh: akses.userId,
  }))
  if (lepas.length > 0) await admin.from('perjadin_komitmen').insert(lepas)

  const { error } = await supabase.from('perjadin_penugasan')
    .update({ status: 'Dibatalkan', alasan_batal: alasan, updated_at: new Date().toISOString() }).eq('id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId!, aksi: 'batalkan_penugasan', entitas: 'perjadin_penugasan', entitasId: penugasanId, penugasanId, nilaiBaru: { alasan, dilepas: lepas.length } })
  revalidatePath(LIST); revalidatePath(`${LIST}/${penugasanId}`)
  return { success: true }
}

async function deteksiIrisanDini(
  supabase: SupabaseClient, penugasanId: string, peserta: PesertaRingkas,
  pn: { tanggal_berangkat: string; tanggal_kembali: string },
): Promise<string | null> {
  const kandidat = await kumpulkanKandidatIrisan(supabase, penugasanId, [peserta])
  const hasil = cekTumpangTindih({ berangkat: pn.tanggal_berangkat, kembali: pn.tanggal_kembali }, kandidat)
  return hasil.ok ? null : `Peringatan AF-1 — ${hasil.error} Penerbitan ST akan memblokir bila belum diselesaikan.`
}
