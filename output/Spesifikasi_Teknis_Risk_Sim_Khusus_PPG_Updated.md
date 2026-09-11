# Spesifikasi Teknis Risk Sim — Modul Khusus PPG

**Versi dokumen:** 2.6

**Tanggal pembaruan:** 11 September 2026

**Audiens:** Front-end Engineer, Back-end Engineer, Data Analyst, DBA, QA, dan pemilik proses UPG

### Ringkasan pembaruan versi 2.6

- Mendokumentasikan arsitektur, model data, validasi, RLS, dan UI submenu **Selera Risiko**.
- Menetapkan relasi selera risiko ex-ante, upper limit ex-post, Insight B, dan landasan rekomendasi Program PPG.
- Menyelaraskan spesifikasi dengan isolasi save slot, seed simulasi multi-satker, kontrol gagal terstruktur, CEI, dan treated risk pascaprogram.
- Menjelaskan migrasi idempotent serta pencegahan error PostgreSQL `42P10` pada instalasi baru maupun lama.
- Menegakkan pemisahan create/review Loss Event dan menambahkan rekomendasi Gemini yang dibatasi pada slot demo serta agregat anonim.
- Menambahkan snapshot rekomendasi dan workflow kandidat tindakan AI sebelum promosi ke Action Catalog.
- Mendefinisikan allowlist/denylist payload, kontrak JSON keluaran, proteksi prompt injection, perilaku regenerasi append-only, dan validasi server saat rekomendasi AI dipakai sebagai draf Program PPG.

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menjelaskan implementasi modul **Khusus PPG** sebagai pipeline data-ke-keputusan. Ruang lingkupnya meliputi impor laporan gratifikasi, impor Risk Register 2026, kurasi bottom-up Risk Library dan Control Library, penetapan selera risiko satker, penilaian inherent/residual/treated, bukti serta validasi efektivitas kontrol, Control Effectiveness Index (CEI), Loss Event Database, Insight A dan B, assisted generation Program PPG, penilaian efektivitas pascaprogram, klasterisasi satker, snapshot analitik, serta monitoring.

Prinsip desain utama:

1. Risk Library menyimpan risiko generik; kepemilikan satker berada pada register dan loss event.
2. Impor tidak langsung menerbitkan data ke Risk Library.
3. Mesin mengusulkan; UPG Pusat memutuskan.
4. Program PPG selalu mempunyai satu risiko generik utama.
5. Insight B menggunakan persentase satker agar satu satker dengan volume tinggi tidak mendominasi.
6. Snapshot menjaga reproduktibilitas basis keputusan.
7. Istilah bisnis adalah inherent, residual, dan treated risk. Kolom `*_existing` dipertahankan sebagai nama legacy dengan makna residual.
8. Artefak unduhan adalah template kosong satu-sheet; workbook sumber yang dipakai untuk reverse-engineering format tidak dipublikasikan.
9. UPG Pusat/Admin dapat menghapus batch impor yang salah atau duplikat tanpa menghapus Risk Library maupun register yang telah dibuat.
10. CEI adalah decision-support; kontrol tidak dinonaktifkan otomatis dan keputusan siklus hidup tetap memerlukan tindakan manusia yang diaudit.
11. Kegagalan kontrol pada loss event direkam sebagai referensi terstruktur ke kontrol register, sedangkan narasi teks dipertahankan sebagai konteks tambahan.
12. Selera risiko adalah ambang ex-ante per satker/kategori/tahun; upper limit adalah ambang dampak loss event ex-post yang dikelola UPG Pusat. Keduanya menjadi dasar keputusan yang berbeda dan tidak saling menggantikan.
13. Formula Insight A/B tetap menjadi evidence engine transparan; hanya keluaran Gemini yang diberi label rekomendasi AI.
14. Gemini Free Tier hanya dapat dipanggil pada scenario `demo`, dengan payload agregat tanpa identitas individu, unit kerja, nomor laporan, atau uraian mentah.
15. Tindakan baru hasil AI tidak langsung aktif; ia harus melewati antrean kandidat dan persetujuan UPG Pusat/Admin.

## 2. Tech Stack dan Arsitektur Sistem

### 2.1 Stack

| Lapisan | Teknologi | Fungsi |
| --- | --- | --- |
| Web framework | Next.js 16.2.2 App Router | Server rendering, routing, Server Actions, dan route handlers. |
| UI | React 19.2.4 | Komponen interaktif dan state formulir. |
| Styling | Tailwind CSS 4 | Layout responsif, warna status, dan desain komponen. |
| Ikon | Lucide React | Ikon navigasi dan aksi. |
| Grafik | Recharts 3.8.1 | Scatter plot Insight A×B dan visual analitik. |
| Database/Auth/Storage | Supabase/PostgreSQL | Persistensi, Auth, RLS, dan private object storage. |
| Excel parser | SheetJS `xlsx` 0.20.3 | Membaca template Risk Register dan sumber laporan. |
| Ekspor Excel | ExcelJS 4.4.0 | Menghasilkan laporan pelaksanaan/perencanaan. |
| Bahasa | TypeScript | Kontrak tipe aplikasi dan validasi build. |

### 2.2 Pola komunikasi

```text
Browser
  │ HTTPS: Server Component render / form submission
  ▼
Next.js App Router
  ├── Server Components: read model
  ├── Client Components: interaksi, expand, search, chart
  ├── Server Actions: command/write model
  └── Route Handlers: ekspor XLSX dan dokumen
          │
          ▼
Supabase
  ├── Auth + tabel public.users
  ├── PostgreSQL + RLS
  └── Private Storage ppg-led-bukti
```

Server Action terlebih dahulu memanggil `requirePpgAccess()` atau `requirePpgAdmin()`. Operasi biasa memakai client sesi agar RLS berlaku. Admin client hanya dipakai pada alur yang memerlukan orkestrasi lintas tabel setelah otorisasi eksplisit dan pemeriksaan kepemilikan di server. Action validasi bukti kontrol mengikuti kontrak `useActionState`: menerima state sebelumnya, mengembalikan state serializable per baris, dan tidak mengandalkan exception sebagai satu-satunya umpan balik UI.

File dengan directive top-level `'use server'` hanya mengekspor fungsi `async`, sesuai kontrak Next.js 16. State serializable untuk `useActionState`, termasuk `initialRiskImportState`, ditempatkan pada modul netral `risk-import-state.ts`; modul action mengimpor tipenya tanpa mengekspor object runtime.

### 2.3 Kontrol akses

| Resource | UPG Satker | UPG Pusat | Admin Sistem |
| --- | --- | --- | --- |
| Risk/Control Library | Baca risiko/kontrol aktif | CRUD | CRUD |
| Kandidat impor bottom-up | Tidak | Kurasi | Kurasi |
| Riwayat impor Risk Register | Tidak | Baca/hapus | Baca/hapus |
| Register risiko | CRUD unit sendiri | Baca semua | CRUD semua |
| Selera risiko | CRUD unit sendiri | Baca semua | CRUD semua |
| Bukti kontrol aktual | CRUD register unit sendiri | Baca/validasi | CRUD/validasi |
| Loss event dan referensi kontrol gagal | CRUD terbatas unit sendiri | Baca dan validasi semua | CRUD semua |
| Insight dan snapshot | Tidak | Baca/kelola | CRUD |
| Rekomendasi AI dan kandidat tindakan | Tidak | Generate, baca, ajukan, review | Generate, baca, ajukan, review |
| Program PPG | CRUD rencana dan realisasi unit sendiri | CRUD program nasional; baca rencana/realisasi Satker; validasi realisasi | CRUD program, rencana, realisasi, dan validasi |
| CEI dan kurasi kontrol bottom-up | Tidak | Baca, promosi kandidat, nonaktifkan kontrol | Baca, promosi kandidat, nonaktifkan kontrol |

### 2.4 Komponen implementasi selera risiko

| Komponen | Tanggung jawab |
| --- | --- |
| `src/app/dashboard/ppg/selera-risiko/page.tsx` | Server Component halaman, filter tahun/unit, metrik di atas/dalam/belum ditetapkan, dan tabel monitoring UPG Pusat. |
| `src/app/dashboard/ppg/selera-risiko/PpgRiskAppetiteEditor.tsx` | Form client, nilai saran, pratinjau matriks produk K×D, state sukses/error, dan justifikasi. |
| `src/app/dashboard/ppg/selera-risiko/actions.ts` | Validasi role, unit, tahun, tujuh ambang, lalu upsert penetapan pada save slot aktif. |
| `src/lib/ppg/risk-appetite.ts` | Daftar kategori, default/saran, pemetaan kategori, pembacaan threshold, dan evaluator murni. |
| `src/lib/ppg/data.ts` | Workspace appetite, evaluasi register, agregasi nasional, dan penyediaan basis assisted generation. |
| `src/lib/ppg/demo-seed.ts` | Selera dummy per pengadilan dan dataset loss event yang cukup untuk memperlihatkan Insight B. |
| `supabase/migration_ppg.sql` | Tabel, constraint, RLS, grants, isolasi save-slot, dan idempotensi migrasi. |

