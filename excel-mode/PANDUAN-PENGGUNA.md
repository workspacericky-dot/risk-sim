# Panduan Pengguna Aplikasi Risk-Sim
## Sistem Manajemen Risiko — Mahkamah Agung RI

**Versi**: 1.0 | **Tanggal**: April 2026

---

## Daftar Isi

1. [Gambaran Umum Aplikasi](#1-gambaran-umum-aplikasi)
2. [Masuk ke Sistem (Login)](#2-masuk-ke-sistem-login)
3. [Navigasi Utama](#3-navigasi-utama)
4. [Beranda — Executive Dashboard](#4-beranda--executive-dashboard)
5. [Alur Kerja Manajemen Risiko](#5-alur-kerja-manajemen-risiko)
   - [Langkah 1 — Penetapan Konteks](#langkah-1--penetapan-konteks)
   - [Langkah 2 — Identifikasi Risiko](#langkah-2--identifikasi-risiko)
   - [Langkah 2b — Identifikasi Penyebab Risiko](#langkah-2b--identifikasi-penyebab-risiko)
   - [Langkah 3 — Analisis Risiko](#langkah-3--analisis-risiko)
   - [Langkah 4 — Penetapan Selera Risiko](#langkah-4--penetapan-selera-risiko)
   - [Langkah 5 — Evaluasi Risiko](#langkah-5--evaluasi-risiko)
   - [Langkah 6 — Rencana Tindak Pengendalian (RTP)](#langkah-6--rencana-tindak-pengendalian-rtp)
6. [Fitur Tambahan](#6-fitur-tambahan)
   - [Peta Risiko](#peta-risiko)
   - [Monitoring Risiko](#monitoring-risiko)
   - [Laporan Eksekutif](#laporan-eksekutif)
7. [Administrasi](#7-administrasi)
   - [Master Unit Kerja](#master-unit-kerja)
   - [Manajemen Pengguna](#manajemen-pengguna)
8. [Tips & Catatan Penting](#8-tips--catatan-penting)

---

## 1. Gambaran Umum Aplikasi

Risk-Sim adalah sistem manajemen risiko berbasis web yang dirancang khusus untuk satuan kerja di lingkungan Mahkamah Agung RI. Aplikasi ini mengikuti **siklus manajemen risiko** standar yang terdiri dari enam langkah berurutan:

```
Penetapan Konteks
       ↓
Identifikasi Risiko  ←→  Identifikasi Penyebab (5-Why)
       ↓
Analisis Risiko  ←→  Penetapan Selera Risiko
       ↓
Evaluasi Risiko
       ↓
Rencana Tindak Pengendalian
```

Setiap langkah menghasilkan dokumen yang merujuk pada **Lampiran Pedoman** yang berlaku, sehingga keluaran aplikasi langsung siap digunakan sebagai dokumen pelaporan resmi.

---

## 2. Masuk ke Sistem (Login)

### Cara Login

1. Buka aplikasi melalui peramban web (Chrome atau Edge disarankan).
2. Pada halaman masuk, isi dua kolom berikut:
   - **Email Pengguna** — gunakan format email resmi institusi: `pn-[kode]@mahkamahagung.go.id`
   - **Kata Sandi** — kata sandi akun Anda
3. Klik tombol **Masuk**.
4. Jika berhasil, Anda akan langsung diarahkan ke halaman **Beranda (Dashboard)**.

### Catatan

- Jika muncul pesan kesalahan, periksa kembali email dan kata sandi Anda.
- Akun baru dibuat oleh administrator sistem — hubungi admin jika belum memiliki akun.
- Sesi login akan berakhir secara otomatis; jika halaman tiba-tiba meminta login ulang, itu normal.

---

## 3. Navigasi Utama

### Panel Samping (Sidebar)

Setelah login, panel navigasi muncul di sisi kiri layar. Panel ini dapat **diperlebar** dengan mengarahkan kursor ke atasnya, dan akan **mengecil** kembali saat kursor berpindah.

Struktur menu:

| Ikon | Menu | Keterangan |
|------|------|------------|
| 🏠 | **Beranda** | Halaman ringkasan executive dashboard |
| **Manajemen Risiko** | | |
| ▶ | Mulai | Masuk ke alur kerja manajemen risiko (Penetapan Konteks) |
| 🗺 | Peta Risiko | Visualisasi heatmap risiko per satuan kerja |
| 📊 | Monitoring Risiko | Sub-modul monitoring (Coming Soon) |
| 📄 | Laporan Eksekutif | Ekspor laporan terpadu |
| **Administrasi** | | |
| 🏢 | Master Unit Kerja | Kelola data satuan kerja |
| 👥 | Manajemen Pengguna | Lihat daftar pengguna sistem |
| 🚪 | Keluar | Logout dari sistem |

### Konteks Aktif

Setiap kali Anda bekerja dalam satu konteks risiko (tahun dan satuan kerja tertentu), identitas konteks tersebut akan **terbawa otomatis** di URL (`?konteks=...`). Ini memastikan semua data yang Anda masukkan tersimpan di konteks yang benar tanpa perlu memilih ulang di setiap langkah.

---

## 4. Beranda — Executive Dashboard

Halaman beranda menampilkan **ringkasan menyeluruh** kondisi manajemen risiko di seluruh satuan kerja dalam bentuk visualisasi. Halaman ini bersifat **hanya baca** dan ditujukan untuk pimpinan atau pengelola risiko yang ingin melihat gambaran besar.

Tidak ada tindakan yang perlu dilakukan di halaman ini. Untuk mulai bekerja pada data risiko, gunakan menu **Mulai** di panel samping.

---

## 5. Alur Kerja Manajemen Risiko

---

### Langkah 1 — Penetapan Konteks

**Referensi**: Langkah pertama dalam siklus manajemen risiko  
**Tujuan**: Menetapkan sasaran dan parameter risiko tahunan untuk satu satuan kerja

#### Membuka Halaman

Klik **Mulai** di panel samping untuk membuka halaman Penetapan Konteks.

#### Daftar Konteks yang Ada

Di bagian atas halaman, Anda akan melihat daftar konteks yang sudah pernah dibuat. Setiap baris menampilkan:
- **Tahun** penerapan (dalam bentuk label berwarna)
- **Nama satuan kerja**
- **Nama pemilik risiko**
- **Periode** mulai dan selesai
- **Status** (misalnya: Disetujui)
- Tombol aksi: **Selera** dan **Identifikasi Risiko →**

#### Membuat Konteks Baru

Isi formulir di bawah daftar dengan:

| Kolom | Keterangan |
|-------|------------|
| **Unit Kerja** | Pilih satuan kerja dari daftar yang tersedia |
| **Tahun Penerapan** | Tahun pelaksanaan manajemen risiko (misal: 2026) |
| **Sasaran Strategis** | Tuliskan sasaran utama satuan kerja untuk tahun tersebut |
| **Periode** | Tanggal mulai dan selesai periode risiko |
| **Nama Pemilik Risiko** | Nama pejabat yang bertanggung jawab atas risiko |

Klik tombol **Simpan** setelah semua kolom terisi.

#### Melanjutkan ke Langkah Berikutnya

Dari baris konteks yang sudah ada, klik:
- **Selera** → untuk menetapkan selera risiko (dapat dilakukan kapan saja setelah konteks dibuat)
- **Identifikasi Risiko →** → untuk masuk ke langkah identifikasi risiko

---

### Langkah 2 — Identifikasi Risiko

**Referensi Dokumen**: Lampiran Pedoman No. 5  
**Tujuan**: Mendaftarkan seluruh risiko yang teridentifikasi dalam register risiko

#### Kondisi Awal

Halaman ini hanya dapat diakses jika sudah memiliki konteks aktif. Jika belum, sistem akan menampilkan pesan peringatan.

#### Formulir Tambah Risiko (Panel Kiri)

Isi kolom-kolom berikut untuk menambahkan satu risiko:

| Kolom | Keterangan |
|-------|------------|
| **Proses Bisnis / Sasaran** | Pilih sasaran strategis atau proses bisnis yang terdampak |
| **Pernyataan Risiko** | Tuliskan pernyataan risiko secara singkat dan jelas (wajib diisi) |
| **Kategori Risiko** | Pilih satu dari tujuh kategori yang tersedia |
| **Uraian Dampak** | Jelaskan dampak yang terjadi jika risiko ini terwujud |
| **Metode Pencapaian SPIP** | Pilih metode pencapaian sesuai konteks risiko |
| **Sumber Risiko** | Tuliskan sumber atau pemicu risiko (opsional) |

**Tujuh Kategori Risiko** yang tersedia:
- Risiko Strategis
- Risiko Kebijakan
- Risiko Kecurangan
- Risiko Bencana
- Risiko Kepatuhan
- Risiko Operasional
- Risiko Kemitraan

**Empat Metode Pencapaian SPIP**:
- Efektivitas dan Efisiensi Operasi
- Keandalan Pelaporan Keuangan
- Pengamanan Aset Negara
- Ketaatan terhadap Peraturan

Klik **+ Simpan ke Register Risiko** untuk menyimpan risiko yang baru diinput.

#### Register Risiko (Tabel Utama)

Setiap risiko yang tersimpan akan muncul di tabel sebelah kanan dengan kolom-kolom berikut:

| Kolom | Keterangan |
|-------|------------|
| No | Nomor urut |
| Nama Konteks (Kol. 2) | Sasaran strategis / proses bisnis |
| Indikator (Kol. 3) | Indikator kinerja terkait |
| Kode Risiko (Kol. 4) | Kode otomatis yang digenerate sistem |
| Pernyataan Risiko (Kol. 5) | Pernyataan risiko |
| Kategori (Kol. 6) | Label kategori risiko |
| Uraian Dampak (Kol. 7) | Uraian dampak |
| Metode SPIP (Kol. 8) | Metode pencapaian SPIP |
| Penyebab Risiko | Tombol **Identifikasi Penyebab** (lihat Langkah 2b) |
| Nama & Jabatan Pemilik Risiko | Dapat diisi langsung di tabel (klik sel untuk mengedit) |
| Nama & Jabatan Pengelola Risiko | Dapat diisi langsung di tabel (klik sel untuk mengedit) |
| Hapus | Tombol hapus risiko dari register |

#### Mengedit Data Langsung di Tabel

Kolom **Nama Pemilik Risiko**, **Jabatan Pemilik**, **Nama Pengelola Risiko**, dan **Jabatan Pengelola** dapat diedit langsung dengan mengklik sel yang diinginkan. Perubahan tersimpan otomatis setelah Anda selesai mengetik dan berpindah ke sel lain.

#### Melanjutkan ke Analisis Risiko

Tombol **Analisis Risiko →** di bagian atas kanan halaman akan aktif jika minimal satu risiko sudah terdaftar. Klik tombol tersebut untuk melanjutkan.

---

### Langkah 2b — Identifikasi Penyebab Risiko

**Referensi Dokumen**: Lampiran Pedoman No. 9  
**Tujuan**: Menggali akar penyebab setiap risiko menggunakan metode **5 Why**

#### Cara Mengakses

Dari tabel register risiko (Langkah 2), klik tombol **Identifikasi Penyebab** pada baris risiko yang ingin dianalisis. Anda akan berpindah ke halaman khusus untuk risiko tersebut.

#### Memahami Metode 5 Why

Metode 5 Why bekerja dengan cara menanyakan "mengapa?" secara berulang hingga menemukan **akar masalah sesungguhnya**:

```
Mengapa risiko terjadi? → Why 1
  Mengapa itu terjadi?  → Why 2
    Mengapa itu terjadi?  → Why 3
      Mengapa itu terjadi?  → Why 4
                              ↓
                        Akar Penyebab Final
```

#### Kolom dalam Tabel Penyebab

| Kolom | Keterangan |
|-------|------------|
| **Why 1 — Why 4** | Rangkaian pertanyaan "mengapa" secara berurutan |
| **Akar Penyebab Final** | Penyebab paling mendasar yang ditemukan |
| **Kode Penyebab** | Kode otomatis berformat `[kode risiko].[kategori 5M+EX].[nomor urut]` |
| **Kegiatan Pengendalian** | Rencana aktivitas pengendalian untuk mengatasi akar penyebab ini |

#### Kategori Sumber Penyebab (5M+EX)

| Kode | Kategori | Keterangan |
|------|----------|------------|
| MN | Orang (Manpower) | Penyebab dari faktor sumber daya manusia |
| MY | Dana (Money) | Penyebab dari faktor keuangan |
| MD | Metode (Method) | Penyebab dari faktor prosedur/proses |
| MR | Bahan (Material) | Penyebab dari faktor bahan/data |
| MC | Mesin (Machine) | Penyebab dari faktor perangkat/infrastruktur |
| EX | Eksternal | Penyebab dari faktor di luar kendali organisasi |

#### Menambah dan Menghapus Baris

- Klik **+ Tambah Baris** untuk menambahkan satu set analisis baru (misalnya jika satu risiko memiliki lebih dari satu akar penyebab)
- Klik ikon hapus di baris untuk menghapus analisis yang tidak diperlukan

#### Setelah Selesai

Klik tombol kembali (← ) atau navigasi halaman untuk kembali ke register risiko dan melanjutkan ke risiko berikutnya. Langkah ini **opsional** namun sangat direkomendasikan karena hasil analisis penyebab akan digunakan secara otomatis di **Rencana Tindak Pengendalian** (Langkah 6).

---

### Langkah 3 — Analisis Risiko

**Referensi Dokumen**: Lampiran Pedoman No. 6  
**Tujuan**: Memberikan skor kemungkinan dan dampak pada setiap risiko untuk menghitung tingkat risiko

#### Skala Penilaian

Kemungkinan dan dampak dinilai menggunakan **skala 1 hingga 5**:

| Nilai | Kemungkinan | Dampak |
|-------|------------|--------|
| 1 | Sangat Jarang | Sangat Rendah |
| 2 | Jarang | Rendah |
| 3 | Kadang-Kadang | Sedang |
| 4 | Sering | Tinggi |
| 5 | Hampir Pasti | Sangat Tinggi |

**Besaran Risiko** dihitung otomatis: `Kemungkinan × Dampak` (rentang 1–25)

#### Level Risiko Berdasarkan Skor

| Level | Skor | Keterangan | Warna |
|-------|------|-----------|-------|
| 1 | 1–4 | Sangat Rendah | Hijau |
| 2 | 5–9 | Rendah | Kuning Muda |
| 3 | 10–14 | Sedang | Kuning |
| 4 | 15–19 | Tinggi | Oranye |
| 5 | 20–25 | Sangat Tinggi | Merah |

#### Yang Perlu Diisi per Risiko

Untuk setiap risiko, Anda perlu mengisi dua blok penilaian:

**A. Risiko Awal (Inherent Risk)**

| Kolom | Keterangan |
|-------|------------|
| Kemungkinan Awal | Nilai 1–5 sebelum adanya pengendalian |
| Dampak Awal | Nilai 1–5 sebelum adanya pengendalian |
| Besaran Awal | Otomatis dihitung (Kemungkinan × Dampak) |

**B. Pengendalian Saat Ini**

Evaluasi kualitas pengendalian yang sudah ada:

| Kolom | Pilihan |
|-------|---------|
| Keandalan Desain | Memadai / Kurang Memadai / Tidak Memadai |
| Keandalan Operasi | Memadai / Kurang Memadai / Tidak Memadai |
| Keterkaitan | Terkait / Tidak Terkait |
| Efektivitas | Efektif / Tidak Efektif |

**C. Risiko Residu (Residual Risk)**

Penilaian setelah memperhitungkan pengendalian yang ada:

| Kolom | Keterangan |
|-------|------------|
| Kemungkinan Residu | Nilai 1–5 setelah pengendalian |
| Dampak Residu | Nilai 1–5 setelah pengendalian |
| Besaran Residu | Otomatis dihitung |

**D. Keterangan** — kolom teks bebas untuk catatan tambahan

#### Cara Mengedit

Semua nilai diisi langsung di tabel. Setiap perubahan tersimpan otomatis ke sistem tanpa perlu menekan tombol simpan.

#### Melanjutkan ke Evaluasi

Tombol **Evaluasi Risiko →** akan aktif jika minimal satu risiko sudah memiliki analisis lengkap.

---

### Langkah 4 — Penetapan Selera Risiko

**Tujuan**: Menetapkan ambang batas nilai risiko yang masih dapat ditoleransi per kategori risiko

#### Cara Mengakses

Ada dua cara untuk membuka halaman ini:
1. Dari halaman **Penetapan Konteks**: klik tombol **Selera** pada baris konteks yang diinginkan
2. Dari halaman **Evaluasi Risiko**: klik ikon **Selera Risiko** di pojok kanan atas

#### Pengaturan Ambang Batas

Untuk setiap **tujuh kategori risiko**, tentukan nilai ambang batas (skala 1–25 sesuai matriks risiko 5×5):

| Kategori Risiko | Ambang Batas (isi nilai 1–25) |
|----------------|-------------------------------|
| Risiko Strategis | _______ |
| Risiko Kebijakan | _______ |
| Risiko Kecurangan | _______ |
| Risiko Bencana | _______ |
| Risiko Kepatuhan | _______ |
| Risiko Operasional | _______ |
| Risiko Kemitraan | _______ |

**Contoh**: Jika selera risiko strategis ditetapkan **8**, maka risiko dengan skor residu di atas 8 akan otomatis masuk ke **daftar risiko prioritas**.

#### Visualisasi Matriks Risiko

Di halaman ini terdapat **matriks 5×5 interaktif** yang menampilkan garis ambang batas secara visual. Ini membantu memastikan ambang batas yang Anda tetapkan sesuai dengan toleransi yang diinginkan.

#### Kolom Catatan

Tersedia kolom **Catatan** untuk mendokumentasikan dasar pertimbangan penetapan selera risiko.

Klik **Simpan** setelah semua ambang batas terisi.

> **Kapan harus dilakukan?** Selera risiko idealnya ditetapkan **sebelum** atau **bersamaan** dengan Analisis Risiko, agar evaluasi risiko dapat berjalan dengan referensi yang tepat.

---

### Langkah 5 — Evaluasi Risiko

**Referensi Dokumen**: Lampiran Pedoman No. 7  
**Tujuan**: Mengidentifikasi risiko-risiko yang melebihi ambang batas selera risiko dan menetapkannya sebagai risiko prioritas

#### Ringkasan di Bagian Atas

Halaman ini menampilkan tiga kartu ringkasan:
- **Total Risiko** — jumlah seluruh risiko yang terdaftar
- **Sudah Dianalisis** — jumlah risiko yang sudah memiliki skor
- **Risiko Prioritas** — jumlah risiko yang melampaui selera risiko (ditampilkan dalam lencana merah)

#### Tabel Daftar Risiko Prioritas

Hanya risiko dengan **skor residu > selera risiko kategorinya** yang muncul di tabel ini. Tabel diurutkan dari risiko dengan skor tertinggi (paling mendesak) ke terendah.

Kolom-kolom dalam tabel:

| Kolom | Keterangan |
|-------|------------|
| **Kode** | Kode unik risiko |
| **Pernyataan Risiko** | Pernyataan risiko beserta sasaran, indikator, proses, dan kategori |
| | Tampilan perbandingan: `selera: [X] · nilai: [Y]` |
| **Kemungkinan Residu** | Skor kemungkinan setelah pengendalian |
| **Dampak Residu** | Skor dampak setelah pengendalian |
| **Level Risiko** | Label warna sesuai tingkat risiko (Sangat Rendah s.d. Sangat Tinggi) |

#### Jika Tabel Kosong

Jika muncul pesan "✓ Tidak ada risiko di atas selera risiko", artinya semua risiko sudah berada dalam ambang toleransi yang ditetapkan. Anda tidak perlu membuat RTP untuk siklus ini (atau bisa meninjau ulang nilai selera risiko jika dirasa terlalu longgar).

#### Tombol Aksi

Di pojok kanan atas terdapat tiga tombol:
- **Selera Risiko** — buka/ubah selera risiko
- **Peta Risiko** — lihat visualisasi heatmap risiko (5×5 matriks)
- **Rencana Tindak Pengendalian** — lanjut ke langkah berikutnya

---

### Langkah 6 — Rencana Tindak Pengendalian (RTP)

**Referensi Dokumen**: Lampiran Pedoman No. 10  
**Tujuan**: Merencanakan kegiatan mitigasi untuk setiap akar penyebab dari risiko prioritas

#### Cara Mengakses

Dari halaman Evaluasi Risiko, klik ikon **Rencana Tindak Pengendalian** atau tombol navigasi ke RTP.

#### Memahami Struktur Tabel RTP

Tabel RTP tersusun berdasarkan **setiap akar penyebab** dari risiko prioritas (bukan per risiko). Artinya, satu risiko bisa memiliki beberapa baris jika memiliki beberapa akar penyebab.

#### Kolom yang Perlu Diisi

| Kolom | Keterangan |
|-------|------------|
| **Kode Penyebab** | Terisi otomatis dari analisis penyebab (5 Why) |
| **Pernyataan Risiko** | Terisi otomatis |
| **Respons Risiko** | Terisi otomatis: "Mengurangi Frekuensi" atau "Mengurangi Dampak" |
| **Akar Penyebab** | Terisi otomatis dari analisis 5 Why |
| **Kegiatan Pengendalian** | Terisi otomatis dari hasil identifikasi penyebab |
| **Klasifikasi SPIP** | Pilih klasifikasi (misal: Lingkungan Pengendalian) |
| **Penanggung Jawab** | Nama pejabat/unit yang bertanggung jawab |
| **Indikator Keluaran** | Target/bukti penyelesaian kegiatan |
| **Target Waktu** | Semester target penyelesaian |
| **Frekuensi Rencana** | Nilai 1–5: target kemungkinan setelah mitigasi |
| **Dampak Rencana** | Nilai 1–5: target dampak setelah mitigasi |
| **Besaran Target** | Otomatis dihitung (Frekuensi × Dampak) |

#### Cara Mengisi dan Menyimpan

1. Isi kolom-kolom yang dapat diedit di setiap baris.
2. Klik tombol **Simpan** di baris yang bersangkutan untuk menyimpan perubahan pada baris tersebut.
3. Lakukan hal yang sama untuk setiap baris yang ada.

> **Respons Risiko** ditetapkan otomatis oleh sistem:
> - Jika **kemungkinan residu ≥ dampak residu** → "Mengurangi Frekuensi"
> - Jika **dampak residu > kemungkinan residu** → "Mengurangi Dampak"

---

## 6. Fitur Tambahan

### Peta Risiko

**Tujuan**: Visualisasi posisi seluruh risiko dalam matriks 5×5 (heatmap)

#### Cara Mengakses

- **Panel Samping**: Klik menu **Peta Risiko** → sebuah panel akan muncul dari sisi kanan layar
- **Halaman Evaluasi**: Klik ikon peta risiko di pojok kanan atas

#### Cara Menggunakan

1. Pada panel yang muncul, gunakan kolom pencarian atau dropdown untuk **memilih satuan kerja**.
2. Matriks 5×5 akan menampilkan titik-titik risiko berdasarkan posisi kemungkinan dan dampak residunya.
3. Setiap titik diberi **label kode risiko** dan warna sesuai tingkat risikonya.
4. Arahkan kursor ke titik risiko untuk melihat **tooltip** berisi pernyataan risiko lengkap.

Fitur ini berguna untuk presentasi kepada pimpinan atau rapat koordinasi.

---

### Monitoring Risiko

**Tujuan**: Melacak perkembangan pengendalian risiko secara berkala

Halaman ini menampilkan tiga sub-modul yang saat ini dalam tahap pengembangan:

| Sub-modul | Fungsi |
|-----------|--------|
| **Monitoring RTP** | Memantau kemajuan pelaksanaan kegiatan pengendalian dalam RTP |
| **Monitoring Loss Event** | Mencatat kejadian kerugian aktual yang terjadi |
| **Monitoring Level Risiko** | Memantau tren perubahan level risiko dari waktu ke waktu |

Navigasi antar sub-modul menggunakan tombol panah kiri/kanan atau titik-titik indikator di bawah kartu.

> Sub-modul ini akan segera tersedia dalam pembaruan sistem berikutnya.

---

### Laporan Eksekutif

**Tujuan**: Menampilkan dan mengekspor database risiko terpadu dari seluruh satuan kerja

#### Isi Laporan

Tabel utama menggabungkan data dari seluruh tahapan manajemen risiko:

| Kolom | Keterangan |
|-------|------------|
| **Tahun** | Tahun penerapan konteks |
| **Satker** | Nama dan level satuan kerja |
| **Pernyataan Risiko** | Pernyataan risiko |
| **Skor Awal** | Besaran risiko inherent (sebelum pengendalian) |
| **Prioritas?** | Ya/Tidak — apakah risiko melebihi selera risiko |
| **Mitigasi (RTP)** | Kegiatan pengendalian yang direncanakan |
| **Skor Target** | Besaran risiko yang ditargetkan setelah mitigasi |

#### Mengekspor Laporan

Klik tombol **Export** untuk mengunduh laporan dalam format yang tersedia.

---

## 7. Administrasi

Menu administrasi biasanya hanya dapat diakses oleh pengguna dengan hak akses admin atau koordinator.

### Master Unit Kerja

**Tujuan**: Mengelola data hierarki satuan kerja dalam sistem

#### Menambah Satuan Kerja Baru

Isi formulir di sisi kiri dengan kolom-kolom berikut:

| Kolom | Keterangan |
|-------|------------|
| **Kode Unit** | Kode unik satuan kerja (wajib) |
| **Nama Unit Kerja** | Nama lengkap satuan kerja (wajib) |
| **Tingkat Struktur** | Level dalam hierarki organisasi |
| **Unit Induk / Parent** | Satuan kerja induk dalam struktur organisasi |
| **Lokasi / Kota** | Kota kedudukan satuan kerja |

**Tingkat Struktur** yang tersedia:

| Level | Keterangan |
|-------|------------|
| Level 3 | Mahkamah Agung Pusat |
| Level 2 | Eselon I / Direktorat Jenderal |
| Level 1 | Pengadilan Tingkat Banding |
| Level 0 | Pengadilan Tingkat Pertama |

Klik **Simpan Unit Kerja** untuk menyimpan data.

#### Daftar Satuan Kerja

Tabel di sisi kanan menampilkan seluruh satuan kerja yang terdaftar beserta kode, nama, tingkat (label berwarna sesuai level), dan unit induknya. Tabel menampilkan **100 data per halaman** dengan navigasi halaman di bagian bawah.

---

### Manajemen Pengguna

**Tujuan**: Melihat daftar pengguna yang terdaftar dalam sistem

#### Informasi yang Ditampilkan

| Kolom | Keterangan |
|-------|------------|
| **Nama Lengkap** | Nama lengkap pengguna |
| **Email** | Alamat email login |
| **Role / Hak Akses** | Peran pengguna dalam sistem (ditampilkan sebagai lencana) |
| **Unit Kerja** | Satuan kerja yang ditugaskan kepada pengguna |
| **Status** | Aktif (hijau) / Nonaktif (abu-abu) |

> Penambahan akun pengguna baru dilakukan melalui panel admin Supabase dan tidak dapat dilakukan langsung dari halaman ini. Hubungi administrator sistem untuk pembuatan akun baru.

---

## 8. Tips & Catatan Penting

### Alur yang Disarankan

Ikuti urutan langkah berikut untuk satu siklus manajemen risiko yang lengkap:

```
1. Buat Konteks → 2. Identifikasi Risiko → 2b. Analisis Penyebab (5 Why)
→ 3. Analisis Risiko → 4. Tetapkan Selera Risiko → 5. Evaluasi Risiko
→ 6. Buat RTP
```

### Hal-hal yang Perlu Diperhatikan

- **Konteks** adalah "wadah" utama semua data risiko. Pastikan konteks yang Anda pilih sudah benar sebelum mulai mengisi data.
- **Kode Risiko** dibuat otomatis oleh sistem dan tidak perlu diisi manual.
- **Skor risiko** selalu dihitung otomatis dari nilai kemungkinan dan dampak yang Anda masukkan.
- Pengisian **Identifikasi Penyebab (5 Why)** di Langkah 2b akan **mengisi otomatis** kolom-kolom di RTP (Langkah 6). Sangat disarankan untuk dilakukan sebelum membuat RTP.
- Seluruh perubahan di tabel-tabel yang bisa diedit langsung (inline editing) **tersimpan otomatis** — tidak perlu menekan tombol Simpan setiap saat, kecuali di RTP.

### Mencetak Dokumen

Halaman-halaman dalam aplikasi dioptimalkan untuk cetak. Untuk mencetak halaman tertentu:
1. Tekan `Ctrl + P` (Windows) dari halaman yang ingin dicetak.
2. Pilih printer atau pilih "Save as PDF" untuk menyimpan sebagai PDF.
3. Header kop surat Mahkamah Agung RI akan muncul otomatis pada hasil cetak.

### Jika Terjadi Masalah

| Masalah | Solusi |
|---------|--------|
| Halaman meminta login ulang | Sesi berakhir — login kembali; data yang sudah tersimpan tidak hilang |
| Tombol "Lanjut" tidak aktif | Pastikan minimal satu data sudah tersimpan di langkah sebelumnya |
| Data tidak muncul di tabel | Periksa apakah konteks yang dipilih sudah benar |
| Tidak bisa menambah pengguna | Pembuatan akun hanya bisa dilakukan oleh administrator sistem |

---

*Dokumen panduan ini mencakup fitur manajemen risiko untuk pengguna reguler (pemilik risiko dan pengelola risiko). Fitur-fitur yang berkaitan dengan fungsi audit internal tidak tercakup dalam panduan ini.*

---

**Risk-Sim** | Sistem Manajemen Risiko Mahkamah Agung RI  
Dikembangkan untuk mendukung tata kelola risiko yang efektif dan akuntabel.
