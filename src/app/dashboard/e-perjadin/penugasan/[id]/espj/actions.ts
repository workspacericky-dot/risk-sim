'use server'

import { randomUUID } from 'crypto'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { catatLog } from '@/lib/e-perjadin/log'
import { formatNomor } from '@/lib/e-perjadin/penugasan'
import {
  hitungJumlahHari, durasiLokasiMenit, dinasDalamKotaDiakuiBesar, type RincianDanom,
} from '@/lib/e-perjadin/sbm'
import { hitungTitikWajib, titikBelumTerekam } from '@/lib/e-perjadin/presensi'
import { hashBerkas } from '@/lib/e-perjadin/hash'
import {
  evaluasiBiaya, hitungRekapPeserta, syaratPengajuanEspj, realisasiPenugasan, type KomponenBiaya,
} from '@/lib/e-perjadin/espj'

const BUKTI = 'perjadin-bukti'
type Gagal = { error: string }

async function tulisTemuanAf4(
  supabase: SupabaseClient, penugasanId: string, pesertaId: string,
  durasi: number | null, ambang: number, harian: number,
) {
  await supabase.from('perjadin_temuan').insert({
    penugasan_id: penugasanId, peserta_id: pesertaId, kode: 'AF-4', keparahan: 'blocking',
    ringkasan: `AF-4 — durasi di lokasi ${durasi == null ? 'tidak terukur' : `${Math.round(durasi)} menit`} < ambang ${ambang} menit; uang harian Rp ${harian.toLocaleString('id-ID')} digugurkan dari E-SPJ.`,
    status: 'diputus', keputusan: 'gugur', alasan: 'Otomatis oleh AF-4 (durasi_dinas).',
  })
}

async function ctx(penugasanId: string) {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) return { supabase, akses, peserta: null as null | { id: string; peran_tim: string } }
  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, peran_tim').eq('penugasan_id', penugasanId).eq('user_id', akses.userId).maybeSingle()
  return { supabase, akses, peserta }
}
const bolehKetua = (a: { isAdmin: boolean; peran: string[] }, p: { peran_tim: string } | null) =>
  a.isAdmin || a.peran.includes('pengelola_kegiatan') || p?.peran_tim === 'Ketua Tim'
const isStafPpk = (a: { isAdmin: boolean; peran: string[] }) => a.isAdmin || a.peran.includes('staf_ppk')
const isPpk = (a: { isAdmin: boolean; peran: string[] }) => a.isAdmin || a.peran.includes('ppk')
const isBendahara = (a: { isAdmin: boolean; peran: string[] }) => a.isAdmin || a.peran.includes('bendahara')
const J = (id: string) => `/dashboard/e-perjadin/penugasan/${id}/espj`

async function batasSbm(
  supabase: SupabaseClient, komponen: KomponenBiaya,
  pn: { provinsi: string; tahun_anggaran: number; tanggal_berangkat: string; tanggal_kembali: string },
  pes: { tingkat_biaya?: string; berangkat_tempat_sah?: boolean; pulang_tempat_sah?: boolean; estimasi_rincian?: Partial<RincianDanom> },
): Promise<number | null> {
  // Transport riil dari/ke Tempat Sah (PMK 119/2023): maksimal estimasi kantor→tujuan (pesawat + DPR).
  if (komponen === 'transport' && (pes.berangkat_tempat_sah || pes.pulang_tempat_sah)) {
    const est = Number(pes.estimasi_rincian?.pesawat ?? 0) + Number(pes.estimasi_rincian?.dpr ?? 0)
    return est > 0 ? est : null
  }
  if (komponen !== 'penginapan' && komponen !== 'transport_lokal') return null
  const { data } = await supabase.from('perjadin_sbm').select('nilai')
    .eq('tahun', pn.tahun_anggaran).eq('provinsi', pn.provinsi).eq('tingkat_biaya', pes.tingkat_biaya ?? '')
    .eq('komponen', komponen).maybeSingle()
  if (!data) return null
  if (komponen === 'transport_lokal') return Number(data.nilai)
  const malam = Math.max(0, hitungJumlahHari(pn.tanggal_berangkat, pn.tanggal_kembali) - 1)
  return Number(data.nilai) * malam
}