### 2.5 Komponen rekomendasi AI

| Komponen | Tanggung jawab |
| --- | --- |
| `src/lib/ppg/ai-recommendations.ts` | Kontrak output, pembentukan payload agregat anonim, normalisasi dan validasi keluaran model. |
| `src/lib/ppg/gemini.ts` | Pemanggilan Gemini server-only, JSON Schema, parser defensif, retry format satu kali, timeout 55 detik per request, dan pemetaan error key/quota/model/output terpotong. |
| `src/app/dashboard/ppg/analitik/ai-actions.ts` | Otorisasi slot demo, generation, snapshot, pengajuan kandidat, review, promosi katalog, dan audit log. |
| `src/app/dashboard/ppg/analitik/AiRecommendationPanel.tsx` | Pending/error state, kartu evidence-grounded, tingkat keyakinan, kandidat tindakan, dan tautan draf Program. |
| Environment | `GEMINI_API_KEY` wajib; `GEMINI_MODEL` opsional dengan default `gemini-2.5-flash`; `GEMINI_FALLBACK_MODEL` opsional dengan default `gemini-2.5-flash-lite`. Seluruhnya server-only. |

### 2.6 Kontrak privasi dan keluaran Gemini

Payload dibangun dengan pola allowlist. Data yang tidak disebut sebagai boleh kirim tidak boleh ikut diserialisasi.

| Boleh dikirim sebagai agregat | Dilarang dikirim |
| --- | --- |
| Periode analisis dan jumlah laporan agregat | Nama orang, NIK, alamat, kontak, atau identitas lain |
| Distribusi kategori jabatan, objek, dan skenario aman | Nama satker/unit kerja dan nama pemberi |
| Pola musim serta asosiasi jabatan–objek | Nomor laporan, nomor Loss Event, dan identifier baris mentah |
| Skor/komponen Insight A dan metrik risiko nasional Insight B | Kronologi, uraian risiko, uraian dampak, lesson learned, atau teks mentah lain |
| Jumlah/persentase appetite, pelampauan, dan upper limit | Momen/kegiatan bebas yang dapat mengandung konteks sensitif |
| Maksimum 100 item Action Catalog yang relevan | `PpgAnalyticsResult.rows` dan raw payload impor |

Label skenario di luar allowlist aman dinormalisasi menjadi **Skenario teridentifikasi lainnya (label disamarkan)**. Seluruh string dalam payload diperlakukan sebagai data tidak tepercaya; system instruction memerintahkan model mengabaikan instruksi yang mungkin tersisip di dalam nilai data.

Gemini diminta mengembalikan JSON terstruktur berisi 3–5 rekomendasi. Kontrak tiap item adalah:

| Field | Fungsi dan validasi |
| --- | --- |
| `key`, `title` | Identitas lokal kartu dan judul ringkas; panjang dinormalisasi. |
| `finding`, `evidence`, `reasoning_summary` | Temuan, bukti angka, dan penjelasan singkat yang dapat ditinjau; bukan chain-of-thought internal. |
| `timing`, `target_roles`, `concrete_actions` | Waktu, sasaran jabatan, dan langkah implementasi yang operasional. |
| `linked_risk_id` | Harus cocok dengan risk ID yang tersedia pada payload server. |
| `existing_action_code` atau `proposed_action` | Merujuk tindakan katalog valid atau spesifikasi kandidat baru; keduanya tidak boleh dipercaya hanya dari client. |
| `limitations`, `confidence` | Keterbatasan data dan tingkat keyakinan terkontrol. |

Response terlebih dahulu dibatasi oleh `responseJsonSchema`, kemudian dinormalisasi dan divalidasi ulang di aplikasi. Parser menerima JSON murni, JSON dalam Markdown fence, atau satu object JSON lengkap yang dikelilingi teks. Jika parsing atau kontrak gagal, server mencoba satu kali lagi dengan tepat tiga rekomendasi yang lebih ringkas. Batas output adalah 8.192 token. Untuk `gemini-2.5-flash`, percobaan awal membatasi thinking budget pada 1.024 token dan percobaan perbaikan format memakai 0 agar ruang keluaran tidak habis sebelum object JSON ditutup.

HTTP `408`, `500`, `502`, `503`, dan `504` diperlakukan sebagai gangguan sementara: request dicoba ulang dua kali dengan exponential backoff pendek dan jitter. Bila model utama tetap gagal, proses berpindah ke `GEMINI_FALLBACK_MODEL`. Status `429` tidak diputar tanpa batas karena dapat menandakan kuota harian telah habis. Semua kegagalan menghasilkan pesan eksplisit tanpa menghilangkan analitik rule-based.

## 3. Pipeline Impor Risk Register 2026

### 3.1 Kontrak workbook

- Format berkas: `.xlsx`, maksimum 10 MB.
- Sheet wajib: `Risk Register 2026`.
- Template publik: `/templates/Template_Risk_Register_PPG_2026_Kosong.xlsx`.
- Workbook publik hanya memiliki satu sheet, 100 baris input kosong mulai baris 6, dan tidak memuat data sumber/satker.
- Validasi struktur: judul `A1` mengandung “risk register” dan header `C4` mengandung “potensi”.
- Tahun dibaca dari `G2`.
- Triwulan dibaca dari `E2` dan dikonversi menjadi `Triwulan I`–`Triwulan IV`.
- Data dimulai pada baris Excel 6.

| Kolom Excel | Field staging | Perlakuan |
| --- | --- | --- |
| B | `unit_nama_raw` | Fill-down dari baris unit terakhir. |
| C | `peristiwa` | Wajib; baris tanpa peristiwa dilewati. |
| D | `klasifikasi_risiko` | Dibaca sebagai teks. |
| E | `kemungkinan_inherent` | Ekstrak bilangan 1–5. |
| F | `raw_payload.kemungkinan_keterangan` | Disimpan untuk audit. |
| G | `dampak_inherent` | Ekstrak bilangan 1–5. |
| H | `dampak` | Narasi dampak. |
| J | `faktor_penyebab` | Dinormalisasi ke daftar baku. |
| K | `penyebab` | Narasi penyebab. |
| N | `control_text` | Kontrol sumber; belum otomatis menjadi Control Library. |
| P | `mitigation_text` | Dapat menjadi draf mitigasi operasional. |

`kategori`, `proses_bisnis`, `subproses_bisnis`, residual K/D, dan treated K/D tetap kosong karena tidak tersedia secara andal pada template. Sistem dilarang merekayasa nilai tersebut.

Template menerapkan validasi Triwulan 1–4, Tahun 2000–2200, probabilitas/dampak 1–5, klasifikasi risiko, dan faktor penyebab. Kolom `L` memuat formula skor `E × G`; parser tetap menghitung dan memvalidasi nilai bisnis secara independen sehingga formula client tidak dipercaya sebagai input otoritatif.

### 3.2 Dua mode impor

**Bootstrap Library**:

1. Parser menghasilkan baris staging.
2. Nama unit dicocokkan secara exact-normalized ke master unit.
3. Risiko dibandingkan dengan Risk Library aktif.
4. Match ≥ 88 dipetakan ke library.
5. Sisanya dibandingkan dengan kandidat terbuka.
6. Similarity ≥ 72 digabung ke kandidat; selain itu dibuat kandidat baru.
7. UPG Pusat memeriksa evidence members dan mengambil keputusan.

**Penghapusan batch bootstrap/operasional oleh pusat**:

1. Server Action memverifikasi role melalui `requirePpgAccess()` dan menolak selain UPG Pusat/Admin.
2. UUID batch divalidasi dan metadata batch dibaca sebelum mutasi.
3. ID source row dan kandidat terkait dihimpun untuk menentukan kandidat yang masih memiliki sumber dari batch lain.
4. Penghapusan `ppg_risk_import_batches` memicu cascade ke `ppg_risk_import_rows` dan membership terkait.
5. Kandidat berstatus `usulan`/`review` hanya dihapus bila tidak memiliki sumber lain.
6. Risk Library, register, dan mitigasi yang sudah dibuat tidak dihapus karena hanya memiliki referensi `ON DELETE SET NULL`/identitas mandiri melalui alur penerbitannya.
7. Metadata batch yang dihapus ditulis ke `ppg_audit_log`, kemudian halaman pustaka, penilaian, dan referensi direvalidasi.

**Operational Assessment**:

