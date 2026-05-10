# Workflow Aplikasi Manajemen Risiko — Mahkamah Agung RI

> **Risk-Sim** | Sistem Manajemen Risiko Berbasis SPIP (PP No. 60 Tahun 2008)
> Dokumen ini menjelaskan alur kerja aplikasi secara menyeluruh: dari pengaturan konteks hingga pelaporan eksekutif.

---

## A. Ringkasan Workflow

### Gambaran Umum

Risk-Sim adalah platform manajemen risiko berbasis web yang mengimplementasikan siklus SPIP (Sistem Pengendalian Intern Pemerintah) secara digital. Aplikasi ini mencakup seluruh tahapan manajemen risiko mulai dari penetapan konteks hingga rencana tindak pengendalian, dilengkapi modul audit dan pelaporan eksekutif.

### Siklus Utama (Linear)

```
[1] Penetapan Konteks
         ↓
[2] Penetapan Selera Risiko
         ↓
[3] Identifikasi Risiko
         ↓
[4] Identifikasi Penyebab (5-Whys, per risiko)
         ↓
[5] Analisis Risiko (matriks 5×5)
         ↓
[6] Evaluasi Risiko (filter vs. selera)
         ↓
[7] Evaluasi Pengendalian Utama
         ↓
[8] Program Kerja Audit
         ↓
[9] Rencana Tindak Pengendalian (RTP)
```

### Modul Mandiri (dapat diakses kapan saja)

| Modul | Keterangan |
|-------|-----------|
| **Peta Risiko** | Visualisasi heatmap 5×5 seluruh risiko pada satu konteks |
| **Maturitas Manajemen Risiko** | Penilaian tingkat kapabilitas MR satuan kerja (level 1–5) |
| **Monitoring Risiko** | Dashboard monitoring RTP (dalam pengembangan) |
| **Laporan Eksekutif** | Ekspor laporan lintas satker dan tahun ke format presentasi/PDF |

### Prinsip Dasar Operasional

- Setiap siklus diikat oleh satu **Penetapan Konteks** (unit kerja × tahun penerapan)
- Seluruh data risiko, analisis, dan pengendalian terhubung ke konteks tersebut melalui `konteks_id`
- Sistem mengikuti format **Lampiran 5, 6, 9, dan 10** sesuai ketentuan APIP Mahkamah Agung

---

## B. Teknis Workflow

### B.1. Arsitektur Sistem

| Komponen | Teknologi |
|----------|-----------|
| Framework | Next.js (App Router) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Hosting | Vercel |
| UI | Tailwind CSS + shadcn/ui |

### B.2. Peran Pengguna (Roles)

| Kode Role | Label Tampilan | Fungsi Utama |
|-----------|---------------|-------------|
| `admin_satker` | Admin Satker | Mengelola data konteks dan pengguna di satker |
| `pemilik_risiko` | Pemilik Risiko Satker | Bertanggung jawab atas risiko dan penetapan konteks |
| `pengelola_risiko` | Pengelola Risiko Satker | Mengisi identifikasi, analisis, dan RTP |
| `kepala_umr` | Kepala Unit MR (MA) | Supervisi & validasi tingkat MA |
| `anggota_umr` | Anggota Unit MR (MA) | Dukungan teknis Unit MR |
| `kepala_apip` | Kepala APIP | Menyetujui Program Kerja Audit |
| `anggota_apip` | Anggota APIP | Mengisi dan mengelola program audit |
| `pemilik_risiko_ma` | Pemilik Risiko MA | Akses peta risiko dan laporan lintas satker |
| `admin_sistem` | Administrator Sistem | Manajemen master data (unit kerja, pengguna) |

### B.3. Struktur Database Utama