async function unggahBukti(admin: SupabaseClient, path: string, file: Blob, tipe: string): Promise<string> {
  const { error } = await admin.storage.from(BUKTI).upload(path, file, { contentType: tipe || 'application/octet-stream', upsert: false })
  if (error) throw new Error(`Unggah bukti gagal: ${error.message}`)
  return path
}

// ── F-3.1 / F-3.2 / F-3.4: tambah entri biaya riil ────────────────────
export async function tambahBiaya(penugasanId: string, fd: FormData): Promise<Gagal | { success: true; melebihiSbm: boolean; buktiGanda: string | null }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId || !peserta) return { error: 'Hanya peserta penugasan yang dapat merekam biaya.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('status, provinsi, tahun_anggaran, tanggal_berangkat, tanggal_kembali').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }
  if (pn.status !== 'Berjalan') return { error: 'Biaya hanya dapat direkam selama penugasan Berjalan.' }

  const { data: espj } = await supabase.from('perjadin_espj').select('status').eq('penugasan_id', penugasanId).maybeSingle()
  if (espj && !['draf', 'dikembalikan'].includes(espj.status)) return { error: 'E-SPJ sudah diajukan — entri biaya terkunci.' }

  const { data: pes } = await supabase.from('perjadin_peserta')
    .select('tingkat_biaya, berangkat_tempat_sah, pulang_tempat_sah, estimasi_rincian').eq('id', peserta.id).single()

  const komponen = String(fd.get('komponen') ?? '') as KomponenBiaya
  const uraian = String(fd.get('uraian') ?? '').trim()
  const tanggal = String(fd.get('tanggal') ?? '') || null
  const jumlah = Number(fd.get('jumlah_diajukan'))
  const tanpaBukti = fd.get('tanpa_bukti') === 'true'
  const bukti = fd.get('bukti') as File | null

  if (!['transport', 'penginapan', 'transport_lokal', 'lainnya'].includes(komponen)) return { error: 'Komponen tidak sah.' }
  if (!uraian) return { error: 'Uraian wajib diisi.' }
  if (!Number.isFinite(jumlah) || jumlah < 0) return { error: 'Jumlah tidak sah.' }
  if (!tanpaBukti && (!bukti || bukti.size === 0)) return { error: 'Lampirkan bukti, atau tandai "bukti tidak diperoleh".' }

  const cap = await batasSbm(supabase, komponen, pn, {
    tingkat_biaya: pes?.tingkat_biaya, berangkat_tempat_sah: pes?.berangkat_tempat_sah,
    pulang_tempat_sah: pes?.pulang_tempat_sah, estimasi_rincian: (pes?.estimasi_rincian ?? {}) as Partial<RincianDanom>,
  })
  const evaluasi = evaluasiBiaya(Math.round(jumlah), cap, false)

  const admin = createAdminClient()
  let pathBukti: string | null = null
  let hash: string | null = null
  let buktiGanda: string | null = null

  if (!tanpaBukti && bukti) {
    hash = await hashBerkas(bukti)
    const { data: kembar } = await supabase.from('perjadin_biaya')
      .select('id, penugasan_id, peserta_id').eq('hash_bukti', hash).limit(1).maybeSingle()
    if (kembar && (kembar.penugasan_id !== penugasanId || kembar.peserta_id !== peserta.id)) {
      buktiGanda = kembar.id as string
    }
    const ext = bukti.type === 'application/pdf' ? 'pdf' : 'jpg'
    try {
      pathBukti = await unggahBukti(admin, `${penugasanId}/${peserta.id}/${randomUUID()}.${ext}`, bukti, bukti.type)
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unggah bukti gagal.' }
    }
  }

  const { data: baris, error } = await supabase.from('perjadin_biaya').insert({
    penugasan_id: penugasanId, peserta_id: peserta.id, komponen, uraian, tanggal,
    jumlah_diajukan: Math.round(jumlah), jumlah_diakui: evaluasi.jumlah_diakui,
    melebihi_sbm: evaluasi.melebihi_sbm, batas_sbm: evaluasi.batas_sbm,
    tanpa_bukti: tanpaBukti, path_bukti: pathBukti, hash_bukti: hash, dibuat_oleh: akses.userId,
  }).select('id').single()
  if (error || !baris) return { error: error?.message ?? 'Gagal menyimpan biaya.' }

  if (buktiGanda) {
    await admin.from('perjadin_temuan').insert({
      penugasan_id: penugasanId, peserta_id: peserta.id, kode: 'AF-10', keparahan: 'warning',
      ringkasan: `Bukti dengan hash SHA-256 identik sudah dipakai pada entri biaya lain (id ${buktiGanda}). Verifikasi ditahan.`,
    })
  }

  await catatLog(supabase, {
    aktorId: akses.userId, aksi: 'tambah_biaya', entitas: 'perjadin_biaya', entitasId: baris.id,
    nilaiBaru: { komponen, jumlah_diajukan: Math.round(jumlah), jumlah_diakui: evaluasi.jumlah_diakui, melebihi_sbm: evaluasi.melebihi_sbm },
  })
  revalidatePath(J(penugasanId))
  return { success: true, melebihiSbm: evaluasi.melebihi_sbm, buktiGanda }
}

