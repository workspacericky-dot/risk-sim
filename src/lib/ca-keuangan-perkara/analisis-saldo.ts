/**
 * Bagian A — bangun Reanalisis_Ringkasan dari Reanalisis_Pivot: matriks
 * Tahun × Jenis Perkara untuk saldo positif (panjar belum dikembalikan) dan
 * saldo negatif (anomali, wajib ditelusuri). Setara PDF A.5–A.7.
 */
import { JENIS_PERKARA } from './konstanta'
import type { BarisPivot } from './parse-jur'

export type MatriksRingkasan = {
  tahunList: number[]
  jenisList: string[]
  /** sel[tahun][jenis] = jumlah Sisa terfilter */
  sel: Record<number, Record<string, number>>
  totalPerJenis: Record<string, number>
  totalPerTahun: Record<number, number>
  totalKeseluruhan: number
}

function bangunMatriks(baris: BarisPivot[]): MatriksRingkasan {
  const tahunList = [...new Set(baris.map((b) => b.tahun).filter((t): t is number => t !== null))]
    .sort((a, b) => a - b)
  const jenisList = [...JENIS_PERKARA]

  const sel: Record<number, Record<string, number>> = {}
  const totalPerJenis: Record<string, number> = Object.fromEntries(jenisList.map((j) => [j, 0]))
  const totalPerTahun: Record<number, number> = Object.fromEntries(tahunList.map((t) => [t, 0]))
  let totalKeseluruhan = 0

  for (const t of tahunList) sel[t] = Object.fromEntries(jenisList.map((j) => [j, 0]))

  for (const b of baris) {
    if (b.tahun === null) continue
    sel[b.tahun][b.jenis] = (sel[b.tahun][b.jenis] ?? 0) + b.sisa
    totalPerJenis[b.jenis] = (totalPerJenis[b.jenis] ?? 0) + b.sisa
    totalPerTahun[b.tahun] += b.sisa
    totalKeseluruhan += b.sisa
  }

  return { tahunList, jenisList, sel, totalPerJenis, totalPerTahun, totalKeseluruhan }
}

export type HasilAnalisisSaldo = {
  pivot: BarisPivot[]
  ringkasanPositif: MatriksRingkasan
  ringkasanNegatif: MatriksRingkasan
  /** Seluruh perkara bersaldo negatif, terurut dari yang paling negatif — wajib ditelusuri. */
  daftarAnomali: BarisPivot[]
  /** Perkara bersaldo positif — masukan Bagian B (uji kepatuhan). */
  daftarSaldoPositif: BarisPivot[]
  /** Nomor Perkara yang tahunnya tidak dapat diekstrak — perlu diperiksa manual. */
  tanpaTahun: BarisPivot[]
}

/** Gabungkan baris (jenis, Nomor Perkara) yang sama dari lebih dari satu berkas. */
function gabungkanPivot(baris: BarisPivot[]): BarisPivot[] {
  const peta = new Map<string, BarisPivot>()
  for (const b of baris) {
    const kunci = `${b.jenis}|${b.nomorPerkara}`
    const ada = peta.get(kunci)
    if (ada) ada.sisa += b.sisa
    else peta.set(kunci, { ...b })
  }
  return [...peta.values()]
}

export function jalankanAnalisisSaldo(pivotMentah: BarisPivot[]): HasilAnalisisSaldo {
  const pivot = gabungkanPivot(pivotMentah)
  const positif = pivot.filter((b) => b.sisa > 0)
  const negatif = pivot.filter((b) => b.sisa < 0)

  return {
    pivot,
    ringkasanPositif: bangunMatriks(positif),
    ringkasanNegatif: bangunMatriks(negatif),
    daftarAnomali: [...negatif].sort((a, b) => a.sisa - b.sisa),
    daftarSaldoPositif: [...positif].sort((a, b) => a.nomorPerkara.localeCompare(b.nomorPerkara)),
    tanpaTahun: pivot.filter((b) => b.tahun === null),
  }
}