```
penetapan_konteks
  ├── unit_kerja_id (FK → unit_kerja)
  ├── tahun_penerapan
  ├── sasaran_strategis (JSON)
  ├── proses_bisnis_json (JSON)
  └── pemangku_kepentingan (JSON)

risiko (FK → penetapan_konteks)
  ├── kode_risiko (auto-generate)
  ├── pernyataan_risiko
  ├── kategori_risiko
  ├── sasaran_strategis_item, indikator_konteks, proses_bisnis_item
  └── nama/jabatan pemilik & pengelola risiko

analisis_risiko (FK → risiko)
  ├── level_kemungkinan (1–5)
  ├── level_dampak (1–5)
  ├── residual_kemungkinan, residual_dampak
  ├── kecukupan_pengendalian
  └── di_atas_selera_risiko (boolean)

penyebab_risiko_detail (FK → risiko)
  ├── kode_penyebab (auto-generate: [kode_risiko].[5M+EX].[urut])
  ├── why_1 s.d. why_5
  ├── akar_penyebab
  └── kegiatan_pengendalian

selera_risiko_kategori (FK → penetapan_konteks)
  └── threshold per 7 kategori risiko (1–5)

evaluasi_pengendalian_utama (FK → risiko)
rencana_tindak_pengendalian (FK → risiko, penyebab)
program_kerja_audit (FK → risiko)
maturitas_penilaian (FK → penetapan_konteks)
```

### B.4. Alur Teknis Per Tahapan

---

#### [1] Penetapan Konteks — `/dashboard/konteks`

**Tujuan:** Menetapkan kerangka manajemen risiko satu unit kerja untuk satu tahun.

**Input:**
- Unit Kerja (dari master `unit_kerja`)
- Tahun Penerapan
- Sasaran Strategis + Indikator Kinerja
- Proses Bisnis Utama (MA-01 s.d. MA-10 dengan sub-proses dan indikator)
- Pemangku Kepentingan
- Nama & Jabatan Pemilik dan Pengelola Risiko
- Periode Mulai / Selesai

**Mekanisme:**
- Form dibagi menjadi beberapa seksi; setiap seksi memiliki tombol "Simpan Bagian Ini" (draft save)
- Simpan pertama → INSERT ke `penetapan_konteks`, `konteks_id` dikembalikan ke state
- Simpan berikutnya → UPDATE berdasarkan `konteks_id` yang sudah tersimpan
- Tombol "Identifikasi Risiko →" muncul setelah konteks berhasil disimpan untuk pertama kali
- Submit akhir ("Simpan Penetapan Konteks") memvalidasi minimal 1 sasaran sebelum menyimpan

**Output:** Record `penetapan_konteks` dengan `konteks_id` yang menjadi induk seluruh data risiko.

---

#### [2] Penetapan Selera Risiko — `/dashboard/selera-risiko?konteks={id}`

**Tujuan:** Menentukan batas toleransi risiko per kategori.

**Input:** Nilai numerik 1–5 untuk 7 kategori risiko:
- Strategis, Kebijakan, Kecurangan, Bencana, Kepatuhan, Operasional, Kemitraan

**Mekanisme:**
- Upsert ke `selera_risiko_kategori` berdasarkan `konteks_id`
- Digunakan pada tahap Evaluasi Risiko untuk menentukan risiko prioritas

**Output:** Threshold selera risiko yang menjadi dasar filter evaluasi.

---

#### [3] Identifikasi Risiko — `/dashboard/identifikasi?konteks={id}`

**Tujuan:** Mendaftarkan seluruh risiko yang teridentifikasi (format Lampiran 5).

**Input per risiko:**
- Sasaran Strategis → dipilih dari konteks (dropdown)
- Proses Bisnis → dipilih dari konteks; otomatis mengisi Indikator Konteks dan Sasaran Strategis
- Pernyataan Risiko (wajib)
- Kategori Risiko (7 pilihan sesuai SPIP)
- Dampak Potensial
- Metode Pencapaian SPIP (4 pilihan)
- Sumber Risiko
- Nama & Jabatan Pemilik Risiko (editable per baris, per risiko)
- Nama & Jabatan Pengelola Risiko (editable per baris, per risiko)

**Mekanisme:**
- `kode_risiko` di-generate otomatis: `[kode_unit].[kode_kategori].[nomor_urut]`
- Setiap risiko disimpan ke tabel `risiko` dengan FK ke `konteks_id`
- Pejabat per risiko disimpan dengan tombol "Simpan" di masing-masing baris
- Cascading otomatis: pilih Proses Bisnis → Indikator Konteks dan Sasaran Strategis terisi dari data konteks

**Output:** Daftar risiko dengan kode unik, siap untuk tahap penyebab dan analisis.

---

