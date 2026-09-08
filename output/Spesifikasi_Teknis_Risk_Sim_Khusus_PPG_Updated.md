# Spesifikasi Teknis Risk Sim — Modul Khusus PPG

**Versi dokumen:** 2.0

**Tanggal pembaruan:** 7 September 2026

**Audiens:** Front-end Engineer, Back-end Engineer, Data Analyst, DBA, QA, dan pemilik proses UPG

## 1. Tujuan dan Ruang Lingkup

Dokumen ini menjelaskan implementasi modul **Khusus PPG** sebagai pipeline data-ke-keputusan. Ruang lingkupnya meliputi impor laporan gratifikasi, impor Risk Register 2026, kurasi bottom-up Risk Library, penilaian inherent/residual/treated, Loss Event Database, Insight A dan B, assisted generation Program PPG, klasterisasi satker, snapshot analitik, serta monitoring.

Prinsip desain utama:

1. Risk Library menyimpan risiko generik; kepemilikan satker berada pada register dan loss event.
2. Impor tidak langsung menerbitkan data ke Risk Library.
3. Mesin mengusulkan; UPG Pusat memutuskan.
4. Program PPG selalu mempunyai satu risiko generik utama.
5. Insight B menggunakan persentase satker agar satu satker dengan volume tinggi tidak mendominasi.
6. Snapshot menjaga reproduktibilitas basis keputusan.
7. Istilah bisnis adalah inherent, residual, dan treated risk. Kolom `*_existing` dipertahankan sebagai nama legacy dengan makna residual.

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

Server Action terlebih dahulu memanggil `requirePpgAccess()` atau `requirePpgAdmin()`. Operasi biasa memakai client sesi agar RLS berlaku. Admin client hanya dipakai pada alur yang memerlukan orkestrasi lintas tabel setelah otorisasi eksplisit dan pemeriksaan kepemilikan di server.

### 2.3 Kontrol akses

| Resource | UPG Satker | UPG Pusat | Admin Sistem |
| --- | --- | --- | --- |
| Risk/Control Library | Baca risiko/kontrol aktif | CRUD | CRUD |
| Kandidat impor bottom-up | Tidak | Kurasi | Kurasi |
| Register risiko | CRUD unit sendiri | Baca semua | CRUD semua |
| Bukti kontrol aktual | CRUD register unit sendiri | Baca/validasi | CRUD/validasi |
| Loss event | CRUD terbatas unit sendiri | Baca dan validasi semua | CRUD semua |
| Insight, snapshot, program | Tidak | CRUD | CRUD |

## 3. Pipeline Impor Risk Register 2026

### 3.1 Kontrak workbook

- Format berkas: `.xlsx`, maksimum 10 MB.
- Sheet wajib: `Risk Register 2026`.
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

### 3.2 Dua mode impor

**Bootstrap Library**:

1. Parser menghasilkan baris staging.
2. Nama unit dicocokkan secara exact-normalized ke master unit.
3. Risiko dibandingkan dengan Risk Library aktif.
4. Match ≥ 88 dipetakan ke library.
5. Sisanya dibandingkan dengan kandidat terbuka.
6. Similarity ≥ 72 digabung ke kandidat; selain itu dibuat kandidat baru.
7. UPG Pusat memeriksa evidence members dan mengambil keputusan.

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

Penyebut seluruh indikator adalah jumlah seluruh satker pada `unit_kerja`:

```text
affected_pct        = distinct_satker_with_event / eligible_satkers × 100
high_impact_pct     = distinct_satker_with_any_level_4_5 / eligible_satkers × 100
recurring_pct       = distinct_satker_with_2_or_more_events / eligible_satkers × 100
control_failure_pct = distinct_satker_with_failure_text / eligible_satkers × 100
```

Skor B:

```text
B = clamp(
      2×affected_pct
    + 4×high_impact_pct
    + 4×recurring_pct
    + 2×control_failure_pct,
    0, 100
)
```

Contoh dengan 100 satker:

- 12 satker terdampak → 12%;
- 5 satker berdampak tinggi → 5%;
- 4 satker berulang → 4%;
- 8 satker mencatat kegagalan kontrol → 8%.

```text
B = 2×12 + 4×5 + 4×4 + 2×8
  = 24 + 20 + 16 + 16
  = 76
```

Satu satker dihitung satu kali pada setiap metrik walaupun memiliki banyak event. Pendekatan ini mencegah dominasi oleh volume satu satker.

