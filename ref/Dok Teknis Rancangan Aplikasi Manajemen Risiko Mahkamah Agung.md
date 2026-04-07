# Dokumen Teknis Rancangan Aplikasi Manajemen Risiko Mahkamah Agung (Draft Awal)

**Disusun oleh:** Manus AI
**Tanggal:** 7 April 2026

---

## 1. Pendahuluan

Dokumen ini merupakan rancangan teknis awal untuk Sistem Informasi Manajemen Risiko di lingkungan Mahkamah Agung dan Badan Peradilan yang Berada di Bawahnya. Rancangan ini disusun berdasarkan Keputusan Ketua Mahkamah Agung tentang Pedoman Manajemen Risiko, yang mengadopsi model tiga lini (*Three Lines Model*) dan mencakup seluruh tahapan proses manajemen risiko mulai dari penetapan konteks hingga pelaporan.

Tujuan dari sistem ini adalah untuk mendigitalisasi dan mengotomatisasi seluruh proses penilaian dan pengendalian risiko, memastikan konsistensi penerapan kebijakan, menjaga kualitas data, serta memfasilitasi pemantauan dan pelaporan secara *real-time* dan berjenjang.

---

## 2. Arsitektur Sistem dan Modul Utama

Sistem Informasi Manajemen Risiko dirancang dengan arsitektur berbasis web yang terintegrasi, terdiri dari beberapa modul utama yang mencerminkan tahapan proses manajemen risiko sesuai pedoman.

### 2.1. Modul Manajemen Pengguna dan Otorisasi (Lini 1, 2, dan 3)

Modul ini mengatur hak akses berdasarkan struktur organisasi dan peran dalam manajemen risiko.

| Peran Pengguna | Deskripsi Hak Akses |
| :--- | :--- |
| **Administrator Sistem** | Mengelola data master (kriteria dampak, matriks risiko), struktur organisasi, dan pembuatan akun pengguna tingkat pusat. |
| **Pemilik Risiko (Lini 1)** | Menetapkan selera risiko, menyetujui penetapan konteks, memvalidasi daftar risiko prioritas, menyetujui Rencana Tindak Pengendalian (RTP), dan menerima laporan berkala. |
| **Pengelola Risiko (Lini 1)** | Melakukan input data penetapan konteks, identifikasi risiko, analisis risiko, evaluasi risiko, menyusun RTP, melakukan pemantauan (realisasi dan peristiwa), serta menyusun laporan semester dan tahunan. |
| **Unit Manajemen Risiko (Lini 2)** | Memverifikasi penilaian risiko dan RTP dari Lini 1, mereviu usulan risiko baru, memantau efektivitas pengendalian secara lintas unit, dan menyusun laporan tingkat lembaga. |
| **APIP / Pengawas Intern (Lini 3)** | Memiliki akses *read-only* ke seluruh data untuk keperluan audit, evaluasi tingkat kematangan manajemen risiko, dan pemantauan kepatuhan. |

### 2.2. Modul Penetapan Konteks

Modul ini merupakan langkah awal di mana Pengelola Risiko mendefinisikan parameter operasional unit kerjanya.

*   **Input Data:** Identitas unit kerja, periode penerapan (default: 1 Januari - 31 Desember), sasaran strategis/program, proses bisnis utama, daftar pemangku kepentingan, dan isu internal/eksternal.
*   **Konfigurasi Kriteria:** Sistem menampilkan kriteria kemungkinan (5 level) dan kriteria dampak (5 area: keuangan, reputasi, K3, kinerja, temuan audit) yang telah dibakukan oleh pusat.
*   **Penetapan Selera Risiko:** Pemilik Risiko menetapkan batas toleransi risiko (selera risiko) yang dapat diterima oleh unit kerjanya.

### 2.3. Modul Penilaian Risiko (Identifikasi, Analisis, dan Evaluasi)

Modul inti ini memfasilitasi pencatatan dan pengukuran risiko secara sistematis.

*   **Identifikasi Risiko:** Pengelola Risiko memilih risiko dari *database* risiko standar atau mengusulkan risiko baru. Setiap risiko dilengkapi dengan pernyataan risiko, kategori, sumber, penyebab, dan dampak potensial.
*   **Analisis Risiko:** Pengelola Risiko menilai level kemungkinan (1-5) dan level dampak (1-5) sebelum adanya pengendalian tambahan. Sistem secara otomatis menghitung **Status Risiko** (Sangat Rendah hingga Sangat Tinggi) berdasarkan matriks 5x5. Pengguna juga mendata pengendalian yang sudah ada (*existing control*).
*   **Evaluasi Risiko:** Sistem secara otomatis membandingkan Status Risiko dengan Selera Risiko. Risiko yang berada di atas selera risiko akan ditandai sebagai **Risiko Prioritas** yang wajib ditindaklanjuti. Sistem menghasilkan Peta Risiko (*Risk Map*) visual.

### 2.4. Modul Respons Risiko (Rencana Tindak Pengendalian)

Untuk setiap Risiko Prioritas, Pengelola Risiko harus menyusun rencana mitigasi.

*   **Analisis Akar Masalah (RCA):** Fitur opsional untuk mendokumentasikan metode *Root Cause Analysis* (misalnya *5 Whys* atau *Fishbone*).
*   **Penyusunan RTP:** Pengelola Risiko merumuskan kegiatan pengendalian baru, menentukan indikator keluaran, menunjuk penanggung jawab, dan menetapkan target waktu penyelesaian.
*   **Proyeksi Risiko (Treated Risk):** Pengelola Risiko menaksir ulang level kemungkinan dan dampak dengan asumsi RTP telah dilaksanakan secara efektif.

### 2.5. Modul Pemantauan dan Pelaporan

Modul ini melacak implementasi RTP dan insiden yang terjadi, serta menghasilkan laporan berjenjang.

