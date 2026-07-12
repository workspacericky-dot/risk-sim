# PRD — Alat Workshop Penilaian Risiko *Live* untuk Diklat MA

| | |
|---|---|
| **Nama Produk** | RiskLab Live — Simulasi Penilaian Risiko untuk Diklat |
| **Versi PRD** | 1.0 (Draft) |
| **Tanggal** | 12 Juli 2026 |
| **Pemilik Produk** | (diisi) |
| **Status** | Draft untuk direview |
| **Tipe PRD** | Standard (comprehensive) |
| **Turunan dari** | Aplikasi Manajemen Risiko SPIP MA (Risk-Sim) — mesin risiko dipertahankan |

> **Catatan lingkup:** Produk ini **hanya untuk tujuan edukasi/pelatihan**. Ia **bukan** sistem manajemen risiko resmi dan **tidak** menghasilkan dokumen risiko yang mengikat. Data yang dihasilkan bersifat latihan/simulasi.

---

## 1. Executive Summary

RiskLab Live adalah alat workshop berbasis web untuk **diklat/pelatihan klasikal** yang mengajak peserta didik lingkungan peradilan mensimulasikan **penilaian risiko SPIP** secara langsung dan menyenangkan. Berbeda dengan aplikasi induknya yang berorientasi tabel-formulir kaku untuk praktisi, RiskLab Live menyajikan **form terpandu (wizard) yang ramah pemula dengan hint kontekstual di setiap langkah**, sehingga peserta yang baru mengenal manajemen risiko dapat belajar dengan beban kognitif rendah.

Sesi dipandu **instruktur**: instruktur menetapkan **satu konteks/skenario bersama**, lalu membuka tahap demi tahap (**lockstep**) — Identifikasi → Analisis → Evaluasi. Sementara peserta (sebagai **individu**) mengisi, **layar admin menampilkan visualisasi *live***: **heatmap 5×5 real-time** yang terisi seiring submisi peserta, plus umpan langsung register identifikasi, analisis, dan evaluasi.

Produk mempertahankan **"mesin" penilaian risiko** dari aplikasi induk — 7 kategori risiko, skala kemungkinan × dampak 1–5, matriks 5×5 "besaran risiko" (1–25), konversi level (Sangat Rendah → Sangat Tinggi), dan selera risiko per kategori — sehingga yang dipelajari peserta tetap benar secara metodologis. Dibangun di atas stack yang sama (**Next.js App Router + Supabase**), dengan **Supabase Realtime** sebagai tulang punggung fitur live.

**Nilai inti:** memindahkan penilaian risiko dari "materi ceramah yang abstrak" menjadi **pengalaman kelas interaktif** di mana peserta melihat kontribusinya muncul di peta risiko bersama secara langsung.

---

## 2. Problem Statement

**Masalah.** Manajemen risiko SPIP bersifat abstrak dan penuh istilah (kemungkinan vs dampak, risiko melekat vs residu, besaran vs level, selera risiko). Dalam diklat, materi ini umumnya disampaikan lewat ceramah dan lembar kerja statis, sehingga:

- Peserta pemula kesulitan membedakan **7 kategori risiko** dan menaksir **kemungkinan vs dampak** secara terpisah.
- Formulir/tabel gaya praktisi (Lampiran 5/6/7) **terlalu kaku dan menakutkan** bagi peserta yang baru belajar.
- Instruktur **tidak punya visibilitas real-time** atas pemahaman kelas — baru tahu peserta salah menaksir setelah lembar kerja dikumpulkan/dinilai manual.
- Tidak ada **umpan balik instan** dan tidak ada momen "aha" kolektif saat peta risiko kelas terbentuk.

**Mengapa sekarang.** Aplikasi induk (Risk-Sim) sudah memvalidasi mesin risiko dan stack teknis. Menurunkannya menjadi alat diklat interaktif berbiaya rendah namun berdampak besar pada kualitas pelatihan.

**Jika tidak diselesaikan.** Diklat tetap satu arah, tingkat retensi rendah, dan peserta kembali ke unit kerja tanpa "otot" praktik menilai risiko.

---

## 3. Goals & Objectives

