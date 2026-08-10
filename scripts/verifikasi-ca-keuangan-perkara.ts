/**
 * Uji sintetis modul CA Audit Keuangan Perkara terhadap contoh angka di
 * script-saldo-sisapanjar.pdf (MS Banda Aceh) — tidak ada data satker riil
 * yang tersedia di repo, karena itu memakai data buatan yang meniru pola PDF.
 *
 * Jalankan:  npx tsx scripts/verifikasi-ca-keuangan-perkara.ts
 * Keluar dengan kode 1 bila ada satu saja pemeriksaan yang gagal.
 */
import * as XLSX from 'xlsx'
import { parseBerkasJur } from '../src/lib/ca-keuangan-perkara/parse-jur'
import { jalankanAnalisisSaldo } from '../src/lib/ca-keuangan-perkara/analisis-saldo'
import { klasifikasiBerkas } from '../src/lib/ca-keuangan-perkara/klasifikasi-file'
import {
  hitungHariKerjaBerlalu, hitungStatus, parseFileKepatuhan, type InputKepatuhan,
} from '../src/lib/ca-keuangan-perkara/kepatuhan'
import { keKunciTanggal } from '../src/lib/ca-kepeg/kalender'
import type { PetaKalender } from '../src/lib/ca-kepeg/konstanta'

let gagal = 0

function cek(nama: string, aktual: unknown, harapan: unknown) {
  const a = JSON.stringify(aktual)
  const h = JSON.stringify(harapan)
  if (a === h) {
    console.log(`  OK  ${nama}`)
  } else {
    gagal++
    console.log(`GAGAL ${nama}\n      aktual : ${a}\n      harapan: ${h}`)
  }
}

function buatWorkbookBuffer(sheets: Record<string, unknown[][]>): ArrayBuffer {
  const wb = XLSX.utils.book_new()
  for (const [nama, aoa] of Object.entries(sheets)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nama)
  }
  const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
}

// ── Bagian A — reproduksi contoh PDF ────────────────────────────────────
// "Hasil Gugatan +Rp10.118.900; Permohonan +Rp960.000 (saldo positif hanya
// di 2025 & 2026); anomali negatif 1 perkara: 91/Pdt.P/2023/MS.Bna (−Rp10.000)."
console.log('Bagian A — Reanalisis saldo sisa panjar')

const HEADER_JUR = [
  'No', 'Nomor Perkara', 'Klasifikasi Perkara', 'Penggugat', 'Tergugat',
  'Proses Terakhir', 'Penerimaan', 'Pengeluaran', 'Sisa', 'Link',
]

// Deteksi jenis berkas dari nama, mengikuti model input beberapa berkas
// terpisah (satu berkas per jenis perkara — sama seperti CA Bid. Kepegawaian).
cek('klasifikasi "jur_gugatan.xls" → Gugatan', klasifikasiBerkas('jur_gugatan.xls').jenis, 'Gugatan')
cek('klasifikasi "jur_gugatan_sederhana.xlsx" → GS', klasifikasiBerkas('jur_gugatan_sederhana.xlsx').jenis, 'GS')
cek('klasifikasi "jur_HT.xls" → tidak-dipakai', klasifikasiBerkas('jur_HT.xls').jenis, 'tidak-dipakai')
cek('klasifikasi "berkas_acak.xlsx" → tidak-dikenali', klasifikasiBerkas('berkas_acak.xlsx').jenis, 'tidak-dikenali')

const bufGugatan = buatWorkbookBuffer({
  jur_gugatan: [
    HEADER_JUR,
    [1, '1/Pdt.G/2025/MS.Bna', 'Cerai Gugat', 'A', 'B', 'Minutasi', 6000000, 881100, 5118900, ''],
    [2, '2/Pdt.G/2026/MS.Bna', 'Cerai Gugat', 'C', 'D', 'Penetapan Ikrar Talak', 5000000, 0, 5000000, ''],
    [3, '3/Pdt.G/2024/MS.Bna', 'Cerai Gugat', 'E', 'F', 'Sidang', 500000, 0, 500000, ''],
  ],
})
const bufPermohonan = buatWorkbookBuffer({
  jur_permohonan: [
    HEADER_JUR,
    [1, '4/Pdt.P/2025/MS.Bna', 'Itsbat Nikah', 'G', '', 'Minutasi', 960000, 0, 960000, ''],
    [2, '91/Pdt.P/2023/MS.Bna', 'Wali Adhol', 'H', '', 'Tidak Memenuhi Syarat Formil', 0, 10000, -10000, ''],
  ],
})

// Dua berkas terpisah, masing-masing dibaca dari sheet pertamanya sendiri.
const parsedGugatan = parseBerkasJur(bufGugatan, 'Gugatan', 'jur_gugatan.xls')
const parsedPermohonan = parseBerkasJur(bufPermohonan, 'Permohonan', 'jur_permohonan.xls')
cek('kedua berkas terbaca tanpa kolom hilang', [...parsedGugatan.kolomHilang, ...parsedPermohonan.kolomHilang], [])
cek('baris 3/Pdt.G (Sidang) tidak masuk pivot — di luar filter', parsedGugatan.pivot.some((p) => p.nomorPerkara === '3/Pdt.G/2024/MS.Bna'), false)

