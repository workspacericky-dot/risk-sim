# Panduan Simulasi End-to-End Modul Khusus PPG

**Versi:** 1.0  
**Tanggal:** 9 September 2026  
**Satker contoh:** Pengadilan Negeri Wates  
**Tujuan:** menghasilkan satu Program PPG berbasis Risk Library, selera risiko, penilaian satker, Loss Event Database, Insight A, dan Insight B.

## 1. Persiapan aman

1. Pastikan migrasi terbaru `supabase/migration_ppg.sql` telah dijalankan.
2. Masuk sebagai **Admin Sistem** agar seluruh tahap simulasi dapat dikerjakan dengan satu akun. Dalam operasi riil, pekerjaan dibagi antara UPG Satker dan UPG Pusat.
3. Pada header **Khusus PPG**, pilih save slot **Simulasi Lengkap**. Jangan memakai **Data Riil** untuk latihan ini.
4. Bila data simulasi lama masih tampil, klik **Reset Simulasi** sekali. Reset hanya boleh dilakukan pada slot simulasi.
5. Pastikan tahun analisis adalah **2026**.

Hasil awal yang diharapkan pada slot simulasi: lima risiko generik, delapan kontrol, data hingga 60 pengadilan, dua register per pengadilan, 369 laporan anonim, dan sekitar 12 loss event untuk setiap risiko. Karena Insight B memakai seluruh master satker sebagai penyebut, angkanya dapat sedikit berbeda menurut isi master unit kerja.

## 2. Ringkasan skenario Pengadilan Negeri Wates

| Kode kerja | Risiko | Inherent K×D | Residual K×D | Appetite | Keputusan |
| --- | --- | ---: | ---: | ---: | --- |
| R1 | Pemberian uang/fasilitas untuk memengaruhi layanan | 5×5 = 25 | 3×4 = 12 | Kecurangan = 4 | Di atas selera; kandidat Program PPG |
| R2 | Keterlambatan pelaporan gratifikasi | 4×4 = 16 | 2×3 = 6 | Kepatuhan = 8 | Dalam selera; monitor |
| R3 | Hadiah penyedia pada tahapan pengadaan | 4×5 = 20 | 3×3 = 9 | Operasional = 9 | Dalam selera karena sama dengan ambang; monitor |

Fokus Program PPG adalah R1. Loss event R1 diberi dampak level 4 agar menjadi **upper limit** setelah divalidasi UPG Pusat. Dengan demikian, program mempunyai dua dasar yang saling melengkapi: residual risk di atas selera dan loss event aktual upper-limit.

## 3. Submenu Risk and Control Library

Tahap ini berperan sebagai UPG Pusat. Jika menggunakan data simulasi bawaan, risiko dan kontrol berikut sudah tersedia sehingga Anda dapat mencocokkan saja. Jika ingin berlatih dari kosong, masukkan data berikut.

### 3.1 Tambah draf risiko R1

| Input | Isi |
| --- | --- |
| Kategori risiko | Risiko Kecurangan |
| Kontrol terkait | Kosongkan dahulu |
| Klasifikasi risiko | Sektor Pelayanan Publik |
| Proses bisnis | Pelayanan Publik |
| Subproses bisnis | Tidak berlaku/otomatis nonaktif |
| Peristiwa risiko | Pemberian uang atau fasilitas untuk memengaruhi layanan pengadilan. |
| Faktor penyebab | Sistem |
| Keterangan penyebab | Interaksi langsung belum seluruhnya transparan dan media larangan belum terlihat di semua titik layanan. |
| Uraian dampak | Independensi layanan dan reputasi lembaga menurun. |

Klik **Simpan draf**, lalu pada tabel pustaka ubah status risiko menjadi **Aktif**.

### 3.2 Tambah draf risiko R2