## 7. Fusi Insight A dan B

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
| `ppg_control_library` | `id uuid`, `kode`, `nama`, `jenis`, `uraian`, `status` | PK `id`; unique `kode`; jenis Preventif/Detektif/Korektif. |
| `ppg_library_risk_controls` | `risk_library_id uuid`, `control_id uuid` | PK gabungan; M:N risk library–control library. |
| `ppg_register` | identitas unit/periode, inherent `smallint`, legacy residual `*_existing`, treated `*_treated` | PK `id`; FK risk library dan unit; skor = K×D; unique kode+tahun+periode+unit. |
| `ppg_risk_controls` | `risk_id`, `control_id`, `efektivitas`, `bukti_efektivitas_url` | PK gabungan; FK register dan control library. |
| `ppg_risk_control_validations` | `risk_id`, `control_id`, `status`, validator | PK/FK gabungan ke risk controls; validasi terpisah dari pelapor. |
| `ppg_mitigations` | `register_id`, tindakan, PIC, tenggat, status, progres | PK `id`; FK register; progres 0–100. |
| `ppg_reports` | atribut laporan anonim, tanggal, objek, nilai, skenario, klasifikasi | PK `id`; FK batch; tidak menyimpan nama/NIK/pemberi. |
| `ppg_import_batches` | metadata impor laporan gratifikasi | PK `id`; unique hash+sheet. |
| `ppg_loss_events` | unit, risiko generik, register, RCA, dampak, limit, status, bukti | PK `id`; FK unit/risk/register/limit; satu primary generic risk wajib untuk data baru. |
| `ppg_loss_event_report_links` | event, report, type, score, reason | PK gabungan; link kandidat/terkonfirmasi/ditolak. |
| `ppg_led_limit_versions` | tahun, ambang dampak upper, status | PK `id`; unique tahun. |
| `ppg_analysis_snapshots` | periode, method version, `summary jsonb`, `recommendations jsonb` | PK `id`; rentang tanggal valid. |
| `ppg_action_catalog` | kode, tindakan, kategori, lead time, indikator | PK `id`; unique kode; status aktif/nonaktif. |
| `ppg_programs` | kode, snapshot, periode analisis/program, cakupan, status | PK `id`; FK snapshot; unique kode. |
| `ppg_program_items` | program, satu risk library, action, indikator/KRI/outcome | PK `id`; FK program/risk/action; persentase 0–100. |
| `ppg_program_item_controls` | program item, control | PK gabungan; M:N item–control. |
| `ppg_program_clusters` | item, kode 1–3, fokus, target | PK `id`; unique item+kode. |
| `ppg_program_cluster_units` | cluster, unit, `basis jsonb` | PK gabungan; snapshot keanggotaan. |
| `ppg_program_updates` | item, tanggal, status, progres, realisasi, bukti | PK `id`; FK program item. |
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
ppg_risk_library 1 ──< ppg_register >── 1 unit_kerja
       │                    │
       │                    ├──< ppg_risk_controls >── ppg_control_library
       │                    └──< ppg_mitigations
       │
       ├──< ppg_loss_events >── unit_kerja
       │
       └──< ppg_program_items >── ppg_programs >── ppg_analysis_snapshots
                     │
                     ├──< ppg_program_item_controls >── ppg_control_library
                     ├──< ppg_program_clusters >──< ppg_program_cluster_units
                     ├──< ppg_program_updates
                     └──< ppg_program_loss_events >── ppg_loss_events
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

### 10.2 Assisted generation Program PPG

| Pengguna | Front-end | Back-end & Database |
| --- | --- | --- |
| Pilih periode | Render filter | Ambil laporan dan event tervalidasi. |
| Baca visual A/B | Recharts + tabel komponen | Hitung analytics, A, B, ranking, dan klaster. |
| Pilih risiko/tindakan/kontrol | Prefill rekomendasi dan baseline | Validasi mapping risk–control–action. |
| Tetapkan target | Baseline read-only, target editable | Recompute agar tidak mempercayai nilai client. |
| Simpan rancangan | Submit Server Action | Insert snapshot → program → item → controls → clusters → units. |
| Input monitoring | Form update | Insert update dan sinkronkan status/progres item. |

## 11. Wireframe Antarmuka

### 11.1 Risk and Control Library

```text
┌───────────────────────────────────────────────────────────────┐
│ Header Khusus PPG + navigasi submenu                         │
├───────────────────────────────────────────────────────────────┤
│ Import Risk Register                                         │
│ [Unduh template] [Mode ▼] [Pilih .xlsx] [Impor]              │
├───────────────────────────────────────────────────────────────┤
│ Antrean kurasi bottom-up                                     │
│ ┌ Kandidat + confidence + jumlah satker ─────── [expand] ┐   │
│ │ evidence sumber                                            │
│ │ kategori/proses/klasifikasi/faktor/peristiwa/penyebab      │
│ │ [Setujui baru] [Gabungkan] [Tolak]                         │
│ └─────────────────────────────────────────────────────────┘   │
├───────────────────────────────────────────────────────────────┤
│ Form manual library │ tabel Risk Library │ Control Library   │
└───────────────────────────────────────────────────────────────┘
```

Behavior: tombol approve disabled secara fungsional bila field wajib tidak valid; bukti anggota collapsed secara default; field yang tidak diekstrak kosong; duplicate file hash ditolak.

### 11.2 Penilaian Risiko

