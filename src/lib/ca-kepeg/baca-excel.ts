/**
 * Pembaca Excel bersama (SheetJS) — jalan di browser, file tidak dikirim ke server.
 * Menangani .xls (BIFF, SIKEP) maupun .xlsx (KOMDANAS).
 */
import * as XLSX from 'xlsx'

export type SelMentah = string | number | boolean | null | undefined
export type BarisMentah = SelMentah[]

/**
 * Sheet pertama sebagai matriks baris×kolom.
 *
 * `teks: true` memformat setiap sel jadi string (padanan `str(cell_value)` xlrd)
 * dan mengisi sel kosong dengan '' — dipakai untuk SIKEP yang seluruhnya teks.
 * `teks: false` mempertahankan tipe asli dan membiarkan sel kosong `undefined`,
 * supaya pemeriksaan "sel kosong" pada parser KOMDANAS berperilaku sama dengan
 * `row[i] is None` di openpyxl.
 */
export function bacaMatriks(
  data: ArrayBuffer,
  teks: boolean,
  namaSheet?: string,
): BarisMentah[] {
  const wb = XLSX.read(new Uint8Array(data), { type: 'array' })
  const ws = wb.Sheets[namaSheet ?? wb.SheetNames[0]]
  if (!ws) return []
  return XLSX.utils.sheet_to_json<BarisMentah>(ws, {
    header: 1,
    raw: !teks,
    blankrows: true,
    ...(teks ? { defval: '' } : {}),
  })
}

/** Sel → string yang sudah di-trim. Sel kosong jadi ''. */
export function teksSel(v: SelMentah): string {
  return v == null ? '' : String(v).trim()
}

/** Sel → string trim + huruf kecil, padanan `_norm()` di Python. */
export function normalSel(v: SelMentah): string {
  return v == null ? '' : String(v).trim().toLowerCase()
}

/** NIP valid = 18 digit. File uang makan menyimpannya dengan apostrof di depan. */
export function bersihkanNip(v: SelMentah): string {
  return teksSel(v).replace(/^'+/, '').trim()
}

export function isNipValid(nip: string): boolean {
  return /^\d{18}$/.test(nip)
}