1. Parser menghasilkan staging milik pengunggah.
2. Unit UPG Satker dipaksakan dari profil autentikasi.
3. Inherent K/D diisi dari workbook bila valid.
4. User memilih generic risk dan mengisi residual K/D.
5. Server membuat `ppg_register` berstatus `draft` dan, bila ada, `ppg_mitigations`.

### 3.3 Normalisasi dan similarity

Normalisasi teks:

```text
NFKD → lowercase id-ID → hapus non-alfanumerik → rapikan spasi
```

Stop words umum dikeluarkan sebelum Jaccard token similarity. Skor kandidat:

```text
S = 100 × (
      0,70 × sim(peristiwa)
    + 0,10 × sim(penyebab)
    + 0,05 × sim(dampak)
    + 0,10 × exact(klasifikasi)
    + 0,05 × exact(faktor_penyebab)
)
```

Jika nama aktivitas sebelum pemisah `–`, `—`, atau `:` identik dan panjangnya memadai, skor minimum dinaikkan menjadi 92. Aturan ini hanya membentuk usulan; source rows tetap tersedia untuk human review.

## 4. Core Engine: Penilaian Risiko

### 4.1 Formula

```text
Skor risiko = Kemungkinan × Dampak
```

Kedua input berupa bilangan bulat 1–5. Mapping level:

| Skor | Level |
| ---: | --- |
| 1–5 | Sangat Rendah |
| 6–11 | Rendah |
| 12–15 | Sedang |
| 16–19 | Tinggi |
| 20–25 | Sangat Tinggi |

Formula yang sama diterapkan pada tiga titik ukur:

- **Inherent**: sebelum kontrol;
- **Residual**: setelah kontrol yang sedang berjalan;
- **Treated**: setelah treatment Program PPG.

Contoh:

```text
Inherent : K=5, D=4 → 20 → Sangat Tinggi
Residual : K=4, D=4 → 16 → Tinggi
Treated  : K=2, D=3 →  6 → Rendah
```

### 4.2 Selera risiko dan upper limit

Model selera mengikuti konsep yang telah digunakan Risk Sim: ambang penerimaan ditetapkan per kategori dan dibandingkan dengan skor residual. Implementasi khusus PPG memakai matriks produknya sendiri (`Kemungkinan × Dampak`) agar perbandingan berada pada skala 1–25 yang sama.

```text
residual > appetite  → di_atas_selera → kandidat treatment/Program PPG
residual ≤ appetite  → dalam_selera   → diterima dan dimonitor
appetite belum ada   → belum_ditetapkan; sistem tidak membuat asumsi
```

Penetapan disimpan dalam `ppg_risk_appetites`, unik untuk `(scenario_id, unit_kerja_id, tahun)`, dengan tujuh kolom kategori bernilai 1–25. `evaluatePpgAppetite()` melakukan pemetaan nama kategori, validasi ambang, dan klasifikasi keputusan. UPG Satker dapat mengubah milik unit sendiri; UPG Pusat hanya membaca konsolidasi; Admin dapat mengoreksi seluruh unit.

| Key | Label | Nilai saran awal |
| --- | --- | ---: |
| `strategis` | Risiko Strategis | 9 |
| `kebijakan` | Risiko Kebijakan | 9 |
| `kecurangan` | Risiko Kecurangan | 4 |
| `bencana` | Risiko Bencana | 9 |
| `kepatuhan` | Risiko Kepatuhan | 8 |
| `operasional` | Risiko Operasional | 9 |
| `kemitraan` | Risiko Kemitraan | 9 |

Nilai saran hanya mengisi initial state editor. Record resmi baru ada setelah Server Action berhasil melakukan upsert. Batas yang sama dengan residual termasuk `dalam_selera`; hanya operator `>` yang menghasilkan `di_atas_selera`. Bila kategori tidak dapat dipetakan, skor tidak finite, atau record appetite tidak ada, evaluator mengembalikan `belum_ditetapkan`.

Read model memakai penetapan pada tiga tingkat:

1. **Register:** Penilaian Risiko mencari appetite berdasarkan `unit_kerja_id:tahun` dan membandingkan `skor_existing` dengan kolom kategori.
2. **Ringkasan:** menghitung register di atas selera dan register tanpa appetite.
3. **Nasional:** per risiko generik menghitung satker yang sudah mempunyai appetite, satker di atas appetite, persentasenya terhadap seluruh master satker, dan satker dengan upper-limit.

Upper limit tetap berasal dari `ppg_led_limit_versions` dan klasifikasi `ppg_loss_events.klasifikasi_limit`. Ia tidak menjadi appetite nasional: upper limit mengevaluasi dampak aktual ex-post, sedangkan appetite menentukan toleransi residual ex-ante. Kandidat Program PPG direkomendasikan jika terdapat minimal satu satker di atas appetite **atau** minimal satu loss event upper-limit. Snapshot program menyimpan kedua basis tersebut agar keputusan dapat diaudit.

### 4.3 Dua fase pelaksanaan Program PPG di Satker

Route Program PPG (`/dashboard/ppg/tindak-lanjut`) memisahkan lifecycle lokal Satker dari desain program nasional:

1. **Pra Pelaksanaan**: Satker memilih Risk Register dan item program, lalu mengisi `planned_start`, `planned_end`, `pic_jabatan`, dan catatan. Server mensyaratkan program sudah ditetapkan, belum dibatalkan, risiko generik sama, Satker termasuk klaster penerima, dan tanggal berada dalam jendela program nasional.
2. **Pasca Pelaksanaan**: berdasarkan assignment yang telah tersimpan, Satker mengisi `actual_end`, uraian realisasi, efektivitas, evidence HTTPS, serta K/D treated. Pengajuan mengubah `validation_status` menjadi `menunggu`.
3. **Validasi UPG Pusat**: Pusat hanya membaca rencana dan data realisasi Satker, kemudian menetapkan `disetujui`, `perlu_perbaikan`, atau `ditolak` beserta catatan. Pusat tidak mengubah jadwal, PIC, uraian, evidence, maupun treated risk milik Satker.

Record utama kedua fase disimpan pada `ppg_satker_program_assignments`. Nilai treated terbaru juga disalin ke `ppg_register` untuk kompatibilitas laporan dan peta risiko yang sudah ada. UI menghitung delta terhadap residual dan menampilkan `Turun`, `Naik`, atau `Tetap`; perencanaan, pengajuan ulang, dan validasi dicatat dalam `ppg_audit_log`.

### 4.4 Control Effectiveness Index (CEI)

Kalkulator murni berada di `src/lib/ppg/control-effectiveness.ts`. Hanya kontrol berstatus aktif yang dievaluasi. Bobot observasi efektivitas:

```text
efektif        = 100
sebagian       = 50
tidak_efektif  = 0
belum_dinilai  = diabaikan

base_CEI = average(observasi yang dinilai)
CEI      = clamp(base_CEI - 5 × qualifying_loss_events, 0, 100)
```

Jika tidak ada observasi yang dinilai, hasil adalah `null` dan UI menampilkan **Belum dinilai**, bukan 0. Loss event yang dapat memberi penalti adalah event berstatus `tervalidasi`, `tindak_lanjut`, atau `ditutup`. Untuk event baru, penalti hanya mengenai kontrol yang dipilih dalam `ppg_loss_event_controls`; event historis tanpa referensi terstruktur menggunakan fallback seluruh kontrol pada register agar histori perhitungan tetap kompatibel.

Kriteria tampilan sementara:

| CEI | Warna | Interpretasi |
| ---: | --- | --- |
| 0–49 | Merah | Rendah; kaji ulang dan kandidat penonaktifan bila kelemahan persisten. |
| 50–79 | Kuning | Kurang efektif; perbaiki desain/implementasi dan monitor. |
| 80–100 | Hijau | Tinggi/efektif; pertahankan dengan monitoring berkala. |

Ambang ditampilkan dalam popup informasi. Ambang tidak memicu perubahan status otomatis. Error query harus ditampilkan sebagai error, tidak boleh dikonversi menjadi CEI nol.

### 4.5 Kurasi kontrol bottom-up

`getPpgEmergingControls` mengambil mitigasi berstatus selesai, mengelompokkannya menurut teks yang dinormalisasi dan risiko generik, menghitung satker unik, serta menyembunyikan kandidat yang sudah dipromosikan. Promosi memvalidasi keberadaan mitigasi selesai, mencegah duplikasi, membangkitkan kode `PPG.K.<nomor>`, dan melakukan retry saat terjadi unique collision. Bila insert relasi risk–control gagal, kontrol yatim dihapus kembali. Promosi maupun penonaktifan kontrol menulis audit log; penonaktifan tidak menghapus pemakaian historis.

## 5. Core Engine: Insight A