*   **Pemantauan Realisasi RTP:** Pengelola Risiko memperbarui status pelaksanaan kegiatan pengendalian (Selesai/Belum Selesai) beserta bukti dukung dan kendala yang dihadapi.
*   **Registrasi Peristiwa Risiko:** Pencatatan insiden/risiko aktual yang terjadi selama periode berjalan, mencakup waktu, tempat, pemicu, dan skor dampak aktual.
*   **Evaluasi Efektivitas:** Pada akhir tahun, sistem membandingkan status risiko proyeksi (*treated risk*) dengan status risiko aktual berdasarkan insiden yang terjadi, untuk menilai apakah pengendalian efektif.
*   **Pelaporan Otomatis:** Sistem menggenerasi Laporan Semester dan Laporan Tahunan sesuai format standar (Lampiran 17-20) yang dapat diekspor ke PDF/Word dan diteruskan secara berjenjang (misal: Pengadilan Tingkat Pertama -> Pengadilan Tingkat Banding -> Dirjen).

---

## 3. Struktur Levelling Risiko: Satker vs MA (Ekstraksi)

Sistem dirancang dengan konsep **levelling risiko** yang memungkinkan agregasi dan ekstraksi data risiko dari tingkat satker (unit di bawah MA) ke tingkat MA (pusat). Struktur ini mencerminkan hierarki organisasi dan alur pelaporan berjenjang sesuai pedoman.

### 3.1. Tingkatan Organisasi dan Levelling Risiko

| Tingkat | Satuan Kerja | Pemilik Risiko | Pengelola Risiko | Tipe Data |
| :--- | :--- | :--- | :--- | :--- |
| **Level 0 (Terbawah)** | Pengadilan Tingkat Pertama | Ketua/Kepala Pengadilan | Panitera & Sekretaris | Risiko operasional unit |
| **Level 1** | Pengadilan Tingkat Banding | Ketua/Kepala Pengadilan | Panitera & Sekretaris | Risiko unit + ekstraksi dari Level 0 |
| **Level 2** | Kepaniteraan MA & Eselon I (Badan/Dirjen) | Kepala Unit Eselon I | Panitera Muda & Eselon II | Risiko unit + ekstraksi dari Level 1 |
| **Level 3 (Tertinggi)** | Mahkamah Agung (Lembaga) | Ketua MA | Sekretaris MA | Risiko lembaga + ekstraksi dari Level 2 |

### 3.2. Konsep Ekstraksi dan Agregasi Risiko

**Ekstraksi Risiko** adalah proses pengambilan risiko prioritas dari satker di bawah untuk dilaporkan ke tingkat yang lebih tinggi. Risiko yang diekstraksi adalah risiko yang:

1. **Status Risiko Tinggi/Sangat Tinggi** (Level 4-5) atau berada di atas selera risiko satker.
2. **Berdampak Lintas Unit** atau memiliki implikasi strategis bagi organisasi yang lebih besar.
3. **Memerlukan Intervensi Tingkat Lebih Tinggi** untuk pengendaliannya.

**Agregasi Risiko** adalah proses penggabungan data risiko dari berbagai satker untuk membentuk gambaran risiko konsolidasi di tingkat yang lebih tinggi. Agregasi meliputi:

- Penghitungan ulang status risiko berdasarkan data aktual dari satker.
- Identifikasi risiko yang sama atau serupa di berbagai satker (duplikasi).
- Konsolidasi laporan dan peta risiko tingkat lembaga.

### 3.3. Alur Data Ekstraksi (Bottom-Up)

```
Pengadilan Tingkat Pertama (Level 0)
  ├─ Risiko Prioritas (Status ≥ Tinggi)
  └─ Laporan Semester/Tahunan
        ↓ (Ekstraksi)
Pengadilan Tingkat Banding (Level 1)
  ├─ Risiko Unit Sendiri
  ├─ Risiko Terekstraksi dari Level 0
  └─ Laporan Konsolidasi
        ↓ (Ekstraksi)
Eselon I / Dirjen Badan Peradilan (Level 2)
  ├─ Risiko Unit Sendiri
  ├─ Risiko Terekstraksi dari Level 1
  └─ Laporan Konsolidasi
        ↓ (Ekstraksi)
Mahkamah Agung - Lembaga (Level 3)
  ├─ Risiko Lembaga
  ├─ Risiko Terekstraksi dari Level 2
  └─ Peta Risiko Lembaga Konsolidasi
```

---

## 4. Role dan Hak Akses Pengguna: Satker vs MA

Sistem mengimplementasikan dua kategori utama pengguna berdasarkan tingkat organisasi: **Pengguna Satker** (unit di bawah MA) dan **Pengguna MA** (pusat). Setiap kategori memiliki role spesifik dengan hak akses yang berbeda.

### 4.1. Pengguna Satker (Unit di Bawah MA)

Pengguna satker adalah mereka yang bekerja di Pengadilan Tingkat Pertama, Pengadilan Tingkat Banding, atau unit Eselon I di bawah MA.

#### Role: Admin Satker
- **Tanggung Jawab:** Mengelola data master satker (unit kerja, struktur organisasi lokal), membuat akun pengguna satker, dan mengatur otorisasi pengguna lokal.
- **Hak Akses:**
  - Mengelola profil unit kerja satker (nama, kode, lokasi, dll).
  - Membuat dan mengelola akun Pemilik Risiko dan Pengelola Risiko satker.
  - Mengatur tim manajemen risiko lokal.
  - Melihat laporan satker sendiri (tidak dapat melihat satker lain).

#### Role: Pemilik Risiko Satker
- **Tanggung Jawab:** Menetapkan selera risiko satker, menyetujui penetapan konteks, memvalidasi daftar risiko prioritas, menyetujui RTP, dan mengesahkan laporan.
- **Hak Akses:**
  - Melihat dashboard risiko satker sendiri.
  - Menetapkan/mengubah selera risiko satker.
  - Menyetujui atau menolak penetapan konteks, identifikasi risiko, dan RTP.
  - Mengesahkan laporan semester dan tahunan sebelum dikirim ke tingkat atas.
  - Tidak dapat melihat data risiko satker lain atau tingkat MA.

#### Role: Pengelola Risiko Satker
- **Tanggung Jawab:** Melakukan seluruh proses manajemen risiko di tingkat satker (identifikasi, analisis, evaluasi, respons, pemantauan, pelaporan).
- **Hak Akses:**
  - Akses penuh ke semua modul manajemen risiko untuk satker sendiri (Penetapan Konteks, Penilaian Risiko, RTP, Pemantauan).
  - Input data risiko, kegiatan pengendalian, dan peristiwa risiko.
  - Generate laporan semester dan tahunan satker.
  - Melihat feedback dari Unit Manajemen Risiko MA (Lini 2).
  - Tidak dapat melihat data risiko satker lain atau risiko ekstraksi dari unit lain.

