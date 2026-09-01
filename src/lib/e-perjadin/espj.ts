/**
 * E-Perjadin Bawas — logika murni biaya riil & E-SPJ (M4).
 * AF-5 (klaim > SBM), AF-3/8/9 (syarat pengajuan E-SPJ), dan rekap kurang/lebih bayar.
 */

export type KomponenBiaya = 'transport' | 'penginapan' | 'transport_lokal' | 'lainnya'

export const LABEL_KOMPONEN_BIAYA: Record<KomponenBiaya, string> = {
  transport: 'Transport (tiket)',
  penginapan: 'Penginapan',
  transport_lokal: 'Transport Lokal',
  lainnya: 'Biaya Riil Lainnya',
}

export type HasilEvaluasiBiaya = {
  melebihi_sbm: boolean
  jumlah_diakui: number
  batas_sbm: number | null
}

/**
 * AF-5 — bandingkan klaim terhadap batas SBM komponen. Bila melampaui dan belum
 * disetujui PPK, jumlah diakui dipotong ke batas; selisih jadi beban pribadi.
 * `batasSbm = null` → komponen tanpa batas (mis. tiket transport).
 */
export function evaluasiBiaya(
  jumlahDiajukan: number,
  batasSbm: number | null,
  disetujuiPpk: boolean,
): HasilEvaluasiBiaya {
  if (batasSbm == null || disetujuiPpk || jumlahDiajukan <= batasSbm) {
    return { melebihi_sbm: batasSbm != null && jumlahDiajukan > batasSbm, jumlah_diakui: jumlahDiajukan, batas_sbm: batasSbm }
  }
  return { melebihi_sbm: true, jumlah_diakui: batasSbm, batas_sbm: batasSbm }
}

// ── Rekap kurang/lebih bayar per peserta (F-5.1) ──────────────────────
export type RekapPeserta = { hak_sbm: number; biaya_riil: number; uang_muka: number; selisih: number }

/**
 * Dasar pembayaran = hak SBM (prinsip modul: kehadiran fisik → dasar bayar),
 * ditambah pengakuan di atas SBM yang telah disetujui PPK, dikurangi uang muka.
 * `selisih` > 0 = kurang bayar (dibayarkan ke pelaksana); < 0 = lebih bayar (disetor).
 */
export function hitungRekapPeserta(input: {
  hakSbm: number
  biayaRiilDiakui: number
  tambahanDiakuiDiAtasSbm: number
  uangMukaPersen: number
}): RekapPeserta {
  const uang_muka = Math.round((input.hakSbm * input.uangMukaPersen) / 100)
  const dasar = input.hakSbm + Math.max(0, Math.round(input.tambahanDiakuiDiAtasSbm))
  return { hak_sbm: input.hakSbm, biaya_riil: input.biayaRiilDiakui, uang_muka, selisih: dasar - uang_muka }
}

/**
 * Realisasi belanja satu penugasan = total yang benar-benar disalurkan =
 * Σ (selisih final ?? selisih) + uang muka. Dipakai untuk melepas sisa pagu
 * (F-1.3) dan laporan biaya per penugasan (O4).
 */
export function realisasiPenugasan(
  lines: readonly { selisih: number; selisih_final: number | null; uang_muka: number }[],
): number {
  return lines.reduce((s, l) => s + (l.selisih_final ?? l.selisih) + l.uang_muka, 0)
}

// ── Syarat pengajuan E-SPJ (AF-3, AF-8, AF-9) ─────────────────────────
export type BlokirEspj = { kode: string; ringkasan: string }

export function syaratPengajuanEspj(input: {
  statusPenugasan: string
  adaNomorSt: boolean
  laporanFinal: boolean
  titikWajibBelum: number
  presensiBelumDiputus: number
}): { boleh: boolean; blokir: BlokirEspj[] } {
  const blokir: BlokirEspj[] = []
  if (!input.adaNomorSt || input.statusPenugasan !== 'Berjalan') {
    blokir.push({ kode: 'AF-3', ringkasan: 'E-SPJ hanya dapat diajukan dari Surat Tugas terbitan sistem yang berstatus Berjalan.' })
  }
  if (input.titikWajibBelum > 0 || input.presensiBelumDiputus > 0) {
    blokir.push({
      kode: 'AF-8',
      ringkasan: `Titik presensi wajib belum lengkap: ${input.titikWajibBelum} titik belum terekam, ${input.presensiBelumDiputus} titik anomali belum diputus PPK.`,
    })
  }
  if (!input.laporanFinal) {
    blokir.push({ kode: 'AF-9', ringkasan: 'Laporan hasil dinas belum berstatus final.' })
  }
  return { boleh: blokir.length === 0, blokir }
}