export async function ubahAlasanBiaya(penugasanId: string, biayaId: string, alasan: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId || !peserta) return { error: 'Akses ditolak.' }
  const { error } = await supabase.from('perjadin_biaya')
    .update({ alasan_pelaksana: alasan.trim() || null, updated_at: new Date().toISOString() })
    .eq('id', biayaId).eq('peserta_id', peserta.id).eq('dikunci', false)
  if (error) return { error: error.message }
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function hapusBiaya(penugasanId: string, biayaId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId || !peserta) return { error: 'Akses ditolak.' }
  const { data: b } = await supabase.from('perjadin_biaya').select('dikunci, peserta_id').eq('id', biayaId).single()
  if (!b) return { error: 'Entri tidak ditemukan.' }
  if (b.dikunci) return { error: 'Entri terkunci — E-SPJ sudah diajukan.' }
  if (b.peserta_id !== peserta.id && !akses.isAdmin) return { error: 'Hanya pemilik entri yang dapat menghapus.' }
  const { error } = await supabase.from('perjadin_biaya').delete().eq('id', biayaId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'hapus_biaya', entitas: 'perjadin_biaya', entitasId: biayaId })
  revalidatePath(J(penugasanId))
  return { success: true }
}

// ── F-5.1: E-SPJ ─────────────────────────────────────────────────────
export async function pastikanEspj(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId) return { error: 'Tidak terautentikasi.' }
  if (!peserta && !akses.isAdmin && !akses.peran.includes('pengelola_kegiatan')) return { error: 'Akses ditolak.' }
  const { data: ada } = await supabase.from('perjadin_espj').select('id').eq('penugasan_id', penugasanId).maybeSingle()
  if (!ada) {
    const { error } = await supabase.from('perjadin_espj').insert({ penugasan_id: penugasanId })
    if (error) return { error: error.message }
  }
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function ajukanEspj(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses, peserta } = await ctx(penugasanId)
  if (!akses.userId || !bolehKetua(akses, peserta)) return { error: 'Hanya Ketua Tim yang dapat mengajukan E-SPJ.' }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('status, nomor, tanggal_berangkat, tanggal_kembali').eq('id', penugasanId).single()
  if (!pn) return { error: 'Penugasan tidak ditemukan.' }

  const { data: espj } = await supabase.from('perjadin_espj').select('id, status').eq('penugasan_id', penugasanId).single()
  if (!espj) return { error: 'Buat E-SPJ lebih dulu.' }
  if (!['draf', 'dikembalikan'].includes(espj.status)) return { error: `E-SPJ berstatus "${espj.status}".` }

  const [{ data: lap }, { data: presensi }, { data: biaya }] = await Promise.all([
    supabase.from('perjadin_laporan').select('status').eq('penugasan_id', penugasanId).maybeSingle(),
    supabase.from('perjadin_presensi').select('jenis, tanggal, status_verifikasi').eq('penugasan_id', penugasanId),
    supabase.from('perjadin_biaya').select('id').eq('penugasan_id', penugasanId),
  ])

  const wajib = hitungTitikWajib(pn.tanggal_berangkat, pn.tanggal_kembali)
  const belum = titikBelumTerekam(wajib, (presensi ?? []).map((p) => ({ tanggal: p.tanggal as string, jenis: p.jenis as string })))
  const belumDiputus = (presensi ?? []).filter((p) => ['anomali', 'pernyataan_pending'].includes(p.status_verifikasi as string)).length

  const syarat = syaratPengajuanEspj({
    statusPenugasan: pn.status, adaNomorSt: !!pn.nomor, laporanFinal: lap?.status === 'final',
    titikWajibBelum: belum.length, presensiBelumDiputus: belumDiputus,
  })
  if (!syarat.boleh) {
    const admin = createAdminClient()
    await admin.from('perjadin_temuan').insert(syarat.blokir.map((b) => ({
      penugasan_id: penugasanId, kode: b.kode, keparahan: 'blocking', ringkasan: b.ringkasan,
    })))
    return { error: syarat.blokir.map((b) => `${b.kode}: ${b.ringkasan}`).join(' ') }
  }

  const now = new Date().toISOString()
  if ((biaya ?? []).length > 0) {
    // Kunci lintas-peserta → RLS hanya izinkan baris sendiri; pakai service role.
    await createAdminClient().from('perjadin_biaya').update({ dikunci: true, updated_at: now }).eq('penugasan_id', penugasanId)
  }
  const { error } = await supabase.from('perjadin_espj')
    .update({ status: 'diajukan', diajukan_oleh: akses.userId, diajukan_pada: now, updated_at: now }).eq('id', espj.id)
  if (error) return { error: error.message }

  await catatLog(supabase, { aktorId: akses.userId, aksi: 'ajukan_espj', entitas: 'perjadin_espj', entitasId: espj.id })
  revalidatePath(J(penugasanId)); revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`)
  return { success: true }
}

// ── F-5.2: verifikasi berjenjang ─────────────────────────────────────
export async function nilaiEntri(penugasanId: string, biayaId: string, fd: FormData): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isStafPpk(akses)) return { error: 'Hanya Staf PPK yang menilai entri.' }
  const status = String(fd.get('status') ?? '')
  const catatan = String(fd.get('catatan') ?? '').trim() || null
  if (!['sesuai', 'perbaiki', 'tolak'].includes(status)) return { error: 'Status tidak sah.' }

  const { data: espj } = await supabase.from('perjadin_espj').select('status').eq('penugasan_id', penugasanId).single()
  if (espj?.status !== 'diajukan') return { error: 'E-SPJ tidak sedang dalam verifikasi Staf PPK.' }

  const { error } = await supabase.from('perjadin_biaya')
    .update({ status_verifikasi: status, catatan_verifikasi: catatan, updated_at: new Date().toISOString() }).eq('id', biayaId)
  if (error) return { error: error.message }
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function setujuiBiayaMelebihiSbm(penugasanId: string, biayaId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isPpk(akses)) return { error: 'Hanya PPK yang menyetujui pengakuan di atas SBM.' }
  const { data: b } = await supabase.from('perjadin_biaya').select('jumlah_diajukan, alasan_pelaksana').eq('id', biayaId).single()
  if (!b) return { error: 'Entri tidak ditemukan.' }
  if (!b.alasan_pelaksana) return { error: 'Pelaksana belum mengisi alasan.' }
  const { error } = await supabase.from('perjadin_biaya')
    .update({ disetujui_ppk: true, jumlah_diakui: b.jumlah_diajukan, updated_at: new Date().toISOString() }).eq('id', biayaId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'setujui_biaya_di_atas_sbm', entitas: 'perjadin_biaya', entitasId: biayaId })
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function setujuiDaftarPengeluaranRiil(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isPpk(akses)) return { error: 'Hanya PPK.' }
  const { error } = await supabase.from('perjadin_espj')
    .update({ daftar_pengeluaran_disetujui: true, updated_at: new Date().toISOString() }).eq('penugasan_id', penugasanId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'setujui_daftar_pengeluaran_riil', entitas: 'perjadin_espj', entitasId: penugasanId })
  revalidatePath(J(penugasanId))
  return { success: true }
}

export async function kembalikanEspj(penugasanId: string, fd: FormData): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || (!isStafPpk(akses) && !isPpk(akses))) return { error: 'Hanya Staf PPK / PPK.' }
  const catatan = String(fd.get('catatan') ?? '').trim()
  if (!catatan) return { error: 'Catatan pengembalian wajib diisi (berkas dikembalikan utuh sekali).' }

  const { data: espj } = await supabase.from('perjadin_espj').select('id, status, siklus_revisi').eq('penugasan_id', penugasanId).single()
  if (!espj || !['diajukan', 'diverifikasi'].includes(espj.status)) return { error: 'E-SPJ tidak dalam tahap yang dapat dikembalikan.' }

  const now = new Date().toISOString()
  await createAdminClient().from('perjadin_biaya').update({ dikunci: false, updated_at: now }).eq('penugasan_id', penugasanId)
  const { error } = await supabase.from('perjadin_espj').update({
    status: 'dikembalikan', catatan_pengembalian: catatan, siklus_revisi: (espj.siklus_revisi as number) + 1, updated_at: now,
  }).eq('id', espj.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'kembalikan_espj', entitas: 'perjadin_espj', entitasId: espj.id, nilaiBaru: { catatan } })
  revalidatePath(J(penugasanId)); revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`)
  return { success: true }
}