#### Role: Tim Manajemen Risiko Satker (Opsional)
- **Tanggung Jawab:** Membantu Pengelola Risiko dalam proses identifikasi, analisis, dan pemantauan risiko.
- **Hak Akses:**
  - Akses *read-write* ke modul penilaian risiko dan pemantauan satker.
  - Akses *read-only* ke laporan satker.
  - Tidak dapat membuat atau menghapus risiko (hanya Pengelola Risiko).

### 4.2. Pengguna MA (Mahkamah Agung - Pusat)

Pengguna MA adalah mereka yang bekerja di Unit Manajemen Risiko (Badan Urusan Administrasi), APIP, atau Sekretariat MA.

#### Role: Administrator Sistem (MA)
- **Tanggung Jawab:** Mengelola data master sistem secara keseluruhan, struktur organisasi semua satker, dan master data kriteria risiko.
- **Hak Akses:**
  - Mengelola data master (kriteria kemungkinan, kriteria dampak, matriks risiko, kategori risiko, dll).
  - Mengelola struktur organisasi semua satker (Pengadilan Tingkat Pertama, Pengadilan Tingkat Banding, Eselon I).
  - Membuat akun pengguna MA (Unit MR, APIP, Admin Sistem).
  - Mengatur parameter sistem (periode penerapan, selera risiko default, dll).
  - Melihat laporan audit sistem.
  - Akses *read-only* ke semua data risiko (untuk keperluan teknis).

#### Role: Kepala Unit Manajemen Risiko (MA - Lini 2)
- **Tanggung Jawab:** Memimpin Unit Manajemen Risiko, mengkoordinasikan verifikasi penilaian risiko, memberikan feedback kepada satker, dan menyusun laporan konsolidasi lembaga.
- **Hak Akses:**
  - Melihat dashboard risiko konsolidasi dari semua satker (Level 0, 1, 2).
  - Melihat detail penilaian risiko dan RTP dari semua satker.
  - Memberikan komentar/feedback kepada Pengelola Risiko satker melalui sistem.
  - Mereviu dan memvalidasi usulan risiko baru dari satker.
  - Generate laporan konsolidasi semester dan tahunan (agregasi dari semua satker).
  - Melihat peta risiko lembaga konsolidasi.
  - Tidak dapat mengubah data risiko satker (hanya read/comment).

#### Role: Anggota Unit Manajemen Risiko (MA - Lini 2)
- **Tanggung Jawab:** Melakukan verifikasi detail penilaian risiko, analisis tren risiko, dan pemantauan efektivitas pengendalian lintas satker.
- **Hak Akses:**
  - Melihat detail penilaian risiko dan RTP dari semua satker.
  - Memberikan komentar/feedback kepada satker.
  - Generate laporan analisis risiko (tren, hotspot, dll).
  - Akses *read-only* ke laporan satker.
  - Tidak dapat mengubah data risiko.

#### Role: Kepala APIP / Pengawas Intern (MA - Lini 3)
- **Tanggung Jawab:** Melakukan evaluasi proses manajemen risiko, audit kepatuhan, dan penilaian tingkat kematangan MR.
- **Hak Akses:**
  - Akses *read-only* ke semua data risiko (satker dan MA).
  - Melihat laporan audit manajemen risiko.
  - Generate laporan evaluasi tingkat kematangan MR.
  - Melihat riwayat perubahan data (audit trail).
  - Tidak dapat mengubah data risiko.

#### Role: Anggota APIP / Pengawas Intern (MA - Lini 3)
- **Tanggung Jawab:** Membantu Kepala APIP dalam evaluasi dan audit manajemen risiko.
- **Hak Akses:**
  - Akses *read-only* ke semua data risiko.
  - Melihat laporan audit.
  - Tidak dapat mengubah data risiko.

#### Role: Pemilik Risiko Tingkat MA (Lembaga)
- **Tanggung Jawab:** Menetapkan selera risiko lembaga, menyetujui penetapan konteks tingkat lembaga, dan mengesahkan laporan konsolidasi lembaga.
- **Hak Akses:**
  - Melihat dashboard risiko lembaga konsolidasi.
  - Menetapkan/mengubah selera risiko lembaga.
  - Menyetujui penetapan konteks tingkat lembaga.
  - Mengesahkan laporan konsolidasi lembaga.
  - Melihat peta risiko lembaga.
  - Akses *read-only* ke detail risiko satker (untuk informasi).

### 4.3. Tabel Ringkasan Hak Akses

| Fitur / Modul | Admin Satker | Pemilik Risiko Satker | Pengelola Risiko Satker | Kepala Unit MR (MA) | APIP (MA) | Admin Sistem (MA) |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Penetapan Konteks Satker** | R | A | RW | R | R | R |
| **Identifikasi Risiko Satker** | R | A | RW | R | R | R |
| **Analisis Risiko Satker** | R | A | RW | R | R | R |
| **RTP Satker** | R | A | RW | R | R | R |
| **Pemantauan Satker** | R | R | RW | R | R | R |
| **Laporan Satker** | R | A | RW | R | R | R |
| **Dashboard Konsolidasi MA** | - | - | - | RW | R | R |
| **Laporan Konsolidasi MA** | - | - | - | RW | R | R |
| **Master Data Sistem** | - | - | - | - | - | RW |
| **Manajemen Akun Pengguna** | RW (satker) | - | - | - | - | RW (semua) |
| **Audit Trail / Log** | - | - | - | - | R | RW |

*Keterangan: R = Read (Lihat), W = Write (Edit), A = Approve (Setujui), RW = Read-Write, - = Tidak Ada Akses*

---

## 5. Alur Kerja Pengguna (User Workflow) - Siklus Tahunan

Berikut adalah rancangan alur kerja utama (*happy path*) untuk siklus manajemen risiko tahunan di tingkat unit kerja (misal: Pengadilan Tingkat Pertama).