#### [4] Identifikasi Penyebab Risiko — `/dashboard/identifikasi-penyebab?risiko={id}&konteks={id}`

**Tujuan:** Menggali akar penyebab setiap risiko menggunakan metode 5-Whys (format Lampiran 9).

**Input per penyebab:**
- Why 1 s.d. Why 5 (pertanyaan mengapa bertingkat)
- Akar Penyebab (hasil akhir why 5 atau tingkat yang valid)
- Kegiatan Pengendalian (aktivitas mitigasi yang sudah berjalan)

**Mekanisme:**
- `kode_penyebab` di-generate otomatis: `[kode_risiko].[kategori_5M+EX].[urut]`
- Kategori 5M+EX: MN (Manusia), MY (Money), MD (Metode), MR (Material), MC (Mesin), EX (Eksternal)
- Satu risiko dapat memiliki beberapa penyebab
- Data penyebab digunakan untuk auto-generate uraian Program Kerja Audit

**Output:** Akar penyebab terstruktur yang terhubung ke masing-masing risiko.

---

#### [5] Analisis Risiko — `/dashboard/analisis?konteks={id}`

**Tujuan:** Mengkuantifikasi tingkat risiko menggunakan matriks 5×5 kemungkinan × dampak.

**Input per risiko:**
- Level Kemungkinan Inheren (1–5)
- Level Dampak Inheren (1–5)
- Ada Pengendalian (ya/tidak)
- Pengendalian Eksisting (uraian)
- Efektivitas Pengendalian (efektif/tidak)
- Residual Kemungkinan (1–5, opsional)
- Residual Dampak (1–5, opsional)
- Kecukupan Pengendalian (4 pilihan: Memadai / Cukup / Kurang / Tidak Memiliki)

**Mekanisme:**
- `besaran_risiko = level_kemungkinan × level_dampak` (1–25)
- Level risiko ditentukan dari besaran: 20–25 → Sangat Tinggi (5), 16–19 → Tinggi (4), 11–15 → Sedang (3), 6–10 → Rendah (2), 1–5 → Sangat Rendah (1)
- `residual_level` dibandingkan dengan threshold selera risiko per kategori
- `di_atas_selera_risiko = residual_level > threshold_kategori` → menentukan prioritas

**Output:** Skor inheren dan residual; flag prioritas; data kecukupan pengendalian.

---

#### [6] Evaluasi Risiko — `/dashboard/evaluasi?konteks={id}`

**Tujuan:** Menentukan risiko prioritas yang memerlukan tindakan lanjutan.

**Tampilan:**
- Tabel prioritas: hanya risiko dengan `di_atas_selera_risiko = true`
- Setiap baris menampilkan: Pernyataan Risiko, Sasaran, Indikator, Proses Bisnis, skor inheren, skor residual, vs. threshold selera
- Heatmap 5×5 visual: posisi risiko sebelum dan sesudah pengendalian

**Output:** Daftar risiko prioritas yang menjadi fokus tahap selanjutnya.

---

#### [7] Evaluasi Pengendalian Utama — `/dashboard/evaluasi-pengendalian?konteks={id}`

**Tujuan:** Mendokumentasikan dan menilai desain pengendalian kunci per risiko prioritas.

**Input per risiko:**
- Pengendalian Eksisting (auto-fetch dari data analisis)
- Pengendalian Utama (pengendalian kunci yang ditetapkan)

**Output:** Catatan pengendalian utama yang menjadi dasar Program Kerja Audit.

---

#### [8] Program Kerja Audit — `/dashboard/program-kerja-audit?konteks={id}`

**Tujuan:** Menyusun program kerja audit untuk pengendalian yang dinilai tidak memadai.

**Filter:** Hanya risiko dengan `kecukupan_pengendalian ≠ 'Memadai'`

**Input per risiko:**
- Uraian (otomatis di-generate dari: pengendalian eksisting + pengendalian utama + daftar penyebab; user dapat mengedit)
- No. KKA (Kertas Kerja Audit)
- Waktu Pelaksanaan
- Dilaksanakan Oleh

**Output:** Program Kerja Audit siap cetak per konteks.

---

#### [9] Rencana Tindak Pengendalian (RTP) — `/dashboard/rencana-tindak-pengendalian?konteks={id}`

