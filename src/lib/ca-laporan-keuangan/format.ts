/** Pemformat angka bersama untuk panel CA Laporan Keuangan. */
import type { Severity } from './konstanta'

export function fmtRp(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return n.toLocaleString('id-ID')
}

export function fmtPersen(n: number | null | undefined, digit = 2): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—'
  return `${n.toLocaleString('id-ID', { minimumFractionDigits: digit, maximumFractionDigits: digit })}%`
}

/** Kelas Tailwind per severity — dipakai badge & baris tabel temuan. */
export const WARNA_SEVERITY: Record<Severity, string> = {
  Kritikal: 'bg-red-100 text-red-800 border-red-300',
  Tinggi: 'bg-orange-100 text-orange-800 border-orange-300',
  Sedang: 'bg-amber-100 text-amber-800 border-amber-300',
  Info: 'bg-sky-100 text-sky-800 border-sky-300',
}

export const WARNA_BARIS_SEVERITY: Record<Severity, string> = {
  Kritikal: 'bg-red-50/70',
  Tinggi: 'bg-orange-50/70',
  Sedang: 'bg-amber-50/50',
  Info: 'bg-sky-50/50',
}
