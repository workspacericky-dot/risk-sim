import { createHash } from 'crypto'

/** SHA-256 heksadesimal dari sebuah berkas bukti (F-3.4). Dipakai sisi server. */
export async function hashBerkas(file: Blob): Promise<string> {
  const buf = Buffer.from(await file.arrayBuffer())
  return createHash('sha256').update(buf).digest('hex')
}
