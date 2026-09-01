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
import {
  paramDanom, tarifSbmUntuk, inputDanom, recomputeEstimasi, kumpulkanKandidatIrisan, tulisTemuan,
  type HeaderPn, type PesertaRingkas,
} from '@/lib/e-perjadin/danom-helper'
import { ringkasPerubahan, jumlahPerubahan, type SnapshotBaru } from '@/lib/e-perjadin/revisi'

type Gagal = { error: string }
type OK = { success: true }
const J = (id: string) => `/dashboard/e-perjadin/penugasan/${id}`

async function ctx() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  return { supabase, akses }
}
const bolehKelola = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('pengelola_kegiatan')
const bolehPemberiTugas = (a: AksesEPerjadin) => a.isAdmin || a.peran.includes('pemberi_tugas')

async function espjMasihDraf(supabase: SupabaseClient, penugasanId: string): Promise<boolean> {
  const { data } = await supabase.from('perjadin_espj').select('status').eq('penugasan_id', penugasanId).maybeSingle()
  return !data || ['draf', 'dikembalikan'].includes(data.status)
}
async function snapshotSekarang(supabase: SupabaseClient, penugasanId: string) {
  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('jenis_dinas, jenis_alur, provinsi, unit_tujuan_id, pka_id, tanggal_berangkat, tanggal_kembali, tahun_anggaran, uang_muka_persen, nomor')
    .eq('id', penugasanId).single()
  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, nama, nip, peran_tim, tingkat_biaya, ditarik_pada').eq('penugasan_id', penugasanId)
  return { header: pn, peserta: peserta ?? [] }
}

// ── Buat / batalkan / simpan / ajukan revisi (Pengelola) ─────────────
export async function buatRevisi(penugasanId: string, fd: FormData): Promise<Gagal | (OK & { id: string })> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehKelola(akses)) return { error: 'Hanya Pengelola Kegiatan.' }
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!alasan) return { error: 'Alasan revisi wajib diisi.' }

  const { data: pn } = await supabase.from('perjadin_penugasan').select('st_status, status').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.st_status !== 'terbit') return { error: 'Revisi hanya untuk penugasan yang ST-nya sudah terbit.' }
  if (['Selesai', 'Dibatalkan'].includes(pn.status)) return { error: `Penugasan berstatus "${pn.status}".` }
  if (!(await espjMasihDraf(supabase, penugasanId))) return { error: 'E-SPJ sudah diajukan — penugasan tidak dapat direvisi.' }

  const { data: adaAktif } = await supabase.from('perjadin_penugasan_revisi')
    .select('id').eq('penugasan_id', penugasanId).in('status', ['draf', 'diajukan']).limit(1)
  if ((adaAktif ?? []).length > 0) return { error: 'Sudah ada revisi berjalan untuk penugasan ini.' }

  const { data: maxRev } = await supabase.from('perjadin_penugasan_revisi')
    .select('nomor_revisi').eq('penugasan_id', penugasanId).order('nomor_revisi', { ascending: false }).limit(1).maybeSingle()
  const nomor = Number(maxRev?.nomor_revisi ?? 0) + 1

  const { data, error } = await supabase.from('perjadin_penugasan_revisi').insert({
    penugasan_id: penugasanId, nomor_revisi: nomor, alasan,
    snapshot_lama: await snapshotSekarang(supabase, penugasanId),
    snapshot_baru: { header: {}, peserta: [] }, diusulkan_oleh: akses.userId,
  }).select('id').single()
  if (error || !data) return { error: error?.message ?? 'Gagal membuat revisi.' }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'buat_revisi', entitas: 'perjadin_penugasan_revisi', entitasId: data.id, penugasanId, nilaiBaru: { nomor, alasan } })
  revalidatePath(`${J(penugasanId)}/revisi`)
  return { success: true, id: data.id }
}

