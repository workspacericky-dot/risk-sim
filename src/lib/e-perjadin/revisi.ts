/**
 * E-Perjadin Bawas — logika murni revisi bernomor penugasan pasca-terbit (F-1.4).
 * Perubahan diusulkan pada catatan revisi (snapshot_baru), baru diterapkan ke data
 * hidup saat Pemberi Tugas menyetujui.
 */

export type PerubahanHeader = {
  tanggal_berangkat?: string
  tanggal_kembali?: string
}

export type PerubahanPeserta =
  | {
      aksi: 'tambah'
      nama: string; nip: string | null; jabatan: string | null; peran_tim: string
      kategori: string; penginapan_mode: string; homebase_jabodetabek: boolean
      berhak_representasi?: boolean; transport_lokal_riil?: boolean; pakai_kendaraan_dinas?: boolean
      estimasi_pesawat: number; estimasi_dpr: number; rute_pesawat: string
    }
  | { aksi: 'tarik'; peserta_id: string; nama: string; alasan: string }
  | {
      aksi: 'ubah'; peserta_id: string; nama: string
      kategori?: string; penginapan_mode?: string
      estimasi_pesawat?: number; estimasi_dpr?: number; rute_pesawat?: string
    }

export type SnapshotBaru = { header: PerubahanHeader; peserta: PerubahanPeserta[] }

/** Ringkas jenis perubahan & apakah DANOM/anggaran ikut berubah. */
export function ringkasPerubahan(s: SnapshotBaru): { jenis: string[]; adaDampakDanom: boolean } {
  const jenis: string[] = []
  const tanggalBerubah = !!(s.header.tanggal_berangkat || s.header.tanggal_kembali)
  if (tanggalBerubah) jenis.push('tanggal')
  if (s.peserta.length > 0) jenis.push('tim')
  // Setiap perubahan tanggal/tim menggeser estimasi DANOM.
  const adaDampakDanom = tanggalBerubah || s.peserta.length > 0
  return { jenis, adaDampakDanom }
}

/** Jumlah perubahan bersih (untuk memblok pengajuan revisi kosong). */
export function jumlahPerubahan(s: SnapshotBaru): number {
  return (s.header.tanggal_berangkat ? 1 : 0) + (s.header.tanggal_kembali ? 1 : 0) + s.peserta.length
}
