/**
 * E-Perjadin Bawas — konstanta & tipe bersama modul.
 *
 * Ambang bawaan di sini mengikuti "usulan awal" PRD §8.6 / §F-6.4. Nilai yang
 * berlaku disimpan di tabel `perjadin_parameter` dan dapat diubah tanpa ganti
 * kode; konstanta di bawah hanya dipakai untuk seeding & label antarmuka.
 */

// ── Peran modul (terpisah dari users.role) — PRD F-6.1 ────────────────────
export const PERAN_PERJADIN = [
  'pengelola_kegiatan', 'pelaksana', 'pemberi_tugas', 'staf_ppk',
  'ppk', 'ppspm', 'bendahara', 'auditor_perjadin', 'kpa',
] as const
export type PeranPerjadin = (typeof PERAN_PERJADIN)[number]

export const LABEL_PERAN: Record<PeranPerjadin, string> = {
  pengelola_kegiatan: 'Pengelola Kegiatan',
  pelaksana:          'Pelaksana SPD',
  pemberi_tugas:      'Pemberi Tugas (Inspektur)',
  staf_ppk:           'Staf PPK',
  ppk:                'PPK',
  ppspm:              'PPSPM',
  bendahara:          'Bendahara Pengeluaran',
  auditor_perjadin:   'Auditor Perjadin',
  kpa:                'KPA (Sekretaris)',
}

/** Kombinasi peran yang saling mengunci (Segregation of Duties) — PRD F-6.1. */
export const KOMBINASI_TERLARANG: readonly (readonly [PeranPerjadin, PeranPerjadin])[] = [
  ['ppk', 'bendahara'],
  ['ppk', 'staf_ppk'],
  ['pengelola_kegiatan', 'ppk'],
  ['kpa', 'ppk'],
  ['kpa', 'bendahara'],
]

export const JENIS_DINAS = ['Luar Kota', 'Dalam Kota > Ambang', 'Dalam Kota <= Ambang'] as const
export type JenisDinas = (typeof JENIS_DINAS)[number]
export const LABEL_JENIS_DINAS: Record<JenisDinas, string> = {
  'Luar Kota':            'Luar Kota',
  'Dalam Kota > Ambang':  'Dalam Kota (> 8 jam / durasi lokasi ≥ ambang)',
  'Dalam Kota <= Ambang': 'Dalam Kota (≤ 8 jam)',
}

// ── Komponen SBM (plafon_danom.md) ──────────────────────────────────────
export const KOMPONEN_SBM = [
  'uang_harian', 'penginapan', 'tiket_pesawat', 'uang_representasi', 'transport_lokal',
] as const
export type KomponenSbm = (typeof KOMPONEN_SBM)[number]

export const LABEL_KOMPONEN: Record<KomponenSbm, string> = {
  uang_harian:      'Uang Harian (per provinsi)',
  penginapan:       'Batas Biaya Penginapan (per kategori)',
  tiket_pesawat:    'Plafon Tiket Pesawat PP (per rute)',
  uang_representasi: 'Uang Representasi',
  transport_lokal:  'Transport Lokal',
}

/**
 * Arti kolom `tingkat_biaya` pada `perjadin_sbm` bergantung komponen:
 * uang_harian → '-'; penginapan → kategori '1'|'2'; tiket_pesawat → '-' atau label sub-rute.
 */
export const KATEGORI_PELAKSANA = ['1', '2'] as const
export type KategoriPelaksana = (typeof KATEGORI_PELAKSANA)[number]
export const LABEL_KATEGORI: Record<KategoriPelaksana, string> = {
  '1': 'Kategori 1 — Eselon II/III, Gol. IV',
  '2': 'Kategori 2 — Eselon IV, Gol. III/II/I, PPPK',
}

export const PENGINAPAN_MODE = ['hotel', '30persen', 'tidak'] as const
export type PenginapanMode = (typeof PENGINAPAN_MODE)[number]
export const LABEL_PENGINAPAN_MODE: Record<PenginapanMode, string> = {
  hotel:      'Menginap hotel (tarif penuh)',
  '30persen': 'Tidak menginap hotel — biaya penginapan 30%',
  tidak:      'Tidak ada biaya penginapan',
}

/** Satuan lazim SBM (OH = orang-hari, OM = orang-malam, PP = pergi-pulang). */
export const SATUAN_SBM = ['OH', 'OM', 'PP', 'OK', 'Paket'] as const

