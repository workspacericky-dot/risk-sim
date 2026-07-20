// Control library SPIP 25 Subunsur (5 Unsur SPIP) — sumber: Peraturan BPKP No. 5/2021.
// Dipakai peserta untuk mengaitkan "Pengendalian yang Ada" ke unsur/subunsur resminya.

export type SpipSubunsur = { kode: string; nama: string }
export type SpipUnsur = { kode: string; nama: string; sub: SpipSubunsur[] }

export const SPIP_UNSUR: SpipUnsur[] = [
  { kode: '1', nama: 'Lingkungan Pengendalian', sub: [
    { kode: '1.1', nama: 'Penegakan Integritas dan Nilai Etika' },
    { kode: '1.2', nama: 'Komitmen terhadap Kompetensi' },
    { kode: '1.3', nama: 'Kepemimpinan yang Kondusif' },
    { kode: '1.4', nama: 'Pembentukan Struktur Organisasi yang Sesuai dengan Kebutuhan' },
    { kode: '1.5', nama: 'Pendelegasian Wewenang dan Tanggung Jawab yang Tepat' },
    { kode: '1.6', nama: 'Penyusunan dan Penerapan Kebijakan yang Sehat tentang Pembinaan SDM' },
    { kode: '1.7', nama: 'Perwujudan Peran APIP yang Efektif' },
    { kode: '1.8', nama: 'Hubungan Kerja yang Baik dengan Instansi Pemerintah Terkait' },
  ]},
  { kode: '2', nama: 'Penilaian Risiko', sub: [
    { kode: '2.1', nama: 'Identifikasi Risiko' },
    { kode: '2.2', nama: 'Analisis Risiko' },
  ]},
  { kode: '3', nama: 'Kegiatan Pengendalian', sub: [
    { kode: '3.1', nama: 'Reviu atas Kinerja Instansi Pemerintah' },
    { kode: '3.2', nama: 'Pembinaan Sumber Daya Manusia' },
    { kode: '3.3', nama: 'Pengendalian atas Pengelolaan Sistem Informasi' },
    { kode: '3.4', nama: 'Pengendalian Fisik atas Aset' },
    { kode: '3.5', nama: 'Penetapan dan Reviu atas Indikator dan Ukuran Kinerja' },
    { kode: '3.6', nama: 'Pemisahan Fungsi' },
    { kode: '3.7', nama: 'Otorisasi atas Transaksi dan Kejadian yang Penting' },
    { kode: '3.8', nama: 'Pencatatan yang Akurat dan Tepat Waktu atas Transaksi dan Kejadian' },
    { kode: '3.9', nama: 'Pembatasan Akses atas Sumber Daya dan Pencatatannya' },
    { kode: '3.10', nama: 'Akuntabilitas terhadap Sumber Daya dan Pencatatannya' },
    { kode: '3.11', nama: 'Dokumentasi yang Baik atas SPI serta Transaksi dan Kejadian Penting' },
  ]},
  { kode: '4', nama: 'Informasi dan Komunikasi', sub: [
    { kode: '4.1', nama: 'Informasi yang Relevan' },
    { kode: '4.2', nama: 'Komunikasi yang Efektif' },
  ]},
  { kode: '5', nama: 'Pemantauan', sub: [
    { kode: '5.1', nama: 'Pemantauan Berkelanjutan' },
    { kode: '5.2', nama: 'Evaluasi Terpisah' },
  ]},
]