### Fase 1: Perencanaan (Awal Tahun)
1.  **Pengelola Risiko** *login* dan membuka menu **Penetapan Konteks**.
2.  **Pengelola Risiko** mengisi sasaran strategis, proses bisnis, dan pemangku kepentingan.
3.  **Pemilik Risiko** mereviu dan menyetujui Penetapan Konteks serta menetapkan Selera Risiko.
4.  **Pengelola Risiko** masuk ke menu **Identifikasi Risiko**, memilih/menginput daftar risiko potensial.
5.  **Pengelola Risiko** melakukan **Analisis Risiko** dengan menilai level kemungkinan dan dampak, serta mencatat *existing control*.
6.  Sistem menghasilkan **Peta Risiko** dan daftar **Risiko Prioritas** (risiko di atas selera).
7.  Untuk setiap Risiko Prioritas, **Pengelola Risiko** menyusun **Rencana Tindak Pengendalian (RTP)**.
8.  **Pemilik Risiko** menyetujui RTP.
9.  **Unit Manajemen Risiko (Lini 2)** melakukan verifikasi atas penilaian risiko dan RTP yang telah disetujui Pemilik Risiko.

### Fase 2: Pelaksanaan dan Pemantauan (Berjalan Sepanjang Tahun)
10. **Pengelola Risiko** secara berkala (minimal per semester) memperbarui status pelaksanaan RTP di menu **Pemantauan Realisasi**.
11. Jika terjadi insiden, **Pengelola Risiko** segera mencatatnya di menu **Peristiwa Risiko**.
12. **Unit Manajemen Risiko (Lini 2)** memantau *dashboard* untuk melihat RTP yang tertunda dan memberikan *feedback* melalui sistem.

### Fase 3: Evaluasi dan Pelaporan (Akhir Semester / Akhir Tahun)
13. Pada akhir semester, **Pengelola Risiko** men-generate **Laporan Semester** melalui sistem. Laporan direviu dan disahkan oleh **Pemilik Risiko**, lalu dikirimkan secara sistem ke tingkat banding.
14. Pada akhir tahun, **Pengelola Risiko** melakukan **Penilaian Efektivitas Pengendalian** dengan membandingkan risiko aktual vs proyeksi.
15. **Pengelola Risiko** men-generate **Laporan Tahunan**.
16. **Pemilik Risiko** mengesahkan Laporan Tahunan dan meneruskannya ke jenjang yang lebih tinggi.

---

### 5.1. Alur Kerja Satker (Pengadilan Tingkat Pertama / Eselon I)

#### Fase 1: Perencanaan (Awal Tahun)
1. **Pengelola Risiko Satker** *login* ke sistem dengan role-nya.
2. **Pengelola Risiko Satker** membuka menu **Penetapan Konteks** dan mengisi:
   - Sasaran strategis/program satker (dari Rencana Strategis satker).
   - Proses bisnis utama satker.
   - Daftar pemangku kepentingan internal dan eksternal.
   - Isu internal dan eksternal yang relevan.
3. **Pemilik Risiko Satker** mereviu dan menyetujui Penetapan Konteks.
4. **Pemilik Risiko Satker** menetapkan **Selera Risiko** satker (misal: risiko maksimal yang dapat diterima adalah Level 3 Moderat).
5. **Pengelola Risiko Satker** masuk ke menu **Identifikasi Risiko** dan:
   - Memilih risiko dari *database* risiko standar yang disediakan oleh MA (Lini 2).
   - Mengusulkan risiko baru jika ada risiko spesifik satker yang tidak ada di database standar.
6. **Pengelola Risiko Satker** melakukan **Analisis Risiko**:
   - Menilai level kemungkinan (1-5) berdasarkan kriteria kemungkinan yang sudah dibakukan.
   - Menilai level dampak (1-5) berdasarkan kriteria dampak (keuangan, reputasi, K3, kinerja, temuan audit).
   - Mencatat *existing control* yang sudah ada.
   - Sistem secara otomatis menghitung **Status Risiko** berdasarkan matriks 5x5.
7. Sistem menghasilkan **Peta Risiko Satker** dan daftar **Risiko Prioritas** (risiko di atas selera risiko satker).
8. **Pengelola Risiko Satker** menyusun **Rencana Tindak Pengendalian (RTP)** untuk setiap Risiko Prioritas:
   - Melakukan Analisis Akar Masalah (RCA) untuk mengidentifikasi root cause.
   - Merumuskan kegiatan pengendalian yang relevan.
   - Menentukan indikator keluaran dan penanggung jawab.
   - Menetapkan target waktu penyelesaian.
   - Menaksir status risiko setelah pengendalian (*treated risk*).
9. **Pemilik Risiko Satker** mereviu dan menyetujui RTP.
10. **Unit Manajemen Risiko (MA - Lini 2)** menerima notifikasi bahwa penilaian risiko dan RTP satker telah selesai. Mereka melakukan verifikasi:
    - Mengecek kelengkapan dan konsistensi data penilaian risiko.
    - Mengecek relevansi dan feasibilitas RTP.
    - Memberikan komentar/feedback melalui sistem jika ada yang perlu diperbaiki.
    - Menandai sebagai "Terverifikasi" jika sudah sesuai.

#### Fase 2: Pelaksanaan dan Pemantauan (Berjalan Sepanjang Tahun)
11. **Pengelola Risiko Satker** secara berkala (minimal per semester) memperbarui status pelaksanaan RTP di menu **Pemantauan Realisasi Kegiatan Pengendalian**:
    - Menginput tanggal realisasi kegiatan pengendalian.
    - Mengunggah bukti dukung (dokumen, foto, dll).
    - Mencatat hambatan/kendala jika kegiatan belum selesai.
12. Jika terjadi insiden/peristiwa risiko, **Pengelola Risiko Satker** segera mencatatnya di menu **Peristiwa Risiko**:
    - Menginput nama peristiwa, waktu, tempat, pemicu.
    - Menilai skor dampak aktual yang terjadi.
    - Mencatat kronologi dan penyebab aktual.
13. **Unit Manajemen Risiko (MA - Lini 2)** memantau *dashboard* konsolidasi untuk melihat:
    - RTP satker yang tertunda atau belum terealisasi.
    - Peristiwa risiko yang terjadi di berbagai satker.
    - Tren risiko dan hotspot.
    Jika ada yang memerlukan perhatian, mereka memberikan *feedback* kepada Pengelola Risiko Satker melalui sistem.