| Input | Isi |
| --- | --- |
| Kategori risiko | Risiko Kepatuhan |
| Klasifikasi risiko | Sektor Pelayanan Publik |
| Proses bisnis | Administrasi Perkara |
| Peristiwa risiko | Keterlambatan pelaporan penerimaan gratifikasi oleh aparatur. |
| Faktor penyebab | Pemahaman |
| Keterangan penyebab | Batas waktu dan kanal pelaporan belum dipahami merata. |
| Uraian dampak | Kepatuhan pelaporan menurun dan tindak lanjut terlambat. |

Simpan dan ubah status menjadi **Aktif**.

### 3.3 Tambah draf risiko R3

| Input | Isi |
| --- | --- |
| Kategori risiko | Risiko Operasional |
| Klasifikasi risiko | Sektor Pengadaan Barang dan/atau Jasa |
| Proses bisnis | Administrasi Umum |
| Subproses bisnis | Pengadaan B/J P |
| Peristiwa risiko | Pemberian hadiah oleh penyedia pada tahapan pengadaan. |
| Faktor penyebab | Penegakan Aturan |
| Keterangan penyebab | Deklarasi konflik kepentingan belum konsisten. |
| Uraian dampak | Objektivitas pengadaan dan kepercayaan penyedia terganggu. |

Simpan dan ubah status menjadi **Aktif**.

### 3.4 Tambah kontrol

Tambahkan kontrol satu per satu. Kode dibuat otomatis oleh aplikasi.

| Risiko terkait | Jenis | Nama kontrol | Uraian pelaksanaan |
| --- | --- | --- | --- |
| R1 | Preventif | Banner larangan gratifikasi pada area layanan | Banner ditempatkan pada PTSP, ruang tunggu, dan jalur masuk alternatif serta didokumentasikan setiap triwulan. |
| R1, R2 | Preventif | Kanal pelaporan dan pengingat batas waktu | Kanal pelaporan dipublikasikan dan pengingat batas waktu dikirim kepada seluruh pegawai. |
| R1, R2 | Detektif | Register penerimaan/penolakan gratifikasi | UPG Satker mencatat penerimaan, penolakan, tanggal, tindak lanjut, dan bukti. |
| R3 | Preventif | Deklarasi konflik kepentingan pengadaan | Seluruh anggota tim pengadaan menandatangani deklarasi sebelum proses dimulai. |
| R3 | Detektif | Reviu berkala transaksi dan dokumen pendukung | Sekretaris melakukan reviu dokumen dan transaksi secara berkala. |

Pada tabel **Katalog kontrol**, pastikan status kontrol **Aktif** dan keterkaitannya menunjuk risiko yang benar. Jika suatu kontrol hendak dinonaktifkan, alasan minimal lima karakter wajib diisi; jangan lakukan pada simulasi alur ini.

## 4. Submenu Selera Risiko

Pilih **Tahun 2026** dan **Pengadilan Negeri Wates**, lalu isi:

| Input | Isi |
| --- | ---: |
| Risiko Strategis | 9 |
| Risiko Kebijakan | 9 |
| Risiko Kecurangan | 4 |
| Risiko Bencana | 9 |
| Risiko Kepatuhan | 8 |
| Risiko Operasional | 9 |
| Risiko Kemitraan | 8 |
| Catatan/justifikasi | Toleransi Risiko Kecurangan ditetapkan sangat rendah sebagai penerapan zero tolerance terhadap gratifikasi; kategori lain mengikuti kapasitas kontrol dan konteks Pengadilan Negeri Wates tahun 2026. |

Klik **Tetapkan Selera Risiko PPG**. Interpretasi yang dipakai aplikasi:

- residual > ambang: **Di atas selera**, kandidat treatment/Program PPG;
- residual ≤ ambang: **Dalam selera**, diterima dan dimonitor;
- belum ada penetapan: **Selera belum ditetapkan**, sehingga mesin tidak mengasumsikan ambang.

## 5. Submenu Penilaian Risiko

### 5.1 Register R1

