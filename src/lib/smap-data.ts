// SMAP reference data — static constants, never changes (regulatory data)

// ── Jenis Pengadilan detection ────────────────────────────────────────────
export type JenisPeradilan = 'umum' | 'agama' | 'militer' | 'tun' | 'semua'

export function detectJenisPeradilan(namaUnit: string): JenisPeradilan {
  const n = namaUnit.toLowerCase()
  if (n.includes('agama')) return 'agama'
  if (n.includes('militer')) return 'militer'
  if (n.includes('tata usaha') || n.includes('tun') || n.includes('ptun')) return 'tun'
  return 'umum' // default: pengadilan negeri / pengadilan tinggi
}

// ── Proses Bisnis L1/L2 ───────────────────────────────────────────────────
export type ProsesBisnisItem = {
  kode: string
  level: 'L1' | 'L2'
  nama: string
  parentKode: string | null
  jenisPeradilan: JenisPeradilan[]
}

export const SMAP_PROSES_BISNIS: ProsesBisnisItem[] = [
  // ── PERADILAN UMUM ─────────────────────────────────────────────────────
  { kode: '1',    level: 'L1', nama: 'Pidana Umum/Khusus',                            parentKode: null,  jenisPeradilan: ['umum'] },
  { kode: '1.1',  level: 'L2', nama: 'Penunjukan Majelis Hakim/hakim',                parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.2',  level: 'L2', nama: 'Penunjukan Panitera Pengganti',                 parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.3',  level: 'L2', nama: 'Penunjukan Jurusita/Jurusita Pengganti',        parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.4',  level: 'L2', nama: 'Proses persidangan dan penjatuhan putusan',     parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.5',  level: 'L2', nama: 'Proses Penyelesaian Perkara Pidana Anak Diversi Berhasil', parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.6',  level: 'L2', nama: 'Proses Penyelesaian Perkara Pidana Anak Diversi Gagal',    parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.7',  level: 'L2', nama: 'Upaya Hukum (Banding, Kasasi, Peninjauan Kembali)',        parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.8',  level: 'L2', nama: 'Proses Pengiriman Putusan atas Upaya Hukum kepada para pihak', parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.9',  level: 'L2', nama: 'Proses Permohonan Grasi',                      parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.10', level: 'L2', nama: 'Permintaan Perpanjangan Penahanan oleh PU (Ps. 25 KUHAP)', parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.11', level: 'L2', nama: 'Penetapan Penahanan oleh Majelis Hakim',       parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.12', level: 'L2', nama: 'Permohonan Izin/Persetujuan Besuk',            parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.14', level: 'L2', nama: 'Permohonan Pengalihan Penahanan',              parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.15', level: 'L2', nama: 'Permohonan Penangguhan Penahanan',             parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.16', level: 'L2', nama: 'Proses permohonan izin/persetujuan penggeledahan & Penyitaan', parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.17', level: 'L2', nama: 'Izin Pembantaran Penahanan',                   parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.18', level: 'L2', nama: 'Pencabutan Permohonan Upaya Hukum',            parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.19', level: 'L2', nama: 'Permohonan Pinjam Pakai Barang Bukti',         parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.20', level: 'L2', nama: 'Permohonan Izin Berobat Tahanan',              parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.21', level: 'L2', nama: 'Penjatuhan Putusan Ekstradisi',                parentKode: '1',   jenisPeradilan: ['umum'] },
  { kode: '1.22', level: 'L2', nama: 'Proses penyelesaian perkara pelanggaran lalu lintas', parentKode: '1', jenisPeradilan: ['umum'] },
  { kode: '1.23', level: 'L2', nama: 'Proses penyerahan salinan putusan',            parentKode: '1',   jenisPeradilan: ['umum'] },

  { kode: '2',    level: 'L1', nama: 'Perdata Umum/Khusus',                          parentKode: null,  jenisPeradilan: ['umum'] },
  { kode: '2.1',  level: 'L2', nama: 'Pendaftaran Gugatan/permohonan/bantahan perdata/gugatan sederhana/e-court', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.2',  level: 'L2', nama: 'Pendaftaran putusan arbitrase nasional/internasional', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.3',  level: 'L2', nama: 'Permohonan konsinyasi/pengadaan tanah untuk kepentingan umum', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.4',  level: 'L2', nama: 'Upaya hukum keberatan terhadap putusan BPSK', parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.5',  level: 'L2', nama: 'Penyelesaian perkara sengketa partai politik', parentKode: '2',  jenisPeradilan: ['umum'] },
  { kode: '2.6',  level: 'L2', nama: 'Penyelesaian perkara sengketa keterbukaan informasi', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.7',  level: 'L2', nama: 'Penunjukan Majelis Hakim/panitera pengganti/jurusita', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.8',  level: 'L2', nama: 'Panggilan/Pemberitahuan',                      parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.9',  level: 'L2', nama: 'Mediasi',                                      parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.10', level: 'L2', nama: 'Persidangan Gugatan/permohonan/bantahan perdata', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.11', level: 'L2', nama: 'Pemeriksaan setempat',                         parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.12', level: 'L2', nama: 'Putusan perkara gugatan/permohonan/bantahan perdata', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.13', level: 'L2', nama: 'Penetapan permohonan konsinyasi/pengadaan tanah', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.14', level: 'L2', nama: 'Sita jaminan/eksekusi/marital',                parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.15', level: 'L2', nama: 'Salinan putusan/penetapan perdata',            parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.16', level: 'L2', nama: 'Putusan terhadap keberatan gugatan sederhana', parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.17', level: 'L2', nama: 'Pemberkasan dan minutasi perkara',             parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.18', level: 'L2', nama: 'Upaya hukum (banding/kasasi/peninjauan kembali)', parentKode: '2', jenisPeradilan: ['umum'] },
  { kode: '2.19', level: 'L2', nama: 'Pengembalian sisa panjar biaya perkara',       parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.20', level: 'L2', nama: 'Eksekusi',                                     parentKode: '2',   jenisPeradilan: ['umum'] },
  { kode: '2.21', level: 'L2', nama: 'Konsinyasi',                                   parentKode: '2',   jenisPeradilan: ['umum'] },

  { kode: '3',    level: 'L1', nama: 'Niaga',                                         parentKode: null,  jenisPeradilan: ['umum'] },
  { kode: '3.1',  level: 'L2', nama: 'Penetapan tindakan sementara (sebelum pembacaan putusan)', parentKode: '3', jenisPeradilan: ['umum'] },
  { kode: '3.2',  level: 'L2', nama: 'Putusan pailit/PKPU',                          parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.3',  level: 'L2', nama: 'Pengangkatan Kurator/Pengurus',                parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.4',  level: 'L2', nama: 'Pengangkatan Hakim Pengawas',                  parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.5',  level: 'L2', nama: 'Penetapan besaran imbalan jasa Kurator',       parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.20', level: 'L2', nama: 'Putusan pembatalan perdamaian',                parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.21', level: 'L2', nama: 'Izin penjualan di bawah tangan',               parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.23', level: 'L2', nama: 'Putusan rehabilitasi',                         parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.30', level: 'L2', nama: 'Putusan pembatalan/penghapusan HKI',           parentKode: '3',   jenisPeradilan: ['umum'] },
  { kode: '3.34', level: 'L2', nama: 'Keberatan Terhadap Putusan KPPU',              parentKode: '3',   jenisPeradilan: ['umum'] },

  { kode: '4',    level: 'L1', nama: 'Perdata PHI',                                   parentKode: null,  jenisPeradilan: ['umum'] },
  { kode: '4.1',  level: 'L2', nama: 'Pendaftaran gugatan PHI',                      parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.2',  level: 'L2', nama: 'Penunjukan Majelis Hakim/panitera pengganti/jurusita PHI', parentKode: '4', jenisPeradilan: ['umum'] },
  { kode: '4.3',  level: 'L2', nama: 'Persidangan gugatan PHI',                      parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.4',  level: 'L2', nama: 'Putusan perkara PHI',                          parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.5',  level: 'L2', nama: 'Pemberkasan dan minutasi perkara PHI',         parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.6',  level: 'L2', nama: 'Salinan putusan PHI',                          parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.7',  level: 'L2', nama: 'Pendaftaran upaya hukum Kasasi terhadap putusan PHI', parentKode: '4', jenisPeradilan: ['umum'] },
  { kode: '4.8',  level: 'L2', nama: 'Eksekusi PHI',                                 parentKode: '4',   jenisPeradilan: ['umum'] },
  { kode: '4.9',  level: 'L2', nama: 'Pendaftaran permohonan sita jaminan/eksekusi PHI', parentKode: '4', jenisPeradilan: ['umum'] },

  { kode: '5',    level: 'L1', nama: 'Kepaniteraan Hukum (Peradilan Umum)',           parentKode: null,  jenisPeradilan: ['umum'] },
  { kode: '5.1',  level: 'L2', nama: 'Penanganan Pengaduan Melalui Meja Pengaduan',  parentKode: '5',   jenisPeradilan: ['umum'] },
  { kode: '5.2',  level: 'L2', nama: 'Pendaftaran Surat Kuasa Khusus',               parentKode: '5',   jenisPeradilan: ['umum'] },
  { kode: '5.3',  level: 'L2', nama: 'Pendaftaran Surat Ijin Kuasa Insidentil',      parentKode: '5',   jenisPeradilan: ['umum'] },
  { kode: '5.4',  level: 'L2', nama: 'Surat Keterangan Tidak Tersangkut Perkara',    parentKode: '5',   jenisPeradilan: ['umum'] },
  { kode: '5.5',  level: 'L2', nama: 'Legalisasi Surat Akta Di Bawah Tangan (Waarmeking)', parentKode: '5', jenisPeradilan: ['umum'] },

  // ── PERADILAN AGAMA ────────────────────────────────────────────────────
  { kode: '6',    level: 'L1', nama: 'Gugatan (Peradilan Agama)',                     parentKode: null,  jenisPeradilan: ['agama'] },
  { kode: '6.1',  level: 'L2', nama: 'Pendaftaran Perkara',                          parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.2',  level: 'L2', nama: 'Penunjukan Majelis Hakim',                     parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.3',  level: 'L2', nama: 'Penunjukan Panitera Pengganti',                parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.4',  level: 'L2', nama: 'Penunjukan Jurusita',                          parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.5',  level: 'L2', nama: 'Penetapan Hari Sidang',                        parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.6',  level: 'L2', nama: 'Panggilan/Relaas',                             parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.7',  level: 'L2', nama: 'Mediasi',                                      parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.8',  level: 'L2', nama: 'Persidangan',                                  parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.9',  level: 'L2', nama: 'Pemeriksaan Setempat',                         parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.10', level: 'L2', nama: 'Putusan',                                      parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.11', level: 'L2', nama: 'Upaya Hukum (Banding, Kasasi, PK)',            parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.12', level: 'L2', nama: 'Sidang Ikrar Talak',                           parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.13', level: 'L2', nama: 'Pemberkasan dan Minutasi',                     parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.14', level: 'L2', nama: 'Panggilan Sidang Ikrar Talak',                 parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.15', level: 'L2', nama: 'Pengembalian Sisa Panjar',                     parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.16', level: 'L2', nama: 'Eksekusi',                                     parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.17', level: 'L2', nama: 'Konsinyasi',                                   parentKode: '6',   jenisPeradilan: ['agama'] },
  { kode: '6.18', level: 'L2', nama: 'Penyerahan salinan putusan/Akta Cerai',        parentKode: '6',   jenisPeradilan: ['agama'] },

  { kode: '7',    level: 'L1', nama: 'Permohonan (Peradilan Agama)',                  parentKode: null,  jenisPeradilan: ['agama'] },
  { kode: '7.1',  level: 'L2', nama: 'Pendaftaran Perkara Permohonan',               parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.2',  level: 'L2', nama: 'Penunjukan Majelis Hakim',                     parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.3',  level: 'L2', nama: 'Penunjukan Panitera Pengganti',                parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.4',  level: 'L2', nama: 'Penunjukan Jurusita',                          parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.5',  level: 'L2', nama: 'Penetapan Hari Sidang',                        parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.6',  level: 'L2', nama: 'Panggilan',                                    parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.7',  level: 'L2', nama: 'Persidangan Permohonan',                       parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.8',  level: 'L2', nama: 'Penetapan',                                    parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.9',  level: 'L2', nama: 'Upaya Hukum (Kasasi, PK)',                     parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.10', level: 'L2', nama: 'Pemberkasan dan Minutasi Permohonan',          parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.11', level: 'L2', nama: 'Pengembalian Sisa Panjar Permohonan',          parentKode: '7',   jenisPeradilan: ['agama'] },
  { kode: '7.12', level: 'L2', nama: 'Penyerahan salinan penetapan pengadilan',      parentKode: '7',   jenisPeradilan: ['agama'] },

  { kode: '8',    level: 'L1', nama: 'Kepaniteraan Hukum (Peradilan Agama)',          parentKode: null,  jenisPeradilan: ['agama'] },
  { kode: '8.1',  level: 'L2', nama: 'Pendaftaran Surat Kuasa',                      parentKode: '8',   jenisPeradilan: ['agama'] },
  { kode: '8.2',  level: 'L2', nama: 'Penanganan Pengaduan Melalui Meja Pengaduan',  parentKode: '8',   jenisPeradilan: ['agama'] },

  // ── PERADILAN MILITER ─────────────────────────────────────────────────
  { kode: '9',    level: 'L1', nama: 'Pidana Militer',                                parentKode: null,  jenisPeradilan: ['militer'] },
  { kode: '9.1',  level: 'L2', nama: 'Tapkim (Penetapan Majelis Hakim)',              parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.2',  level: 'L2', nama: 'Tapsid (Penetapan Sidang)',                    parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.3',  level: 'L2', nama: 'Juktera Pengganti (Penunjukan Panitera Pengganti)', parentKode: '9', jenisPeradilan: ['militer'] },
  { kode: '9.4',  level: 'L2', nama: 'Proses penyelesaian perkara pidana',           parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.5',  level: 'L2', nama: 'Penetapan penahanan oleh Hakim Ketua',         parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.6',  level: 'L2', nama: 'Penetapan perpanjangan penahanan oleh Kepala Pengadilan Militer', parentKode: '9', jenisPeradilan: ['militer'] },
  { kode: '9.7',  level: 'L2', nama: 'Proses persidangan dan penjatuhan putusan militer', parentKode: '9', jenisPeradilan: ['militer'] },
  { kode: '9.8',  level: 'L2', nama: 'Permohonan upaya hukum (Banding, Kasasi, PK)', parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.9',  level: 'L2', nama: 'Pencabutan permohonan upaya hukum militer',    parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.10', level: 'L2', nama: 'Proses pengiriman putusan atas upaya hukum kepada para pihak', parentKode: '9', jenisPeradilan: ['militer'] },
  { kode: '9.11', level: 'L2', nama: 'Proses permohonan grasi militer',              parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.12', level: 'L2', nama: 'Permohonan pinjam pakai barang bukti militer', parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.13', level: 'L2', nama: 'Proses penyelesaian perkara pelanggaran lalu lintas militer', parentKode: '9', jenisPeradilan: ['militer'] },
  { kode: '9.14', level: 'L2', nama: 'Proses penyerahan salinan putusan militer',    parentKode: '9',   jenisPeradilan: ['militer'] },
  { kode: '9.15', level: 'L2', nama: 'Pelaksanaan tugas Hakim pengawas ke Lemasmil', parentKode: '9',   jenisPeradilan: ['militer'] },

  // ── PERADILAN TUN ─────────────────────────────────────────────────────
  { kode: '10',   level: 'L1', nama: 'Gugatan (Peradilan TUN)',                       parentKode: null,  jenisPeradilan: ['tun'] },
  { kode: '10.1', level: 'L2', nama: 'Pendaftaran Gugatan TUN',                      parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.2', level: 'L2', nama: 'Kelengkapan berkas',                           parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.3', level: 'L2', nama: 'Permohonan masuknya pihak ketiga (intervensi)', parentKode: '10', jenisPeradilan: ['tun'] },
  { kode: '10.4', level: 'L2', nama: 'Penetapan Dismissal Proses',                   parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.5', level: 'L2', nama: 'Penetapan penundaan oleh Ketua PTUN',          parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.6', level: 'L2', nama: 'Penetapan majelis hakim/panitera pengganti/jurusita TUN', parentKode: '10', jenisPeradilan: ['tun'] },
  { kode: '10.7', level: 'L2', nama: 'Pemeriksaan persiapan',                        parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.8', level: 'L2', nama: 'Penetapan masuknya pihak ketiga (putusan sela)', parentKode: '10', jenisPeradilan: ['tun'] },
  { kode: '10.9', level: 'L2', nama: 'Penetapan penundaan',                          parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.10',level: 'L2', nama: 'Penetapan pencabutan',                         parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.11',level: 'L2', nama: 'Persidangan Gugatan TUN',                      parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.12',level: 'L2', nama: 'Pemeriksaan Setempat TUN',                     parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.13',level: 'L2', nama: 'Putusan TUN',                                  parentKode: '10',  jenisPeradilan: ['tun'] },
  { kode: '10.14',level: 'L2', nama: 'Salinan putusan TUN',                          parentKode: '10',  jenisPeradilan: ['tun'] },

  { kode: '11',   level: 'L1', nama: 'Perlawanan (Peradilan TUN)',                    parentKode: null,  jenisPeradilan: ['tun'] },
  { kode: '11.1', level: 'L2', nama: 'Pendaftaran Perlawanan',                       parentKode: '11',  jenisPeradilan: ['tun'] },
  { kode: '11.2', level: 'L2', nama: 'Kelengkapan berkas Perlawanan',                parentKode: '11',  jenisPeradilan: ['tun'] },
  { kode: '11.3', level: 'L2', nama: 'Penetapan majelis hakim/panitera/jurusita Perlawanan', parentKode: '11', jenisPeradilan: ['tun'] },
  { kode: '11.4', level: 'L2', nama: 'Persidangan Perlawanan',                       parentKode: '11',  jenisPeradilan: ['tun'] },
  { kode: '11.5', level: 'L2', nama: 'Penetapan Pencabutan Perlawanan',              parentKode: '11',  jenisPeradilan: ['tun'] },
  { kode: '11.6', level: 'L2', nama: 'Putusan Perlawanan',                           parentKode: '11',  jenisPeradilan: ['tun'] },
  { kode: '11.7', level: 'L2', nama: 'Salinan putusan Perlawanan',                   parentKode: '11',  jenisPeradilan: ['tun'] },

  { kode: '12',   level: 'L1', nama: 'Permohonan (Peradilan TUN)',                    parentKode: null,  jenisPeradilan: ['tun'] },
  { kode: '12.1', level: 'L2', nama: 'Pendaftaran Permohonan TUN',                   parentKode: '12',  jenisPeradilan: ['tun'] },
  { kode: '12.2', level: 'L2', nama: 'Kelengkapan berkas Permohonan TUN',            parentKode: '12',  jenisPeradilan: ['tun'] },
  { kode: '12.3', level: 'L2', nama: 'Penetapan majelis hakim/panitera/jurusita Permohonan TUN', parentKode: '12', jenisPeradilan: ['tun'] },
  { kode: '12.4', level: 'L2', nama: 'Penetapan pencabutan Permohonan TUN',          parentKode: '12',  jenisPeradilan: ['tun'] },
  { kode: '12.5', level: 'L2', nama: 'Persidangan Permohonan TUN',                   parentKode: '12',  jenisPeradilan: ['tun'] },
  { kode: '12.6', level: 'L2', nama: 'Putusan Permohonan TUN',                       parentKode: '12',  jenisPeradilan: ['tun'] },
  { kode: '12.7', level: 'L2', nama: 'Salinan putusan Permohonan TUN',               parentKode: '12',  jenisPeradilan: ['tun'] },

  { kode: '13',   level: 'L1', nama: 'Pasca Putusan (Banding, Kasasi, PK) dan Eksekusi TUN', parentKode: null, jenisPeradilan: ['tun'] },
  { kode: '13.1', level: 'L2', nama: 'Banding TUN',                                  parentKode: '13',  jenisPeradilan: ['tun'] },
  { kode: '13.2', level: 'L2', nama: 'Kasasi TUN',                                   parentKode: '13',  jenisPeradilan: ['tun'] },
  { kode: '13.3', level: 'L2', nama: 'Peninjauan Kembali TUN',                       parentKode: '13',  jenisPeradilan: ['tun'] },
  { kode: '13.4', level: 'L2', nama: 'Eksekusi TUN',                                 parentKode: '13',  jenisPeradilan: ['tun'] },

  { kode: '14',   level: 'L1', nama: 'Kepaniteraan Hukum (Peradilan TUN)',            parentKode: null,  jenisPeradilan: ['tun'] },
  { kode: '14.1', level: 'L2', nama: 'Penanganan Pengaduan Melalui Meja Pengaduan TUN', parentKode: '14', jenisPeradilan: ['tun'] },
  { kode: '14.2', level: 'L2', nama: 'Pendaftaran Surat Kuasa Khusus TUN',           parentKode: '14',  jenisPeradilan: ['tun'] },
  { kode: '14.3', level: 'L2', nama: 'Pendaftaran Surat Ijin Kuasa Insidentil TUN',  parentKode: '14',  jenisPeradilan: ['tun'] },
  { kode: '14.4', level: 'L2', nama: 'Surat Keterangan Tidak Tersangkut Perkara TUN', parentKode: '14', jenisPeradilan: ['tun'] },
  { kode: '14.5', level: 'L2', nama: 'Legalisasi Surat Akta Di Bawah Tangan TUN',    parentKode: '14',  jenisPeradilan: ['tun'] },

  // ── LAYANAN LAINNYA (semua jenis pengadilan) ──────────────────────────
  { kode: '15',   level: 'L1', nama: 'Pertanggungjawaban Belanja',                    parentKode: null,  jenisPeradilan: ['semua'] },
  { kode: '15.1', level: 'L2', nama: 'Pertanggungjawaban belanja gaji pegawai',       parentKode: '15',  jenisPeradilan: ['semua'] },
  { kode: '15.2', level: 'L2', nama: 'Pertanggungjawaban belanja terhadap pihak ketiga/rekanan', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.3', level: 'L2', nama: 'Pertanggungjawaban belanja pembangunan/renovasi gedung', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.4', level: 'L2', nama: 'Pertanggungjawaban belanja pemeliharaan gedung', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.5', level: 'L2', nama: 'Pertanggungjawaban belanja penggantian biaya sewa rumah Hakim', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.6', level: 'L2', nama: 'Pertanggungjawaban belanja pembangunan/renovasi rumah dinas', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.7', level: 'L2', nama: 'Pertanggungjawaban belanja pemeliharaan rumah dinas', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.8', level: 'L2', nama: 'Pertanggungjawaban belanja pengadaan peralatan dan mesin', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.9', level: 'L2', nama: 'Pertanggungjawaban belanja pemeliharaan peralatan dan mesin', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.10',level: 'L2', nama: 'Pertanggungjawaban belanja listrik dan air rumah dinas', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.11',level: 'L2', nama: 'Pertanggungjawaban belanja pengadaan seragam/baju dinas', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.12',level: 'L2', nama: 'Pertanggungjawaban belanja tunjangan kinerja, uang makan dan transportasi', parentKode: '15', jenisPeradilan: ['semua'] },
  { kode: '15.13',level: 'L2', nama: 'Pertanggungjawaban belanja perjalanan dinas',  parentKode: '15',  jenisPeradilan: ['semua'] },
  { kode: '15.14',level: 'L2', nama: 'Pelaksanaan pengadaan barang dan jasa',         parentKode: '15',  jenisPeradilan: ['semua'] },

  { kode: '16',   level: 'L1', nama: 'Penatausahaan BMN',                             parentKode: null,  jenisPeradilan: ['semua'] },
  { kode: '16.1', level: 'L2', nama: 'Penatausahaan barang persediaan',               parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.2', level: 'L2', nama: 'Penatausahaan peralatan dan mesin',             parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.3', level: 'L2', nama: 'Penatausahaan Gedung dan Bangunan',             parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.4', level: 'L2', nama: 'Penatausahaan Barang Tak Berwujud',             parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.5', level: 'L2', nama: 'Penatausahaan Barang Lainnya',                  parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.6', level: 'L2', nama: 'Penghapusan BMN',                               parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.7', level: 'L2', nama: 'Penetapan Status Penggunaan',                   parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.8', level: 'L2', nama: 'Penatausahaan Sewa BMN',                        parentKode: '16',  jenisPeradilan: ['semua'] },
  { kode: '16.9', level: 'L2', nama: 'Penatausahaan Barang Pihak Ketiga lainnya',     parentKode: '16',  jenisPeradilan: ['semua'] },

  { kode: '17',   level: 'L1', nama: 'Kepegawaian dan Ortala',                        parentKode: null,  jenisPeradilan: ['semua'] },
  { kode: '17.1', level: 'L2', nama: 'Tata kelola Baperjakat',                        parentKode: '17',  jenisPeradilan: ['semua'] },
  { kode: '17.2', level: 'L2', nama: 'Tata kelola promosi, demosi dan mutasi',        parentKode: '17',  jenisPeradilan: ['semua'] },
  { kode: '17.3', level: 'L2', nama: 'Tata kelola absensi/disiplin hakim dan aparatur', parentKode: '17', jenisPeradilan: ['semua'] },
  { kode: '17.4', level: 'L2', nama: 'Tata kelola rekruitment dan evaluasi tenaga PPnPN', parentKode: '17', jenisPeradilan: ['semua'] },
  { kode: '17.5', level: 'L2', nama: 'Tata kelola Pelantikan dan alih tugas pejabat', parentKode: '17',  jenisPeradilan: ['semua'] },

  { kode: '18',   level: 'L1', nama: 'Penerimaan Tamu',                               parentKode: null,  jenisPeradilan: ['semua'] },
  { kode: '18.1', level: 'L2', nama: 'Pengisian Buku Tamu',                           parentKode: '18',  jenisPeradilan: ['semua'] },
  { kode: '18.2', level: 'L2', nama: 'Penggunaan Ruang Tamu Terbuka',                 parentKode: '18',  jenisPeradilan: ['semua'] },
  { kode: '18.3', level: 'L2', nama: 'Penggunaan tanda pengenal tamu',                parentKode: '18',  jenisPeradilan: ['semua'] },

  { kode: '19',   level: 'L1', nama: 'Keterbukaan Informasi',                         parentKode: null,  jenisPeradilan: ['semua'] },
  { kode: '19.1', level: 'L2', nama: 'Penyajian informasi dokumen SAKIP',             parentKode: '19',  jenisPeradilan: ['semua'] },
  { kode: '19.2', level: 'L2', nama: 'Penyajian informasi RKA-KL',                    parentKode: '19',  jenisPeradilan: ['semua'] },
  { kode: '19.3', level: 'L2', nama: 'Penyajian Informasi SIPP',                      parentKode: '19',  jenisPeradilan: ['semua'] },
  { kode: '19.4', level: 'L2', nama: 'Tugas Kehumasan',                               parentKode: '19',  jenisPeradilan: ['semua'] },
]

export function getL1ForUnit(namaUnit: string): ProsesBisnisItem[] {
  const jenis = detectJenisPeradilan(namaUnit)
  return SMAP_PROSES_BISNIS.filter(
    p => p.level === 'L1' && (p.jenisPeradilan.includes(jenis) || p.jenisPeradilan.includes('semua'))
  )
}

export function getL2ForL1(l1Kode: string): ProsesBisnisItem[] {
  return SMAP_PROSES_BISNIS.filter(p => p.level === 'L2' && p.parentKode === l1Kode)
}

// ── Uraian Risiko Penyuapan ───────────────────────────────────────────────
export type UraianRisikoItem = {
  id: string
  jenisKorupsi: string
  pasal: string
  uraian: string
}

export const SMAP_URAIAN_RISIKO: UraianRisikoItem[] = [
  // Kerugian Keuangan Negara
  { id: 'kkn-1', jenisKorupsi: 'Kerugian Keuangan Negara', pasal: 'Pasal 2', uraian: 'memperkaya diri sendiri/orang lain/korporasi dengan cara melawan hukum sehingga merugikan keuangan negara' },
  { id: 'kkn-2', jenisKorupsi: 'Kerugian Keuangan Negara', pasal: 'Pasal 3', uraian: 'menguntungkan diri sendiri/orang lain dengan menyalahgunakan kewenangan/kesempatan/sarana yang ada karena jabatan sehingga merugikan keuangan negara' },
  // Suap Menyuap
  { id: 'sm-1', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 5 ayat (1) huruf a', uraian: 'memberi/menjanjikan sesuatu kepada pegawai negeri/penyelenggara negara agar berbuat/tidak berbuat sesuatu yang bertentangan dengan kewajibannya' },
  { id: 'sm-2', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 5 ayat (1) huruf b', uraian: 'memberi sesuatu kepada pegawai negeri/penyelenggara negara karena/berhubungan dengan sesuatu yang bertentangan dengan kewajiban dalam jabatannya' },
  { id: 'sm-3', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 13', uraian: 'memberi hadiah/janji kepada pegawai negeri dengan mengingat kekuasaan/wewenang yang melekat pada jabatan/kedudukannya' },
  { id: 'sm-4', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 5 ayat (2)', uraian: 'menerima pemberian/janji sebagai pegawai negeri/penyelenggara negara dalam konteks suap' },
  { id: 'sm-5', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 12 huruf a', uraian: 'menerima hadiah/janji yang diketahui/patut diduga diberikan untuk menggerakkan agar melakukan/tidak melakukan sesuatu yang bertentangan dengan kewajiban jabatan' },
  { id: 'sm-6', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 12 huruf b', uraian: 'menerima hadiah yang diketahui/patut diduga diberikan sebagai akibat telah melakukan/tidak melakukan sesuatu yang bertentangan dengan kewajiban jabatan' },
  { id: 'sm-7', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 11', uraian: 'menerima hadiah/janji yang diketahui/patut diduga diberikan karena kekuasaan/kewenangan yang berhubungan dengan jabatan' },
  { id: 'sm-8', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 6 ayat (1) huruf a', uraian: 'memberi/menjanjikan sesuatu kepada hakim dengan maksud mempengaruhi putusan perkara' },
  { id: 'sm-9', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 6 ayat (1) huruf b', uraian: 'memberi/menjanjikan sesuatu kepada advokat yang menghadiri sidang dengan maksud mempengaruhi nasihat/pendapat dalam perkara' },
  { id: 'sm-10', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 12 huruf c', uraian: 'sebagai hakim menerima hadiah/janji yang diketahui/patut diduga untuk mempengaruhi putusan perkara' },
  { id: 'sm-11', jenisKorupsi: 'Suap Menyuap', pasal: 'Pasal 12 huruf d', uraian: 'sebagai advokat menerima hadiah/janji yang diketahui/patut diduga untuk mempengaruhi nasihat dalam perkara' },
  // Penggelapan dalam Jabatan
  { id: 'pdj-1', jenisKorupsi: 'Penggelapan dalam Jabatan', pasal: 'Pasal 8', uraian: 'dengan sengaja menggelapkan/membiarkan orang lain mengambil uang/surat berharga yang disimpan karena jabatan' },
  { id: 'pdj-2', jenisKorupsi: 'Penggelapan dalam Jabatan', pasal: 'Pasal 9', uraian: 'dengan sengaja memalsu buku-buku/daftar-daftar yang digunakan untuk pemeriksaan administrasi' },
  { id: 'pdj-3', jenisKorupsi: 'Penggelapan dalam Jabatan', pasal: 'Pasal 10 huruf a', uraian: 'dengan sengaja menggelapkan/menghancurkan/merusakkan barang/akta/surat/daftar yang dikuasainya karena jabatan' },
  { id: 'pdj-4', jenisKorupsi: 'Penggelapan dalam Jabatan', pasal: 'Pasal 10 huruf b', uraian: 'membiarkan orang lain menghilangkan/menghancurkan/merusakkan barang/akta/surat/daftar yang dikuasai karena jabatan' },
  { id: 'pdj-5', jenisKorupsi: 'Penggelapan dalam Jabatan', pasal: 'Pasal 10 huruf c', uraian: 'membantu orang lain menghilangkan/menghancurkan/merusakkan barang/akta/surat/daftar yang dikuasai karena jabatan' },
  // Pemerasan
  { id: 'pm-1', jenisKorupsi: 'Pemerasan', pasal: 'Pasal 12 huruf e', uraian: 'dengan maksud menguntungkan diri sendiri/orang lain secara melawan hukum memaksa seseorang memberikan sesuatu dengan menyalahgunakan kekuasaan' },
  { id: 'pm-2', jenisKorupsi: 'Pemerasan', pasal: 'Pasal 12 huruf g', uraian: 'pada waktu menjalankan tugas meminta/menerima pekerjaan/penyerahan barang seolah-olah merupakan utang kepada dirinya' },
  { id: 'pm-3', jenisKorupsi: 'Pemerasan', pasal: 'Pasal 12 huruf f', uraian: 'pada waktu menjalankan tugas meminta/menerima/memotong pembayaran kepada pegawai negeri/penyelenggara lain seolah-olah mempunyai utang kepada dirinya' },
  // Perbuatan Curang
  { id: 'pc-1', jenisKorupsi: 'Perbuatan Curang', pasal: 'Pasal 7 ayat (1) huruf a', uraian: 'melakukan perbuatan curang pada waktu membuat/menyerahkan bahan bangunan yang dapat membahayakan keamanan' },
  { id: 'pc-2', jenisKorupsi: 'Perbuatan Curang', pasal: 'Pasal 7 ayat (1) huruf b', uraian: 'sebagai pengawas membiarkan dilakukannya perbuatan curang pada waktu membuat/menyerahkan bahan bangunan' },
  { id: 'pc-3', jenisKorupsi: 'Perbuatan Curang', pasal: 'Pasal 12 huruf h', uraian: 'pada waktu menjalankan tugas menggunakan tanah negara yang di atasnya ada hak pakai seolah-olah sesuai peraturan namun telah merugikan yang berhak' },
  // Benturan Kepentingan dalam Pengadaan
  { id: 'bkp-1', jenisKorupsi: 'Benturan Kepentingan dalam Pengadaan', pasal: 'Pasal 12 huruf i', uraian: 'dengan sengaja langsung/tidak langsung turut serta dalam pemborongan/pengadaan/persewaan pada saat dilakukan perbuatan yang ditugaskan untuk diurus/diawasi' },
  // Gratifikasi
  { id: 'gr-1', jenisKorupsi: 'Gratifikasi', pasal: 'Pasal 12B jo. Pasal 12C', uraian: 'menerima gratifikasi yang berhubungan dengan jabatan dan berlawanan dengan kewajiban/tugasnya yang tidak dilaporkan ke KPK dalam 30 hari' },
  // Pelanggaran Lainnya
  { id: 'pl-1', jenisKorupsi: 'Pelanggaran Lainnya', pasal: 'Pasal 21', uraian: 'dengan sengaja mencegah/merintangi/menggagalkan penyidikan/penuntutan/pemeriksaan perkara korupsi' },
  { id: 'pl-2', jenisKorupsi: 'Pelanggaran Lainnya', pasal: 'Pasal 22 jo. Pasal 28', uraian: 'dengan sengaja tidak memberikan keterangan atau memberikan keterangan palsu tentang harta benda tersangka/terdakwa perkara korupsi' },
  { id: 'pl-3', jenisKorupsi: 'Pelanggaran Lainnya', pasal: 'Aturan Kode Etik', uraian: 'melakukan benturan kepentingan dan pelanggaran kode etik terkait dengan korupsi (KMA 122/2013, PERMA 4/2018, Peraturan Bersama KY)' },
]

export const JENIS_KORUPSI_LIST = [...new Set(SMAP_URAIAN_RISIKO.map(u => u.jenisKorupsi))]

// ── Risk scoring helpers (simple K×D for SMAP) ───────────────────────────
export function smapScore(k: number, d: number): number {
  return k * d
}

export type SmapRiskLevel = {
  label: string
  color: string       // tailwind bg class
  textColor: string   // tailwind text class
  borderColor: string
}

export function smapRiskLevel(score: number): SmapRiskLevel {
  if (score >= 15) return { label: 'Ekstrim',        color: 'bg-red-600',    textColor: 'text-white',       borderColor: 'border-red-600' }
  if (score >= 10) return { label: 'Tinggi',          color: 'bg-orange-500', textColor: 'text-white',       borderColor: 'border-orange-500' }
  if (score >= 5)  return { label: 'Moderat',         color: 'bg-yellow-400', textColor: 'text-slate-900',   borderColor: 'border-yellow-400' }
  if (score >= 3)  return { label: 'Rendah',           color: 'bg-green-500',  textColor: 'text-white',       borderColor: 'border-green-500' }
  return               { label: 'Sangat Rendah',   color: 'bg-blue-400',   textColor: 'text-white',       borderColor: 'border-blue-400' }
}

export const SMAP_K_OPTIONS = [
  { v: 1, label: '1 – Kemungkinan Tidak Terjadi (1–10%)' },
  { v: 2, label: '2 – Kemungkinan Kecil (11–30%)' },
  { v: 3, label: '3 – Mungkin (31–50%)' },
  { v: 4, label: '4 – Kemungkinan Besar (51–90%)' },
  { v: 5, label: '5 – Hampir Pasti (91–99%)' },
]

export const SMAP_D_OPTIONS = [
  { v: 1, label: '1 – Sangat Rendah (immaterial)' },
  { v: 2, label: '2 – Rendah (Minor)' },
  { v: 3, label: '3 – Sedang (Moderat)' },
  { v: 4, label: '4 – Tinggi (Major)' },
  { v: 5, label: '5 – Sangat Tinggi (Kritikal)' },
]

export const SMAP_TARGET_LEVEL_OPTIONS = [
  'Sangat Rendah',
  'Rendah',
  'Moderat',
  'Tinggi',
  'Ekstrim',
]