#### Fase 3: Evaluasi dan Pelaporan (Akhir Semester / Akhir Tahun)
14. Pada akhir semester, **Pengelola Risiko Satker** men-generate **Laporan Semester** melalui menu **Pelaporan**:
    - Sistem secara otomatis mengumpulkan data dari semua modul (identifikasi, analisis, RTP, pemantauan).
    - Laporan mencakup: jumlah risiko teridentifikasi, risiko prioritas, realisasi RTP, peristiwa risiko, dll.
    - Format laporan sesuai Lampiran 17 (Laporan Semester Pengelola Risiko).
15. **Pemilik Risiko Satker** mereviu dan mengesahkan **Laporan Semester** dengan tanda tangan digital.
16. Sistem secara otomatis mengirimkan Laporan Semester ke jenjang yang lebih tinggi (misal: Pengadilan Tingkat Pertama -> Pengadilan Tingkat Banding).
17. Pada akhir tahun, **Pengelola Risiko Satker** melakukan **Penilaian Efektivitas Pengendalian**:
    - Membandingkan status risiko proyeksi (*treated risk* dari RTP) dengan status risiko aktual (berdasarkan peristiwa risiko yang terjadi).
    - Mengidentifikasi risiko yang berhasil diturunkan vs yang belum efektif.
    - Memberikan rekomendasi untuk tahun berikutnya.
18. **Pengelola Risiko Satker** men-generate **Laporan Tahunan** (Lampiran 18).
19. **Pemilik Risiko Satker** mengesahkan Laporan Tahunan.
20. Sistem mengirimkan Laporan Tahunan ke jenjang yang lebih tinggi.

### 5.2. Alur Kerja MA (Unit Manajemen Risiko - Lini 2)

#### Fase 1: Persiapan dan Sosialisasi (Awal Tahun)
1. **Administrator Sistem (MA)** memastikan data master sistem sudah lengkap dan terkini:
   - Struktur organisasi semua satker (Pengadilan Tingkat Pertama, Pengadilan Tingkat Banding, Eselon I).
   - Kriteria kemungkinan, dampak, dan matriks risiko.
   - Kategori risiko standar dan *database* risiko standar.
2. **Kepala Unit Manajemen Risiko (MA)** melakukan sosialisasi kepada semua satker tentang proses manajemen risiko dan penggunaan sistem.
3. **Unit Manajemen Risiko (MA)** menyiapkan *database* risiko standar yang dapat dipilih oleh satker.

#### Fase 2: Verifikasi dan Validasi (Selama Perencanaan Satker)
4. Seiring satker melakukan penilaian risiko, **Unit Manajemen Risiko (MA)** menerima notifikasi dan melakukan verifikasi:
   - Mengecek kelengkapan data penetapan konteks satker.
   - Mengecek konsistensi penilaian risiko (apakah level kemungkinan dan dampak sudah sesuai kriteria).
   - Mereviu usulan risiko baru dari satker (Lampiran 14).
   - Memberikan feedback jika ada yang perlu diperbaiki.
5. **Unit Manajemen Risiko (MA)** melakukan verifikasi RTP satker:
   - Mengecek relevansi kegiatan pengendalian dengan akar penyebab risiko.
   - Mengecek feasibilitas dan cost-benefit RTP.
   - Memberikan rekomendasi alternatif pengendalian jika diperlukan.

#### Fase 3: Pemantauan dan Agregasi (Berjalan Sepanjang Tahun)
6. **Unit Manajemen Risiko (MA)** memantau dashboard konsolidasi yang menampilkan:
   - Risiko dari semua satker (Level 0, 1, 2) secara teragregasi.
   - Status realisasi RTP di berbagai satker.
   - Peristiwa risiko yang terjadi di berbagai satker.
   - Tren risiko dan identifikasi risiko yang sama di berbagai satker.
7. **Unit Manajemen Risiko (MA)** memberikan feedback kepada satker jika ada:
   - RTP yang tertunda atau belum terealisasi (Lampiran 15).
   - Kegiatan pengendalian yang belum efektif (Lampiran 16).
   - Rekomendasi alternatif pengendalian yang lebih praktis.
8. **Unit Manajemen Risiko (MA)** melakukan identifikasi risiko ekstraksi:
   - Mengidentifikasi risiko prioritas dari satker yang perlu diekstraksi ke tingkat MA.
   - Risiko yang diekstraksi adalah risiko dengan status tinggi/sangat tinggi atau berdampak lintas unit.

#### Fase 4: Pelaporan dan Konsolidasi (Akhir Semester / Akhir Tahun)
9. Pada akhir semester, **Unit Manajemen Risiko (MA)** menerima laporan semester dari semua satker.
10. **Unit Manajemen Risiko (MA)** melakukan agregasi data:
    - Mengumpulkan data dari laporan satker.
    - Menghitung statistik konsolidasi (jumlah risiko, risiko prioritas, realisasi RTP, dll).
    - Mengidentifikasi duplikasi risiko di berbagai satker.
    - Membuat peta risiko lembaga konsolidasi.
11. **Unit Manajemen Risiko (MA)** men-generate **Laporan Semester Tingkat Lembaga** (Lampiran 20):
    - Laporan mencakup ringkasan risiko dari semua satker, tren risiko, hotspot, dan rekomendasi.
    - Format laporan sesuai template standar.
12. **Kepala Unit Manajemen Risiko (MA)** mengesahkan laporan dan menyampaikannya kepada **Ketua MA** dan **Unit Pengawas Intern (APIP)**.
13. Pada akhir tahun, **Unit Manajemen Risiko (MA)** melakukan proses yang sama untuk Laporan Tahunan.

### 5.3. Alur Kerja Ekstraksi Risiko (Bottom-Up)

Proses ekstraksi risiko adalah mekanisme untuk mengangkat risiko prioritas dari satker ke tingkat yang lebih tinggi.

#### Mekanisme Ekstraksi Otomatis
1. Sistem secara otomatis mengidentifikasi risiko yang memenuhi kriteria ekstraksi:
   - Status Risiko ≥ Tinggi (Level 4-5).
   - Atau status risiko di atas selera risiko satker.
   - Atau risiko yang ditandai sebagai "Berdampak Lintas Unit" oleh Pengelola Risiko Satker.