Insight A adalah indeks paparan berbasis laporan gratifikasi, bukan probabilitas kejadian. Method version: `exposure-components-v2`.

### 5.1 Komponen dan normalisasi

| Komponen | Raw metric | Normalisasi 0–100 | Bobot |
| --- | --- | --- | ---: |
| Kekuatan konsentrasi skenario | Share laporan unik pada skenario teridentifikasi paling dominan | `share × 100` | 30% |
| Anomali periode rawan | Indeks musim bulan puncak | `clamp((index−1)/2 × 100, 0, 100)` | 25% |
| Konsentrasi jabatan | Share laporan unik pada kelompok jabatan dominan | `share × 100` | 20% |
| Paparan objek berisiko | Item uang/setara uang ÷ seluruh item | `share × 100` | 15% |
| Pertumbuhan paparan | Perubahan laporan unik terhadap periode setara sebelumnya | `clamp(max(0, growth) × 100, 0, 100)` | 10% |

Indeks musim:

```text
expected_monthly = total_unique_reports_baseline / 12
seasonal_index_m = unique_reports_month_m / expected_monthly
```

Skor A:

```text
A = 0,30×C_skenario
  + 0,25×C_musim
  + 0,20×C_jabatan
  + 0,15×C_uang
  + 0,10×C_tren
```

### 5.2 Contoh hitung manual Insight A

Asumsi hasil normalisasi:

- skenario dominan 70% → 70;
- indeks musim 2,60 → `(2,60−1)/2×100 = 80`;
- jabatan dominan 65% → 65;
- item uang 40% → 40;
- pertumbuhan 100% → 100.

```text
A = (70×0,30) + (80×0,25) + (65×0,20) + (40×0,15) + (100×0,10)
  = 21 + 20 + 13 + 6 + 10
  = 70,0
```

### 5.3 Exposure ranking tambahan

Untuk ranking kelompok jabatan, objek, skenario, tipe pemberi, dan momen:

```text
exposure_score = 100 × (
    0,50 × percentile_rank(jumlah_laporan)
  + 0,30 × percentile_rank(log(1 + nilai))
  + 0,20 × percentile_rank(proporsi_item_uang)
)
```

Ranking ini mendukung eksplorasi, sedangkan skor Insight A menggunakan lima komponen pada §5.1.

## 6. Core Engine: Insight B

Insight B mengukur realisasi aktual per risiko generik dengan sumber `ppg_loss_events` berstatus `tervalidasi`, `tindak_lanjut`, atau `ditutup`.

Penyebut tidak memakai seluruh master `unit_kerja`, karena Satker yang belum mempunyai data tidak boleh dianggap sebagai observasi nol. Untuk metrik loss event, `eligible_satkers` adalah union Satker yang mempunyai register risiko terkait atau loss event pada periode analisis. Untuk appetite, penyebut khususnya adalah `appetite_set_satkers`—Satker dengan register terkait yang telah menetapkan appetite kategori/tahun.

```text
affected_pct        = distinct_satker_with_event / eligible_satkers × 100
high_impact_pct     = distinct_satker_with_any_level_4_5 / eligible_satkers × 100
recurring_pct       = distinct_satker_with_2_or_more_events / eligible_satkers × 100
control_failure_pct = distinct_satker_with_failure_text / eligible_satkers × 100
appetite_set_satkers = distinct_satker_with_register_and_appetite
above_appetite_pct   = distinct_satker_above_appetite / appetite_set_satkers × 100
upper_limit_satkers  = distinct_satker_with_upper_limit_event
```

UI selalu menampilkan pembilang/penyebut bersama persentase, misalnya `2/24 (8,3%)`, agar cakupan observasi dapat diaudit dan tidak disalahartikan sebagai 2 dari seluruh populasi master.

Skor B:

```text
B = clamp(
      0.25×affected_pct
    + 0.35×high_impact_pct
    + 0.25×recurring_pct
    + 0.15×control_failure_pct,
    0, 100
)
```

Bobot ternormalisasi berjumlah `1.00`, sehingga persentase input 0–100 menghasilkan skor B yang tetap proporsional dan tidak mengalami saturasi dini. Versi metode gabungan yang memakai formula ini adalah `combined-a-b-v3`.

Contoh dengan 100 satker:

- 12 satker terdampak → 12%;
- 5 satker berdampak tinggi → 5%;
- 4 satker berulang → 4%;
- 8 satker mencatat kegagalan kontrol → 8%.

```text
B = 0.25×12 + 0.35×5 + 0.25×4 + 0.15×8
  = 3 + 1.75 + 1 + 1.2
  = 6.95
```

Satu satker dihitung satu kali pada setiap metrik walaupun memiliki banyak event. Pendekatan ini mencegah dominasi oleh volume satu satker.

Metrik appetite dan upper limit ditampilkan bersama Insight B, tetapi tidak dimasukkan ke formula numerik B agar arti seri historis Insight B tidak berubah. Flag keputusan dibentuk terpisah:

```text
recommended_for_program = above_appetite_satkers > 0
                       OR upper_limit_satkers > 0
```

Daftar risiko pada Program PPG diurutkan dengan prioritas: `recommended_for_program`, kecocokan kategori tindakan, persentase di atas appetite, lalu persentase satker terdampak. UPG Pusat tetap dapat memilih risiko tanpa flag tersebut; UI menandainya sebagai **Monitor/justifikasi override**.

## 7. Gabungan Insight A dan B

```text
priority_score = 0,45×A + 0,55×B
```

| Aturan | Label |
| --- | --- |
| `A ≥ 55 && B ≥ 45` | `prioritas_nasional` |
| `A ≥ 55 && B < 45` | `preventif` |
| `A < 55 && B ≥ 45` | `perbaikan_kontrol` |
| selain itu | `monitoring` |

Ambang tersebut merupakan aturan keputusan internal versi metode, bukan konstanta ilmiah universal. Karena itu method version dan semua komponen disimpan pada snapshot agar dapat diaudit dan dikalibrasi menggunakan data historis.

Pada implementasi saat ini, A adalah indeks paparan tingkat periode yang berasal dari kumpulan laporan gratifikasi dan belum mempunyai pemetaan tervalidasi langsung ke setiap risiko generik. Akibatnya, semua baris risiko dalam periode yang sama dapat memakai nilai A yang sama. B tetap dihitung per risiko generik. Bila beberapa risiko menghasilkan pasangan `(B, A)` identik, visual mengelompokkannya menjadi satu gelembung dengan angka jumlah risiko dan tooltip yang mencantumkan semua anggota; data risikonya tidak dibuang.

Klasifikasi A×B tidak diganti oleh appetite. Matriks menjelaskan kekuatan sinyal analitik, sedangkan appetite/upper limit menjelaskan dasar akuntabilitas treatment. Saat program disimpan, `summary.insightB` pada snapshot turut merekam `appetite_set_satkers`, `above_appetite_satkers`, `above_appetite_satkers_pct`, `upper_limit_satkers`, dan `recommended_for_program`.

### 7.1 Baseline dan target berbantuan

Baseline Outcome A dipilih menurut `signalKey` rekomendasi: proporsi objek uang, keterlambatan, missing context, jabatan prioritas, bulan puncak, relasi eksternal, atau skenario dominan. Target awal mesin:

```text
target_A = baseline_A × 0,80
target_B = affected_pct × 0,75
```

Keduanya hanya saran awal. UPG Pusat menetapkan target final. KRI default memakai ambang `<5%`, `5–10%`, dan `>10%` serta dapat disesuaikan sebelum program disimpan.

## 8. Klasterisasi Satker

Untuk satu risiko generik utama dan satu periode analisis:

```text
Klaster 1 — Realisasi kritis:
  event_count >= 2 OR highest_impact >= 4

Klaster 2 — Realisasi terbatas/preventif:
  event_count = 1 AND highest_impact < 4

Klaster 3 — Terkendali/monitoring:
  event_count = 0
```

Keanggotaan disimpan sebagai snapshot pada program. Perubahan loss event setelah program disahkan tidak mengubah keanggotaan historis secara diam-diam.

## 9. Database Schema dan ERD

### 9.1 Tabel domain utama

