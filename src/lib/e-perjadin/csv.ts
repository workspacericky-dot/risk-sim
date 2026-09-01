/** CSV RFC-4180 sederhana — dipakai ekspor paket audit & laporan manajerial. */
export function keCsv(header: string[], baris: readonly (readonly (string | number | null | undefined)[])[]): string {
  const esc = (v: unknown) => {
    const s = v == null ? '' : String(v)
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [header, ...baris].map((r) => r.map(esc).join(',')).join('\r\n')
}