2. Risiko yang memenuhi kriteria ekstraksi ditampilkan di dashboard Unit Manajemen Risiko (MA) dengan label "Risiko Ekstraksi".
3. **Unit Manajemen Risiko (MA)** mereviu risiko ekstraksi dan memutuskan apakah risiko tersebut perlu:
   - Dimasukkan ke dalam register risiko tingkat MA (jika berdampak lembaga).
   - Dipantau sebagai risiko lintas satker (jika terjadi di berbagai satker).
   - Dikembalikan ke satker untuk penanganan lokal (jika dampaknya lokal saja).

#### Mekanisme Ekstraksi Manual
4. **Pengelola Risiko Satker** dapat secara manual mengusulkan risiko untuk diekstraksi ke tingkat atas melalui menu **Usulan Ekstraksi Risiko**.
5. **Unit Manajemen Risiko (MA)** mereviu usulan ekstraksi dan memberikan keputusan (Diterima/Ditolak).

#### Integrasi Risiko Ekstraksi di Tingkat Atas
6. Risiko yang diekstraksi dari satker di bawah akan menjadi bagian dari register risiko tingkat yang lebih tinggi.
7. Contoh: Risiko ekstraksi dari Pengadilan Tingkat Pertama akan diintegrasikan ke register risiko Pengadilan Tingkat Banding, dan seterusnya hingga tingkat MA.
8. Pengelola Risiko tingkat atas dapat melakukan analisis ulang terhadap risiko ekstraksi (misal: menilai ulang dampak dari perspektif tingkat atas) dan menyusun RTP tambahan jika diperlukan.

---

## 6. Desain Antarmuka Pengguna (UI/UX) - Wireframe Konsep

### 6.1. Struktur Navigasi Utama

Sistem dirancang dengan navigasi yang intuitif dan responsif. Struktur menu utama adalah:

```
┌─ Dashboard
│  ├─ Dashboard Risiko (Satker / MA)
│  └─ Widget KPI (Jumlah Risiko, Status, RTP, dll)
├─ Manajemen Risiko
│  ├─ Penetapan Konteks
│  ├─ Identifikasi Risiko
│  ├─ Analisis Risiko
│  ├─ Evaluasi Risiko
│  ├─ Respons Risiko (RTP)
│  └─ Peta Risiko
├─ Pemantauan
│  ├─ Pemantauan Realisasi RTP
│  ├─ Peristiwa Risiko
│  └─ Efektivitas Pengendalian
├─ Pelaporan
│  ├─ Laporan Semester
│  ├─ Laporan Tahunan
│  └─ Export Laporan (PDF/Excel)
├─ Administrasi (untuk Admin/Unit MR MA)
│  ├─ Manajemen Pengguna
│  ├─ Manajemen Unit Kerja
│  ├─ Master Data
│  └─ Audit Trail
└─ Bantuan & Pengaturan
   ├─ Panduan Pengguna
   ├─ FAQ
   └─ Pengaturan Profil
```

### 6.2. Tampilan Dashboard Risiko (Satker)

Dashboard Satker menampilkan gambaran risiko unit kerja secara ringkas:

**Elemen Utama:**
- **Header:** Nama satker, periode penerapan, selera risiko yang ditetapkan.
- **KPI Cards:**
  - Total Risiko Teridentifikasi
  - Risiko Prioritas (di atas selera risiko)
  - Realisasi RTP (%)
  - Peristiwa Risiko Tahun Ini
- **Peta Risiko Visual:** Matriks 5x5 dengan warna-kode status risiko.
- **Daftar Risiko Prioritas:** Tabel dengan kolom Kode, Pernyataan Risiko, Status, Penanggung Jawab, Target Penyelesaian RTP.
- **Grafik Tren:** Grafik garis menunjukkan perubahan jumlah risiko per bulan atau per semester.
- **Feedback dari Unit MR (MA):** Notifikasi atau panel yang menampilkan komentar/feedback dari Lini 2.

### 6.3. Tampilan Dashboard Konsolidasi (Unit Manajemen Risiko MA)

Dashboard MA menampilkan agregasi risiko dari semua satker:

**Elemen Utama:**
- **Header:** "Dashboard Risiko Lembaga", periode penerapan.
- **KPI Konsolidasi:**
  - Total Risiko Teridentifikasi (semua satker)
  - Risiko Prioritas (semua satker)
  - Risiko Ekstraksi (dari satker ke MA)
  - Realisasi RTP Rata-rata (%)
  - Peristiwa Risiko (semua satker)
- **Filter & Drill-Down:** Pengguna dapat memfilter berdasarkan:
  - Tingkat organisasi (Pengadilan Tingkat Pertama, Pengadilan Tingkat Banding, Eselon I).
  - Satker spesifik.
  - Status risiko.
  - Kategori risiko.
- **Peta Risiko Lembaga:** Matriks 5x5 konsolidasi dari semua satker.
- **Tabel Risiko Ekstraksi:** Menampilkan risiko yang diekstraksi dari satker dengan status verifikasi.
- **Analisis Tren:** Grafik menunjukkan tren risiko lintas satker, identifikasi risiko yang sama di berbagai satker.
- **Hotspot Analysis:** Menampilkan satker atau kategori risiko yang memiliki konsentrasi risiko tinggi.

### 6.4. Form Input Penilaian Risiko

Form untuk input identifikasi dan analisis risiko dirancang dengan:

**Identifikasi Risiko:**
- Dropdown untuk memilih risiko dari database standar atau input risiko baru.
- Field: Kode Risiko, Pernyataan Risiko, Kategori, Sumber, Penyebab Potensial, Dampak Potensial.
- Tombol: Simpan, Batal, Lihat Riwayat.

**Analisis Risiko:**
- Dropdown untuk memilih level kemungkinan (1-5) dengan deskripsi kriteria.
- Dropdown untuk memilih level dampak (1-5) dengan deskripsi kriteria.
- Tabel untuk mendata existing control dengan kolom: Nama Pengendalian, Jenis, Efektivitas (Efektif/Tidak Efektif).
- Sistem secara otomatis menampilkan Status Risiko berdasarkan matriks.
- Tombol: Simpan, Batal, Lihat Matriks.