| Tabel | Kolom kunci dan tipe | PK/FK dan constraint utama |
| --- | --- | --- |
| `ppg_risk_library` | `id uuid`, `kode text`, dimensi proses/risiko, `versi int`, `status text` | PK `id`; unique `kode`; status draft/review/aktif/nonaktif. |
| `ppg_control_library` | `id uuid`, `kode`, `nama`, `jenis`, `uraian`, `status` | PK `id`; unique `kode`; jenis Preventif/Detektif/Korektif; status aktif/nonaktif mempertahankan histori. |
| `ppg_library_risk_controls` | `risk_library_id uuid`, `control_id uuid` | PK gabungan; M:N risk library–control library. |
| `ppg_register` | identitas unit/periode, inherent `smallint`, legacy residual `*_existing`, treated `*_treated`, `treated_program_id`, `efektivitas_program`, URL/actor/waktu evaluasi | PK `id`; FK risk library, unit, dan `ppg_programs`; skor = K×D; unique kode+tahun+periode+unit; enum efektivitas program. |
| `ppg_risk_appetites` | unit, tahun, tujuh ambang kategori 1–25, catatan, actor/waktu penetapan | PK `id`; unique scenario+unit+tahun; RLS baca lintas unit untuk UPG Pusat dan tulis unit sendiri untuk UPG Satker. |
| `ppg_risk_controls` | `risk_id`, `control_id`, `efektivitas`, `bukti_efektivitas_url` | PK gabungan; FK register dan control library. |
| `ppg_risk_control_validations` | `risk_id`, `control_id`, `status`, validator | PK/FK gabungan ke risk controls; validasi terpisah dari pelapor. |
| `ppg_mitigations` | `register_id`, tindakan, PIC, tenggat, status, progres | PK `id`; FK register; progres 0–100. |
| `ppg_reports` | atribut laporan anonim, tanggal, objek, nilai, skenario, klasifikasi | PK `id`; FK batch; tidak menyimpan nama/NIK/pemberi. |
| `ppg_import_batches` | metadata impor laporan gratifikasi | PK `id`; unique hash+sheet. |
| `ppg_loss_events` | unit, risiko generik, register, RCA, narasi kegagalan kontrol, dampak, limit, status, bukti | PK `id`; FK unit/risk/register/limit; satu primary generic risk wajib untuk data baru. |
| `ppg_loss_event_controls` | `loss_event_id uuid`, `control_id uuid`, actor dan timestamps | PK gabungan; M:N loss event–control library; RLS mengikuti akses event. |
| `ppg_loss_event_report_links` | event, report, type, score, reason | PK gabungan; link kandidat/terkonfirmasi/ditolak. |
| `ppg_led_limit_versions` | tahun, ambang dampak upper, status | PK `id`; unique tahun. |
| `ppg_analysis_snapshots` | periode, method version, `summary jsonb`, `recommendations jsonb` | PK `id`; rentang tanggal valid. |
| `ppg_action_catalog` | kode, tindakan, kategori, lead time, indikator | PK `id`; unique kode; status aktif/nonaktif. |
| `ppg_ai_recommendation_runs` | periode, model, prompt version, input agregat, rekomendasi JSON, actor/waktu | PK `id`; scenario-isolated; tidak menyimpan data mentah/identitas. |
| `ppg_ai_action_candidates` | run, recommendation key, spesifikasi tindakan, status review, promoted action | PK `id`; unique scenario+run+key; status menunggu/disetujui/ditolak. |
| `ppg_programs` | kode, snapshot, periode analisis/program, cakupan, status, `ditetapkan_by`, `ditetapkan_at`, `catatan_penetapan` | PK `id`; FK snapshot; unique kode; status mencakup `dirancang` dan `ditetapkan`. |
| `ppg_program_items` | program, satu risk library, action, indikator/KRI/outcome | PK `id`; FK program/risk/action; persentase 0–100. |
| `ppg_program_item_controls` | program item, control | PK gabungan; M:N item–control. |
| `ppg_program_clusters` | item, kode 1–3, fokus, target | PK `id`; unique item+kode. |
| `ppg_program_cluster_units` | cluster, unit, `basis jsonb` | PK gabungan; snapshot keanggotaan. |
| `ppg_program_updates` | item, tanggal, status, progres, realisasi, bukti | PK `id`; FK program item. |
| `ppg_satker_program_assignments` | item program, register/unit, tanggal rencana, PIC, selesai aktual, uraian, efektivitas, evidence, K/D treated, status validasi | PK `id`; unique item+register; ownership Satker; status belum_diajukan/menunggu/disetujui/perlu_perbaikan/ditolak. |
| `ppg_program_loss_events` | item, loss event | PK gabungan; bukti event prioritas program. |
| `ppg_audit_log` | actor, entity, action, changes, timestamp | PK identity; jejak perubahan penting. |

### 9.2 Tabel staging dan kurasi

| Tabel | Kolom kunci dan tipe | Fungsi |
| --- | --- | --- |
| `ppg_risk_import_batches` | hash, sheet, mode, tahun, periode, status, counts | Metadata dan idempotensi impor Risk Register. |
| `ppg_risk_import_rows` | source row, unit, atribut risiko, K/D, raw payload, errors, match status | Menjaga lineage setiap baris sumber. |
| `ppg_risk_candidates` | redaksi usulan, signature, confidence, status, library target | Unit kerja kurasi oleh UPG Pusat. |
| `ppg_risk_candidate_members` | candidate id, import row id, similarity | Relasi M:N kandidat dengan evidence sumber. |

### 9.3 ERD ringkas

```text
ppg_risk_import_batches 1 ──< ppg_risk_import_rows >── 1 unit_kerja
                                  │
                                  └──< ppg_risk_candidate_members >── 1 ppg_risk_candidates
                                                                            │ approve/merge
                                                                            ▼
ppg_risk_library 1 ──< ppg_register >── 1 unit_kerja 1 ──< ppg_risk_appetites
       │                    │                                  (per tahun)
       │                    ├──< ppg_risk_controls >── ppg_control_library
       │                    └──< ppg_mitigations
       │
       ├──< ppg_loss_events >── unit_kerja
       │             └──< ppg_loss_event_controls >── ppg_control_library
       │
       └──< ppg_program_items >── ppg_programs >── ppg_analysis_snapshots
                     │
                     ├──< ppg_program_item_controls >── ppg_control_library
                     ├──< ppg_program_clusters >──< ppg_program_cluster_units
                     ├──< ppg_program_updates
                     └──< ppg_program_loss_events >── ppg_loss_events

ppg_ai_recommendation_runs 1 ──< ppg_ai_action_candidates >── ppg_action_catalog
              │                                      (setelah approval)
              └── recommendation key ──> referensi draf/snapshot ppg_programs
```

## 10. Workflow dan Swimlane

### 10.1 Bootstrap Risk Library

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| UPG Pusat memilih mode dan file | Validasi ekstensi, size, dan state form | Verifikasi role dan hash file. |
| Klik impor | Kirim `FormData` ke Server Action | Parse sheet, buat batch dan rows. |
| Menunggu hasil | Tampilkan jumlah valid/perlu perbaikan | Match library/kandidat dan simpan lineage. |
| Expand kandidat | Tampilkan members dan similarity | Query candidate + nested evidence. |
| Setujui/gabung/tolak | Validasi field wajib | Buat/update Risk Library, update rows, tulis audit log. |
| Hapus batch salah/duplikat | Konfirmasi target dan dampak | Otorisasi pusat, cascade staging, pertahankan kandidat multisumber, tulis audit log. |

### 10.2 Assisted generation Program PPG

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| Pilih periode | Render filter | Ambil laporan, event tervalidasi, register tahun analisis, dan appetite satker. |
| Baca visual A/B | Recharts + tabel komponen dan kolom appetite/upper limit | Hitung analytics, A, B, ranking, klaster, pelampauan appetite, dan flag landasan program. |
| Pilih risiko/tindakan/kontrol | Prefill rekomendasi dan baseline | Validasi mapping risk–control–action. |
| Tetapkan target | Baseline read-only, target editable | Recompute agar tidak mempercayai nilai client. |
| Simpan rancangan | Submit Server Action | Insert snapshot → program → item → controls → clusters → units. |
| Review dan tetapkan | Catatan penetapan minimal 10 karakter | Isi actor/waktu/catatan, ubah `dirancang` menjadi `ditetapkan`, dan tulis audit log. |
| Input monitoring | Form hanya tersedia setelah penetapan | Insert update serta sinkronkan status/progres item dan status program induk. |

### 10.3 Penetapan selera risiko

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| UPG Satker memilih tahun | Unit berasal dari akun dan tidak dapat diganti | Query appetite dan register dibatasi unit serta save slot aktif. |
| Admin memilih unit/tahun | Unit dapat dipilih untuk koreksi administratif | Server memvalidasi UUID dan foreign key unit. |
| Pengguna mengisi tujuh ambang | Input integer 1–25 dan pratinjau K×D | Server mengulang validasi seluruh nilai; client tidak dipercaya. |
| Klik tetapkan | `useActionState` menampilkan sukses/error | Upsert pada `(scenario_id,unit_kerja_id,tahun)`, menyimpan actor dan timestamps. |
| UPG Pusat membuka halaman | Tabel cakupan read-only | RLS mengizinkan baca lintas satker, tanpa mutation untuk UPG Pusat. |