export async function simpanRevisi(penugasanId: string, snapshot: SnapshotBaru): Promise<Gagal | OK> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: rev } = await supabase.from('perjadin_penugasan_revisi')
    .select('id, status').eq('penugasan_id', penugasanId).in('status', ['draf']).maybeSingle()
  if (!rev) return { error: 'Tidak ada revisi berstatus draf.' }
  const { error } = await supabase.from('perjadin_penugasan_revisi')
    .update({ snapshot_baru: snapshot, updated_at: new Date().toISOString() }).eq('id', rev.id)
  if (error) return { error: error.message }
  revalidatePath(`${J(penugasanId)}/revisi`)
  return { success: true }
}

export async function batalkanRevisi(penugasanId: string): Promise<Gagal | OK> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: rev } = await supabase.from('perjadin_penugasan_revisi')
    .select('id, status').eq('penugasan_id', penugasanId).eq('status', 'draf').maybeSingle()
  if (!rev) return { error: 'Tidak ada revisi draf.' }
  await supabase.from('perjadin_penugasan_revisi').delete().eq('id', rev.id)
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'batalkan_revisi', entitas: 'perjadin_penugasan_revisi', entitasId: rev.id, penugasanId })
  revalidatePath(`${J(penugasanId)}/revisi`); revalidatePath(J(penugasanId))
  return { success: true }
}

export async function ajukanRevisi(penugasanId: string): Promise<Gagal | OK> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehKelola(akses)) return { error: 'Akses ditolak.' }
  const { data: rev } = await supabase.from('perjadin_penugasan_revisi')
    .select('id, snapshot_baru').eq('penugasan_id', penugasanId).eq('status', 'draf').maybeSingle()
  if (!rev) return { error: 'Tidak ada revisi draf.' }
  const snap = (rev.snapshot_baru ?? { header: {}, peserta: [] }) as SnapshotBaru
  if (jumlahPerubahan(snap) === 0) return { error: 'Revisi belum berisi perubahan.' }
  const { jenis, adaDampakDanom } = ringkasPerubahan(snap)

  const { error } = await supabase.from('perjadin_penugasan_revisi').update({
    status: 'diajukan', jenis_perubahan: jenis, dampak_danom: adaDampakDanom, updated_at: new Date().toISOString(),
  }).eq('id', rev.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'ajukan_revisi', entitas: 'perjadin_penugasan_revisi', entitasId: rev.id, penugasanId, nilaiBaru: { jenis } })
  revalidatePath(`${J(penugasanId)}/revisi`); revalidatePath(J(penugasanId))
  return { success: true }
}

// ── Setujui / tolak revisi (Pemberi Tugas) ──────────────────────────
export async function tolakRevisi(penugasanId: string, fd: FormData): Promise<Gagal | OK> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehPemberiTugas(akses)) return { error: 'Hanya Pemberi Tugas.' }
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!alasan) return { error: 'Alasan penolakan wajib diisi.' }
  const { data: rev } = await supabase.from('perjadin_penugasan_revisi')
    .select('id, alasan').eq('penugasan_id', penugasanId).eq('status', 'diajukan').maybeSingle()
  if (!rev) return { error: 'Tidak ada revisi menunggu.' }
  const { error } = await supabase.from('perjadin_penugasan_revisi')
    .update({ status: 'ditolak', disetujui_oleh: akses.userId, disetujui_pada: new Date().toISOString(), alasan: `${rev.alasan}\n[DITOLAK] ${alasan}` }).eq('id', rev.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'tolak_revisi', entitas: 'perjadin_penugasan_revisi', entitasId: rev.id, penugasanId, nilaiBaru: { alasan } })
  revalidatePath(`${J(penugasanId)}/revisi`); revalidatePath(J(penugasanId))
  return { success: true }
}