export async function teruskanEspj(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isStafPpk(akses)) return { error: 'Hanya Staf PPK.' }
  const { data: espj } = await supabase.from('perjadin_espj').select('id, status').eq('penugasan_id', penugasanId).single()
  if (espj?.status !== 'diajukan') return { error: 'E-SPJ tidak sedang diverifikasi Staf PPK.' }

  const { data: belum } = await supabase.from('perjadin_biaya')
    .select('id').eq('penugasan_id', penugasanId).eq('status_verifikasi', 'menunggu').limit(1)
  if ((belum ?? []).length > 0) return { error: 'Masih ada entri biaya berstatus "menunggu". Nilai semua entri lebih dulu.' }

  const now = new Date().toISOString()
  const { error } = await supabase.from('perjadin_espj')
    .update({ status: 'diverifikasi', diverifikasi_oleh: akses.userId, diverifikasi_pada: now, updated_at: now }).eq('id', espj.id)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'teruskan_espj_ke_ppk', entitas: 'perjadin_espj', entitasId: espj.id })
  revalidatePath(J(penugasanId))
  return { success: true }
}

// ── F-5.2: persetujuan PPK + susun baris penyelesaian ────────────────
export async function setujuiEspj(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isPpk(akses)) return { error: 'Hanya PPK yang menyetujui E-SPJ.' }

  const { data: espj } = await supabase.from('perjadin_espj')
    .select('id, status, daftar_pengeluaran_disetujui').eq('penugasan_id', penugasanId).single()
  if (espj?.status !== 'diverifikasi') return { error: 'E-SPJ belum selesai diverifikasi Staf PPK.' }

  // Tidak boleh menyetujui bila ada temuan blocking terbuka (F-5.2).
  const { data: blocking } = await supabase.from('perjadin_temuan')
    .select('kode').eq('penugasan_id', penugasanId).eq('keparahan', 'blocking').eq('status', 'terbuka').limit(1)
  if ((blocking ?? []).length > 0) return { error: `Masih ada temuan anti-fraud blocking terbuka (${blocking![0].kode}). Putuskan lebih dulu.` }

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('uang_muka_persen, tahun_anggaran, jenis_dinas').eq('id', penugasanId).single()
  const { data: peserta } = await supabase.from('perjadin_peserta')
    .select('id, estimasi_total, estimasi_rincian').eq('penugasan_id', penugasanId)
  const { data: biaya } = await supabase.from('perjadin_biaya')
    .select('peserta_id, jumlah_diakui, batas_sbm, disetujui_ppk, status_verifikasi, tanpa_bukti').eq('penugasan_id', penugasanId)

  if ((biaya ?? []).some((b) => b.tanpa_bukti) && !espj.daftar_pengeluaran_disetujui) {
    return { error: 'Ada entri tanpa bukti — setujui Daftar Pengeluaran Riil lebih dulu.' }
  }

  const now = new Date().toISOString()
  const persen = Number(pn?.uang_muka_persen ?? 0)

  // ── AF-4: dinas dalam kota — gugurkan uang harian bila durasi lokasi < ambang ──
  const dalamKotaBesar = pn?.jenis_dinas === 'Dalam Kota > Ambang'
  let ambangMenit = 360
  if (dalamKotaBesar) {
    const { data: par } = await supabase.from('perjadin_parameter').select('nilai').eq('key', 'ambang_durasi_lokasi_menit').maybeSingle()
    ambangMenit = Number(par?.nilai ?? 360)
  }

  for (const p of (peserta ?? []) as { id: string; estimasi_total: number; estimasi_rincian: Partial<RincianDanom> }[]) {
    const rows = (biaya ?? []).filter((b) => b.peserta_id === p.id && b.status_verifikasi !== 'tolak')
    const biayaRiil = rows.reduce((s, b) => s + Number(b.jumlah_diakui), 0)
    const tambahan = rows.reduce((s, b) => s + (b.disetujui_ppk && b.batas_sbm != null
      ? Math.max(0, Number(b.jumlah_diakui) - Number(b.batas_sbm)) : 0), 0)

    let hakSbm = Number(p.estimasi_total)
    if (dalamKotaBesar) {
      const { data: inRow } = await supabase.from('perjadin_presensi').select('waktu_server')
        .eq('peserta_id', p.id).eq('jenis', 'In').order('waktu_server', { ascending: true }).limit(1).maybeSingle()
      const { data: outRow } = await supabase.from('perjadin_presensi').select('waktu_server')
        .eq('peserta_id', p.id).eq('jenis', 'Out').order('waktu_server', { ascending: false }).limit(1).maybeSingle()
      const durasi = durasiLokasiMenit((inRow?.waktu_server as string) ?? null, (outRow?.waktu_server as string) ?? null)
      if (!dinasDalamKotaDiakuiBesar(durasi, ambangMenit)) {
        const harian = Number(p.estimasi_rincian?.harian ?? 0)
        hakSbm -= harian
        await tulisTemuanAf4(supabase, penugasanId, p.id, durasi, ambangMenit, harian)
      }
    }

    const r = hitungRekapPeserta({
      hakSbm, biayaRiilDiakui: biayaRiil, tambahanDiakuiDiAtasSbm: tambahan, uangMukaPersen: persen,
    })
    await supabase.from('perjadin_espj_peserta').upsert({
      espj_id: espj.id, peserta_id: p.id, hak_sbm: r.hak_sbm, biaya_riil: r.biaya_riil,
      uang_muka: r.uang_muka, selisih: r.selisih,
    }, { onConflict: 'espj_id,peserta_id' })
  }

  const { error } = await supabase.from('perjadin_espj')
    .update({ status: 'disetujui', disetujui_oleh: akses.userId, disetujui_pada: now, updated_at: now }).eq('id', espj.id)
  if (error) return { error: error.message }

  const admin = createAdminClient()
  const tahun = Number(pn?.tahun_anggaran ?? new Date().getFullYear())
  const { data: seq } = await admin.rpc('perjadin_next_nomor', { p_jenis: 'RSPJ', p_tahun: tahun })
  await admin.from('perjadin_dokumen').insert({
    penugasan_id: penugasanId, peserta_id: null, jenis: 'RekapSPJ',
    nomor: formatNomor('RSPJ', Number(seq ?? 0), tahun), token_qr: randomUUID(), diterbitkan_oleh: akses.userId,
  })

  await catatLog(supabase, { aktorId: akses.userId, aksi: 'setujui_espj', entitas: 'perjadin_espj', entitasId: espj.id })
  revalidatePath(J(penugasanId)); revalidatePath('/dashboard/e-perjadin/penyelesaian')
  return { success: true }
}