**Tujuan:** Menetapkan rencana mitigasi spesifik per penyebab risiko prioritas (format Lampiran 10).

**Input per penyebab:**
- Klasifikasi SPIP (sub-elemen SPIP yang dituju)
- Penanggung Jawab
- Indikator Keluaran
- Target Waktu (deadline)
- Frekuensi Rencana (1–5, target kemungkinan setelah mitigasi)
- Dampak Rencana (1–5, target dampak setelah mitigasi)

**Output:** RTP lengkap per konteks, dasar monitoring berkala.

---

#### [M1] Maturitas Manajemen Risiko — `/dashboard/maturitas`

**Tujuan:** Mengukur tingkat kapabilitas MR satuan kerja (1–5).

**Independen:** Tidak terikat konteks tertentu; dapat diakses kapan saja.

**Output:** Skor total + label maturitas (Rintisan → Berkembang → Terdefinisi → Terkelola → Optimum).

---

#### [M2] Laporan Eksekutif — `/dashboard/laporan`

**Tujuan:** Menghasilkan laporan lintas satker/tahun untuk pimpinan.

**Konten laporan:**
- Jumlah total risiko, jumlah prioritas, persentase mitigasi
- Distribusi risiko per satker
- Daftar risiko prioritas dengan skor
- Health index donut chart

**Format ekspor:** Marp Markdown → PDF slide; CSV/Excel untuk data tabular.

---

### B.5. Kode Otomatis yang Di-generate Sistem

| Kode | Format | Contoh |
|------|--------|--------|
| Kode Risiko | `[kode_unit].[kode_kategori].[urut]` | `BAWAS.STR.001` |
| Kode Penyebab | `[kode_risiko].[5M+EX].[urut]` | `BAWAS.STR.001.MN.01` |

**Kategori 5M+EX:**

| Kode | Kategori |
|------|---------|
| MN | Manusia |
| MY | Money / Keuangan |
| MD | Metode |
| MR | Material / Bahan |
| MC | Mesin / Teknologi |
| EX | Eksternal |

---

## C. Contoh Kasus Pelaksanaan Workflow

### Konteks Kasus

> **Satuan Kerja:** Badan Pengawasan Mahkamah Agung RI
> **Tahun:** 2026
> **Pelaksana:** Tim Pengelola Risiko Badan Pengawasan
> **Tujuan:** Penyusunan Dokumen Manajemen Risiko Tahun 2026 sesuai format APIP MA

---

### Langkah 1 — Penetapan Konteks

**Siapa:** Pengelola Risiko (`pengelola_risiko`) dibantu Admin Satker (`admin_satker`)

**Yang dilakukan:**

Pengelola Risiko membuka `/dashboard/konteks`, kemudian mengisi:

- **Unit Kerja:** Badan Pengawasan
- **Tahun Penerapan:** 2026
- **Sasaran Strategis:**
  - Sasaran 1: "Terwujudnya pengawasan yang efektif atas kinerja badan peradilan"
    - Indikator: Persentase temuan hasil pemeriksaan yang ditindaklanjuti (Target: 85%)
  - Sasaran 2: "Meningkatnya kualitas SDM pengawasan"
    - Indikator: Jumlah auditor yang lulus diklat berjenjang (Target: 20 orang)
- **Proses Bisnis Utama:**
  - MA-07.01 — Pemeriksaan Reguler (Indikator: Jumlah satker diperiksa)
  - MA-07.02 — Pemeriksaan Khusus (Indikator: Laporan pemeriksaan tepat waktu)
- **Pemangku Kepentingan:** Pimpinan MA, Satker Teknis, BPK RI, APIP Kementerian
- **Periode:** 1 Januari 2026 – 31 Desember 2026

Setelah mengisi Seksi 1 (Sasaran), klik "Simpan Bagian Ini" → sistem menyimpan draft dan menampilkan tombol "Identifikasi Risiko →".

---

### Langkah 2 — Penetapan Selera Risiko

**Siapa:** Pemilik Risiko (`pemilik_risiko`)

**Yang dilakukan:**

Pemilik Risiko membuka `/dashboard/selera-risiko?konteks={id}` dan menetapkan batas toleransi:

| Kategori | Threshold (1–5) | Makna |
|----------|----------------|-------|
| Strategis | 3 | Toleransi sedang — risiko strategis di atas 3 harus dimitigasi |
| Kebijakan | 2 | Toleransi rendah |
| Kecurangan | 1 | Nol toleransi |
| Bencana | 4 | Toleransi tinggi |
| Kepatuhan | 2 | Toleransi rendah |
| Operasional | 3 | Toleransi sedang |
| Kemitraan | 3 | Toleransi sedang |

---

### Langkah 3 — Identifikasi Risiko

**Siapa:** Pengelola Risiko

**Yang dilakukan:**

Pengelola Risiko membuka `/dashboard/identifikasi?konteks={id}` dan mendaftarkan risiko. Contoh entri:

**Risiko 1:**
- **Proses Bisnis:** MA-07.01 — Pemeriksaan Reguler
  - → Sistem otomatis mengisi Indikator: "Jumlah satker diperiksa"
  - → Sistem otomatis mengisi Sasaran: "Terwujudnya pengawasan yang efektif..."
- **Pernyataan Risiko:** "Auditor tidak memiliki kompetensi teknis memadai untuk memeriksa satker bernilai tinggi"
- **Kategori:** Operasional
- **Dampak Potensial:** Laporan pemeriksaan tidak akurat, opini audit tidak tepat
- **Metode SPIP:** Evaluasi
- **Sumber Risiko:** Internal
- **Pemilik Risiko:** Kepala Badan Pengawasan / Dr. Yusuf Harun, S.H., M.H.
- **Pengelola Risiko:** Kepala Bagian Pemeriksaan / Drs. Ahmad Fauzi

Kode risiko ter-generate: `BAWAS.OPS.001`

**Risiko 2:**
- **Proses Bisnis:** MA-07.02 — Pemeriksaan Khusus
- **Pernyataan Risiko:** "Dokumen pemeriksaan tidak lengkap akibat sistem arsip digital yang tidak andal"
- **Kategori:** Operasional
- Kode risiko ter-generate: `BAWAS.OPS.002`

---

### Langkah 4 — Identifikasi Penyebab (untuk Risiko BAWAS.OPS.001)

**Siapa:** Pengelola Risiko

**Yang dilakukan:**

Buka `/dashboard/identifikasi-penyebab?risiko={id_risiko1}&konteks={id}`:

**Penyebab 1 — Kategori Manusia (MN):**
- Why 1: Mengapa auditor kurang kompeten? → Program diklat tidak sesuai kebutuhan
- Why 2: Mengapa program diklat tidak sesuai? → TNA (Training Needs Analysis) tidak dilakukan
- Why 3: Mengapa TNA tidak dilakukan? → Tidak ada anggaran yang dialokasikan
- Why 4: Mengapa tidak ada anggaran? → Perencanaan SDM belum berbasis risiko
- Why 5: Mengapa perencanaan tidak berbasis risiko? → Belum ada kebijakan MR yang mengatur SDM
- **Akar Penyebab:** Tidak ada kebijakan MR yang mengatur perencanaan SDM berbasis risiko
- **Kegiatan Pengendalian:** Inventarisasi kompetensi auditor secara tahunan
- Kode penyebab ter-generate: `BAWAS.OPS.001.MN.01`

---

### Langkah 5 — Analisis Risiko

**Siapa:** Pengelola Risiko, divalidasi Pemilik Risiko

**Yang dilakukan:**

Buka `/dashboard/analisis?konteks={id}`, isi untuk `BAWAS.OPS.001`:

- **Level Kemungkinan Inheren:** 4 (Mungkin terjadi — pernah terjadi di beberapa satker)
- **Level Dampak Inheren:** 4 (Signifikan — mempengaruhi kualitas audit secara material)
- **Besaran Risiko Inheren:** 4 × 4 = 16 → Level **Tinggi (4)**
- **Ada Pengendalian:** Ya
- **Pengendalian Eksisting:** Uji kompetensi tahunan auditor
- **Efektif:** Tidak (karena hanya uji, bukan pengembangan)
- **Residual Kemungkinan:** 3 (masih berpeluang terjadi)
- **Residual Dampak:** 4 (dampak tetap signifikan)
- **Besaran Residual:** 3 × 4 = 12 → Level **Sedang (3)**
- **Kecukupan Pengendalian:** Kurang

