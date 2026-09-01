'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { catatLog } from '@/lib/e-perjadin/log'
import { acuanGeofence, haversineMeter, deteksiAnomaliPresensi, type InputAnomali } from '@/lib/e-perjadin/presensi'

const BUCKET = 'perjadin-presensi'

type Gagal = { error: string }
type Sukses = { success: true; status: string; anomali: string[] }

async function paramMap(supabase: SupabaseClient, keys: string[]): Promise<Record<string, string>> {
  const { data } = await supabase.from('perjadin_parameter').select('key, nilai').in('key', keys)
  return Object.fromEntries(((data ?? []) as { key: string; nilai: string }[]).map((r) => [r.key, r.nilai]))
}

async function unggah(admin: SupabaseClient, path: string, file: File): Promise<string> {
  const { error } = await admin.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || 'application/octet-stream', upsert: false,
  })
  if (error) throw new Error(`Unggah berkas gagal: ${error.message}`)
  return path
}

export async function rekamPresensi(penugasanId: string, fd: FormData): Promise<Gagal | Sukses> {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, status, unit_tujuan_id, tanggal_berangkat, tanggal_kembali').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.status !== 'Berjalan') return { error: 'Presensi hanya untuk penugasan berstatus Berjalan.' }

  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, nama').eq('penugasan_id', penugasanId).eq('user_id', akses.userId).maybeSingle()
  if (!peserta) return { error: 'Anda bukan peserta pada penugasan ini.' }

  const jenis = String(fd.get('jenis') ?? '')
  const tanggal = String(fd.get('tanggal') ?? '')
  const sumber = String(fd.get('sumber') ?? 'pwa') === 'fallback' ? 'fallback' : 'pwa'
  const lintang = fd.get('lintang') ? Number(fd.get('lintang')) : null
  const bujur = fd.get('bujur') ? Number(fd.get('bujur')) : null
  const akurasi = fd.get('akurasi_m') ? Number(fd.get('akurasi_m')) : null
  const waktuPerangkatIso = String(fd.get('waktu_perangkat') ?? '') || null
  const deviceId = String(fd.get('device_id') ?? '') || null
  const modeBerbagi = fd.get('mode_berbagi') === 'true'
  const pemilikPerangkat = String(fd.get('pemilik_perangkat') ?? '').trim() || null
  const keterangan = String(fd.get('keterangan') ?? '').trim()
  const alasanFallback = String(fd.get('alasan_fallback') ?? '').trim() || null
  const foto = fd.get('foto') as File | null
  const pernyataan = fd.get('pernyataan') as File | null
  const idempotencyKey = String(fd.get('idempotency_key') ?? '').trim() || null
  const dariTempatSah = fd.get('dari_tempat_sah') === 'true' && (jenis === 'Start' || jenis === 'End')
  const tempatSahJenis = dariTempatSah ? (String(fd.get('tempat_sah_jenis') ?? '') || null) : null
  const tempatSahKeterangan = dariTempatSah ? (String(fd.get('tempat_sah_keterangan') ?? '').trim() || null) : null
  const percobaanKe = fd.get('percobaan_ke') ? Math.max(1, Math.round(Number(fd.get('percobaan_ke')))) : null
  const durasiRekamDetik = fd.get('durasi_rekam_detik') ? Math.max(0, Math.round(Number(fd.get('durasi_rekam_detik')))) : null

  // Replay antrean luring: titik dengan kunci ini sudah tercatat → sukses (tak menggandakan).
  if (idempotencyKey) {
    const { data: sudah } = await supabase.from('perjadin_presensi')
      .select('status_verifikasi').eq('idempotency_key', idempotencyKey).maybeSingle()
    if (sudah) return { success: true, status: sudah.status_verifikasi as string, anomali: [] }
  }

  if (!['Start', 'In', 'Kegiatan', 'Out', 'End', 'Tambahan'].includes(jenis)) return { error: 'Jenis titik tidak sah.' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal titik wajib diisi.' }
  if (tanggal < pn.tanggal_berangkat || tanggal > pn.tanggal_kembali) return { error: 'Tanggal titik di luar rentang penugasan.' }
  if ((jenis === 'Kegiatan' || jenis === 'Tambahan') && !keterangan) return { error: 'Titik kegiatan wajib disertai keterangan singkat.' }
  if (!foto || foto.size === 0) return { error: 'Foto wajib dilampirkan.' }
  if (dariTempatSah && !['fws', 'cuti', 'libur', 'penugasan_lain'].includes(tempatSahJenis ?? '')) {
    return { error: 'Pilih jenis Tempat Sah (FWS / cuti / libur / penugasan lain).' }
  }

  const par = await paramMap(supabase, [
    'ambang_akurasi_gps_m', 'ambang_selisih_waktu_menit', 'ambang_kecepatan_kmh',
    'ambang_fallback_berulang', 'batas_peserta_per_perangkat', 'radius_geofence_default_m',
    'kedudukan_lintang', 'kedudukan_bujur', 'kedudukan_radius_m',
  ])

  if (sumber === 'pwa') {
    if (lintang == null || bujur == null) return { error: 'Lokasi GPS tidak terbaca. Coba lagi di ruang terbuka.' }
    const ambangAkurasi = Number(par.ambang_akurasi_gps_m || 100)
    if (akurasi != null && akurasi > ambangAkurasi) {
      return { error: `Akurasi GPS ${Math.round(akurasi)} m di atas ambang ${ambangAkurasi} m. Coba lagi di ruang terbuka.` }
    }
  } else {
    if (!alasanFallback) return { error: 'Jalur fallback wajib menyertakan alasan.' }
    if (!pernyataan || pernyataan.size === 0) return { error: 'Jalur fallback wajib melampirkan Surat Pernyataan Kepatuhan.' }
  }

  const admin = createAdminClient()
  const dasar = `${penugasanId}/${peserta.id}/${randomUUID()}`
  let pathFoto: string
  let pathPernyataan: string | null = null
  try {
    pathFoto = await unggah(admin, `${dasar}.jpg`, foto)
    if (pernyataan && pernyataan.size > 0) {
      const ext = pernyataan.type === 'application/pdf' ? 'pdf' : 'jpg'
      pathPernyataan = await unggah(admin, `${dasar}-pernyataan.${ext}`, pernyataan)
    }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Unggah berkas gagal.' }
  }

  // ── Geofence (haversine, PRD F-2.2; Tempat Sah PMK 119/2023 → tanpa acuan kedudukan) ──
  const acuan = acuanGeofence(jenis, dariTempatSah)
  let jarakM: number | null = null
  let dalamGeofence: boolean | null = null
  if (acuan && lintang != null && bujur != null) {
    if (acuan === 'kedudukan') {
      const kLat = Number(par.kedudukan_lintang)
      const kLon = Number(par.kedudukan_bujur)
      const kRad = Number(par.kedudukan_radius_m || 500)
      if (Number.isFinite(kLat) && Number.isFinite(kLon)) {
        jarakM = haversineMeter(kLat, kLon, lintang, bujur)
        dalamGeofence = jarakM <= kRad
      }
    } else {
      const { data: unit } = await supabase.from('unit_kerja')
        .select('lintang, bujur, radius_geofence').eq('id', pn.unit_tujuan_id).maybeSingle()
      if (unit?.lintang != null && unit?.bujur != null) {
        jarakM = haversineMeter(Number(unit.lintang), Number(unit.bujur), lintang, bujur)
        dalamGeofence = jarakM <= Number(unit.radius_geofence ?? par.radius_geofence_default_m ?? 500)
      }
      // unit tanpa koordinat → dalamGeofence tetap null (R-3: verifikasi manual di E-SPJ)
    }
  }

  // ── Konteks AF-7 ──
  const nowMs = Date.now()
  const waktuPerangkatMs = waktuPerangkatIso ? Date.parse(waktuPerangkatIso) : null
  const selisihDetik = waktuPerangkatMs ? Math.round(Math.abs(nowMs - waktuPerangkatMs) / 1000) : null

  const { data: prev } = await supabase.from('perjadin_presensi')
    .select('lintang, bujur, waktu_server').eq('peserta_id', peserta.id).not('lintang', 'is', null)
    .order('waktu_server', { ascending: false }).limit(1).maybeSingle()

  const { data: fallbackRows } = await supabase.from('perjadin_presensi')
    .select('id').eq('peserta_id', peserta.id).eq('penugasan_id', penugasanId).eq('sumber', 'fallback')

  let pesertaDiPerangkat = new Set<string>()
  if (deviceId) {
    const { data } = await supabase.from('perjadin_presensi')
      .select('peserta_id').eq('device_id', deviceId).eq('tanggal', tanggal)
    pesertaDiPerangkat = new Set(((data ?? []) as { peserta_id: string }[]).map((r) => r.peserta_id))
  }

  let koordIdentik = false
  if (lintang != null && bujur != null) {
    const { data } = await supabase.from('perjadin_presensi')
      .select('id').eq('penugasan_id', penugasanId).eq('lintang', lintang).eq('bujur', bujur).limit(1)
    koordIdentik = (data ?? []).length > 0
  }

  const anomaliInput: InputAnomali = {
    jenis,
    waktuServerMs: nowMs,
    waktuPerangkatMs,
    lintang, bujur, sumber, dalamGeofence,
    titikSebelumnya: prev?.lintang != null
      ? { lintang: Number(prev.lintang), bujur: Number(prev.bujur), waktuServerMs: Date.parse(prev.waktu_server as string) }
      : null,
    pesertaLainDiPerangkatHariIni: [...pesertaDiPerangkat].filter((p) => p !== peserta.id).length,
    pesertaIniSudahDiPerangkat: pesertaDiPerangkat.has(peserta.id),
    fallbackSebelumnya: (fallbackRows ?? []).length,
    adaKoordinatIdentikLain: koordIdentik,
    ambangSelisihMenit: Number(par.ambang_selisih_waktu_menit || 5),
    ambangKecepatanKmh: Number(par.ambang_kecepatan_kmh || 900),
    ambangFallbackBerulang: Number(par.ambang_fallback_berulang || 2),
    batasPesertaPerangkat: Number(par.batas_peserta_per_perangkat || 4),
  }
  const temuan = deteksiAnomaliPresensi(anomaliInput)

  const status = sumber === 'fallback' ? 'pernyataan_pending' : temuan.length > 0 ? 'anomali' : 'lolos'

  const { data: baris, error } = await supabase.from('perjadin_presensi').insert({
    penugasan_id: penugasanId, peserta_id: peserta.id, jenis, tanggal,
    waktu_perangkat: waktuPerangkatIso, lintang, bujur, akurasi_m: akurasi,
    path_foto: pathFoto, keterangan, device_id: deviceId, mode_berbagi: modeBerbagi,
    pemilik_perangkat: pemilikPerangkat, sumber, path_pernyataan: pathPernyataan,
    alasan_fallback: alasanFallback, jarak_m: jarakM, dalam_geofence: dalamGeofence,
    selisih_waktu_detik: selisihDetik, status_verifikasi: status, dibuat_oleh: akses.userId,
    idempotency_key: idempotencyKey,
    dari_tempat_sah: dariTempatSah, tempat_sah_jenis: tempatSahJenis, tempat_sah_keterangan: tempatSahKeterangan,
    percobaan_ke: percobaanKe, durasi_rekam_detik: durasiRekamDetik,
  }).select('id').single()
  if (error || !baris) return { error: error?.message ?? 'Gagal menyimpan presensi.' }

  // Tandai peserta bila Start/End dari Tempat Sah → pembatasan biaya transport riil di E-SPJ.
  if (dariTempatSah) {
    await supabase.from('perjadin_peserta')
      .update(jenis === 'Start' ? { berangkat_tempat_sah: true } : { pulang_tempat_sah: true })
      .eq('id', peserta.id)
  }

  if (temuan.length > 0) {
    await admin.from('perjadin_temuan').insert(
      temuan.map((t) => ({
        penugasan_id: penugasanId, peserta_id: peserta.id, presensi_id: baris.id,
        kode: t.kode, keparahan: 'warning', ringkasan: t.ringkasan,
      })),
    )
  }

  await catatLog(supabase, {
    aktorId: akses.userId!, aksi: 'rekam_presensi', entitas: 'perjadin_presensi', entitasId: baris.id,
    nilaiBaru: { jenis, tanggal, sumber, status, anomali: temuan.length },
  })

  revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}/presensi`)
  revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`)
  return { success: true, status, anomali: temuan.map((t) => t.ringkasan) }
}