export const PROVINSI = [
  'Aceh', 'Sumatera Utara', 'Sumatera Barat', 'Riau', 'Kepulauan Riau', 'Jambi',
  'Sumatera Selatan', 'Bangka Belitung', 'Bengkulu', 'Lampung', 'Banten', 'DKI Jakarta',
  'Jawa Barat', 'Jawa Tengah', 'DI Yogyakarta', 'Jawa Timur', 'Bali', 'Nusa Tenggara Barat',
  'Nusa Tenggara Timur', 'Kalimantan Barat', 'Kalimantan Tengah', 'Kalimantan Selatan',
  'Kalimantan Timur', 'Kalimantan Utara', 'Sulawesi Utara', 'Gorontalo', 'Sulawesi Tengah',
  'Sulawesi Barat', 'Sulawesi Selatan', 'Sulawesi Tenggara', 'Maluku', 'Maluku Utara',
  'Papua', 'Papua Barat', 'Papua Selatan', 'Papua Tengah', 'Papua Pegunungan', 'Papua Barat Daya',
] as const

/** Kunci parameter kontrol + nilai bawaan — sejalan dengan seeding migrasi M0/M2/M6. */
export const PARAMETER_BAWAAN: Record<string, { nilai: string; keterangan: string }> = {
  ambang_durasi_dinas_dalam_kota_jam: { nilai: '8',   keterangan: 'Batas jam dinas dalam kota (PMK 113/2012). Ukuran teknisnya: ambang_durasi_lokasi_menit.' },
  ambang_durasi_lokasi_menit:         { nilai: '360', keterangan: 'Durasi minimal In→Out di lokasi agar dinas dalam kota diakui > 8 jam (AF-4). Min 360.' },
  radius_geofence_default_m:           { nilai: '500', keterangan: 'Radius geofence bawaan bila satker belum punya nilai sendiri.' },
  ambang_akurasi_gps_m:                { nilai: '100', keterangan: 'Presensi ditolak bila akurasi GPS di atas nilai ini.' },
  batas_peserta_per_perangkat:         { nilai: '4',   keterangan: 'Ambang mode berbagi perangkat sebelum ditandai anomali (AF-7c).' },
  ambang_selisih_waktu_menit:          { nilai: '5',   keterangan: 'Selisih waktu perangkat vs server yang memicu anomali (AF-7a).' },
  ambang_kecepatan_kmh:                { nilai: '900', keterangan: 'Kecepatan antar titik presensi di atas nilai ini → anomali (AF-7b).' },
  ambang_fallback_berulang:            { nilai: '2',   keterangan: 'Pemakaian jalur fallback berulang oleh orang yang sama → anomali (AF-7d).' },
  kedudukan_lintang:                   { nilai: '-6.17540',  keterangan: 'Lintang tempat kedudukan (Bawas MA, Jakarta) — geofence Start/End.' },
  kedudukan_bujur:                     { nilai: '106.84780', keterangan: 'Bujur tempat kedudukan.' },
  kedudukan_radius_m:                  { nilai: '500', keterangan: 'Radius geofence tempat kedudukan (meter).' },
  tarif_dalam_kota_harian:             { nilai: '210000', keterangan: 'Uang harian dinas dalam kota > 8 jam (Rp/hari).' },
  tarif_transport_lokal_dalam_kota:    { nilai: '170000', keterangan: 'Transport lokal dinas dalam kota (Rp/hari).' },
  tarif_dpr_default:                   { nilai: '300000', keterangan: 'Estimasi bawaan Daftar Pengeluaran Riil per penugasan luar kota.' },
  toleransi_overbudget_tiket:          { nilai: '500000', keterangan: 'Batas overbudget tiket pesawat yang dapat dipertanggungjawabkan (Rp/orang).' },
  faktor_penginapan_30persen:          { nilai: '0.30', keterangan: 'Faktor biaya penginapan bagi pelaksana yang tidak menginap hotel.' },
  tarif_representasi_luar_kota:        { nilai: '150000', keterangan: 'Uang representasi luar kota per orang/hari (lumpsum), hanya bagi peserta yang berhak (mis. Eselon II).' },
  faktor_harian_transport_riil:       { nilai: '0.6', keterangan: 'Faktor uang harian bila transport lokal dibayar riil / kunjungan lebih dari satu obrik (60%).' },
}