**Evaluasi threshold:** Level residual (3) > threshold Operasional (3)? → **3 > 3 = TIDAK** → bukan prioritas.

*(Jika threshold diubah ke 2, maka 3 > 2 = YA → menjadi prioritas)*

---

### Langkah 6 — Evaluasi Risiko

**Siapa:** Pemilik Risiko + Kepala UMR

**Yang dilakukan:**

Buka `/dashboard/evaluasi?konteks={id}` → heatmap menampilkan posisi semua risiko.

Misalkan `BAWAS.KCR.001` (risiko kecurangan) dengan residual level 2 > threshold 1 → **masuk daftar prioritas**.

Tampilan baris prioritas:
- Sasaran: "Terwujudnya pengawasan yang efektif..."
- Indikator: "Persentase temuan yang ditindaklanjuti"
- Proses: MA-07.01 — Pemeriksaan Reguler
- Skor Inheren: 16 (Tinggi) → Residual: 8 (Rendah) → Threshold: 1 → **DI ATAS SELERA**

---

### Langkah 7 — Evaluasi Pengendalian Utama

**Siapa:** Anggota APIP (`anggota_apip`)

**Yang dilakukan:**

Buka `/dashboard/evaluasi-pengendalian?konteks={id}` untuk `BAWAS.KCR.001`:

- **Pengendalian Eksisting:** (terisi otomatis dari analisis) "Verifikasi mandiri laporan keuangan"
- **Pengendalian Utama yang Ditetapkan:** "Konfirmasi empat mata antara auditor senior dan tim sebelum finalisasi LHP"

---

### Langkah 8 — Program Kerja Audit

**Siapa:** Anggota APIP, disahkan Kepala APIP

**Yang dilakukan:**

Buka `/dashboard/program-kerja-audit?konteks={id}` → sistem menyajikan auto-draft uraian:

> *"Pengujian atas kecukupan pengendalian terhadap risiko BAWAS.KCR.001: risiko kecurangan pada proses pelaporan audit. Pengendalian eksisting: verifikasi mandiri laporan keuangan. Pengendalian utama: konfirmasi empat mata. Penyebab: [BAWAS.KCR.001.MN.01] ..."*

Anggota APIP mengedit jika diperlukan, lalu mengisi:
- **No. KKA:** KKA-BAWAS-2026-003
- **Waktu Pelaksanaan:** Maret – April 2026
- **Dilaksanakan Oleh:** Tim Audit Internal Badan Pengawasan

---

### Langkah 9 — Rencana Tindak Pengendalian

**Siapa:** Pengelola Risiko + Pemilik Risiko

**Yang dilakukan:**

Buka `/dashboard/rencana-tindak-pengendalian?konteks={id}`, isi RTP untuk penyebab `BAWAS.OPS.001.MN.01`:

- **Klasifikasi SPIP:** Lingkungan Pengendalian — Komitmen terhadap kompetensi
- **Penanggung Jawab:** Kabag Kepegawaian dan Umum Badan Pengawasan
- **Indikator Keluaran:** Tersusunnya dokumen kebijakan MR SDM; terlaksananya TNA berbasis risiko
- **Target Waktu:** 30 Juni 2026
- **Frekuensi Rencana:** 2 (target kemungkinan turun dari 4 menjadi 2)
- **Dampak Rencana:** 3 (target dampak turun dari 4 menjadi 3)
- **Target Besaran Residual Setelah RTP:** 2 × 3 = 6 → Level **Rendah (2)**

---

### Hasil Akhir

Setelah seluruh langkah selesai, **laporan eksekutif** dapat di-generate dari `/dashboard/laporan`:

| Indikator | Nilai |
|-----------|-------|
| Total Risiko Terdaftar | 12 |
| Risiko Prioritas | 3 |
| Risiko Telah Ber-RTP | 3 (100%) |
| Rerata Skor Residual | 2.4 |
| Level Maturitas MR | 3 — Terdefinisi |

Laporan dapat diekspor ke PDF slide untuk disampaikan kepada pimpinan MA.

---

*Dokumen ini di-generate otomatis dari analisis kode sumber Risk-Sim. Terakhir diperbarui: April 2026.*