// ── F-5.3: penyelesaian & rekonsiliasi uang muka ────────────────────
export async function aturSelisihFinal(espjPesertaId: string, nilai: number): Promise<Gagal | { success: true }> {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId || !isPpk(akses)) return { error: 'Hanya PPK yang dapat menyetel selisih akhir.' }
  const { error } = await supabase.from('perjadin_espj_peserta')
    .update({ selisih_final: Math.round(nilai) }).eq('id', espjPesertaId)
  if (error) return { error: error.message }
  return { success: true }
}

export async function bayarPeserta(espjPesertaId: string, fd: FormData): Promise<Gagal | { success: true }> {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId || !isBendahara(akses)) return { error: 'Hanya Bendahara yang mencatat pembayaran/penyetoran.' }

  const tanggal = String(fd.get('tanggal_bayar') ?? '')
  const catatan = String(fd.get('catatan_bayar') ?? '').trim() || null
  const bukti = fd.get('bukti') as File | null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return { error: 'Tanggal wajib diisi.' }

  const { data: baris } = await supabase.from('perjadin_espj_peserta')
    .select('id, espj:espj_id(penugasan_id, status)').eq('id', espjPesertaId).single()
  if (!baris) return { error: 'Baris penyelesaian tidak ditemukan.' }
  const induk = baris.espj as unknown as { penugasan_id: string; status: string } | null
  if (induk?.status !== 'disetujui') return { error: 'E-SPJ belum disetujui / sudah ditutup.' }

  let pathBukti: string | null = null
  if (bukti && bukti.size > 0) {
    const admin = createAdminClient()
    const ext = bukti.type === 'application/pdf' ? 'pdf' : 'jpg'
    try {
      pathBukti = await admin.storage.from(BUKTI).upload(`${induk.penugasan_id}/bayar/${randomUUID()}.${ext}`, bukti,
        { contentType: bukti.type, upsert: false }).then((r) => { if (r.error) throw new Error(r.error.message); return r.data.path })
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Unggah bukti bayar gagal.' }
    }
  }

  const { error } = await supabase.from('perjadin_espj_peserta').update({
    status_bayar: 'lunas', tanggal_bayar: tanggal, catatan_bayar: catatan, bukti_bayar_path: pathBukti,
  }).eq('id', espjPesertaId)
  if (error) return { error: error.message }
  await catatLog(supabase, { aktorId: akses.userId, aksi: 'bayar_penyelesaian', entitas: 'perjadin_espj_peserta', entitasId: espjPesertaId })
  revalidatePath('/dashboard/e-perjadin/penyelesaian')
  if (induk) revalidatePath(J(induk.penugasan_id))
  return { success: true }
}