### 10.4 Rekomendasi AI dan kandidat tindakan

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| Pusat/Admin memilih periode pada slot demo | Tombol Generate/Regenerasi aktif | Server memastikan `scenarioKey === demo`, lalu menghitung ulang agregat periode. |
| Klik Generate | Pending state dan hasil error eksplisit | Bentuk payload tanpa baris mentah/identitas, panggil Gemini dengan JSON Schema dan timeout 55 detik. |
| Model merespons | Render 3–5 kartu temuan, evidence, rationale, waktu, sasaran, aksi, limitation, confidence | Validasi risk ID/action code, panjang field, enum, dan minimal tiga rekomendasi; simpan snapshot dan audit log. |
| Klik Regenerasi | Render hasil run terbaru tanpa menghapus histori | Insert run baru secara append-only untuk periode; run lama tetap menjadi jejak audit. |
| Tindakan katalog cocok | Tombol menuju draf Program membawa risk/action/periode | Program tetap memvalidasi mapping dan menghitung ulang baseline pada server. |
| Tindakan baru | Tombol Ajukan ke Action Catalog | Ambil spesifikasi dari snapshot server, bukan hidden payload client; upsert kandidat berstatus `menunggu`. |
| Pusat/Admin mereview | Setujui atau tolak beserta catatan | Approval membuat `PPG-AI-<8 karakter UUID>` di katalog slot demo; keputusan dan ID promosi diaudit. |
| Simpan draf dari kartu AI | Form telah terisi nama, target role, tujuan/aksi, dan catatan keputusan | Server memuat ulang run+recommendation, memverifikasi periode/risk/action serta status kandidat, lalu membekukan kartu terpilih dalam analysis snapshot dan rationale program. |

### 10.5 Validasi bukti kontrol, loss event, dan evaluasi pascaprogram

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| UPG Satker memperbarui efektivitas/bukti kontrol | Form per baris; tampilkan state sukses/error | Validasi ownership dan simpan `ppg_risk_controls`. |
| UPG Pusat memilih status validasi | `useActionState` per baris | Tolak `disetujui` tanpa URL bukti; upsert validasi dan revalidate halaman. |
| Satker memilih register pada Loss Event | Muat multi-select kontrol register | Verifikasi setiap control ID memang terhubung ke register. |
| UPG Pusat membuka Loss Event | Form create tidak dirender | `createPpgLossEvent` tetap menolak role UPG Pusat bila dipanggil langsung. Admin dikecualikan untuk debugging. |
| Pusat mengganti risiko generik event | Bersihkan tampilan referensi lama | Set register `null` dan hapus relasi kontrol gagal agar konsisten. |
| Satker merencanakan program | Pilih register dan item program; isi tanggal rencana, PIC, catatan | Validasi penetapan, klaster, kesamaan risiko, ownership, dan jendela tanggal; upsert assignment. |
| Satker mengajukan realisasi | Dari assignment, isi selesai aktual, uraian, efektivitas, evidence, treated K/D | Validasi ownership/kelengkapan; simpan realisasi, reset status menjadi `menunggu`, sinkronkan treated terbaru ke register, dan audit. |
| UPG Pusat memvalidasi realisasi | View-only terhadap isian Satker; pilih keputusan dan catatan | Hanya ubah metadata validasi assignment; nilai realisasi Satker tidak ditimpa. |

## 11. Wireframe Antarmuka

### 11.1 Risk and Control Library

```text
┌───────────────────────────────────────────────────────────────┐
│ Header Khusus PPG + navigasi submenu                         │
├───────────────────────────────────────────────────────────────┤
│ Import Risk Register                                         │
│ [Unduh template kosong] [Mode ▼] [Pilih .xlsx] [Impor]       │
├───────────────────────────────────────────────────────────────┤
│ ▸ Antrean kurasi bottom-up (N) — tertutup default            │
│ ┌ Kandidat + confidence + jumlah satker ─────── [expand] ┐   │
│ │ evidence sumber                                            │
│ │ kategori/proses/klasifikasi/faktor/peristiwa/penyebab      │
│ │ [Setujui baru] [Gabungkan] [Tolak]                         │
│ └─────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────┤
│ ▸ Riwayat impor Risk Register (N)                             │
│   file │ mode/periode │ status/jumlah baris │ [Hapus]         │
├───────────────────────────────────────────────────────────────┤
│ Form manual library │ tabel Risk Library │ Control Library   │
├───────────────────────────────────────────────────────────────┤
│ CEI kontrol + popup kriteria │ kandidat kontrol bottom-up    │
└───────────────────────────────────────────────────────────────┘
```

Behavior: antrean kurasi dan riwayat impor menggunakan native `<details>` tanpa atribut `open`, sehingga tertutup saat render awal. Tombol approve disabled secara fungsional bila field wajib tidak valid; bukti anggota collapsed secara default; field yang tidak diekstrak kosong; duplicate file hash ditolak. Tombol hapus memakai dialog konfirmasi client dan Server Action dengan otorisasi ulang.

### 11.2 Selera Risiko

```text
┌ Selera Risiko PPG ──────────────────────────────────────────┐
│ Selera Satker (ex-ante) │ Upper limit Pusat (ex-post)       │
├ Tahun │ Satker (khusus Admin) │ [Tampilkan]                 ┤
├ Di atas selera │ Dalam selera │ Belum dapat dinilai         ┤
├ 7 kartu kategori: skor maksimum diterima 1–25               ┤
├ Pratinjau matriks K×D kategori Kecurangan                    ┤
├ Catatan/justifikasi │ [Tetapkan Selera Risiko PPG]           ┤
└ UPG Pusat: tabel cakupan penetapan seluruh satker (read-only)┘
```

### 11.3 Penilaian Risiko

```text
┌ Import operasional + download template ┐
├ ▸ Draf hasil impor yang perlu dilengkapi (tertutup default) ┤
│   generic risk + inherent + residual + [Buat]              │
├ Form penilaian manual inherent/residual                   ┤
├ Matriks residual risk 5×5                                 ┤
├ Bukti dan validasi kontrol + state hasil per baris        ┤
└ Tabel inherent │ residual │ treated + search/pagination   ┘
```

### 11.4 Titik Rawan dan Program PPG

```text
┌ Filter tahun/triwulan + kualitas/cakupan data ┐
├ Scatter A×B │ dasar analitik gabungan (tertutup) ┤
├ tren │ musim │ ranking │ asosiasi             ┤
├ tabel Insight B + appetite + upper limit      ┤
└ [Buat draf berbantuan]                        ┘

┌ Program PPG ──────────────────────────────────┐
│ risiko utama │ tindakan │ controls            │
│ panel A │ panel B │ landasan appetite/limit   │
│ KRI │ baseline & target outcome A/B           │
│ klaster 1 │ klaster 2 │ klaster 3             │
│ jadwal │ PIC │ target │ [Simpan rancangan]    │
├───────────────────────────────────────────────┤
│ Evaluasi pascaprogram: register │ program      │
│ treated K/D │ efektivitas │ URL bukti │ delta  │
└───────────────────────────────────────────────┘
```

## 12. Validasi, Konsistensi, dan Error Handling