| Input | Isi |
| --- | --- |
| Satker penilai | Pengadilan Negeri Wates |
| Risiko generik | Pilih R1 dari Risk Library |
| Tahun | 2026 |
| Periode | Tahunan |
| Probabilitas inherent | Level 5 — Hampir Pasti Terjadi |
| Dampak inherent | Level 5 — Sangat Signifikan |
| Probabilitas residual | Level 3 — Kadang Terjadi |
| Dampak residual | Level 4 — Signifikan |
| Kontrol aktual 1 | Banner larangan gratifikasi pada area layanan |
| Efektivitas kontrol 1 | Tidak efektif |
| Bukti kontrol 1 | Kosong; status Tidak Efektif tidak mensyaratkan bukti |
| Kontrol aktual 2 | Kanal pelaporan dan pengingat batas waktu |
| Efektivitas kontrol 2 | Sebagian efektif |
| Bukti kontrol 2 | `https://example.com/bukti-simulasi/pn-wates/pengingat-pelaporan` |
| Kontrol aktual 3 | Register penerimaan/penolakan gratifikasi |
| Efektivitas kontrol 3 | Efektif |
| Bukti kontrol 3 | `https://example.com/bukti-simulasi/pn-wates/register-gratifikasi` |

Simpan. Hasil: inherent 25, residual 12, dan **Perlu Program PPG · 12 > 4**.

### 5.2 Register R2

Isi satker/tahun/periode seperti R1, lalu pilih R2.

| Input | Isi |
| --- | --- |
| Probabilitas inherent | 4 — Sering Terjadi |
| Dampak inherent | 4 — Signifikan |
| Probabilitas residual | 2 — Jarang Terjadi |
| Dampak residual | 3 — Moderat |
| Kanal pelaporan dan pengingat batas waktu | Efektif; `https://example.com/bukti-simulasi/pn-wates/sosialisasi-kanal` |
| Register penerimaan/penolakan gratifikasi | Efektif; `https://example.com/bukti-simulasi/pn-wates/register-gratifikasi` |

Hasil: residual 6 dan **Dalam selera · 6 ≤ 8**.

### 5.3 Register R3

Isi satker/tahun/periode seperti R1, lalu pilih R3.

| Input | Isi |
| --- | --- |
| Probabilitas inherent | 4 — Sering Terjadi |
| Dampak inherent | 5 — Sangat Signifikan |
| Probabilitas residual | 3 — Kadang Terjadi |
| Dampak residual | 3 — Moderat |
| Deklarasi konflik kepentingan pengadaan | Sebagian efektif; `https://example.com/bukti-simulasi/pn-wates/deklarasi-pbj` |
| Reviu berkala transaksi dan dokumen | Efektif; `https://example.com/bukti-simulasi/pn-wates/reviu-pbj` |

Hasil: residual 9 dan **Dalam selera · 9 ≤ 9**. Kesamaan dengan ambang tidak dihitung sebagai pelampauan.

### 5.4 Validasi UPG Pusat

Pada bagian **Monitoring bukti efektivitas kontrol**, per baris:

1. Pilih **Disetujui** untuk bukti URL yang memadai.
2. Pilih **Perlu perbaikan** jika tautan tidak dapat diverifikasi, dan isi catatan.
3. Untuk kontrol R1 yang dinilai Tidak Efektif tanpa bukti, pilih **Perlu perbaikan** dengan catatan: `Lampirkan dokumentasi lokasi banner dan rencana perbaikannya.`
4. Pastikan pesan sukses muncul. Status harus tetap sama setelah halaman direload.

Bagian **Draf hasil impor yang perlu dilengkapi** tertutup secara default; bagian itu tidak perlu dibuka untuk simulasi manual ini.

## 6. Submenu Loss Event

Masukkan sedikitnya tiga kejadian agar satu satker mempunyai contoh berulang. Kejadian pertama menjadi bukti upper-limit utama.

### 6.1 Loss event utama R1

