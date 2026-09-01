/**
 * E-Perjadin Bawas — logika murni presensi lapangan (M2).
 * Model "212", geofence haversine, dan Anti-Fraud Engine AF-7 (§8.5, §8.6).
 */

export type TitikJenis = 'Start' | 'In' | 'Kegiatan' | 'Out' | 'End'

export const LABEL_TITIK: Record<string, string> = {
  Start: 'Berangkat dari tempat kedudukan',
  In: 'Tiba di lokasi tujuan',
  Kegiatan: 'Titik kegiatan harian',
  Out: 'Meninggalkan lokasi tujuan',
  End: 'Tiba kembali di tempat kedudukan',
  Tambahan: 'Titik kegiatan tambahan',
}

/**
 * Titik acuan geofence per jenis: kedudukan utk Start/End, satker tujuan utk sisanya.
 * `dariTempatSah = true` (PMK 119/2023): Start/End boleh dari lokasi sah lain →
 * geofence kedudukan tidak dievaluasi (tetap tercatat + ditandai untuk verifikasi PPK).
 */
export function acuanGeofence(jenis: string, dariTempatSah = false): 'kedudukan' | 'tujuan' | null {
  if (jenis === 'Start' || jenis === 'End') return dariTempatSah ? null : 'kedudukan'
  if (jenis === 'In' || jenis === 'Out' || jenis === 'Kegiatan') return 'tujuan'
  return null // 'Tambahan' tidak divalidasi geofence
}

export const LABEL_TEMPAT_SAH: Record<string, string> = {
  fws: 'Flexible working space',
  cuti: 'Lokasi cuti',
  libur: 'Lokasi libur resmi',
  penugasan_lain: 'Lokasi penugasan dinas lain',
}

const HARI_MS = 86_400_000

function tglIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}
function parseTgl(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(t)) throw new Error(`Tanggal tidak sah: ${iso}`)
  return t
}

/**
 * Titik presensi wajib untuk satu penugasan (pola "212", PRD F-2.1):
 * 2 titik hari berangkat, ≥1 titik per hari kegiatan, 2 titik hari pulang.
 */
export function hitungTitikWajib(berangkat: string, kembali: string): { tanggal: string; jenis: TitikJenis }[] {
  const d0 = parseTgl(berangkat)
  const dN = parseTgl(kembali)
  if (dN < d0) throw new Error('Tanggal kembali mendahului tanggal berangkat.')

  if (d0 === dN) {
    return (['Start', 'In', 'Out', 'End'] as TitikJenis[]).map((jenis) => ({ tanggal: berangkat, jenis }))
  }

  const titik: { tanggal: string; jenis: TitikJenis }[] = [
    { tanggal: berangkat, jenis: 'Start' },
    { tanggal: berangkat, jenis: 'In' },
  ]
  for (let d = d0 + HARI_MS; d < dN; d += HARI_MS) {
    titik.push({ tanggal: tglIso(d), jenis: 'Kegiatan' })
  }
  titik.push({ tanggal: kembali, jenis: 'Out' }, { tanggal: kembali, jenis: 'End' })
  return titik
}

/** Titik wajib mana yang belum terpenuhi (Kegiatan: ≥1 rekaman pada tanggal itu). */
export function titikBelumTerekam(
  wajib: { tanggal: string; jenis: TitikJenis }[],
  terekam: { tanggal: string; jenis: string }[],
): { tanggal: string; jenis: TitikJenis }[] {
  return wajib.filter((w) => {
    if (w.jenis === 'Kegiatan') {
      return !terekam.some((r) => r.tanggal === w.tanggal && (r.jenis === 'Kegiatan' || r.jenis === 'Tambahan'))
    }
    return !terekam.some((r) => r.tanggal === w.tanggal && r.jenis === w.jenis)
  })
}

// ── Geofence (haversine, tanpa PostGIS — PRD F-2.2) ────────────────────
export function haversineMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)))
}

// ── AF-7: anomali presensi (semua Warning — wajib diputus PPK) ──────────
export type InputAnomali = {
  jenis: string
  waktuServerMs: number
  waktuPerangkatMs: number | null
  lintang: number | null
  bujur: number | null
  sumber: 'pwa' | 'fallback'
  dalamGeofence: boolean | null
  titikSebelumnya: { lintang: number; bujur: number; waktuServerMs: number } | null
  pesertaLainDiPerangkatHariIni: number     // distinct peserta_id ≠ ini, device sama, tanggal sama
  pesertaIniSudahDiPerangkat: boolean
  fallbackSebelumnya: number                // jumlah presensi fallback peserta ini di penugasan ini
  adaKoordinatIdentikLain: boolean
  ambangSelisihMenit: number
  ambangKecepatanKmh: number
  ambangFallbackBerulang: number
  batasPesertaPerangkat: number
}

export type TemuanPresensi = { kode: 'AF-7'; ringkasan: string }

export function deteksiAnomaliPresensi(i: InputAnomali): TemuanPresensi[] {
  const out: TemuanPresensi[] = []

  // (a) selisih waktu perangkat vs server
  if (i.waktuPerangkatMs != null) {
    const selisihMenit = Math.abs(i.waktuServerMs - i.waktuPerangkatMs) / 60_000
    if (selisihMenit > i.ambangSelisihMenit) {
      out.push({ kode: 'AF-7', ringkasan: `AF-7a — selisih waktu perangkat vs server ${selisihMenit.toFixed(1)} menit (ambang ${i.ambangSelisihMenit}).` })
    }
  }

  // (b) kecepatan mustahil antar titik berurutan
  if (i.titikSebelumnya && i.lintang != null && i.bujur != null) {
    const jarak = haversineMeter(i.titikSebelumnya.lintang, i.titikSebelumnya.bujur, i.lintang, i.bujur)
    const detik = (i.waktuServerMs - i.titikSebelumnya.waktuServerMs) / 1000
    if (detik > 0) {
      const kmh = (jarak / detik) * 3.6
      if (kmh > i.ambangKecepatanKmh) {
        out.push({ kode: 'AF-7', ringkasan: `AF-7b — kecepatan antar titik ${Math.round(kmh)} km/j (ambang ${i.ambangKecepatanKmh}).` })
      }
    }
  }

  // (c) satu perangkat melayani > N peserta dalam satu hari
  const totalPeserta = i.pesertaLainDiPerangkatHariIni + (i.pesertaIniSudahDiPerangkat ? 0 : 1)
  if (totalPeserta > i.batasPesertaPerangkat) {
    out.push({ kode: 'AF-7', ringkasan: `AF-7c — perangkat merekam ${totalPeserta} peserta pada hari yang sama (batas ${i.batasPesertaPerangkat}).` })
  }

  // (d) pemakaian jalur fallback berulang oleh orang yang sama
  const totalFallback = i.fallbackSebelumnya + (i.sumber === 'fallback' ? 1 : 0)
  if (totalFallback > i.ambangFallbackBerulang) {
    out.push({ kode: 'AF-7', ringkasan: `AF-7d — jalur fallback dipakai ${totalFallback}× oleh peserta ini (ambang ${i.ambangFallbackBerulang}).` })
  }

  // (e) koordinat identik persis dengan presensi lain
  if (i.adaKoordinatIdentikLain) {
    out.push({ kode: 'AF-7', ringkasan: `AF-7e — koordinat identik persis dengan titik presensi lain (indikasi salin-tempel).` })
  }

  // (f) di luar geofence
  if (i.dalamGeofence === false) {
    out.push({ kode: 'AF-7', ringkasan: `AF-7f — titik ${i.jenis} di luar radius geofence lokasi acuan.` })
  }

  return out
}