```text
┌ Import operasional + download template ┐
├ Draf staging: generic risk + inherent + residual + [Buat] ┤
├ Form penilaian manual inherent/residual                   ┤
├ Form treated risk pasca-program                           ┤
├ Matriks residual risk 5×5                                 ┤
├ Bukti dan validasi kontrol                                ┤
└ Tabel inherent │ residual │ treated + search/pagination   ┘
```

### 11.3 Titik Rawan dan Program PPG

```text
┌ Filter tahun/triwulan + kualitas/cakupan data ┐
├ Scatter A×B │ kartu kandidat fusi             ┤
├ tren │ musim │ ranking │ asosiasi             ┤
├ tabel Insight B nasional                      ┤
└ [Buat draf berbantuan]                        ┘

┌ Program PPG ──────────────────────────────────┐
│ risiko utama │ tindakan │ controls            │
│ panel A │ panel B │ rincian formula A         │
│ KRI │ baseline & target outcome A/B           │
│ klaster 1 │ klaster 2 │ klaster 3             │
│ jadwal │ PIC │ target │ [Simpan rancangan]    │
└───────────────────────────────────────────────┘
```

## 12. Validasi, Konsistensi, dan Error Handling

- Semua UUID yang berasal dari form divalidasi formatnya.
- Referensi library/action/control harus aktif dan relasinya diperiksa ulang di server.
- Persentase dibatasi 0–100; K/D dibatasi 1–5; progres dibatasi 0–100.
- Rentang tanggal harus valid dan tanggal mulai tidak boleh melebihi tanggal akhir.
- File identik pada sheet dan mode yang sama ditolak berdasarkan SHA-256.
- Batch gagal diberi status `gagal` dan menyimpan catatan error.
- Constraint migrasi lama ditambahkan secara idempotent menggunakan `IF NOT EXISTS` dan `DROP ... IF EXISTS`.
- Constraint `NOT VALID` dipakai pada beberapa upgrade agar data historis tidak menggagalkan instalasi, sementara baris baru tetap diperiksa.
- Tabel memiliki RLS; policy pusat dibuat generik, sedangkan register/loss event memiliki policy khusus satker.

## 13. Privasi, Audit, dan Retensi

- Data laporan gratifikasi tidak menyimpan nama, NIK, nama pemberi, alamat, kontak, atau tanggal lahir.
- Bukti LED berada pada bucket privat `ppg-led-bukti`, batas 10 MB, MIME PDF/JPEG/PNG/WebP.
- Link bukti diberikan sebagai signed URL berdurasi terbatas.
- Source row, source sheet, file hash, raw payload terbatas, similarity, reviewer, dan timestamps menjaga lineage.
- Penghapusan akun mengosongkan actor/reference user tanpa menghapus histori organisasi.
- Snapshot program tidak boleh dihitung ulang secara diam-diam setelah program ditetapkan.

## 14. Strategi Pengujian

### 14.1 Unit/integration checks

- Workbook valid dikenali dan sheet salah ditolak.
- Tahun/triwulan dan baris data terbaca sesuai sel baku.
- Fill-down unit bekerja.
- Residual dan treated tetap `null` setelah parsing.
- Similarity identik = 100 dan threshold grouping konsisten.
- Formula skor risiko dan batas level benar.
- Insight A menyimpan lima kontribusi yang totalnya sama dengan skor A.
- Insight B menggunakan distinct satker, bukan event count.
- Role dan ownership diuji untuk setiap command.

### 14.2 Acceptance criteria

1. UPG Pusat dapat mengimpor template dan melihat kandidat beserta evidence.
2. Kandidat tidak masuk Risk Library tanpa keputusan eksplisit.
3. UPG Satker hanya dapat membuat register untuk unitnya.
4. Field yang tidak tersedia pada template tetap kosong.
5. Penilaian menampilkan inherent, residual, dan treated secara terpisah.
6. Insight A/B dapat dijelaskan dari raw metric, normalisasi, bobot, dan formula.
7. Program tidak dapat disimpan tanpa satu risiko generik, tindakan, kontrol, KRI, target, dan tanggal yang valid.
8. Keanggotaan tiga klaster tersimpan sebagai snapshot.
9. Build TypeScript dan pengujian PPG lulus.

## 15. Operasional Migrasi

Jalankan `supabase/migration_ppg.sql` melalui Supabase SQL Editor pada proyek yang benar, lalu reload schema cache/API bila diperlukan. Setelah migrasi, verifikasi keberadaan tabel staging, kolom treated, policy RLS, indeks, fungsi helper, trigger kode LED, dan bucket privat. Aplikasi harus menampilkan pesan skema terbaru bila query ke struktur yang diwajibkan gagal.

Untuk instalasi lama, kolom `kemungkinan_existing`, `dampak_existing`, `skor_existing`, dan `level_existing` tidak di-rename agar kompatibilitas terjaga. Seluruh UI, dokumentasi, dan logika baru memperlakukannya sebagai **residual risk**.