**RTP (Rencana Tindak Pengendalian):**
- Field untuk Analisis Akar Masalah (RCA) - opsional dengan template 5 Whys atau Fishbone.
- Field untuk Kegiatan Pengendalian dengan deskripsi detail.
- Dropdown untuk Indikator Keluaran (target apa yang ingin dicapai).
- Dropdown untuk Penanggung Jawab (pilih dari daftar pegawai satker).
- Date Picker untuk Target Waktu Penyelesaian.
- Estimasi Level Kemungkinan dan Dampak setelah pengendalian (Treated Risk).
- Sistem secara otomatis menampilkan Status Risiko Setelah Pengendalian.
- Tombol: Simpan, Batal, Kirim ke Pemilik Risiko untuk Persetujuan.

### 6.5. Form Pemantauan

**Pemantauan Realisasi RTP:**
- Tabel daftar RTP dengan kolom: Kode Risiko, Kegiatan Pengendalian, Target Waktu, Status (Belum Dimulai/Sedang Berjalan/Selesai).
- Untuk setiap RTP, pengguna dapat:
  - Mengubah status realisasi.
  - Mengunggah bukti dukung (file, foto, dokumen).
  - Mencatat hambatan/kendala jika belum selesai.
  - Menambahkan catatan perkembangan.
- Tombol: Simpan, Batal.

**Peristiwa Risiko:**
- Form untuk mencatat insiden/risiko yang terjadi.
- Field: Nama Peristiwa, Tanggal Kejadian, Tempat, Pemicu, Kronologi, Skor Dampak Aktual, Penyebab Aktual.
- Sistem dapat secara otomatis mencocokkan peristiwa dengan risiko teridentifikasi (jika ada).
- Tombol: Simpan, Batal, Lihat Riwayat Peristiwa.

### 6.6. Tampilan Laporan

**Laporan Semester/Tahunan:**
- Laporan ditampilkan dalam format yang dapat dibaca di layar (HTML) dan dapat di-export ke PDF atau Word.
- Struktur laporan sesuai template standar (Lampiran 17-18).
- Elemen laporan mencakup:
  - Ringkasan eksekutif (KPI utama).
  - Daftar risiko teridentifikasi.
  - Analisis risiko (status, peta risiko).
  - Daftar RTP dan realisasinya.
  - Peristiwa risiko yang terjadi.
  - Analisis efektivitas pengendalian.
  - Rekomendasi untuk periode berikutnya.
- Tombol: Export PDF, Export Excel, Cetak, Kirim ke Pemilik Risiko.

---

## 7. Spesifikasi Backend dan Basis Data

### 7.1. Arsitektur Teknis Sistem

Sistem dirancang dengan arsitektur **Client-Server** berbasis web:

**Frontend:**
- Framework: React.js atau Vue.js (responsive, modern UI).
- State Management: Redux atau Vuex.
- Charting Library: Chart.js atau D3.js untuk visualisasi peta risiko dan grafik.
- Authentication: JWT (JSON Web Token) untuk session management.

**Backend:**
- Framework: Node.js (Express.js) atau Python (Django/FastAPI).
- API: RESTful API dengan dokumentasi OpenAPI/Swagger.
- Authentication & Authorization: Role-Based Access Control (RBAC).
- Database: PostgreSQL atau MySQL untuk data relasional.
- Caching: Redis untuk performa dashboard dan laporan.
- File Storage: S3 atau local storage untuk dokumen/bukti dukung.

**Infrastructure:**
- Server: Cloud-based (AWS, GCP, Azure) atau on-premise.
- Containerization: Docker untuk deployment yang konsisten.
- CI/CD: GitHub Actions atau Jenkins untuk automated testing dan deployment.
- Monitoring: ELK Stack atau Datadog untuk logging dan monitoring.

### 7.2. Entity-Relationship Diagram (ERD) - Konsep

Basis data dirancang dengan entitas utama:

```
┌─────────────────────────────────────────────────────────────────┐
│                          USERS                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK: user_id                                                     │
│ - username                                                      │
│ - email                                                         │
│ - password_hash                                                 │
│ - role (Admin, Pemilik Risiko, Pengelola Risiko, dll)          │
│ - unit_kerja_id (FK)                                           │
│ - status (Aktif/Nonaktif)                                      │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      UNIT_KERJA                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK: unit_kerja_id                                              │
│ - kode_unit                                                     │
│ - nama_unit                                                     │
│ - tingkat (Level 0/1/2/3)                                      │
│ - parent_unit_id (FK - untuk hierarki)                         │
│ - lokasi                                                        │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PENETAPAN_KONTEKS                            │
├─────────────────────────────────────────────────────────────────┤
│ PK: konteks_id                                                  │
│ - unit_kerja_id (FK)                                           │
│ - tahun_penerapan                                              │
│ - pemilik_risiko_id (FK)                                       │
│ - pengelola_risiko_id (FK)                                     │
│ - selera_risiko (1-5)                                          │
│ - status (Draft/Disetujui)                                     │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        RISIKO                                   │
├─────────────────────────────────────────────────────────────────┤
│ PK: risiko_id                                                   │
│ - konteks_id (FK)                                              │
│ - kode_risiko                                                   │
│ - pernyataan_risiko                                            │
│ - kategori_risiko                                              │
│ - sumber_risiko                                                │
│ - penyebab_risiko                                              │
│ - dampak_potensial                                             │
│ - status (Teridentifikasi/Dianalisis/Dievaluasi)              │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ANALISIS_RISIKO                              │
├─────────────────────────────────────────────────────────────────┤
│ PK: analisis_id                                                 │
│ - risiko_id (FK)                                               │
│ - level_kemungkinan (1-5)                                      │
│ - level_dampak (1-5)                                           │
│ - status_risiko (1-5)                                          │
│ - existing_control (deskripsi)                                 │
│ - efektivitas_control (Efektif/Tidak Efektif)                │
│ - di_atas_selera_risiko (Boolean)                             │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          RTP                                    │
├─────────────────────────────────────────────────────────────────┤
│ PK: rtp_id                                                      │
│ - analisis_id (FK)                                             │
│ - kegiatan_pengendalian                                        │
│ - indikator_keluaran                                           │
│ - penanggung_jawab_id (FK - Users)                            │
│ - target_waktu                                                 │
│ - level_kemungkinan_treated (1-5)                             │
│ - level_dampak_treated (1-5)                                  │
│ - status_risiko_treated (1-5)                                 │
│ - status_rtp (Draft/Disetujui/Sedang Berjalan/Selesai)       │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ FK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PEMANTAUAN_RTP                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK: pemantauan_id                                              │
│ - rtp_id (FK)                                                  │
│ - tanggal_realisasi                                            │
│ - status_realisasi (Belum Dimulai/Sedang/Selesai)             │
│ - bukti_dukung (file path)                                     │
│ - hambatan_kendala                                             │
│ - catatan_perkembangan                                         │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PERISTIWA_RISIKO                              │
├─────────────────────────────────────────────────────────────────┤
│ PK: peristiwa_id                                               │
│ - konteks_id (FK)                                              │
│ - risiko_id (FK - opsional, jika cocok dengan risiko teridentifikasi)
│ - nama_peristiwa                                               │
│ - tanggal_kejadian                                             │
│ - tempat_kejadian                                              │
│ - pemicu_peristiwa                                             │
│ - kronologi                                                     │
│ - skor_dampak_aktual (1-5)                                    │
│ - penyebab_aktual                                              │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   EFEKTIVITAS_PENGENDALIAN                      │
├─────────────────────────────────────────────────────────────────┤
│ PK: efektivitas_id                                             │
│ - analisis_id (FK)                                             │
│ - status_risiko_treated (dari RTP)                            │
│ - status_risiko_aktual (dari peristiwa risiko)                │
│ - efektif (Boolean)                                            │
│ - deviasi (selisih status)                                     │
│ - rekomendasi                                                  │
│ - tahun (untuk evaluasi tahunan)                              │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        LAPORAN                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK: laporan_id                                                  │
│ - konteks_id (FK)                                              │
│ - tipe_laporan (Semester/Tahunan)                             │
│ - periode                                                       │
│ - status (Draft/Disetujui/Dikirim)                            │
│ - file_path (PDF/Word)                                         │
│ - created_at, updated_at                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      AUDIT_LOG                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK: log_id                                                      │
│ - user_id (FK)                                                 │
│ - action (Create/Update/Delete/View)                          │
│ - entity_type (Risiko/RTP/Laporan/dll)                        │
│ - entity_id                                                     │
│ - old_value (untuk tracking perubahan)                         │
│ - new_value                                                     │
│ - timestamp                                                     │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3. API Endpoints Utama

**Authentication:**
- `POST /api/auth/login` - Login pengguna
- `POST /api/auth/logout` - Logout
- `POST /api/auth/refresh-token` - Refresh JWT token

**Manajemen Pengguna:**
- `GET /api/users` - Daftar pengguna (Admin only)
- `POST /api/users` - Buat pengguna baru (Admin only)
- `PUT /api/users/{user_id}` - Update profil pengguna
- `DELETE /api/users/{user_id}` - Hapus pengguna (Admin only)

**Manajemen Unit Kerja:**
- `GET /api/unit-kerja` - Daftar unit kerja
- `GET /api/unit-kerja/{unit_id}` - Detail unit kerja
- `POST /api/unit-kerja` - Buat unit kerja (Admin only)
- `PUT /api/unit-kerja/{unit_id}` - Update unit kerja (Admin only)

**Penetapan Konteks:**
- `GET /api/konteks` - Daftar penetapan konteks (sesuai akses pengguna)
- `POST /api/konteks` - Buat penetapan konteks baru
- `PUT /api/konteks/{konteks_id}` - Update penetapan konteks
- `POST /api/konteks/{konteks_id}/approve` - Setujui penetapan konteks (Pemilik Risiko)

**Penilaian Risiko:**
- `GET /api/risiko` - Daftar risiko (sesuai akses pengguna)
- `POST /api/risiko` - Identifikasi risiko baru
- `PUT /api/risiko/{risiko_id}` - Update risiko
- `POST /api/risiko/{risiko_id}/analisis` - Input analisis risiko
- `GET /api/risiko/peta` - Generate peta risiko
- `GET /api/risiko/prioritas` - Daftar risiko prioritas

**RTP:**
- `GET /api/rtp` - Daftar RTP (sesuai akses pengguna)
- `POST /api/rtp` - Buat RTP baru
- `PUT /api/rtp/{rtp_id}` - Update RTP
- `POST /api/rtp/{rtp_id}/approve` - Setujui RTP (Pemilik Risiko)

**Pemantauan:**
- `GET /api/pemantauan/rtp` - Daftar pemantauan RTP
- `PUT /api/pemantauan/rtp/{pemantauan_id}` - Update realisasi RTP
- `POST /api/peristiwa-risiko` - Catat peristiwa risiko
- `GET /api/peristiwa-risiko` - Daftar peristiwa risiko

**Laporan:**
- `GET /api/laporan` - Daftar laporan (sesuai akses pengguna)
- `GET /api/laporan/{laporan_id}` - Detail laporan
- `POST /api/laporan/generate-semester` - Generate laporan semester
- `POST /api/laporan/generate-tahunan` - Generate laporan tahunan
- `GET /api/laporan/{laporan_id}/export-pdf` - Export laporan ke PDF
- `GET /api/laporan/{laporan_id}/export-excel` - Export laporan ke Excel

**Dashboard & Konsolidasi (untuk Unit MR MA):**
- `GET /api/dashboard/konsolidasi` - Dashboard konsolidasi lembaga
- `GET /api/risiko/ekstraksi` - Daftar risiko ekstraksi
- `GET /api/analytics/tren` - Analisis tren risiko
- `GET /api/analytics/hotspot` - Identifikasi hotspot risiko

**Master Data:**
- `GET /api/master/kriteria-kemungkinan` - Daftar kriteria kemungkinan
- `GET /api/master/kriteria-dampak` - Daftar kriteria dampak
- `GET /api/master/matriks-risiko` - Matriks risiko 5x5
- `GET /api/master/kategori-risiko` - Daftar kategori risiko
- `GET /api/master/database-risiko` - Database risiko standar

---

*Catatan: Dokumen ini adalah draf pengembangan yang mencakup struktur levelling risiko, role user satker vs MA, alur kerja, desain UI/UX konsep, dan spesifikasi backend. Iterasi berikutnya akan mencakup detail wireframe UI, data flow diagram, dan spesifikasi teknis lebih mendalam.*