- Semua UUID yang berasal dari form divalidasi formatnya.
- Referensi library/action/control harus aktif dan relasinya diperiksa ulang di server.
- Control ID pada loss event harus termasuk kontrol yang digunakan oleh register terpilih; narasi kegagalan kontrol tetap disimpan terpisah.
- Bila risiko generik loss event diubah saat validasi pusat, register dan relasi kontrol gagal dibersihkan untuk mencegah referensi silang yang tidak valid.
- Validasi bukti kontrol berstatus `disetujui` mensyaratkan URL bukti dan selalu mengembalikan state sukses/error yang terlihat pada baris terkait.
- Pra pelaksanaan mensyaratkan program ditetapkan, tidak dibatalkan, risiko sama, Satker anggota klaster, PIC terisi, dan jadwal lokal berada dalam jendela program nasional.
- Pasca pelaksanaan hanya tersedia dari assignment yang ada dan mensyaratkan selesai aktual, uraian substantif, enum efektivitas valid, K/D 1–5, serta evidence HTTPS.
- Pengajuan ulang Satker selalu mengembalikan status validasi ke `menunggu`; UPG Pusat hanya mengubah metadata validasi.
- Monitoring program ditolak sebelum `ditetapkan_at` terisi. Penetapan menyimpan actor, waktu, catatan substantif, dan audit action `tetapkan`.
- Persentase dibatasi 0–100; K/D dibatasi 1–5; progres dibatasi 0–100.
- Tahun selera risiko dibatasi 2000–2200, setiap ambang kategori wajib berupa integer 1–25, dan catatan/justifikasi dibatasi maksimal 1.500 karakter.
- Upsert selera risiko hanya sah untuk kombinasi unik `(scenario_id, unit_kerja_id, tahun)`; server memvalidasi unit, role, save slot aktif, dan ketujuh nilai tanpa mempercayai validasi client.
- Nilai saran selera di UI bukan record resmi. Status tetap `belum ditetapkan` sampai action penyimpanan berhasil.
- Rentang tanggal harus valid dan tanggal mulai tidak boleh melebihi tanggal akhir.
- File identik pada sheet dan mode yang sama ditolak berdasarkan SHA-256.
- Batch yang dipastikan salah/duplikat dapat dihapus UPG Pusat/Admin agar hash yang sama dapat diimpor ulang.
- Modul `'use server'` tidak boleh mengekspor object/non-function; state awal form harus berada di modul client-safe/netral.
- Batch gagal diberi status `gagal` dan menyimpan catatan error.
- Constraint migrasi lama ditambahkan secara idempotent menggunakan `IF NOT EXISTS` dan `DROP ... IF EXISTS`.
- Constraint `NOT VALID` dipakai pada beberapa upgrade agar data historis tidak menggagalkan instalasi, sementara baris baru tetap diperiksa.
- Tabel memiliki RLS; policy pusat dibuat generik, sedangkan register/loss event memiliki policy khusus satker.
- `ppg_risk_appetites` memakai policy berlapis: UPG Satker membaca dan menulis unit sendiri, UPG Pusat membaca seluruh satker tanpa mutation, dan Admin Sistem dapat melakukan koreksi administratif. Policy scenario `AS RESTRICTIVE` tetap membatasi semua role pada save slot aktif.
- Kegagalan query CEI tidak boleh dianggap sebagai nilai nol; UI menampilkan error agar masalah data/skema dapat ditindaklanjuti.
- Payload Gemini dibentuk melalui allowlist agregat kategori: jabatan, objek, skenario, musim, asosiasi, dan metrik risiko nasional. `PpgAnalyticsResult.rows`, unit, pemberi, momen/kegiatan bebas, nomor laporan, uraian risiko, kronologi, dan uraian mentah tidak diserialisasi.
- Keluaran Gemini tidak dipercaya langsung: response harus cocok JSON Schema, lalu dinormalisasi ulang terhadap risk ID dan action code yang benar-benar tersedia.
- Input prompt memperlakukan seluruh string analitik sebagai data tidak tepercaya dan menginstruksikan model mengabaikan perintah yang mungkin tersisip di dalam nilai data.
- Referensi `ai_run` dan `ai_rec` dari URL/form tidak dipercaya: pembuatan Program wajib memuat ulang snapshot server, mengikat rekomendasi ke periodenya, memverifikasi risk/action, dan menolak kandidat tindakan yang belum disetujui.
- API key hanya dibaca dari `process.env.GEMINI_API_KEY` pada modul `server-only`; tidak memakai prefix `NEXT_PUBLIC_`.

## 13. Privasi, Audit, dan Retensi

- Data laporan gratifikasi tidak menyimpan nama, NIK, nama pemberi, alamat, kontak, atau tanggal lahir.
- Bukti LED berada pada bucket privat `ppg-led-bukti`, batas 10 MB, MIME PDF/JPEG/PNG/WebP.
- Link bukti diberikan sebagai signed URL berdurasi terbatas.
- Source row, source sheet, file hash, raw payload terbatas, similarity, reviewer, dan timestamps menjaga lineage.
- Workbook asli yang dipakai sebagai referensi format tetap berada di area sumber internal dan tidak disajikan sebagai static asset publik.
- Penghapusan batch Risk Register mencatat metadata target pada `ppg_audit_log`; data resmi yang telah diterbitkan tidak ikut dihapus.
- Penghapusan akun mengosongkan actor/reference user tanpa menghapus histori organisasi.
- Snapshot program tidak boleh dihitung ulang secara diam-diam setelah program ditetapkan.
- Setiap Generate/Regenerasi AI membuat `ppg_ai_recommendation_runs` baru; run lama tidak di-update agar model, prompt version, input agregat, keluaran, actor, dan waktu tetap dapat diaudit.
- Kandidat tindakan menyimpan status review, catatan reviewer, reviewer, waktu keputusan, dan `promoted_action_id`; promosi maupun penolakan juga dicatat pada `ppg_audit_log`.

## 14. Strategi Pengujian

### 14.1 Isolasi scenario/save slot

Isolasi data menggunakan dua record tetap pada `ppg_scenarios`: `real` dan `demo`. Preferensi aktif disimpan per akun pada `ppg_user_scenario_preferences`; bila belum ada preferensi, fungsi `ppg_current_scenario_id()` selalu mengembalikan slot riil.

Seluruh tabel data transaksional PPG, termasuk `ppg_risk_appetites`, `ppg_ai_recommendation_runs`, dan `ppg_ai_action_candidates`, memiliki `scenario_id`. Kolom tersebut otomatis mengambil slot aktif pada insert. Policy PostgreSQL `AS RESTRICTIVE` mewajibkan `scenario_id = ppg_current_scenario_id()` untuk operasi baca dan tulis, sehingga policy role/ownership yang sudah ada tetap berlaku sekaligus tidak dapat membuka slot lain. Constraint kode bisnis utama menjadi komposit dengan `scenario_id`, agar kode yang sama sah digunakan secara independen pada dua slot. Counter nomor Loss Event juga menggunakan primary key `(scenario_id, tahun)`, sehingga pembuatan atau reset LED dummy tidak melompati nomor LED resmi. Selain isolasi scenario, policy role membatasi tabel AI kepada UPG Pusat/Admin; Server Action kembali menegakkan syarat slot `demo` sebelum memanggil provider.

Beberapa alur Satker memakai service-role untuk validasi lintas tabel dan private storage. Seluruh query database pada alur tersebut wajib menggunakan `createPpgAdminClient(scenarioId)`, yang menambahkan filter skenario pada select/update/delete dan menstempel `scenario_id` pada insert/upsert. Akses storage diteruskan tanpa perubahan.

Seed simulasi dibuat idempotent oleh `ensurePpgDemoData()`. Dataset mencakup lima risiko generik, delapan kontrol, hingga 60 pengadilan, dua register per pengadilan, selera risiko per pengadilan, pemetaan dan penilaian efektivitas, validasi UPG Pusat, mitigasi, 369 laporan anonim (253 tanpa konteks atau sekitar 68,6%), sekitar 12 loss event per risiko generik agar persentase Insight B tampak material, snapshot analitik, Program PPG tiga klaster dengan metadata penetapan UPG Pusat, monitoring, treated risk, kontrol gagal terstruktur, serta kandidat kurasi bottom-up. `resetPpgDemoData()` menghapus hanya record `scenario_id` demo sebelum membentuk ulang dataset; hanya Admin Sistem yang dapat memicunya dari UI.

### 14.2 Unit/integration checks

- Workbook valid dikenali dan sheet salah ditolak.
- Tahun/triwulan dan baris data terbaca sesuai sel baku.
- Fill-down unit bekerja.
- Residual dan treated tetap `null` setelah parsing.
- Similarity identik = 100 dan threshold grouping konsisten.
- Formula skor risiko dan batas level benar.
- Selera risiko mengklasifikasikan skor di atas ambang sebagai kandidat treatment, nilai sama dengan ambang sebagai dalam selera, dan data tanpa penetapan sebagai belum ditetapkan.
- Insight A menyimpan lima kontribusi yang totalnya sama dengan skor A.
- Insight B menggunakan distinct satker, bukan event count.
- CEI mengabaikan `belum_dinilai`, menghasilkan `null` tanpa observasi, menerapkan bobot 100/50/0, serta penalti 5 poin per loss event yang memenuhi syarat.
- Penalti CEI menggunakan kontrol gagal terstruktur dan fallback historis hanya untuk event lama tanpa relasi.
- Kandidat kontrol bottom-up menghitung satker unik, menyembunyikan kandidat yang sudah dipromosikan, dan aman terhadap benturan kode/relasi gagal.
- Loss event menolak control ID yang tidak terhubung ke register terpilih.
- Persetujuan validasi kontrol tanpa bukti ditolak dengan pesan yang terlihat.
- Pra pelaksanaan menolak program yang belum ditetapkan/dibatalkan, Satker di luar klaster, risiko tidak cocok, atau tanggal di luar jendela program.
- Pasca pelaksanaan menolak assignment milik unit lain, tanggal aktual invalid, K/D di luar rentang, enum invalid, uraian terlalu pendek, atau URL non-HTTPS.
- Eligibility dropdown dan Server Action memakai gerbang yang sama: penetapan, kesamaan risiko, dan keanggotaan klaster Satker.
- Role dan ownership diuji untuk setiap command.
- Template unduhan diuji memiliki tepat satu sheet, header/metadata baku, formula skor, dan tidak memiliki data risiko pada baris input.
- Server Action impor diuji melalui build agar tidak mengekspor nilai runtime non-async.
- Builder payload AI diuji tidak menyertakan unit, nama pemberi, nomor laporan, momen/kegiatan bebas, uraian risiko, kronologi, maupun `rows` mentah.
- Parser AI diuji menerima 3–5 rekomendasi valid dan menolak risk ID/action code/enum yang tidak tersedia.
- Guard Loss Event diuji menolak role UPG Pusat pada Server Action meskipun endpoint dipanggil di luar UI; Admin tetap lolos untuk debugging.

