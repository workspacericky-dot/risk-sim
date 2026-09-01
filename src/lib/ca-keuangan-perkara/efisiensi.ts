/**
 * Analisis Efisiensi Biaya Proses — port dari
 * `CA Audit Keuangan Perkara/Analisis_Efisiensi_Biaya Proses.md`.
 *
 * Dua analisis independen, keduanya butuh angka Buku Kas/SIPP yang tidak ada
 * di berkas jur_* (tarif resmi, pengeluaran riil, data stock opname ATK) —
 * karena itu murni input manual per periode, bukan hasil parsing berkas.
 */

// ── 1. Alokasi Overhead (Over/Underallocated) ──────────────────────────────

export type StatusAlokasi = 'Overallocated (Tarif Terlalu Mahal)' | 'Underallocated (Tarif Terlalu Rendah)' | 'Seimbang'

export type BarisAlokasi = {
  id: string
  tahun: number | null
  tarifPerPerkara: number
  jumlahPerkaraDiterima: number
  pengeluaranRiil: number
}

export type HasilAlokasi = BarisAlokasi & {
  totalAlokasi: number
  selisih: number
  status: StatusAlokasi
}

export function barisAlokasiKosong(id: string, tahun: number | null = null): BarisAlokasi {
  return { id, tahun, tarifPerPerkara: 0, jumlahPerkaraDiterima: 0, pengeluaranRiil: 0 }
}

export function hitungAlokasi(b: BarisAlokasi): HasilAlokasi {
  const totalAlokasi = b.tarifPerPerkara * b.jumlahPerkaraDiterima
  const selisih = totalAlokasi - b.pengeluaranRiil
  const status: StatusAlokasi = selisih > 0
    ? 'Overallocated (Tarif Terlalu Mahal)'
    : selisih < 0 ? 'Underallocated (Tarif Terlalu Rendah)' : 'Seimbang'
  return { ...b, totalAlokasi, selisih, status }
}

// ── 2. Varians Efisiensi ATK (stock opname) ────────────────────────────────

export type StatusVarians = 'Unfavorable (Tidak Efisien)' | 'Favorable (Efisien)' | 'Sesuai Standar'

export type BarisVariansAtk = {
  id: string
  tahun: number | null
  namaItem: string
  standarPerPerkara: number
  jumlahPerkaraDiputus: number
  saldoAwal: number
  pembelian: number
  saldoAkhirOpname: number
  hargaStandar: number
}

export type HasilVariansAtk = BarisVariansAtk & {
  kuantitasStandar: number
  kuantitasAktual: number
  variansEfisiensi: number
  status: StatusVarians
}

export function barisVariansAtkKosong(id: string, tahun: number | null = null): BarisVariansAtk {
  return {
    id, tahun, namaItem: 'Kertas', standarPerPerkara: 0, jumlahPerkaraDiputus: 0,
    saldoAwal: 0, pembelian: 0, saldoAkhirOpname: 0, hargaStandar: 0,
  }
}

export function hitungVariansAtk(b: BarisVariansAtk): HasilVariansAtk {
  const kuantitasStandar = b.standarPerPerkara * b.jumlahPerkaraDiputus
  const kuantitasAktual = b.saldoAwal + b.pembelian - b.saldoAkhirOpname
  const variansEfisiensi = (kuantitasAktual - kuantitasStandar) * b.hargaStandar
  const status: StatusVarians = variansEfisiensi > 0
    ? 'Unfavorable (Tidak Efisien)'
    : variansEfisiensi < 0 ? 'Favorable (Efisien)' : 'Sesuai Standar'
  return { ...b, kuantitasStandar, kuantitasAktual, variansEfisiensi, status }
}

export type HasilEfisiensi = { alokasi: HasilAlokasi[]; variansAtk: HasilVariansAtk[] }