| Input | Isi |
| --- | --- |
| Satker pelapor | Pengadilan Negeri Wates |
| Nama loss event | Indikasi pemberian uang setelah layanan PTSP selesai |
| Tanggal kejadian | 09/09/2026 (`2026-09-09`) |
| Tanggal diketahui | 09/09/2026 |
| Sumber informasi | Pengaduan |
| Lokasi | Area PTSP Pengadilan Negeri Wates |
| Risiko generik utama | R1 — pemberian uang/fasilitas untuk memengaruhi layanan |
| Proses bisnis | Pelayanan Publik |
| Subproses bisnis | Tidak berlaku |
| Risk Register Satker | Register R1 Pengadilan Negeri Wates |
| Kontrol yang gagal | Banner larangan gratifikasi pada area layanan |
| Keterangan tambahan kegagalan kontrol | Banner utama tidak terlihat dari jalur masuk alternatif dan petugas pengganti belum menerima briefing. |
| Laporan gratifikasi yang diduga terkait | Pilih laporan PN Wates dengan tanggal/objek paling mendekati; boleh kosong jika tidak tersedia |
| Kronologi | Setelah layanan PTSP selesai, pengguna layanan menawarkan uang kepada petugas. Petugas menolak, mengamankan informasi kejadian, dan melapor kepada UPG Satker. |
| Metode RCA | 5-Why |
| Akar masalah | Penempatan media larangan dan briefing petugas pengganti belum mencakup seluruh titik interaksi. |
| Jenis/area dampak | Penurunan Reputasi |
| Level dampak | Level 4 — Tinggi |
| Uraian dampak aktual | Kejadian menimbulkan pengaduan dan memerlukan klarifikasi pimpinan serta tindakan korektif segera. |
| Lesson learned awal | Media pengendalian harus terlihat dari semua akses dan briefing harus mencakup petugas pengganti. |
| Bukti pendukung privat | Opsional: PDF/JPG/PNG/WebP maksimal 10 MB |

Klik **Ajukan ke UPG Pusat**. Sebagai UPG Pusat, buka detail kejadian, konfirmasi risiko generik R1, isi catatan `Pemetaan dan bukti awal memadai; tindak lanjut RCA diperlukan`, lalu pilih **Tindak lanjut** dan simpan. Dengan limit dampak aktif yang menggunakan level 4, kejadian akan tampil sebagai upper limit.

### 6.2 Loss event kedua R1

Gunakan nilai yang sama kecuali:

| Input | Isi |
| --- | --- |
| Nama loss event | Penawaran parsel kepada petugas layanan menjelang hari raya |
| Tanggal kejadian/diketahui | 15/04/2026 dan 15/04/2026 |
| Sumber informasi | Observasi satker |
| Kontrol yang gagal | Kanal pelaporan dan pengingat batas waktu |
| Keterangan tambahan | Pengingat periode rawan terlambat didistribusikan. |
| Level dampak | Level 3 — Sedang |
| Uraian dampak | Petugas membutuhkan eskalasi dan pencatatan tambahan, tetapi pemberian berhasil ditolak. |

Ajukan dan validasi sebagai **Tervalidasi**.

### 6.3 Loss event R3

| Input | Isi |
| --- | --- |
| Nama loss event | Penawaran fasilitas dari penyedia pada masa evaluasi pengadaan |
| Tanggal kejadian/diketahui | 20/06/2026 dan 20/06/2026 |
| Sumber informasi | Temuan audit |
| Lokasi | Bagian Umum Pengadilan Negeri Wates |
| Risiko generik utama | R3 — hadiah penyedia pada tahapan pengadaan |
| Proses/subproses | Administrasi Umum / Pengadaan B/J P |
| Risk Register Satker | Register R3 |
| Kontrol yang gagal | Deklarasi konflik kepentingan pengadaan |
| Keterangan tambahan | Deklarasi belum ditandatangani oleh satu anggota tim pengadaan. |
| Kronologi | Penyedia menawarkan fasilitas transportasi ketika evaluasi dokumen berlangsung; tawaran ditolak dan dilaporkan. |
| Metode RCA | Fishbone/Ishikawa |
| Akar masalah | Daftar periksa kelengkapan deklarasi belum menjadi prasyarat tahapan evaluasi. |
| Jenis/area dampak | Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Badan Pengawasan |
| Level dampak | Level 3 — Sedang |
| Uraian dampak | Diperlukan klarifikasi dan perbaikan administrasi pengadaan. |
| Lesson learned | Sistem harus memblokir tahapan evaluasi sebelum seluruh deklarasi lengkap. |

