// Proses Bisnis Kepaniteraan MA (L1) → Subproses (L2).
// Sumber: ref/Probis_Kepaniteraan_MA.md (konstanta statis).

export type SubProses = { kode: string; nama: string }      // L2
export type ProsesBisnis = { kode: string; nama: string; sub: SubProses[] } // L1

// Pilihan yang tersimpan pada sesi (JSON di kolom rals_session.scenario_id).
export type ProbisSelection = { l1Kode: string; l1Nama: string; l2Kode: string; l2Nama: string }

export const PROSES_BISNIS: ProsesBisnis[] = [
  { kode: '1.00', nama: 'Administrasi Upaya Hukum pada Kepaniteraan Muda Perkara', sub: [
    { kode: '1.10', nama: 'Penerimaan Berkas Perkara' },
    { kode: '1.20', nama: 'Pendaftaran Perkara Langsung' },
    { kode: '1.30', nama: 'Penelaahan Berkas Perkara' },
    { kode: '1.40', nama: 'Pemilahan Berkas Perkara' },
    { kode: '1.50', nama: 'Pengembalian Berkas Tidak Memenuhi Syarat' },
    { kode: '1.60', nama: 'Registrasi Berkas Perkara' },
    { kode: '1.70', nama: 'Distribusi Berkas Perkara' },
    { kode: '1.80', nama: 'Pengiriman Salinan Putusan ke Satker Pengaju' },
    { kode: '1.90', nama: 'Penetapan Pengalihan Tempat Persidangan' },
    { kode: '1.100', nama: 'Pengembalian Biaya Perkara' },
    { kode: '1.110', nama: 'Penetapan Penahanan' },
    { kode: '1.120', nama: 'Pencabutan Upaya Hukum' },
    { kode: '1.130', nama: 'Pengusulan Penetapan Kamar' },
  ]},
  { kode: '2.00', nama: 'Administrasi Persidangan pada Kamar', sub: [
    { kode: '2.10', nama: 'Menyiapkan Permohonan Penetapan Majelis' },
    { kode: '2.20', nama: 'Distribusi Perkara Sesuai Kamar' },
    { kode: '2.30', nama: 'Penunjukkan Panitera Pengganti' },
    { kode: '2.40', nama: 'Menyusun draft Penetapan Hari Musyawarah dan Ucapan' },
    { kode: '2.50', nama: 'Pembacaan Berkas' },
    { kode: '2.60', nama: 'Menyusun Rencana Sidang' },
    { kode: '2.70', nama: 'Menyiapkan Roll Sidang' },
    { kode: '2.80', nama: 'Pelaksanaan Musyawarah dan Ucapan' },
    { kode: '2.90', nama: 'Quality Control Putusan dan Berkas Perkara' },
    { kode: '2.100', nama: 'Minutasi Berkas' },
    { kode: '2.110', nama: 'Pembetulan Kesalahan Redaksional Setelah Minutasi' },
  ]},
  { kode: '3.00', nama: 'Pelayanan Informasi Perkara', sub: [
    { kode: '3.10', nama: 'Layanan Publikasi Putusan' },
    { kode: '3.20', nama: 'Layanan Informasi Penanganan Perkara di Mahkamah Agung' },
  ]},
  { kode: '4.00', nama: 'Penanganan Bantuan Teknis Hukum dalam Perkara Perdata Lintas Negara', sub: [
    { kode: '4.10', nama: 'Bantuan Teknis Hukum dari Indonesia ke Negara Lain' },
    { kode: '4.20', nama: 'Bantuan Teknis Hukum dari Negara Lain ke Indonesia' },
    { kode: '4.30', nama: 'Pemeriksaan Saksi/Ahli di Luar Negeri' },
  ]},
  { kode: '5.00', nama: 'Administrasi Non Judisial', sub: [
    { kode: '5.10', nama: 'Layanan Persuratan Berdasarkan Disposisi Pimpinan' },
    { kode: '5.20', nama: 'Permohonan Fatwa' },
    { kode: '5.30', nama: 'Penanganan Keluhan Layanan' },
    { kode: '5.40', nama: 'Pengelolaan Biaya Proses Di Mahkamah Agung' },
  ]},
  { kode: '6.00', nama: 'Pertanggungjawaban Belanja', sub: [
    { kode: '6.10', nama: 'Pertanggungjawaban belanja gaji pegawai' },
    { kode: '6.20', nama: 'Pertanggungjawaban belanja terhadap pihak ketiga / rekanan' },
    { kode: '6.30', nama: 'Pertanggungjawaban belanja pengadaan peralatan dan mesin' },
    { kode: '6.40', nama: 'Pertanggungjawaban belanja pemeliharaan / perawatan peralatan dan mesin' },
    { kode: '6.50', nama: 'Pertanggungjawaban belanja pengadaan seragam / baju dinas' },
    { kode: '6.60', nama: 'Pertanggungjawaban belanja tunjangan kinerja, uang makan dan transportasi' },
    { kode: '6.70', nama: 'Pertanggungjawaban belanja perjalanan dinas' },
    { kode: '6.80', nama: 'Pelaksanaan pengadaan barang dan jasa' },
  ]},
  { kode: '7.00', nama: 'Penatausahaan BMN', sub: [
    { kode: '7.10', nama: 'Penatausahaan barang persediaan' },
    { kode: '7.20', nama: 'Penatausahaan peralatan dan mesin' },
    { kode: '7.30', nama: 'Penatausahaan Barang Tak Berwujud' },
    { kode: '7.40', nama: 'Penetapan Status Penggunaan' },
    { kode: '7.50', nama: 'Penghapusan BMN' },
  ]},
  { kode: '8.00', nama: 'Perencanaan dan Kepegawaian', sub: [
    { kode: '8.10', nama: 'Penyusunan Anggaran' },
    { kode: '8.20', nama: 'Penyusunan Dokumen Perencanaan Kinerja' },
    { kode: '8.30', nama: 'Tata kelola rekruitment' },
    { kode: '8.40', nama: 'Pembinaan Dan Monev SDM' },
    { kode: '8.50', nama: 'Tata kelola Baperjakat' },
    { kode: '8.60', nama: 'Tata kelola promosi, demosi dan mutasi' },
    { kode: '8.70', nama: 'Tata kelola absensi/disiplin hakim dan aparatur pengadilan' },
    { kode: '8.80', nama: 'Tata Kelola Layanan Penelitian' },
    { kode: '8.90', nama: 'Tata Kelola Layanan Magang' },
  ]},
  { kode: '9.00', nama: 'Keterbukaan Informasi', sub: [
    { kode: '9.10', nama: 'Penyajian informasi dokumen SAKIP' },
    { kode: '9.20', nama: 'Penyajian informasi RKA-KL' },
    { kode: '9.30', nama: 'Layanan Podcast, Garda Peradilan dan Website Kepaniteraan' },
  ]},
]

// Selera risiko default per kategori (ambang besaran 1–25) — dipakai di Evaluasi.
// Proses bisnis tidak mendefinisikan selera, jadi patokan ini berlaku untuk semua sesi.
export const DEFAULT_SELERA: Record<string, number> = {
  strategis: 14, kebijakan: 14, kecurangan: 6, bencana: 17,
  kepatuhan: 10, operasional: 12, kemitraan: 14,
}

export function parseProbis(json: string | null | undefined): ProbisSelection | null {
  if (!json) return null
  try {
    const p = JSON.parse(json)
    if (p && p.l1Nama && p.l2Nama) return p as ProbisSelection
  } catch {}
  return null
}
