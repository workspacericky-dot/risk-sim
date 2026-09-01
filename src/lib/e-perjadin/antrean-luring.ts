/**
 * Antrean presensi luring (PRD F-2.6). Titik yang gagal terkirim karena tanpa
 * sinyal disimpan di IndexedDB beserta blob foto, lalu disinkronkan otomatis
 * saat daring kembali. Hanya dipakai dari komponen klien.
 */
import { openDB, type IDBPDatabase } from 'idb'

export type ItemAntrean = {
  id?: number
  penugasanId: string
  fields: Record<string, string>
  foto: Blob | null
  pernyataan: Blob | null
  dibuatPada: number // Date.now() saat direkam di perangkat
}

const NAMA_DB = 'e-perjadin'
const STORE = 'antrean-presensi'

let dbP: Promise<IDBPDatabase> | null = null
function db() {
  if (!dbP) {
    dbP = openDB(NAMA_DB, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(STORE)) {
          d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true })
        }
      },
    })
  }
  return dbP
}

export async function antre(item: Omit<ItemAntrean, 'id'>): Promise<void> {
  await (await db()).add(STORE, item)
}

export async function daftarAntrean(): Promise<ItemAntrean[]> {
  return (await db()).getAll(STORE)
}

export async function hapusAntrean(id: number): Promise<void> {
  await (await db()).delete(STORE, id)
}

export async function jumlahAntrean(): Promise<number> {
  return (await db()).count(STORE)
}