### Tujuan Produk
1. Membuat penilaian risiko **mudah dipahami dan menyenangkan** bagi peserta pemula melalui form terpandu + hint.
2. Memberi instruktur **kendali alur kelas** (lockstep) dan **visibilitas live** atas kerja peserta.
3. **Mempertahankan akurasi metodologi** SPIP agar yang dilatih adalah praktik yang benar.

### Objectives (terukur)
- **O1:** ≥85% peserta menyelesaikan seluruh 3 tahap dalam satu sesi diklat (≤90 menit).
- **O2:** Heatmap admin memperbarui titik risiko baru **< 2 detik** setelah peserta submit.
- **O3:** Skor pemahaman (post-test singkat dalam app) naik **≥30%** dibanding pre-test.
- **O4:** ≥80% peserta menilai form "mudah diisi" (≥4/5) di survei akhir sesi.

### Non-Goals (lihat juga §7)
- Bukan sistem MR produksi; tidak ada persetujuan/tanda tangan resmi, tidak ada RTP, maturitas, audit, laporan resmi.
- Tidak mencakup tahap setelah Evaluasi (Rencana Tindak Pengendalian dst.).

---

## 4. User Personas

### Persona 1 — Peserta Diklat ("Rina", 29)
- Analis/staf di satuan kerja pengadilan; **baru** mengenal manajemen risiko.
- Ikut diklat setengah hari; nyaman dengan HP/laptop dan aplikasi web sederhana.
- **Kebutuhan:** panduan jelas langkah-demi-langkah, contoh & definisi di tempat, tahu apakah jawabannya "masuk akal".
- **Frustrasi:** tabel penuh kolom kode (Kol. 1–11), istilah tak dijelaskan, takut salah.

### Persona 2 — Instruktur/Widyaiswara ("Pak Budi", 45)
- Memandu 20–40 peserta per kelas; ingin sesi interaktif dan tepat waktu.
- **Kebutuhan:** menetapkan skenario, membuka tahap saat kelas siap, memantau kemajuan & kesalahan umum secara live, memicu diskusi dari peta risiko bersama.
- **Frustrasi:** tidak tahu siapa yang tertinggal; menilai lembar kerja manual memakan waktu.

### Persona 3 — Admin Penyelenggara ("Sari", 35)
- Menyiapkan sesi, mengelola daftar skenario, mencetak/ekspor ringkasan hasil untuk dokumentasi diklat.
- **Kebutuhan:** membuat sesi, membagikan kode/link akses peserta, mengunduh rekap.

---

## 5. User Stories & Requirements