export async function setujuiRevisi(penugasanId: string): Promise<Gagal | OK> {
  const { supabase, akses } = await ctx()
  if (!akses.userId || !bolehPemberiTugas(akses)) return { error: 'Hanya Pemberi Tugas (Inspektur) yang menyetujui revisi.' }
  const admin = createAdminClient()

  const { data: rev } = await supabase.from('perjadin_penugasan_revisi')
    .select('id, nomor_revisi, snapshot_baru, dampak_danom').eq('penugasan_id', penugasanId).eq('status', 'diajukan').maybeSingle()
  if (!rev) return { error: 'Tidak ada revisi menunggu persetujuan.' }
  const snap = (rev.snapshot_baru ?? { header: {}, peserta: [] }) as SnapshotBaru

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('jenis_alur, jenis_dinas, provinsi, tahun_anggaran, tanggal_berangkat, tanggal_kembali, danom_status').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  const now = new Date().toISOString()

  // 1) Terapkan perubahan tanggal.
  const berangkatBaru = snap.header.tanggal_berangkat || pn.tanggal_berangkat
  const kembaliBaru = snap.header.tanggal_kembali || pn.tanggal_kembali
  if (kembaliBaru < berangkatBaru) return { error: 'Tanggal kembali mendahului tanggal berangkat.' }

  // 2) AF-2 anti-backdate bila tanggal berangkat berubah.
  if (snap.header.tanggal_berangkat) {
    const af2 = cekAntiBackdate(pn.jenis_alur as 'Non-Rampung' | 'Rampung', { berangkat: berangkatBaru, kembali: kembaliBaru })
    if (!af2.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-2', 'blocking', `Revisi Rev.${rev.nomor_revisi}: ${af2.error}`); return { error: af2.error } }
  }
  if (snap.header.tanggal_berangkat || snap.header.tanggal_kembali) {
    await supabase.from('perjadin_penugasan').update({ tanggal_berangkat: berangkatBaru, tanggal_kembali: kembaliBaru, updated_at: now }).eq('id', penugasanId)
  }

  // 3) Terapkan perubahan peserta.
  const param = await paramDanom(supabase)
  const tarif = await tarifSbmUntuk(supabase, pn.tahun_anggaran, pn.provinsi)
  const headerBaru: HeaderPn = { jenis_dinas: pn.jenis_dinas, provinsi: pn.provinsi, tahun_anggaran: pn.tahun_anggaran, tanggal_berangkat: berangkatBaru, tanggal_kembali: kembaliBaru }
  const spdBatal: string[] = []
  for (const p of snap.peserta) {
    if (p.aksi === 'tarik') {
      await supabase.from('perjadin_peserta').update({ ditarik_pada: now, ditarik_alasan: p.alasan }).eq('id', p.peserta_id)
      spdBatal.push(p.peserta_id)
    } else if (p.aksi === 'tambah') {
      let rincian
      try {
        rincian = hitungHakKeuangan(inputDanom(headerBaru, {
          tingkat_biaya: p.kategori, penginapan_mode: p.penginapan_mode, homebase_jabodetabek: p.homebase_jabodetabek,
          berhak_representasi: p.berhak_representasi, transport_lokal_riil: p.transport_lokal_riil, pakai_kendaraan_dinas: p.pakai_kendaraan_dinas,
          estimasi_pesawat: p.estimasi_pesawat, estimasi_dpr: p.estimasi_dpr, rute_pesawat: p.rute_pesawat,
        }, param), tarif)
      } catch (e) { return { error: `Peserta baru "${p.nama}": ${e instanceof Error ? e.message : 'kalkulasi gagal'}` } }
      let userIdBaru: string | null = null
      if (p.nip) {
        const { data: akun } = await supabase.from('users').select('id').eq('nip', p.nip).eq('status_aktif', true).maybeSingle()
        userIdBaru = akun?.id ?? null
      }
      await supabase.from('perjadin_peserta').insert({
        penugasan_id: penugasanId, user_id: userIdBaru, nama: p.nama, nip: p.nip, jabatan: p.jabatan, peran_tim: p.peran_tim,
        tingkat_biaya: p.kategori, penginapan_mode: p.penginapan_mode, homebase_jabodetabek: p.homebase_jabodetabek,
        berhak_representasi: !!p.berhak_representasi, transport_lokal_riil: !!p.transport_lokal_riil, pakai_kendaraan_dinas: !!p.pakai_kendaraan_dinas,
        estimasi_pesawat: p.estimasi_pesawat, estimasi_dpr: p.estimasi_dpr, rute_pesawat: p.rute_pesawat, pegawai_nip: p.nip,
        eksternal: !p.nip, estimasi_rincian: rincian, estimasi_total: rincian.kwitansi,
      })
    }
  }

  // 4) Hitung ulang estimasi seluruh peserta aktif (tanggal mungkin berubah).
  const errRe = await recomputeEstimasi(supabase, penugasanId)
  if (errRe) return { error: errRe }

  // 5) AF-1 tumpang tindih untuk seluruh peserta aktif + rentang baru.
  const { data: aktif } = await supabase.from('perjadin_peserta')
    .select('user_id, nip, nama').eq('penugasan_id', penugasanId).is('ditarik_pada', null)
  const af1 = cekTumpangTindih({ berangkat: berangkatBaru, kembali: kembaliBaru },
    await kumpulkanKandidatIrisan(supabase, penugasanId, (aktif ?? []) as PesertaRingkas[]))
  if (!af1.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-1', 'blocking', `Revisi Rev.${rev.nomor_revisi}: ${af1.error}`); return { error: af1.error } }

  // 6) Terbitkan ST revisi; ST lama ditandai digantikan.
  const { data: stLama } = await supabase.from('perjadin_dokumen')
    .select('id').eq('penugasan_id', penugasanId).eq('jenis', 'ST').eq('digantikan', false).order('diterbitkan_pada', { ascending: false }).limit(1).maybeSingle()
  const { data: seq } = await supabase.rpc('perjadin_next_nomor', { p_jenis: 'ST', p_tahun: pn.tahun_anggaran })
  const nomorBaru = `${formatNomor('ST', Number(seq ?? 0), pn.tahun_anggaran)} Rev.${rev.nomor_revisi}`
  const { data: dokBaru } = await supabase.from('perjadin_dokumen').insert({
    penugasan_id: penugasanId, peserta_id: null, jenis: 'ST', nomor: nomorBaru,
    token_qr: randomUUID(), diterbitkan_oleh: akses.userId, menggantikan_id: stLama?.id ?? null,
  }).select('id').single()
  if (stLama?.id) await supabase.from('perjadin_dokumen').update({ digantikan: true }).eq('id', stLama.id)

  // SPD untuk peserta baru; SPD peserta ditarik ditandai digantikan.
  const { data: pesertaBaruTanpaSpd } = await supabase.from('perjadin_peserta')
    .select('id').eq('penugasan_id', penugasanId).is('ditarik_pada', null)
  for (const p of pesertaBaruTanpaSpd ?? []) {
    const { data: adaSpd } = await supabase.from('perjadin_dokumen').select('id').eq('peserta_id', p.id).eq('jenis', 'SPD').eq('digantikan', false).maybeSingle()
    if (!adaSpd) {
      const { data: sq } = await supabase.rpc('perjadin_next_nomor', { p_jenis: 'SPD', p_tahun: pn.tahun_anggaran })
      await supabase.from('perjadin_dokumen').insert({
        penugasan_id: penugasanId, peserta_id: p.id, jenis: 'SPD',
        nomor: `${formatNomor('SPD', Number(sq ?? 0), pn.tahun_anggaran)} Rev.${rev.nomor_revisi}`,
        token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
      })
    }
  }
  for (const pid of spdBatal) await supabase.from('perjadin_dokumen').update({ digantikan: true }).eq('peserta_id', pid).eq('jenis', 'SPD')

  await supabase.from('perjadin_penugasan').update({ nomor: nomorBaru, updated_at: now }).eq('id', penugasanId)

  // 7) Rute anggaran bila DANOM terdampak.
  if (rev.dampak_danom) {
    if (pn.danom_status === 'disetujui') {
      // Sesuaikan komitmen: total baru vs terpesan.
      const { data: peserta } = await supabase.from('perjadin_peserta').select('estimasi_total').eq('penugasan_id', penugasanId).is('ditarik_pada', null)
      const totalBaru = (peserta ?? []).reduce((s, p) => s + Number(p.estimasi_total ?? 0), 0)
      const { data: map } = await supabase.from('perjadin_penugasan_pagu').select('pagu_id, urutan, pagu:pagu_id(pagu)').eq('penugasan_id', penugasanId).order('urutan')
      const { data: kom } = await supabase.from('perjadin_komitmen').select('pagu_id, jenis, jumlah').eq('penugasan_id', penugasanId)
      const net = new Map<string, number>()
      for (const k of kom ?? []) net.set(k.pagu_id, (net.get(k.pagu_id) ?? 0) + (k.jenis === 'pesan' ? Number(k.jumlah) : -Number(k.jumlah)))
      const terpesan = [...net.values()].reduce((s, n) => s + Math.max(0, n), 0)
      const delta = totalBaru - terpesan
      if (delta > 0) {
        const saldo = (map ?? []).map((r) => {
          const nilai = Number((r.pagu as { pagu?: number } | null)?.pagu ?? 0)
          const kk = (kom ?? []).filter((k) => k.pagu_id === r.pagu_id).map((k) => ({ jenis: k.jenis as 'pesan' | 'lepas', jumlah: Number(k.jumlah) }))
          return { paguId: r.pagu_id as string, tersedia: hitungSaldoPagu(nilai, kk).tersedia }
        })
        const af6 = cekPagu(delta, saldo.reduce((s, x) => s + x.tersedia, 0))
        if (!af6.ok) { await tulisTemuan(supabase, penugasanId, null, 'AF-6', 'blocking', `Revisi Rev.${rev.nomor_revisi}: ${af6.error}`); return { error: af6.error } }
        for (const a of alokasiKomitmen(delta, saldo)) {
          await admin.from('perjadin_komitmen').insert({ pagu_id: a.paguId, penugasan_id: penugasanId, jenis: 'pesan', jumlah: a.jumlah, keterangan: `Tambahan komitmen — Rev.${rev.nomor_revisi}`, dibuat_oleh: akses.userId })
        }
      } else if (delta < 0) {
        const [paguId] = net.keys()
        if (paguId) await admin.from('perjadin_komitmen').insert({ pagu_id: paguId, penugasan_id: penugasanId, jenis: 'lepas', jumlah: -delta, keterangan: `Pelepasan — Rev.${rev.nomor_revisi}`, dibuat_oleh: akses.userId })
      }
      await supabase.from('perjadin_penugasan').update({ danom_status: 'diajukan_kpa', updated_at: now }).eq('id', penugasanId)
    } else if (['diajukan_ppk', 'diajukan_kpa'].includes(pn.danom_status)) {
      await supabase.from('perjadin_penugasan').update({ danom_status: 'draf', updated_at: now }).eq('id', penugasanId)
    }
  }

  await supabase.from('perjadin_penugasan_revisi').update({
    status: 'disetujui', disetujui_oleh: akses.userId, disetujui_pada: now, dokumen_id: dokBaru?.id ?? null, updated_at: now,
  }).eq('id', rev.id)
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'setujui_revisi', entitas: 'perjadin_penugasan_revisi', entitasId: rev.id, penugasanId, nilaiBaru: { nomorBaru } })
  revalidatePath(`${J(penugasanId)}/revisi`); revalidatePath(J(penugasanId)); revalidatePath('/dashboard/e-perjadin/penugasan')
  return { success: true }
}