export async function tutupEspj(penugasanId: string): Promise<Gagal | { success: true }> {
  const { supabase, akses } = await ctx(penugasanId)
  if (!akses.userId || !isBendahara(akses)) return { error: 'Hanya Bendahara yang menutup penyelesaian.' }

  const { data: espj } = await supabase.from('perjadin_espj').select('id, status').eq('penugasan_id', penugasanId).single()
  if (espj?.status !== 'disetujui') return { error: 'E-SPJ belum disetujui.' }

  const { data: lines } = await supabase.from('perjadin_espj_peserta')
    .select('status_bayar, selisih, selisih_final, uang_muka').eq('espj_id', espj.id)
  if ((lines ?? []).some((l) => l.status_bayar !== 'lunas')) return { error: 'Masih ada baris penyelesaian yang belum lunas.' }

  const now = new Date().toISOString()
  const admin = createAdminClient()
  const { error } = await supabase.from('perjadin_espj')
    .update({ status: 'selesai', ditutup_oleh: akses.userId, ditutup_pada: now, updated_at: now }).eq('id', espj.id)
  if (error) return { error: error.message }
  // Transisi status penugasan dibatasi pengelola/PPK/admin di RLS; Bendahara → service role.
  await admin.from('perjadin_penugasan').update({ status: 'Selesai', updated_at: now }).eq('id', penugasanId)

  // Lepas sisa pemesanan pagu: realisasi = Σ(selisih_final ?? selisih + uang_muka) (F-1.3).
  const realisasi = realisasiPenugasan((lines ?? []).map((l) => ({
    selisih: Number(l.selisih), selisih_final: l.selisih_final != null ? Number(l.selisih_final) : null, uang_muka: Number(l.uang_muka),
  })))
  const { data: kom } = await supabase.from('perjadin_komitmen')
    .select('pagu_id, jenis, jumlah').eq('penugasan_id', penugasanId)
  const netPerPagu = new Map<string, number>()
  for (const k of kom ?? []) {
    netPerPagu.set(k.pagu_id, (netPerPagu.get(k.pagu_id) ?? 0) + (k.jenis === 'pesan' ? Number(k.jumlah) : -Number(k.jumlah)))
  }
  const totalNet = [...netPerPagu.values()].reduce((s, n) => s + Math.max(0, n), 0)
  let sisaLepas = Math.max(0, totalNet - Math.round(realisasi))
  const lepas: Record<string, unknown>[] = []
  for (const [pagu_id, net] of netPerPagu) {
    if (sisaLepas <= 0) break
    const ambil = Math.min(sisaLepas, Math.max(0, net))
    if (ambil > 0) {
      lepas.push({ pagu_id, penugasan_id: penugasanId, jenis: 'lepas', jumlah: ambil, keterangan: 'Pelepasan — penyelesaian E-SPJ nilai lebih rendah', dibuat_oleh: akses.userId })
      sisaLepas -= ambil
    }
  }
  // perjadin_komitmen insert dibatasi PPK/admin di RLS; Bendahara menutup → service role.
  if (lepas.length > 0) await admin.from('perjadin_komitmen').insert(lepas)

  await catatLog(supabase, { aktorId: akses.userId, aksi: 'tutup_espj', entitas: 'perjadin_espj', entitasId: espj.id, nilaiBaru: { realisasi, dilepas: lepas.map((l) => l.jumlah) } })
  revalidatePath(J(penugasanId)); revalidatePath(`/dashboard/e-perjadin/penugasan/${penugasanId}`); revalidatePath('/dashboard/e-perjadin/penyelesaian')
  return { success: true }
}
