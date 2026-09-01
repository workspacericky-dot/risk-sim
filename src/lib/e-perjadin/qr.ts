import QRCode from 'qrcode'
import { headers } from 'next/headers'

/** QR sebagai markup SVG inline — dipakai di halaman cetak & portal verifikasi. */
export async function qrSvg(teks: string): Promise<string> {
  return QRCode.toString(teks, { type: 'svg', margin: 1, width: 132 })
}

/** Asal situs untuk menyusun URL absolut di dalam QR (tanpa env tambahan). */
export async function asalSitus(): Promise<string> {
  const h = await headers()
  const host = h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}
