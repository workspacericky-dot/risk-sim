import {
  KOMBINASI_TERLARANG, LABEL_PERAN, PERAN_PERJADIN, type PeranPerjadin,
} from './konstanta'

export type HasilCekPeran = { ok: true } | { ok: false; error: string }

/**
 * Uji satu himpunan peran perjadin terhadap Segregation of Duties (PRD F-6.1).
 * Mengembalikan pelanggaran pertama yang ditemukan; urutan kombinasi mengikuti
 * KOMBINASI_TERLARANG.
 */
export function cekKombinasiPeran(peran: readonly string[]): HasilCekPeran {
  const set = new Set(peran)

  for (const p of set) {
    if (!(PERAN_PERJADIN as readonly string[]).includes(p)) {
      return { ok: false, error: `Peran tidak dikenal: ${p}` }
    }
  }

  for (const [a, b] of KOMBINASI_TERLARANG) {
    if (set.has(a) && set.has(b)) {
      return { ok: false, error: `${LABEL_PERAN[a as PeranPerjadin]} tidak boleh dirangkap dengan ${LABEL_PERAN[b as PeranPerjadin]}.` }
    }
  }

  return { ok: true }
}