const analisisA = jalankanAnalisisSaldo([...parsedGugatan.pivot, ...parsedPermohonan.pivot])
cek('total positif Gugatan = Rp10.118.900', analisisA.ringkasanPositif.totalPerJenis.Gugatan, 10_118_900)
cek('total positif Permohonan = Rp960.000', analisisA.ringkasanPositif.totalPerJenis.Permohonan, 960_000)
cek('saldo positif hanya di tahun 2025 & 2026', analisisA.ringkasanPositif.tahunList, [2025, 2026])
cek('anomali negatif 1 perkara', analisisA.daftarAnomali.length, 1)
cek('anomali = 91/Pdt.P/2023/MS.Bna senilai -Rp10.000', {
  nomorPerkara: analisisA.daftarAnomali[0]?.nomorPerkara,
  sisa: analisisA.daftarAnomali[0]?.sisa,
}, { nomorPerkara: '91/Pdt.P/2023/MS.Bna', sisa: -10_000 })

// ── Bagian B — uji kepatuhan ─────────────────────────────────────────────
console.log('\nBagian B — Uji kepatuhan pemberitahuan sisa panjar')

const petaKosong: PetaKalender = {}
cek('hari kerja berlalu: mulai = sampai (Senin) → 0', hitungHariKerjaBerlalu('2025-01-06', '2025-01-06', petaKosong), 0)
cek('hari kerja berlalu: Senin → Senin depan (lewati Sab/Min) → 5', hitungHariKerjaBerlalu('2025-01-06', '2025-01-13', petaKosong), 5)

const petaDenganLibur: PetaKalender = { [keKunciTanggal('2025-01-10')]: 'Libur Nasional' }
cek('hari kerja berlalu: dengan 1 hari libur di tengah rentang → 4', hitungHariKerjaBerlalu('2025-01-06', '2025-01-13', petaDenganLibur), 4)

const kasusSesuai: InputKepatuhan = {
  nomorPerkara: 'A', media: 'Manual', tglPutusan: '2025-01-06', tglUnggahECourt: null, tglDiberitahukan: '2025-01-08',
}
cek('status Manual, 2 hari kerja → Sesuai', hitungStatus(kasusSesuai, petaKosong).status, 'Sesuai (≤3 hari kerja)')

const kasusTerlambat: InputKepatuhan = {
  nomorPerkara: 'B', media: 'Manual', tglPutusan: '2025-01-06', tglUnggahECourt: null, tglDiberitahukan: '2025-01-13',
}
cek('status Manual, 5 hari kerja → PERLU KONFIRMASI MANUAL', hitungStatus(kasusTerlambat, petaKosong).status, 'PERLU KONFIRMASI MANUAL')

const kasusElektronikTanpaUnggah: InputKepatuhan = {
  nomorPerkara: 'C', media: 'Elektronik', tglPutusan: '2025-01-06', tglUnggahECourt: null, tglDiberitahukan: '2025-01-08',
}
cek('status Elektronik tanpa Tgl Unggah e-Court → Data belum lengkap', hitungStatus(kasusElektronikTanpaUnggah, petaKosong).status, 'Data tanggal belum lengkap')

const kasusElektronik: InputKepatuhan = {
  nomorPerkara: 'D', media: 'Elektronik', tglPutusan: null, tglUnggahECourt: '2025-01-06', tglDiberitahukan: '2025-01-08',
}
cek('status Elektronik pakai Tgl Unggah e-Court sebagai acuan', hitungStatus(kasusElektronik, petaKosong).tanggalMulaiAcuan, '2025-01-06')

// ── File kedua opsional (B.2) ─────────────────────────────────────────────
const bufB = buatWorkbookBuffer({
  Sheet1: [
    ['Nomor Perkara', 'Media', 'Tgl Putusan', 'Tgl Unggah e-Court', 'Tgl Diberitahukan'],
    ['4/Pdt.P/2025/MS.Bna', 'Manual', '2025-01-06', '', '2025-01-08'],
    ['1/Pdt.G/2025/MS.Bna', 'elektronik', 44927, '', ''],
  ],
})
const hasilB = parseFileKepatuhan(bufB)
cek('kolom wajib lengkap (tidak ada kolom hilang)', hasilB.kolomHilang, [])
cek('baris 1 tercocokkan by Nomor Perkara', hasilB.data['4/Pdt.P/2025/MS.Bna']?.tglDiberitahukan, '2025-01-08')
cek('media "elektronik" (huruf kecil) dinormalkan', hasilB.data['1/Pdt.G/2025/MS.Bna']?.media, 'Elektronik')
cek('tanggal serial Excel 44927 → 2023-01-01', hasilB.data['1/Pdt.G/2025/MS.Bna']?.tglPutusan, '2023-01-01')

console.log(gagal === 0 ? '\nSemua pemeriksaan lolos.' : `\n${gagal} pemeriksaan gagal.`)
process.exit(gagal === 0 ? 0 : 1)