Ajukan dan validasi sebagai **Tervalidasi**.

## 7. Submenu Referensi & Impor

Untuk membuat Insight A dari data riil, pada **Impor Rekapitulasi Pelaporan** pilih satu file `.xlsx` hasil ekspor KPK dan klik **Impor data anonim**. Sistem menerima sheet `Worksheet` atau format lama `Worksheet (GOL)` dan tidak menyimpan identitas pribadi seperti nama, NIK, alamat, kontak, atau pemberi.

Untuk simulasi yang repeatable, langkah ini dapat dilewati karena slot **Simulasi Lengkap** sudah mempunyai 369 laporan anonim. Gunakan riwayat impor untuk memastikan batch berstatus selesai. Hapus batch hanya jika benar-benar salah atau duplikat.

## 8. Submenu Titik Rawan

1. Pilih **Tahun 2026**.
2. Pilih **Tahunan** agar seluruh kejadian contoh masuk periode analisis.
3. Periksa **Insight A**: paparan laporan, tren, musim, jabatan, objek, dan kualitas konteks.
4. Periksa tabel **Insight B nasional per risiko generik**.
5. Pada R1, pastikan kolom **Di atas selera** dan **Upper limit** terisi serta landasan program menampilkan **Pertimbangkan PPG**.
6. Ingat bahwa persentase Insight B adalah `jumlah satker unik terdampak ÷ seluruh satker master × 100`, bukan jumlah loss event.
7. Klik **Buat draf berbantuan** pada kandidat R1.

Jika menggunakan seed simulasi, sekitar 12 pengadilan berbeda per risiko akan menghasilkan angka Insight B sekitar satu persen pada master yang berisi kurang lebih seribu satker. Nilai persis mengikuti jumlah unit pada database.

## 9. Submenu Program PPG

Form akan membawa pilihan risiko dan tindakan dari Titik Rawan. Lengkapi sebagai berikut.

| Input | Isi |
| --- | --- |
| Nama program | Penguatan Protokol Penolakan Gratifikasi pada Layanan Pengadilan 2027 |
| Mulai | 01/01/2027 |
| Selesai | 31/03/2027 |
| Risiko generik utama | R1 |
| Kontrol terkait | Banner larangan; kanal pelaporan; register penerimaan/penolakan |
| Loss event upper-limit pendukung | Loss event utama tanggal 09/09/2026 |
| Rencana tindakan | PPG-UANG-01 — Penguatan protokol penolakan uang dan setara uang |
| Target cakupan nasional | 100% |
| PIC | Koordinator UPG Pusat |
| Kelompok sasaran | Pegawai pada fungsi layanan |
| Sasaran program | Menurunkan paparan dan realisasi R1 melalui penguatan protokol penolakan, pelaporan cepat, dan kontrol yang disesuaikan menurut klaster satker. |
| Frekuensi pengukuran | Triwulanan |
| Target output | 100% satker sasaran melaksanakan simulasi penolakan dan mengirim bukti. |
| Target outcome | Proporsi laporan uang yang ditolak dan dilaporkan tepat waktu meningkat. |

Pada panel yang muncul setelah memilih R1:

- baca status landasan selera: jumlah satker di atas appetite, cakupan appetite, dan satker upper-limit;
- pertahankan KRI saran mesin atau isi ambang **Hijau `<5%`**, **Waspada `5–10%`**, dan **Merah `>10%`**;
- tetapkan target Outcome A sesuai baseline mesin, misalnya **80%**;
- tetapkan target Outcome B lebih rendah daripada baseline kejadian, misalnya **0,8% satker**;
- Klaster 1: `RCA, perbaikan kontrol, simulasi penolakan, dan validasi bulanan`, target cakupan **100%**;
- Klaster 2: `Komunikasi preventif, penguatan KRI, dan deteksi dini`, target cakupan **95%**;
- Klaster 3: `Monitoring triwulanan dan pemeliharaan kontrol`, target cakupan **85%**;
- Catatan keputusan UPG Pusat: `Program ditetapkan karena residual risk R1 melampaui selera satker dan terdapat loss event upper-limit; tindakan PPG-UANG-01 selaras dengan risiko dan kontrol yang dipilih.`