### 14.3 Acceptance criteria

1. UPG Pusat dapat mengimpor template dan melihat kandidat beserta evidence.
2. Kandidat tidak masuk Risk Library tanpa keputusan eksplisit.
3. UPG Satker hanya dapat membuat register untuk unitnya.
4. Field yang tidak tersedia pada template tetap kosong.
5. Penilaian menampilkan inherent dan residual; evaluasi treated ditempatkan pada Program PPG dan tetap tampil terpisah dalam hasil register.
6. Insight A/B dapat dijelaskan dari raw metric, normalisasi, bobot, dan formula.
7. Program tidak dapat disimpan tanpa satu risiko generik, tindakan, kontrol, KRI, target, dan tanggal yang valid.
8. Keanggotaan tiga klaster tersimpan sebagai snapshot.
9. Build TypeScript dan pengujian PPG lulus.
10. Antrean kurasi tertutup saat render awal dan dapat dibuka melalui summary/panah.
11. UPG Pusat/Admin dapat menghapus batch; kandidat multisumber serta data resmi tetap dipertahankan.
12. Draf hasil impor pada Penilaian Risiko tertutup saat render awal dan dapat dibuka pengguna.
13. Status validasi bukti kontrol tersimpan setelah reload; persetujuan tanpa bukti menampilkan penolakan eksplisit.
14. Loss event menyimpan referensi kontrol gagal dari register serta narasi tambahan secara terpisah.
15. UPG Satker lebih dahulu mengalokasikan program yang telah ditetapkan ke register yang sesuai dan mengisi jadwal/PIC; treated risk baru dapat diajukan melalui assignment tersebut setelah realisasi.
16. CEI menampilkan `Belum dinilai` atau angka berwarna sesuai ambang, dan tidak menonaktifkan kontrol secara otomatis.
17. UPG Pusat/Admin dapat mempromosikan kandidat kontrol bottom-up dan menonaktifkan kontrol dengan jejak audit.
18. Pengguna dapat berpindah Data Riil/Simulasi Lengkap dan seluruh query, analitik, laporan, serta ekspor hanya menampilkan slot aktif.
19. Insert melalui user client maupun service-role masuk ke slot aktif; reset simulasi tidak mengubah jumlah maupun isi Data Riil.
20. UPG Satker dapat menetapkan tujuh ambang selera untuk unit/tahun sendiri; UPG Pusat dapat membaca konsolidasinya tetapi tidak mengubahnya.
21. Penilaian dan Insight B menampilkan status di atas/dalam selera, sementara pembuatan Program menyimpan basis appetite dan upper limit ke snapshot.
22. Nilai saran awal tidak dihitung sebagai penetapan sebelum disimpan; kombinasi satker/tahun tanpa record tetap ditampilkan sebagai `belum ditetapkan`.
23. Kandidat Program direkomendasikan bila terdapat satker di atas selera atau satker yang menembus upper limit, tanpa mengubah formula numerik skor Insight B.
24. Record selera risiko pada Data Riil dan Simulasi Lengkap terisolasi; reset simulasi tidak mengubah ambang resmi satker.
25. UPG Pusat tidak melihat form create Loss Event dan Server Action menolak pembuatan oleh role tersebut; Admin tetap dapat membuat untuk debugging.
26. Tombol Gemini hanya aktif pada Simulasi Lengkap dan payload tidak mengandung nama orang, nama satker, nomor laporan, kronologi, maupun baris mentah.
27. Respons Gemini menghasilkan 3–5 rekomendasi JSON tervalidasi dan tersimpan sebagai snapshot per periode, model, prompt version, actor, dan waktu.
28. Tindakan baru hasil AI tetap berstatus kandidat sampai UPG Pusat/Admin menyetujui; approval, rejection, dan promosi katalog memiliki audit trail.
29. Error key/model, timeout, schema, dan rate limit tampil kepada pengguna tanpa menghilangkan analitik rule-based.
30. Regenerasi AI membuat run baru dan tidak menimpa snapshot rekomendasi sebelumnya.
31. Draf Program yang berasal dari AI hanya dapat disimpan setelah server memvalidasi ulang run, recommendation key, periode, risiko, serta tindakan; kandidat tindakan berstatus menunggu/ditolak tidak dapat digunakan.
32. Rekomendasi AI terpilih dibekukan bersama snapshot/rationale Program PPG sehingga dasar keputusan tetap dapat direproduksi walaupun hasil AI berikutnya berubah.
33. Program baru berstatus `dirancang`; monitoring tidak tersedia sampai UPG Pusat menyimpan catatan dan menekan **Tetapkan Program PPG**.
34. Penetapan program menyimpan validator, waktu, catatan, dan audit trail; status induk selanjutnya tersinkron dari status item pelaksanaan.
35. Program dummy mengikuti metadata penetapan yang sama, sehingga dropdown simulasi tidak memperoleh pengecualian logika bisnis.
36. Satker tidak dapat mengisi realisasi/treated risk sebelum assignment Pra Pelaksanaan tersimpan.
37. UPG Pusat dapat membaca seluruh rencana dan realisasi, tetapi UI tidak menyediakan kontrol untuk mengubah isian Satker; Pusat hanya memvalidasi hasil pascapelaksanaan.
38. Pengajuan ulang setelah **Perlu perbaikan** mengosongkan metadata validator lama dan mengembalikan status ke `menunggu`.

## 15. Operasional Migrasi

Jalankan `supabase/migration_ppg.sql` melalui Supabase SQL Editor pada proyek yang benar, lalu reload schema cache/API bila diperlukan. Setelah migrasi, verifikasi keberadaan tabel staging, kolom treated beserta metadata program/efektivitas/bukti, metadata penetapan program (`ditetapkan_by`, `ditetapkan_at`, `catatan_penetapan`), tabel fase Satker `ppg_satker_program_assignments`, tabel dan indeks `ppg_loss_event_controls`, `ppg_scenarios`, `ppg_user_scenario_preferences`, `ppg_risk_appetites`, `ppg_ai_recommendation_runs`, `ppg_ai_action_candidates`, kolom dan policy isolasi `scenario_id`, fungsi helper, trigger kode LED, dan bucket privat. Aplikasi harus menampilkan pesan skema terbaru bila query ke struktur yang diwajibkan gagal. Migrasi bersifat idempotent untuk penambahan kolom, constraint, tabel, indeks, dan policy yang baru.

File migrasi terbaru aman dijalankan sebelum maupun setelah save slot pernah digunakan. Seed katalog tindakan dan sinkronisasi awal counter Loss Event—yang dieksekusi sebelum bentuk unique key lama/baru dapat dipastikan—menggunakan `ON CONFLICT` tanpa conflict target. Setelah constraint komposit terbentuk, operasi runtime memakai key yang eksplisit, termasuk upsert appetite pada `(scenario_id, unit_kerja_id, tahun)`. Urutan ini mencegah PostgreSQL `42P10: there is no unique or exclusion constraint matching the ON CONFLICT specification` pada jalur upgrade tertentu. Jika error tersebut muncul, hentikan eksekusi, salin ulang seluruh `supabase/migration_ppg.sql` terbaru, lalu jalankan kembali sebagai satu skrip—jangan melanjutkan potongan migrasi lama.

Setelah migrasi berhasil, Admin Sistem perlu memilih **Simulasi Lengkap** dan menjalankan **Reset Simulasi** satu kali agar seed lama dibentuk ulang dengan selera risiko per pengadilan, cakupan multi-satker, kontrol gagal terstruktur, contoh Pra/Pasca Pelaksanaan, validasi realisasi, dan snapshot analitik terbaru. Langkah ini hanya menghapus/membentuk ulang slot demo; Data Riil tidak berubah.

Untuk instalasi lama, kolom `kemungkinan_existing`, `dampak_existing`, `skor_existing`, dan `level_existing` tidak di-rename agar kompatibilitas terjaga. Seluruh UI, dokumentasi, dan logika baru memperlakukannya sebagai **residual risk**.
