/**
 * Kompresi foto sisi peramban sebelum unggah (PRD §8.7 — target ≤ 300 KB)
 * untuk menghemat kuota pelaksana di lapangan. Hanya dipanggil dari komponen klien.
 *
 * ponytail: re-encode kanvas menghapus EXIF. Kuota lapangan (§8.7) diprioritaskan
 * di atas pengecekan EXIF (§8.5) untuk MVP — sinyal anti-fraud utama di modul ini
 * adalah waktu server, geofence, kecepatan mustahil, dan koordinat identik.
 * Kirim EXIF terpisah bila §8.5 jadi wajib.
 */
const MAKS_DIMENSI = 1280
const TARGET_BYTE = 300 * 1024

export async function kompresFoto(file: File): Promise<Blob> {
  if (typeof document === 'undefined') return file // SSR guard

  const bitmap = await createImageBitmap(file)
  const skala = Math.min(1, MAKS_DIMENSI / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * skala)
  const h = Math.round(bitmap.height * skala)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return file
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()

  const keBlob = (q: number) =>
    new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', q))

  for (const q of [0.8, 0.65, 0.5, 0.4]) {
    const blob = await keBlob(q)
    if (blob && (blob.size <= TARGET_BYTE || q === 0.4)) return blob
  }
  return file
}