Prioritas memakai **MoSCoW** (Must/Should/Could/Won't). "Must" = MVP.

### Epik A — Manajemen Sesi & Akses (Must)

**A1. Instruktur membuat sesi diklat**
> Sebagai instruktur, saya ingin membuat sesi baru dan mendapatkan kode/link gabung, agar peserta dapat masuk tanpa registrasi rumit.

Acceptance Criteria:
- Instruktur dapat membuat sesi dengan judul, tanggal, dan mode "individu".
- Sistem menghasilkan **kode sesi 6 karakter** + link/QR.
- Peserta bergabung dengan **memasukkan nama + kode** (tanpa akun/email) dan mendapat identitas peserta yang unik dalam sesi.
- Instruktur dapat melihat daftar peserta yang bergabung secara live.

**A2. Kontrol tahap (lockstep)**
> Sebagai instruktur, saya ingin membuka/menutup tahap (Identifikasi → Analisis → Evaluasi), agar kelas bergerak serempak.

Acceptance Criteria:
- Status sesi punya "tahap aktif": `lobby | identifikasi | analisis | evaluasi | selesai`.
- Peserta **hanya** dapat mengisi tahap yang sedang aktif; tahap terkunci menampilkan status "menunggu instruktur".
- Saat instruktur mengubah tahap, layar peserta berpindah **otomatis** (real-time) tanpa refresh.
- Instruktur dapat kembali ke tahap sebelumnya (mis. untuk membahas ulang).

### Epik B — Penetapan Konteks oleh Instruktur (Must)

**B1. Instruktur menetapkan konteks bersama**
> Sebagai instruktur, saya ingin memilih/menetapkan satu skenario konteks untuk seluruh kelas, agar semua peserta menilai risiko pada situasi yang sama.

Acceptance Criteria:
- Instruktur memilih skenario dari **daftar skenario MA/peradilan siap-pakai** (mis. "Pelayanan PTSP Pengadilan Negeri", "Pengelolaan Barang Bukti", "Administrasi Perkara").
- Skenario memuat: deskripsi unit, sasaran, proses bisnis singkat, dan **selera risiko per kategori** (nilai ambang preset).
- Konteks terpilih tampil (read-only) di layar peserta sebagai "latar" sepanjang sesi.
- *(Should)* Instruktur dapat menyunting ringan (mis. nama unit, satu-dua sasaran) sebelum sesi dimulai.

### Epik C — Form Terpandu Peserta (Must) — *pembeda utama produk*

**C1. Identifikasi risiko yang ramah**
> Sebagai peserta, saya ingin menuliskan risiko lewat form terpandu dengan hint, agar saya paham apa yang harus diisi tanpa takut salah.

Acceptance Criteria:
- Form berupa **kartu/wizard satu-fokus** (bukan tabel Kol. 1–8), field per field dengan bantuan:
  - **Pernyataan risiko**: placeholder + contoh baik/buruk + pola bantu ("[peristiwa] karena [penyebab] sehingga [dampak]").
  - **Kategori risiko**: 7 pilihan sebagai kartu dengan **tooltip definisi + contoh** tiap kategori.
  - **Uraian dampak** & **penyebab (akar masalah)**: opsional, dengan hint singkat.
- Validasi ramah: pesan membimbing, bukan menyalahkan.
- Peserta dapat menambah **beberapa** risiko; daftar miliknya tampil sebagai kartu ringkas yang bisa disunting/hapus (selama tahap aktif).
- Kode risiko dibuat **otomatis** (peserta tidak perlu memikirkan penomoran).

**C2. Analisis risiko yang ramah**
> Sebagai peserta, saya ingin menaksir kemungkinan & dampak lewat kontrol visual berpandu, agar saya belajar menilai secara benar.

Acceptance Criteria:
- Untuk tiap risiko, peserta menilai **risiko melekat**: **Kemungkinan (1–5)** dan **Dampak (1–5)** lewat **slider/pilihan berlabel deskriptif** (bukan angka telanjang), mis. Kemungkinan 4 = "Kemungkinan besar terjadi (≈ sekali/tahun)", Dampak 5 = "Sangat signifikan".
- Sistem **menghitung otomatis** Besaran (matriks 5×5) & Level, lalu menampilkannya sebagai badge berwarna dengan penjelasan singkat.
- Peserta menilai **pengendalian yang ada** (ada/belum; memadai/belum) dan **risiko residu** (Kemungkinan & Dampak 1–5) dengan hint bahwa "pengendalian yang memadai menurunkan skor".
- Besaran & level residu dihitung & ditampilkan otomatis.
- Hint kontekstual menjelaskan istilah *melekat* vs *residu* saat dibutuhkan.

**C3. Evaluasi risiko yang ramah**
> Sebagai peserta, saya ingin melihat risiko mana yang melampaui selera risiko dan posisinya di peta, agar saya paham prioritas.

Acceptance Criteria:
- Sistem membandingkan **besaran residu** tiap risiko dengan **ambang selera risiko kategorinya** dan menandai **"di atas selera → prioritas"**.
- Peserta melihat **heatmap 5×5 pribadi** dengan titik-titik risikonya, dan **daftar risiko prioritas** terurut.
- Penjelasan singkat "mengapa ini prioritas" (nilai vs ambang) ditampilkan per risiko.

### Epik D — Dashboard Live Instruktur (Must)

**D1. Heatmap live kelas**
> Sebagai instruktur, saya ingin melihat heatmap 5×5 yang terisi real-time dari submisi seluruh peserta, agar saya bisa membahas pola kelas secara langsung.

Acceptance Criteria:
- Heatmap 5×5 (kemungkinan × dampak) menampilkan **agregasi seluruh risiko peserta**; tiap sel menunjukkan **jumlah/heat** risiko yang jatuh di sel itu.
- Titik/hitungan **muncul < 2 detik** setelah peserta submit (Supabase Realtime).
- Instruktur dapat mem-*filter* tampilan: melekat vs residu, dan per kategori.
- *(Should)* Klik sel menampilkan daftar pernyataan risiko yang jatuh di sel tersebut (anonim atau bernama, dapat diatur).

**D2. Umpan langsung per tahap**
> Sebagai instruktur, saya ingin melihat umpan langsung identifikasi/analisis/evaluasi yang masuk, agar saya tahu kemajuan & kesalahan umum.

Acceptance Criteria:
- Panel **Identifikasi**: aliran pernyataan risiko masuk + distribusi 7 kategori (bar).
- Panel **Analisis**: progres berapa peserta menyelesaikan analisis; distribusi level (Sangat Rendah→Sangat Tinggi).
- Panel **Evaluasi**: jumlah risiko prioritas terkumpul; peserta yang sudah selesai.
- **Indikator kemajuan** per peserta (belum mulai / mengisi / selesai) untuk tahap aktif.

**D3. Kontrol & moderasi live**
> Sebagai instruktur, saya ingin mengelola tampilan bersama, agar diskusi kelas fokus.

Acceptance Criteria:
- Toggle **anonim/bernama** untuk tampilan bersama (mis. saat ditayangkan ke proyektor).
- *(Could)* Sembunyikan/soroti satu risiko sebagai bahan diskusi.
- *(Could)* Mode "proyektor" layar penuh khusus heatmap.

### Epik E — Rekap & Pembelajaran (Should)

**E1. Ringkasan akhir sesi**
> Sebagai instruktur/admin, saya ingin rekap hasil sesi, agar bisa didokumentasikan & dibahas.

Acceptance Criteria:
- Ringkasan: jumlah peserta, total risiko, distribusi kategori & level, daftar risiko prioritas teratas, heatmap final.
- **Ekspor** ke PDF/CSV.

**E2. Pre/Post-test singkat (Could)**
> Sebagai instruktur, saya ingin kuis singkat sebelum & sesudah, agar dampak pembelajaran terukur (mendukung O3).

---

## 6. Success Metrics

Kerangka: **HEART** (Google) untuk UX + **North Star** untuk dampak.

- **North Star Metric:** *Jumlah risiko yang dinilai lengkap & benar per peserta per sesi* (identifikasi→analisis→evaluasi tuntas).
- **Happiness:** kepuasan form ≥4/5 (O4); NPS instruktur.
- **Engagement:** rata-rata risiko dibuat/peserta; % peserta yang mengisi ketiga tahap.
- **Adoption:** jumlah sesi diklat dibuat/bulan; jumlah instruktur unik.
- **Retention:** % instruktur yang menyelenggarakan sesi ≥2 kali.
- **Task success:** % penyelesaian 3 tahap ≤90 menit (O1); latensi update live < 2 dtk (O2); kenaikan skor post-test (O3).

---

## 7. Scope

### In Scope (MVP — Must)
- Sesi diklat + gabung via kode (individu).
- Konteks bersama dari **daftar skenario MA siap-pakai** + selera risiko preset.
- Alur **lockstep** dikontrol instruktur.
- **Form terpandu** peserta untuk Identifikasi, Analisis, Evaluasi + hint kontekstual.
- **Mesin risiko dipertahankan**: 7 kategori, K×D (1–5), matriks 5×5 besaran, level, selera per kategori (lihat §8).
- **Dashboard live**: heatmap 5×5 real-time + umpan per tahap + kemajuan peserta.

### Out of Scope (MVP)
- Mode **kelompok/tim**, multi-skenario dipilih peserta (Should/Could — fase berikut).
- Tahap setelah Evaluasi (RTP, evaluasi pengendalian lanjut, maturitas, audit, laporan resmi).
- Penetapan konteks penuh oleh peserta (Lampiran 1–4 lengkap).
- Integrasi/sinkron dengan data produksi aplikasi induk; SSO instansi.
- Penilaian/sertifikasi resmi.

### Won't (rilis ini)
- Aplikasi mobile native; mode offline; lokalisasi selain Bahasa Indonesia.

---

## 8. Technical Considerations

### Stack
- **Frontend/Backend:** Next.js App Router (versi in-repo — **wajib** merujuk `node_modules/next/dist/docs/` sebelum menulis kode, sesuai AGENTS.md; API bisa berbeda dari pengetahuan umum).
- **Data & Realtime:** Supabase (Postgres + **Realtime** untuk live), pola `@/utils/supabase/server` & client seperti aplikasi induk.
- **UI:** komponen shadcn/ui + Tailwind (sudah dipakai di repo), ikon lucide-react.

### Mesin Risiko (WAJIB dipertahankan — sumber: kode aplikasi induk)

**Matriks 5×5 "Besaran Risiko"** (baris = Kemungkinan K, kolom = Dampak D):

| K \ D | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| **5** | 9 | 15 | 18 | 23 | 25 |
| **4** | 6 | 12 | 16 | 19 | 24 |
| **3** | 4 | 8 | 14 | 17 | 22 |
| **2** | 2 | 7 | 10 | 13 | 21 |
| **1** | 1 | 3 | 5 | 11 | 20 |

**Konversi Besaran → Level:**
- `≥ 20` → **Sangat Tinggi** (merah)
- `≥ 16` → **Tinggi** (oranye)
- `≥ 11` → **Moderat** (amber)
- `≥ 6` → **Rendah** (hijau)
- `1–5` → **Sangat Rendah** (cyan)

**7 Kategori Risiko:** Strategis, Kebijakan, Kecurangan (Fraud), Bencana, Kepatuhan, Operasional, Kemitraan — masing-masing punya **ambang selera risiko** (dari skenario).

**Prioritas (Evaluasi):** risiko menjadi prioritas jika **besaran residu > ambang selera kategori**; diurutkan besaran residu menurun. (Logika identik `getResidualBesaran` + `getCategoryThreshold` di aplikasi induk — sebaiknya diekstrak jadi util bersama `@/lib/risk-engine` agar tidak duplikasi.)

### Model Data (indikatif, tabel baru — terpisah dari data produksi)
- `workshop_session` (id, kode, judul, tahap_aktif, skenario_id, mode, created_by, created_at)
- `workshop_scenario` (id, nama, deskripsi_unit, sasaran, proses_bisnis, selera_kategori JSON)
- `workshop_participant` (id, session_id, nama, joined_at)
- `workshop_risk` (id, session_id, participant_id, kode, pernyataan, kategori, dampak_uraian, penyebab)
- `workshop_analysis` (risk_id, k_melekat, d_melekat, ada_pengendalian, pengendalian_memadai, k_residu, d_residu) — besaran & level **dihitung**, tidak disimpan sebagai sumber kebenaran.
- Kolom besaran/level boleh disimpan sebagai *generated column* atau dihitung di aplikasi via util bersama.

### Realtime
- Peserta subscribe `tahap_aktif` sesi → auto-navigasi (D-A2).
- Dashboard admin subscribe insert/update `workshop_risk` & `workshop_analysis` untuk heatmap & umpan (D1/D2).
- Pertimbangkan **RLS** per sesi; identitas peserta ringan (tanpa email) — perlu strategi akses aman (mis. token peserta bertanda sesi).

### Isolasi dari produksi
- Skema/tabel **terpisah** (prefix `workshop_`) atau schema `edu` agar simulasi tidak mencemari data MR resmi.

---

## 9. Design & UX Requirements

**Prinsip:** *ramah pemula, satu fokus per layar, hint di tempat.*

- **Layar Peserta:** wizard vertikal; satu pertanyaan/kartu dominan; hint sebagai popover/inline, bukan dinding teks. Bahasa membimbing ("Perkirakan seberapa besar dampaknya bila risiko ini terjadi"). Umpan balik instan (badge level muncul begitu K & D dipilih). Status "menunggu instruktur" yang jelas saat tahap terkunci.
- **Kontrol penilaian:** slider/segmented 1–5 **berlabel deskriptif**, bukan angka telanjang. Warna level konsisten dengan skema mesin risiko.
- **Layar Admin:** tata letak dashboard — heatmap besar di kiri, panel umpan & kemajuan di kanan; **mode proyektor** layar penuh. Toggle anonim/bernama menonjol (etika kelas).
- **Aksesibilitas:** kontras cukup, target sentuh besar (peserta bisa pakai HP), tidak mengandalkan warna semata (label level tekstual).
- **Identitas visual berbeda** dari aplikasi induk (lebih hangat/playful) namun tetap sopan untuk lingkungan MA. *(Rujuk skill `frontend-design` saat implementasi UI.)*
- **Bahasa:** Indonesia, konsisten dengan istilah SPIP.

---

## 10. Timeline & Milestones (indikatif)

| Fase | Cakupan | Est. |
|---|---|---|
| **M0 — Fondasi** | Skema `workshop_*`, util `risk-engine` bersama, buat/gabung sesi | ~1 minggu |
| **M1 — Alur lockstep + Identifikasi** | Kontrol tahap realtime, form identifikasi ramah + hint | ~1 minggu |
| **M2 — Analisis + Evaluasi peserta** | Slider K×D, kalkulasi besaran/level, heatmap pribadi, prioritas | ~1–1.5 minggu |
| **M3 — Dashboard live admin** | Heatmap agregat realtime, umpan per tahap, kemajuan peserta, mode proyektor | ~1.5 minggu |
| **M4 — Rekap & poles** | Ekspor ringkasan, seed skenario MA, aksesibilitas, uji kelas | ~1 minggu |
| **M5 — Uji lapangan** | Pilot 1 diklat nyata, iterasi | ~1 minggu |

*Total kasar ~6–7 minggu untuk MVP (1 pengembang). Pre/post-test & mode tim menyusul.*

---

## 11. Risks & Mitigation

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Realtime tidak stabil di jaringan diklat lemah | Heatmap/umpan tertunda | Fallback polling; tunjukkan status koneksi; batch update |
| Peserta kewalahan meski sudah dipandu | Tujuan edukasi gagal | Uji hint dengan pengguna nyata; contoh konkret; kurangi field wajib |
| Salah tafsir sebagai alat MR resmi | Kepatuhan/kebingungan | Banner "khusus edukasi" tetap; skema data terisolasi |
| Duplikasi mesin risiko lalu *drift* dari induk | Metodologi tidak konsisten | Ekstrak `@/lib/risk-engine` sebagai satu sumber kebenaran |
| API Next.js in-repo berbeda dari asumsi | Bug/waktu terbuang | Ikuti AGENTS.md: baca `node_modules/next/dist/docs/` dulu |
| Akses peserta tanpa akun disalahgunakan | Data sesi kacau | Kode sesi kedaluwarsa; token peserta; RLS per sesi |
| Skala 30–40 peserta serentak | Beban realtime | Uji beban; indeks DB; agregasi sisi server bila perlu |

---

## 12. Dependencies & Assumptions

**Dependencies**
- Supabase (Postgres + Realtime) aktif; kredensial environment tersedia.
- Konten **skenario MA** & nilai selera risiko preset perlu disiapkan (SME/instruktur).
- Komponen UI (shadcn/tailwind) sudah ada di repo.

**Assumptions**
- Peserta punya perangkat + internet selama sesi.
- Satu instruktur per sesi; jumlah peserta ≤ ~40.
- Mode MVP: **individu**, **konteks bersama**, **lockstep** (sesuai keputusan).
- Bahasa Indonesia; lingkungan materi MA/peradilan.
- Tidak perlu integrasi data produksi pada MVP.

---

## 13. Open Questions

1. **Autentikasi peserta:** cukup nama + kode sesi, atau perlu PIN/token agar tidak saling menimpa? Kebijakan privasi nama peserta di tampilan bersama?
2. **Skenario:** berapa banyak skenario MA disiapkan untuk MVP (1 cukup untuk pilot?) dan siapa penyedia kontennya (SME)?
3. **Umpan balik "benar/salah":** apakah sistem memberi *nudge* bila taksiran peserta jauh dari "kunci" instruktur, atau murni netral (biar instruktur yang membahas)?
4. **Persistensi:** apakah hasil sesi disimpan permanen untuk dokumentasi diklat, atau efemeral (terhapus setelah X hari)?
5. **Ekspor:** format wajib (PDF resmi berkop? CSV? keduanya?).
6. **Reset & ulang:** apakah instruktur perlu bisa mengulang tahap/menghapus submisi untuk sesi latihan berulang?
7. **Pre/post-test:** masuk MVP atau fase berikut (mempengaruhi O3)?
8. **Hosting:** Vercel untuk app; ada batasan jaringan internal MA yang perlu diakomodasi?

---

*Dokumen ini adalah draft PRD untuk direview. Bagian yang bertanda (Should)/(Could) berada di luar MVP dan dapat dijadwalkan ke fase berikutnya.*