Klik **Simpan rancangan Program PPG nasional berklaster**. Hasil yang harus muncul:

- kode program otomatis;
- snapshot periode analisis dan dasar appetite/upper-limit;
- satu risiko generik utama dan beberapa kontrol terkait;
- indikator, baseline, target, KRI, serta tiga klaster satker;
- tautan **Laporan perencanaan** dan **Laporan pelaksanaan**.

## 10. Monitoring hingga treated risk

### 10.1 Catat perkembangan

Buka program, pilih **Catat perkembangan**, lalu buat dua pembaruan.

| Input | Pembaruan 1 | Pembaruan 2 |
| --- | --- | --- |
| Tanggal | 31/01/2027 | 31/03/2027 |
| Status | Berjalan | Selesai |
| Progres | 50 | 100 |
| Realisasi indikator | 52% | 100% |
| Realisasi output | Materi dan daftar periksa didistribusikan. | Simulasi dan verifikasi bukti selesai. |
| Catatan outcome | Bukti awal mulai masuk. | Pelaporan penolakan tepat waktu meningkat. |
| Tautan bukti | `https://example.com/bukti-simulasi/program/progres-50` | `https://example.com/bukti-simulasi/program/final` |
| Catatan | Sebagian satker memerlukan asistensi. | Program selesai dan siap dievaluasi. |

### 10.2 Nilai treated risk

Panel ini berada **paling bawah** halaman Program PPG karena baru digunakan setelah item program selesai.

| Input | Isi |
| --- | --- |
| Risk Register Satker | Register R1 Pengadilan Negeri Wates |
| Program PPG terkait | Program yang baru diselesaikan |
| Probabilitas treated | Level 1 — Hampir Tidak Terjadi |
| Dampak treated | Level 3 — Moderat |
| Efektivitas Program PPG | Efektif |
| Evidence efektivitas Program PPG | `https://example.com/bukti-simulasi/program/evaluasi-pn-wates` |

Klik **Simpan evaluasi dampak program**. Hasil: treated risk 3, turun 9 poin dari residual risk 12. Perubahan ini menilai dampak program, bukan mengganti skor efektivitas tiap kontrol.

## 11. Checklist hasil akhir

- [ ] Save slot yang aktif adalah Simulasi Lengkap.
- [ ] Tiga risiko generik aktif dan mempunyai kontrol terkait.
- [ ] Selera risiko PN Wates tahun 2026 telah ditetapkan.
- [ ] R1 berada di atas selera; R2 dan R3 berada dalam selera.
- [ ] Bukti efektivitas kontrol sudah diberi keputusan UPG Pusat dan bertahan setelah reload.
- [ ] Loss event mereferensikan kontrol aktual dari register, bukan hanya narasi bebas.
- [ ] Minimal satu loss event R1 berstatus tervalidasi/tindak lanjut dan upper-limit.
- [ ] Insight B memakai satker unik dan menampilkan dasar appetite serta upper limit.
- [ ] Program PPG mempunyai snapshot, satu risiko utama, kontrol, KRI, target, dan tiga klaster.
- [ ] Item program selesai sebelum treated risk dinilai.
- [ ] Treated risk R1 turun dari 12 menjadi 3 dan mempunyai URL evidence.

## 12. Catatan penggunaan URL simulasi

Alamat `example.com` dalam dokumen ini hanya contoh format URL HTTPS. Untuk uji verifikasi bukti yang sesungguhnya, ganti dengan tautan Drive/OneDrive internal yang dapat diakses reviewer sesuai kebijakan keamanan organisasi.
