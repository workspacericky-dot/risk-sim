/**
 * E-Perjadin Bawas — logika murni laporan hasil dinas tersegmentasi (M3).
 * Segmen baku tata naskah, penguncian lembut, dan syarat finalisasi (F-4.1, F-4.2).
 */

export const SEGMEN = [
  { kunci: 'latar_belakang',   judul: 'Latar Belakang' },
  { kunci: 'maksud_tujuan',    judul: 'Maksud & Tujuan' },
  { kunci: 'ruang_lingkup',    judul: 'Ruang Lingkup' },
  { kunci: 'hasil_pelaksanaan', judul: 'Hasil Pelaksanaan' },
  { kunci: 'kesimpulan',       judul: 'Kesimpulan' },
  { kunci: 'saran',            judul: 'Saran' },
] as const

export type KunciSegmen = (typeof SEGMEN)[number]['kunci']

export const JUDUL_SEGMEN: Record<string, string> = Object.fromEntries(SEGMEN.map((s) => [s.kunci, s.judul]))

const LOCK_MENIT_DEFAULT = 3

/**
 * Penguncian lembut (F-4.2): segmen dianggap "sedang disunting" bila diperbarui
 * oleh orang lain dalam `ambangMenit` menit terakhir. Tidak memblokir — hanya
 * memperingatkan.
 */
export function segmenTerkunci(
  disuntingOleh: string | null,
  disuntingPada: string | null,
  sayaUserId: string,
  sekarangMs: number = Date.now(),
  ambangMenit: number = LOCK_MENIT_DEFAULT,
): { terkunci: boolean; olehOrangLain: boolean } {
  if (!disuntingOleh || !disuntingPada || disuntingOleh === sayaUserId) {
    return { terkunci: false, olehOrangLain: false }
  }
  const lewatMenit = (sekarangMs - Date.parse(disuntingPada)) / 60_000
  const aktif = lewatMenit >= 0 && lewatMenit < ambangMenit
  return { terkunci: aktif, olehOrangLain: aktif }
}

/** Laporan siap difinalkan bila keenam segmen baku terisi (F-4.2). */
export function laporanSiapFinal(segmen: { kunci: string; isi: string }[]): { siap: boolean; kurang: string[] } {
  const isi = new Map(segmen.map((s) => [s.kunci, s.isi.trim()]))
  const kurang = SEGMEN.filter((s) => !isi.get(s.kunci)).map((s) => s.judul)
  return { siap: kurang.length === 0, kurang }
}