// ── Keputusan PPK atas anomali / jalur pernyataan (F-2.2, F-2.6) ────────
export async function putuskanPresensi(presensiId: string, fd: FormData): Promise<Gagal | { success: true }> {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!akses.isAdmin && !akses.peran.includes('ppk')) return { error: 'Hanya PPK yang dapat memutus temuan presensi.' }

  const keputusan = String(fd.get('keputusan') ?? '')
  const alasan = String(fd.get('alasan') ?? '').trim()
  if (!['lolos', 'tolak'].includes(keputusan)) return { error: 'Keputusan tidak sah.' }
  if (!alasan) return { error: 'Alasan keputusan wajib diisi (tersimpan permanen).' }

  const { data: ps } = await supabase.from('perjadin_presensi')
    .select('id, penugasan_id').eq('id', presensiId).single()
  if (!ps) return { error: 'Titik presensi tidak ditemukan.' }

  const nowIso = new Date().toISOString()
  const { error } = await supabase.from('perjadin_presensi').update({
    status_verifikasi: keputusan === 'lolos' ? 'lolos' : 'ditolak',
    catatan_verifikasi: alasan, diputus_oleh: akses.userId, diputus_pada: nowIso,
  }).eq('id', presensiId)
  if (error) return { error: error.message }

  await supabase.from('perjadin_temuan').update({
    status: 'diputus', keputusan, alasan, diputus_oleh: akses.userId, diputus_pada: nowIso,
  }).eq('presensi_id', presensiId).eq('status', 'terbuka')

  await catatLog(supabase, {
    aktorId: akses.userId!, aksi: 'putus_presensi', entitas: 'perjadin_presensi', entitasId: presensiId,
    nilaiBaru: { keputusan, alasan },
  })

  revalidatePath(`/dashboard/e-perjadin/penugasan/${ps.penugasan_id}/presensi`)
  revalidatePath(`/dashboard/e-perjadin/penugasan/${ps.penugasan_id}`)
  revalidatePath('/dashboard/e-perjadin/anomali')
  return { success: true }
}
