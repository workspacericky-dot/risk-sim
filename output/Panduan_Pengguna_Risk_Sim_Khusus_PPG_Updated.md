# Panduan Pengguna Risk Sim — Menu Khusus PPG

**Versi dokumen:** 2.6

**Tanggal pembaruan:** 11 September 2026

**Sasaran pembaca:** UPG Pusat, UPG Satker, dan Admin Sistem

### Ringkasan pembaruan versi 2.6

- Menambahkan panduan lengkap submenu **Selera Risiko**, termasuk tujuh kategori, nilai saran, matriks K×D, pembagian kewenangan, serta arti status di atas/dalam selera.
- Menjelaskan perbedaan selera risiko satker dengan upper limit UPG Pusat dan cara keduanya digunakan sebagai landasan Program PPG.
- Menyelaraskan panduan dengan save slot **Data Riil/Simulasi Lengkap**, dataset dummy multi-satker, kontrol gagal terstruktur, CEI, dan evaluasi treated risk pascaprogram.
- Menambahkan pemecahan masalah migrasi, termasuk error PostgreSQL `42P10` dan kebutuhan reset data simulasi setelah pembaruan skema.
- Membatasi pembuatan Loss Event kepada UPG Satker; UPG Pusat hanya mereview/validasi, sedangkan Admin tetap memiliki akses debugging.
- Menambahkan rekomendasi Program PPG berbantuan Gemini pada Simulasi Lengkap dengan agregat anonim, snapshot audit, dan antrean persetujuan tindakan baru.
- Memisahkan secara tegas matriks analitik rule-based dari reasoning rekomendasi AI, serta mendokumentasikan regenerasi, pemilihan kartu, prefill draf, dan pembekuan rekomendasi pada snapshot Program PPG.

## 1. Pengenalan Menu Khusus PPG

Menu **Khusus PPG** adalah ruang kerja terintegrasi untuk menyusun, menjalankan, dan mengevaluasi Program Pengendalian Gratifikasi di lingkungan Mahkamah Agung RI dan badan peradilan di bawahnya. Modul ini menghubungkan data laporan gratifikasi, risk register satker, Loss Event Database, analisis titik rawan, pustaka risiko dan kontrol, serta monitoring program dalam satu alur yang dapat ditelusuri.

Sistem membantu mesin melakukan pekerjaan kompilasi dan analisis, tetapi tidak menggantikan pertimbangan profesional. Insight, kandidat risiko generik, rekomendasi tindakan, baseline, dan klaster satker dapat dibuat otomatis. Keputusan menyetujui Risk Library dan menetapkan Program PPG tetap berada pada UPG Pusat atau Admin Sistem sesuai kewenangannya.

### 1.1 Submenu dan fungsinya

- **Ringkasan** — menampilkan kondisi umum register risiko, mitigasi, laporan gratifikasi, impor terakhir, dan program yang masih berjalan.
- **Risk and Control Library** — mengelola risiko generik dan kontrol standar lintas satker, menampilkan Control Effectiveness Index (CEI), serta menyediakan kandidat kontrol bottom-up dari mitigasi satker yang telah selesai. Submenu ini juga memuat impor awal Risk Register, antrean kurasi risiko yang tertutup secara default, serta riwayat impor yang dapat dihapus UPG Pusat/Admin.
- **Selera Risiko** — menetapkan skor residual maksimum yang bersedia diterima oleh setiap UPG Satker untuk tujuh kategori risiko pada suatu tahun.
- **Penilaian Risiko** — digunakan UPG Satker untuk mengadopsi risiko generik, menilai inherent risk dan residual risk, melihat peta risiko, serta memperbarui bukti efektivitas kontrol untuk divalidasi UPG Pusat.
- **Loss Event** — UPG Satker mencatat kejadian aktual ketika risiko benar-benar terealisasi, lengkap dengan akar masalah, referensi kontrol yang gagal, keterangan tambahan, dampak, dan bukti. UPG Pusat hanya meninjau serta memvalidasi; Admin dapat membuat data lintas satker untuk debugging/pengembangan.
- **Titik Rawan** — mengolah laporan gratifikasi menjadi Insight A dan loss event tervalidasi menjadi Insight B. Matriks dan ringkasan bukti memakai formula rule-based yang transparan; pada Simulasi Lengkap, Gemini dapat menyusun rekomendasi program berbasis agregat anonim tersebut.
- **Program PPG** — membantu UPG Pusat menyusun dan menetapkan program berdasarkan satu risiko generik utama. UPG Satker menjalankan dua fase: Pra Pelaksanaan untuk alokasi/rencana dan Pasca Pelaksanaan untuk realisasi, efektivitas, evidence, serta treated risk.
- **Referensi & Impor** — mengimpor rekapitulasi laporan gratifikasi untuk analisis titik rawan dan menampilkan jejak batch impor.

### 1.2 Pembagian peran

| Peran | Kewenangan utama |
| --- | --- |
| UPG Satker | Menetapkan selera risiko unitnya, menilai risiko, mengimpor Risk Register operasional, memperbarui efektivitas dan bukti kontrol, mencatat loss event beserta kontrol gagal, serta mengisi rencana dan realisasi Program PPG unitnya. |
| UPG Pusat | Mengelola Risk and Control Library, memantau selera risiko satker, meninjau CEI dan kandidat kontrol bottom-up, mengkurasi kandidat risiko, memvalidasi loss event, membaca Insight A/B, menghasilkan/review rekomendasi AI, menetapkan Program PPG, memonitor rencana dan realisasi Satker secara read-only, serta memvalidasi realisasi/efektivitas pascaprogram. |
| Admin Sistem | Memiliki kewenangan koreksi dan pengelolaan penuh, termasuk pembuatan Loss Event untuk debugging/pengembangan, penghapusan riwayat impor, dan review kandidat tindakan AI. |

## 2. Gambaran Alur Kerja

```text
Risk Register satker ──> staging & kurasi ──> Risk Library generik
                                                  │
Selera Satker per kategori/tahun ─────────────────┤
                                                  ├──> Penilaian inherent & residual
                                                  │       │
                                                  │       ├─ residual > selera ──> kandidat treatment
                                                  │       └─ residual ≤ selera ──> terima & monitor
Laporan gratifikasi ──> Insight A: paparan         │
Loss event aktual ────> Insight B: realisasi ─────┤
         └────────────> Upper limit pusat ─────────┤
                                                  ▼
                                    Rancangan Program PPG
                                                  │
                                     pelaksanaan & monitoring
                                                  │
                                                  ▼
                                         Treated risk
```

Risk Library menjadi bahasa risiko bersama. Penilaian dan loss event tetap memiliki identitas satker, sedangkan Program PPG menggunakan risiko generik sebagai fokus agar dapat berlaku nasional atau pada beberapa klaster satker.

Selera risiko dan upper limit tidak identik. **Selera risiko** adalah ambang penerimaan ex-ante yang ditetapkan UPG Satker per kategori dan tahun; residual risk di atas ambang menjadi kandidat treatment. **Upper limit** adalah klasifikasi ex-post oleh UPG Pusat atas dampak loss event aktual. Upper limit dapat menjadi alasan eskalasi Program PPG walaupun skor residual masih berada dalam selera, sepanjang keputusan tersebut didokumentasikan.

## 3. Pemetaan Variabel Input

### 3.1 Impor Risk Register baku

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Mode impor | Dropdown | Wajib | Pilih **Susun kandidat Risk Library** untuk kurasi awal atau **Cocokkan untuk Penilaian Risiko** untuk membuat draf penilaian satker. |
| File Risk Register | File `.xlsx` | Wajib | Gunakan template kosong resmi yang hanya mempunyai satu sheet bernama **Risk Register 2026**. Ukuran maksimum 10 MB. |
| Nama UPG | Teks | Dianjurkan | Diisi pada area identitas template sebelum data risiko dimasukkan. |
| Unit kerja | Teks dari Excel | Wajib untuk operasional | Dicocokkan dengan master unit kerja; sel kosong mengikuti unit pada baris sebelumnya. |
| Tahun | Angka dari Excel | Wajib | Dibaca dari identitas tahun pada sheet. |
| Periode | Dropdown/hasil ekstraksi | Wajib | Dikonversi menjadi Triwulan I–IV. |
| Potensi kejadian/peristiwa | Teks dari Excel | Wajib | Menjadi unsur utama pembandingan dan kandidat risiko generik. |
| Klasifikasi risiko | Teks dari Excel | Wajib untuk kurasi akhir | Dibaca dari template dan dinormalisasi saat kurasi. |
| Faktor penyebab | Teks dari Excel | Wajib untuk kurasi akhir | Dinormalisasi menjadi Pemahaman, Penegakan Aturan, Pemeriksaan, Sistem, atau Lain-lain. |
| Penyebab | Teks dari Excel | Opsional | Menjadi bukti variasi redaksi risiko antar-satker. |
| Dampak | Teks dari Excel | Opsional | Menjelaskan konsekuensi risiko. |
| Probabilitas inherent | Angka 1–5 | Wajib untuk penilaian | Dibaca dari template bila valid. |
| Dampak inherent | Angka 1–5 | Wajib untuk penilaian | Dibaca dari template bila valid. |
| Kontrol yang ada | Teks dari Excel | Opsional | Disimpan sebagai sumber kurasi; tidak otomatis menjadi kontrol generik yang disetujui. |
| Rencana mitigasi | Teks dari Excel | Opsional | Dapat dibawa menjadi draf mitigasi pada mode operasional. |
| Residual risk | Angka 1–5 | Diisi manual | Tidak tersedia pada template baku; diisi sebelum draf penilaian dibuat. |
| Treated risk | Angka 1–5 | Diisi kemudian | Tidak direka oleh mesin; diisi pada submenu Program PPG setelah program terkait selesai dilaksanakan. |

Template yang diunduh dari aplikasi merupakan **template kosong**, bukan salinan workbook sumber yang pernah dipakai untuk membaca format. Template berisi header, petunjuk, validasi input, dan 100 baris kosong mulai baris 6. Jangan menambah sheet lain, mengganti nama sheet, atau menggeser posisi header. Kolom berwarna kuning merupakan area input; kolom **Level Risiko** menghitung skor dari probabilitas × dampak.

### 3.2 Kurasi kandidat Risk Library

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Kategori risiko | Dropdown | Wajib | Kategori risiko organisasi untuk kode dan klasifikasi pustaka. |
| Proses bisnis | Dropdown | Wajib | Proses bisnis utama yang dipengaruhi risiko. |
| Subproses bisnis | Dropdown/teks | Kondisional | Diisi jika proses bisnis memerlukan subproses, khususnya Administrasi Umum. |
| Klasifikasi risiko | Dropdown | Wajib | Sektor paparan gratifikasi. |
| Faktor penyebab | Dropdown | Wajib | Faktor penyebab generik yang paling mewakili anggota kandidat. |
| Peristiwa risiko generik | Teks | Wajib | Redaksi standar lintas satker, tidak menyebut unit tertentu. |
| Penyebab generik | Teks | Opsional | Ringkasan penyebab yang berlaku luas. |
| Dampak generik | Teks | Opsional | Ringkasan dampak yang berlaku lintas satker. |
| Keputusan kurasi | Tombol | Wajib | Setujui sebagai baru, gabungkan ke library yang ada, atau tolak. |
| Catatan keputusan | Teks | Opsional | Alasan editorial atau pertimbangan keputusan UPG Pusat. |

### 3.3 Selera risiko PPG

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Satker | Master unit | Otomatis/Wajib | Otomatis untuk UPG Satker; Admin dapat memilih unit untuk koreksi. UPG Pusat hanya memantau. |
| Tahun | Angka 2000–2200 | Wajib | Tahun berlakunya penetapan selera dan tahun register yang akan dibandingkan. |
| Risiko Strategis | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 9. |
| Risiko Kebijakan | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 9. |
| Risiko Kecurangan | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 4 karena toleransi gratifikasi/fraud lebih rendah. |
| Risiko Bencana | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 9. |
| Risiko Kepatuhan | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 8. |
| Risiko Operasional | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 9. |
| Risiko Kemitraan | Angka 1–25 | Wajib | Skor residual maksimum yang diterima; nilai saran awal 9. |
| Catatan/justifikasi | Teks, maks. 1.500 karakter | Dianjurkan | Dasar penetapan, misalnya toleransi sangat rendah terhadap gratifikasi. |

Nilai saran hanya titik awal dan belum dianggap sebagai penetapan sampai pengguna menekan **Tetapkan Selera Risiko PPG**. Pratinjau matriks K×D memakai warna hijau untuk skor yang diterima dan merah untuk skor yang melampaui ambang kategori Kecurangan.

Aturan sistem:

```text
skor residual > ambang selera  → Di atas selera → pertimbangkan treatment/Program PPG
skor residual ≤ ambang selera  → Dalam selera   → terima dan monitor
penetapan tidak ditemukan      → Belum ditetapkan; mesin tidak mengasumsikan nilai
```

### 3.4 Penilaian risiko satker

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Satker penilai | Master unit | Otomatis/Wajib | Otomatis dari akun UPG Satker; Admin memilih satker. |
| Risiko generik | Dropdown pencarian | Wajib | Dipilih dari Risk Library berstatus aktif. |
| Tahun dan periode | Angka/Dropdown | Wajib | Periode penilaian risiko. |
| Probabilitas inherent | Dropdown 1–5 | Wajib | Kemungkinan sebelum mempertimbangkan kontrol. |
| Dampak inherent | Dropdown 1–5 | Wajib | Dampak sebelum mempertimbangkan kontrol. |
| Probabilitas residual | Dropdown 1–5 | Wajib | Kemungkinan setelah kontrol yang sedang berjalan. |
| Dampak residual | Dropdown 1–5 | Wajib | Dampak setelah kontrol yang sedang berjalan. |
| Kontrol dan efektivitas | Pilihan/Dropdown | Opsional | Kontrol aktual, status efektivitas, dan bukti penerapan pada satker. Bukti diperlukan sebelum UPG Pusat dapat menyetujui validasi. |

### 3.5 Loss Event

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Risiko generik utama | Dropdown | Wajib | Satu risiko dari Risk Library yang paling tepat menjelaskan kejadian. |
| Register satker | Dropdown | Opsional | Menghubungkan kejadian dengan penilaian risiko spesifik satker dan menjadi sumber daftar kontrol yang dapat dipilih. |
| Nama peristiwa | Teks | Wajib | Judul singkat kejadian aktual. |
| Tanggal kejadian/pelaporan | Tanggal | Wajib | Dasar periode analisis dan ketepatan waktu pelaporan. |
| Kronologi | Teks panjang | Wajib | Fakta urutan kejadian tanpa asumsi. |
| Metode RCA dan akar masalah | Dropdown/Teks | Opsional | Metode dan hasil analisis akar masalah. |
| Kontrol yang gagal | Multi-select | Opsional | Referensi terstruktur ke satu atau lebih kontrol yang benar-benar digunakan pada register terpilih. |
| Keterangan kegagalan kontrol | Teks panjang | Opsional | Narasi tambahan satker mengenai cara implementasi atau sebab kontrol tidak berjalan; tidak menggantikan referensi kontrol. |
| Jenis dan level dampak | Dropdown 1–5 | Wajib | Area dampak resmi dan tingkat dampak aktual. |
| Lesson learned | Teks | Opsional | Pembelajaran yang dapat diterapkan lintas satker. |
| Bukti | File | Opsional | Dokumen atau gambar privat; tautan akses berlaku terbatas. |

### 3.6 Program PPG

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Periode analisis | Tahun/Triwulan | Wajib | Menentukan data Insight A dan B yang digunakan. |
| Risiko generik utama | Dropdown | Wajib | Satu program selalu berfokus pada satu risiko generik utama. |
| Tindakan katalog | Dropdown | Wajib | Rekomendasi tindakan yang sesuai kategori risiko. |
| Kontrol | Multi-select | Wajib | Satu atau lebih kontrol aktif yang telah dipetakan ke risiko generik. |
| Nama program | Teks | Wajib | Nama resmi Program PPG. |
| Jadwal program | Tanggal | Wajib | Tanggal mulai dan selesai rencana. |
| Sasaran dan target cakupan | Teks/Persentase | Wajib | Sasaran program dan persentase satker yang ditargetkan. |
| PIC jabatan | Teks | Wajib | Penanggung jawab berdasarkan jabatan, bukan nama pribadi. |
| KRI | Teks | Wajib | Indikator peringatan dini beserta ambang hijau, waspada, dan merah. |
| Target Outcome A | Persentase | Wajib | Target perubahan paparan; baseline disediakan mesin. |
| Target Outcome B | Persentase | Wajib | Target penurunan/pengendalian realisasi risiko; baseline disediakan mesin. |
| Fokus tiga klaster | Teks | Wajib untuk model berklaster | Perlakuan bagi klaster realisasi kritis, preventif, dan monitoring. |
| Catatan keputusan | Teks | Opsional | Alasan UPG Pusat menerima atau menyesuaikan rekomendasi mesin. |
| Sumber draf AI | Referensi snapshot | Otomatis/Opsional | Bila draf dibuka dari kartu AI, aplikasi membawa periode, risiko, tindakan, nama program, sasaran, aksi, dan alasan; referensinya diverifikasi ulang oleh server saat disimpan. |
| Catatan penetapan UPG Pusat | Teks, minimal 10 karakter | Wajib saat penetapan | Dasar review formal sebelum program boleh memasuki tahap pelaksanaan. |
| Risk Register yang dialokasikan | Dropdown | Wajib pada Pra Pelaksanaan | Register milik Satker yang risikonya sama dengan risiko program. |
| Program PPG terkait | Dropdown | Wajib pada Pra Pelaksanaan | Program telah ditetapkan UPG Pusat dan Satker termasuk anggota klaster penerima. |
| Mulai dan selesai rencana | Tanggal | Wajib pada Pra Pelaksanaan | Jadwal lokal Satker dalam jendela program yang ditetapkan UPG Pusat. |
| PIC program Satker | Teks jabatan | Wajib pada Pra Pelaksanaan | Penanggung jawab pelaksanaan di Satker; gunakan jabatan, bukan nama pribadi. |
| Tanggal selesai aktual | Tanggal | Wajib pada Pasca Pelaksanaan | Waktu riil program selesai di Satker; dapat berbeda dari tanggal rencana. |
| Uraian realisasi | Teks panjang | Wajib pada Pasca Pelaksanaan | Kegiatan terlaksana, capaian, kendala, dan hasil aktual. |
| Probabilitas dan dampak treated | Dropdown 1–5 | Wajib pada Pasca Pelaksanaan | Kondisi risiko setelah treatment benar-benar dilaksanakan. |
| Efektivitas Program PPG | Dropdown | Wajib pada Pasca Pelaksanaan | Tidak Efektif, Kurang Efektif, Cukup Efektif, atau Efektif. |
| Evidence pelaksanaan | Tautan HTTPS | Wajib pada Pasca Pelaksanaan | Bukti realisasi yang dapat ditinjau sesuai tata kelola akses organisasi. |
| Validasi UPG Pusat | Keputusan dan catatan | Oleh UPG Pusat | Disetujui, Perlu Perbaikan, atau Ditolak; tidak mengubah isian Satker. |

## 4. Pemetaan Variabel Output

| Nama output | Format tampilan | Makna/interpretasi hasil |
| --- | --- | --- |
| Kandidat risiko generik | Kartu antrean | Kelompok redaksi risiko satker yang dinilai serupa dan perlu keputusan manusia. |
| Similarity | Persentase | Kedekatan teks kandidat dengan anggota sumber; bukan probabilitas kebenaran. |
| Skor risiko | Angka 1–25 | Hasil `probabilitas × dampak`. |
| Level risiko | Label warna | Sangat Rendah, Rendah, Sedang, Tinggi, atau Sangat Tinggi. |
| Peta residual risk | Matriks 5×5 | Posisi risiko setelah kontrol yang sedang berjalan. |
| Keputusan selera | Label dan perbandingan angka | Menampilkan **Perlu Program PPG · residual > ambang**, **Dalam selera · residual ≤ ambang**, atau **Selera belum ditetapkan**. |
| Ringkasan appetite | Jumlah register | Pada Ringkasan: register di atas selera serta register yang belum mempunyai landasan selera. |
| Insight A | Skor 0–100, narasi, tabel komponen, grafik | Kekuatan paparan berdasarkan laporan gratifikasi: konsentrasi skenario/jabatan, musim, objek uang, dan tren. |
| Baseline Outcome A | Persentase | Nilai awal indikator paparan yang paling relevan dengan rekomendasi tindakan. |
| Insight B | Skor 0–100, narasi, tabel nasional | Bukti realisasi risiko berdasarkan persentase seluruh satker dengan loss event tervalidasi. |
| Di atas selera | Jumlah dan persentase satker | Satker dengan register risiko terkait yang residualnya melampaui appetite kategori/tahun. Persentase memakai Satker terukur yang telah menetapkan appetite terkait, misalnya `2/24 = 8,3%`, bukan seluruh master Satker. |
| Upper-limit Satker | Jumlah satker unik | Satker yang mempunyai loss event upper-limit untuk risiko generik pada periode analisis. |
| Landasan program | Badge keputusan | **Pertimbangkan PPG** bila minimal satu satker di atas selera atau minimal satu satker memiliki upper-limit; selain itu **Monitor**. |
| Baseline Outcome B | Persentase satker | Persentase satker dengan loss event tervalidasi untuk risiko generik utama. |
| Prioritas gabungan A×B | Matriks sebar dan label | Klasifikasi prioritas nasional, preventif, perbaikan kontrol, atau monitoring. |
| Klaster satker | Tiga kelompok | Klaster 1: kritis; Klaster 2: realisasi terbatas/preventif; Klaster 3: terkendali/monitoring. |
| Snapshot analitik | Rekaman basis keputusan | Membekukan data, formula, baseline, dan rekomendasi yang dipakai saat program dibuat. |
| Snapshot rekomendasi AI | Rekaman per proses Generate/Regenerasi | Menyimpan model, versi prompt, agregat input, 3–5 kartu rekomendasi, pembuat, dan waktu. Regenerasi membuat snapshot baru; hasil lama tetap tersedia sebagai jejak audit. |
| Kartu rekomendasi AI | Kartu terstruktur | Menampilkan temuan, bukti angka, ringkasan alasan, waktu pelaksanaan, sasaran jabatan, aksi konkret, risiko terkait, tindakan katalog/usulan baru, keterbatasan, dan tingkat keyakinan. |
| Kandidat tindakan AI | Status menunggu/disetujui/ditolak | Usulan tindakan baru tidak langsung menjadi Action Catalog. Setelah disetujui, sistem membuat kode `PPG-AI-<8 karakter UUID>` dan baru kemudian tindakan dapat dipakai sebagai draf program. |
| CEI | Angka 0–100 atau Belum dinilai | Indeks efektivitas kontrol agregat; mempertimbangkan penilaian satker dan penalti loss event yang terkait dengan kontrol. |
| Kandidat kontrol bottom-up | Kartu antrean | Mitigasi selesai yang berulang pada beberapa satker dan dapat dipromosikan secara manual ke Control Library. |
| Laporan perencanaan/pelaksanaan | Halaman cetak dan Excel | Dokumen formal program, indikator, target, progres, realisasi, dan bukti. |

## 5. Cara Membaca Insight A dan Insight B

### 5.1 Insight A — paparan

Insight A menjawab: **“Di mana pola paparan gratifikasi terlihat menguat?”** Skor 82/100 berarti gabungan sinyal paparan relatif kuat menurut formula mesin. Angka ini bukan berarti peluang risiko persis 82% dan bukan nilai kerugian.

Komponennya adalah:

- 30% kekuatan konsentrasi skenario;
- 25% anomali periode rawan;
- 20% konsentrasi jabatan;
- 15% paparan uang atau setara uang;
- 10% pertumbuhan dibanding periode setara sebelumnya.

**Baseline mesin 68,6%** berarti nilai aktual indikator outcome yang dipilih mesin sebelum program dimulai. Contohnya, bila indikatornya “proporsi laporan pada skenario dominan”, maka 68,6% berarti 68,6% laporan pada periode dasar berada pada skenario tersebut. Baseline bukan bagian tersembunyi dari skor 82; baseline adalah titik awal untuk mengukur perubahan outcome program.

### 5.2 Insight B — realisasi

Insight B menjawab: **“Seberapa luas risiko tersebut benar-benar terjadi?”** Dasarnya hanya loss event yang tervalidasi dan terhubung dengan satu risiko generik. Penyebutnya adalah Satker yang benar-benar terukur untuk risiko dan periode tersebut (union Satker yang mempunyai risk register terkait atau loss event terkait), bukan seluruh populasi master dan bukan jumlah laporan mentah.

Contoh: bila baru 24 Satker yang terukur dan 12 di antaranya memiliki loss event tervalidasi, maka **Satker terdampak = 12/24 (50%)**. Satu Satker dengan banyak kejadian tetap dihitung satu Satker untuk ukuran terdampak, tetapi dapat masuk indikator berulang. Aplikasi menampilkan pembilang dan penyebut agar cakupan datanya terlihat.

Skor Insight B dihitung dari:

```text
B = min(100,
        0,25 × % satker terdampak
      + 0,35 × % satker berdampak tinggi
      + 0,25 × % satker berulang
      + 0,15 × % satker dengan kegagalan kontrol)
```

Bobotnya berjumlah 100%, sehingga skor tetap proporsional pada rentang 0–100 dan tidak cepat mentok di 100. Pada matriks, Insight A adalah baseline paparan periode yang sama untuk semua risiko generik karena laporan gratifikasi belum dipetakan satu-per-satu ke risiko generik. Karena itu beberapa risiko dapat memiliki koordinat A/B yang identik. Aplikasi menggabungkan titik yang persis bertumpuk menjadi gelembung berangka; buka tooltip untuk melihat seluruh risiko di koordinat tersebut.

### 5.3 Membaca selera risiko bersama upper limit

Selera risiko bukan komponen matematis skor Insight B dan tidak mengubah skor A×B. Ia berfungsi sebagai **gerbang keputusan ex-ante**. Upper limit berfungsi sebagai **sinyal eskalasi ex-post**.

| Kondisi | Makna | Respons yang disarankan |
| --- | --- | --- |
| Residual di atas selera | Satker sejak awal tidak bersedia menerima tingkat risiko tersisa | Pertimbangkan treatment atau Program PPG. |
| Residual dalam selera, tanpa upper limit | Risiko masih dalam batas penerimaan dan belum ada kejadian berdampak tinggi | Terima dengan monitoring dan jaga efektivitas kontrol. |
| Residual dalam selera, tetapi ada upper limit | Penilaian ex-ante terlihat dapat diterima, tetapi kejadian aktual memerlukan eskalasi | UPG Pusat dapat menginisiasi Program PPG dengan justifikasi terdokumentasi. |
| Selera belum ditetapkan | Tidak ada basis toleransi satker yang sah untuk pembandingan | Lengkapi penetapan; jangan menganggap nilai saran sebagai nilai resmi. |

### 5.4 Gabungan A × B

| Kondisi | Interpretasi | Respons umum |
| --- | --- | --- |
| A ≥ 55 dan B ≥ 45 | Prioritas nasional | Pencegahan luas sekaligus perbaikan kontrol. |
| A ≥ 55 dan B < 45 | Preventif | Paparan kuat, realisasi belum luas; bertindak sebelum kejadian meningkat. |
| A < 55 dan B ≥ 45 | Perbaikan kontrol | Paparan laporan tidak dominan, tetapi realisasi aktual sudah penting. |
| A < 55 dan B < 45 | Monitoring | Pertahankan kontrol dan tingkatkan kualitas data. |

> Tip: Insight B rendah tidak selalu berarti aman. Periksa kualitas dan kelengkapan pelaporan loss event sebelum mengambil kesimpulan.

### 5.5 Rekomendasi AI — reasoning berbasis bukti

Rekomendasi AI menjawab pertanyaan lanjutan: **“Dengan pola Insight A, Insight B, appetite, dan upper limit yang terlihat, program konkret apa yang layak dipertimbangkan?”** Fitur ini tidak mengganti formula Insight A/B dan tidak mengklaim hubungan sebab-akibat. Bagian **Ringkasan alasan** pada kartu adalah penjelasan singkat yang dapat diaudit pengguna, bukan penayangan proses berpikir internal model.

Data yang boleh dikirim ke Gemini dibatasi pada agregat kategori dan angka, seperti jabatan, objek, skenario yang telah disamarkan bila perlu, pola musim, asosiasi jabatan–objek, skor risiko nasional, appetite, upper limit, serta daftar terbatas tindakan katalog. Nama individu, nama satker, nama pemberi, nomor laporan, kronologi, uraian risiko bebas, momen/kegiatan bebas, dan baris laporan mentah tidak dikirim.

Setiap kartu harus dibaca sebagai bahan pertimbangan:

- cocokkan bukti angka kartu dengan visual dan tabel analitik;
- periksa keterbatasan dan tingkat keyakinannya;
- pastikan risiko serta tindakan yang dirujuk benar;
- sesuaikan sasaran, jadwal, kontrol, KRI, target, dan klaster berdasarkan pertimbangan UPG Pusat;
- jangan memakai rekomendasi sebagai satu-satunya dasar keputusan pengawasan.

## 6. Panduan Penggunaan Langkah demi Langkah

### 6.1 Menyiapkan Risk Library secara bottom-up

1. Masuk sebagai **UPG Pusat** atau **Admin Sistem**.
2. Buka **Khusus PPG → Risk and Control Library**.
3. Pada area impor, klik **Unduh template kosong**.
4. Buka file `.xlsx` tersebut. Pastikan hanya terdapat sheet **Risk Register 2026** dan mulai mengisi satu risiko per baris dari baris 6.
5. Isi nama UPG, triwulan, tahun, serta kolom risiko yang tersedia. Informasi yang belum tersedia boleh dibiarkan kosong untuk dilengkapi di aplikasi.
6. Jangan mengubah nama sheet, posisi header, atau susunan kolom.
7. Pilih mode **Susun kandidat Risk Library**.
8. Pilih file `.xlsx`, lalu klik **Unggah dan analisis**.
9. Baca ringkasan jumlah baris lengkap dan baris yang perlu dilengkapi.
10. Panel **Antrean kurasi bottom-up** tertutup secara default. Klik baris judul atau panahnya untuk membuka daftar kandidat.
11. Pada kandidat yang akan ditinjau, buka **Lihat bukti sumber** untuk melihat satker, nomor baris, peristiwa, penyebab, dampak, kontrol, dan similarity.
12. Rapikan kategori, proses, klasifikasi, faktor penyebab, peristiwa, penyebab, dan dampak menjadi redaksi generik.
13. Pilih salah satu keputusan:
    - **Setujui sebagai risiko baru** untuk membuat entri aktif;
    - **Gabungkan ke risiko yang sudah ada** untuk mencegah duplikasi;
    - **Tolak** bila kandidat tidak layak atau bukan risiko PPG.

> Tip: Risiko generik tidak menyebut nama satker, nama pegawai, atau kejadian tunggal. Redaksinya harus dapat digunakan oleh banyak satker.

### 6.2 Mengelola riwayat impor dan duplikasi manual

1. Masuk sebagai **UPG Pusat** atau **Admin Sistem**.
2. Buka **Khusus PPG → Risk and Control Library**.
3. Klik judul atau panah **Riwayat impor Risk Register** untuk membuka daftar batch.
4. Bandingkan nama file, mode impor, periode, tahun, status, dan jumlah baris.
5. Bila suatu batch ternyata salah atau merupakan duplikasi yang baru diketahui secara manual, klik **Hapus** pada batch tersebut.
6. Baca dialog konfirmasi, lalu setujui hanya jika targetnya benar.

Penghapusan memiliki batas berikut:

- batch dan seluruh baris staging dari file tersebut dihapus;
- usulan kurasi berstatus menunggu yang hanya mempunyai sumber dari batch tersebut ikut dibersihkan;
- kandidat yang masih mempunyai sumber dari batch lain tetap dipertahankan;
- Risk Library yang sudah disetujui, penilaian risiko yang sudah dibuat, dan mitigasi terkait tidak ikut dihapus;
- tindakan penghapusan dicatat dalam audit log;
- setelah batch dihapus, file yang sama dapat diimpor kembali karena pengunci hash batch sebelumnya sudah tidak ada.

> Peringatan: tombol **Hapus** tidak tersedia untuk UPG Satker. Pastikan duplikasi telah diperiksa sebelum menghapus karena baris staging yang dibuang tidak dapat dipulihkan dari aplikasi.

### 6.3 Menetapkan selera risiko satker

1. Buka **Khusus PPG → Selera Risiko** sebelum membuat atau menilai register tahun berjalan.
2. Pilih tahun penetapan. UPG Satker langsung melihat unitnya; Admin Sistem memilih satker yang akan dikoreksi.
3. Tinjau panel pembeda **Selera risiko** dan **Upper limit** serta pratinjau matriks K×D.
4. Isi skor maksimum yang diterima untuk seluruh tujuh kategori pada rentang 1–25. Jangan membiarkan nilai saran tanpa keputusan sadar.
5. Isi catatan/justifikasi, terutama untuk ambang yang sangat rendah atau berbeda dari saran awal.
6. Klik **Tetapkan Selera Risiko PPG** dan pastikan pesan sukses tampil.
7. Pastikan status berubah menjadi **Sudah ditetapkan**. Setelah register dibuat, buka Penilaian Risiko untuk melihat keputusan **Di atas selera** atau **Dalam selera**.
8. UPG Pusat dapat membuka halaman yang sama untuk melihat tabel cakupan penetapan seluruh satker, tetapi tidak dapat menetapkan nilai atas nama satker.

### 6.4 Mengimpor penilaian operasional satker

1. Masuk sebagai **UPG Satker** dan buka **Penilaian Risiko**.
2. Unduh template kosong `.xlsx` **Risk Register 2026** dari area impor.
3. Unggah file pada area **Impor penilaian operasional**.
4. Bagian **Draf hasil impor yang perlu dilengkapi** tertutup secara default untuk menghemat ruang. Klik judul atau ikon panah untuk membukanya.
5. Periksa risiko generik yang dicocokkan mesin. Pilih secara manual jika belum cocok.
6. Periksa nilai inherent yang diekstrak.
7. Isi probabilitas dan dampak **residual**. Kolom ini sengaja tidak diisi otomatis bila tidak tersedia pada template.
8. Klik **Buat draf Penilaian Risiko**.
9. Periksa hasil pada tabel dan peta residual risk.

### 6.5 Menambah penilaian secara manual

1. Buka **Penilaian Risiko**.
2. Pilih **Risiko generik** aktif.
3. Isi tahun dan periode.
4. Isi probabilitas dan dampak inherent.
5. Isi probabilitas dan dampak residual berdasarkan kontrol yang berjalan.
6. Klik **Simpan penilaian**.

### 6.6 Mencatat dan mengajukan loss event

1. Buka **Loss Event**.
2. Pilih satu **Risiko generik utama**.
3. Pilih **Register satker** bila kejadian terkait dengan penilaian tertentu. Setelah register dipilih, aplikasi menampilkan daftar kontrol yang memang digunakan pada register tersebut.
4. Pada **Kontrol yang gagal**, pilih satu atau lebih kontrol yang relevan. Pilihan dari register lain tidak dapat disimpan.
5. Isi nama kejadian, tanggal, lokasi, sumber informasi, dan kronologi.
6. Isi RCA, akar masalah, jenis dampak, level dampak, dan uraian dampak.
7. Gunakan **Keterangan tambahan kegagalan kontrol** untuk menjelaskan kondisi implementasi yang tidak tercakup oleh nama kontrol. Kolom ini tetap berupa teks bebas dan tidak menggantikan pilihan kontrol terstruktur.
8. Unggah bukti bila diperlukan.
9. Simpan sebagai draf, periksa kembali, kemudian ajukan ke UPG Pusat.
10. UPG Pusat meninjau dan menetapkan status tervalidasi, perlu perbaikan, atau tindak lanjut. Bila risiko generik diubah saat validasi, tautan register dan pilihan kontrol gagal akan dibersihkan agar tidak menyisakan referensi yang tidak konsisten.

UPG Pusat tidak memperoleh formulir **Laporkan loss event**. Percobaan membuat event melalui request langsung juga ditolak server. Admin Sistem tetap dapat membuka formulir lintas satker untuk debugging dan pengembangan aplikasi.

### 6.7 Membaca analisis titik rawan

1. UPG Pusat membuka **Titik Rawan**.
2. Pilih tahun dan, bila perlu, triwulan.
3. Periksa cakupan data dan periode baseline.
4. Baca visual Insight A: tren, musim, peringkat jabatan/objek/skenario, dan asosiasi.
5. Baca tabel Insight B nasional per risiko generik.
6. Periksa kolom **Di atas selera**, **Upper limit**, dan badge **Landasan program**. Jumlah appetite yang telah ditetapkan menunjukkan cakupan data, bukan jumlah pelampauan.
7. Gunakan matriks untuk melihat posisi risiko. Bila perlu memeriksa dasar angkanya, buka panel **Dasar Analitik Gabungan A × B** yang tertutup secara default. Panel ringkas ini memuat klasifikasi, skor A/B, satker terdampak, dampak tinggi, kejadian berulang, kegagalan kontrol, appetite, dan upper limit; bagian ini bukan rekomendasi AI.
8. Pada save slot **Simulasi Lengkap**, klik **Generate rekomendasi AI**. Sistem hanya mengirim agregat anonim tanpa nama individu, nama satker, nomor laporan, kronologi, atau uraian mentah. Tombol **Regenerasi** membuat snapshot baru dan tidak menimpa jejak hasil sebelumnya.
9. Baca setiap kartu: temuan, bukti angka, alasan rekomendasi, waktu, sasaran, aksi konkret, keterbatasan, dan tingkat keyakinan. Klik **Lihat dasar analitik gabungan A × B** pada kartu untuk membuka dan menuju baris risiko terkait.
10. Bila tindakan sudah ada di Action Catalog, klik **Gunakan sebagai draf Program PPG**. Aplikasi membawa referensi snapshot/kartu, periode, risiko, tindakan, nama program, sasaran, aksi, dan ringkasan alasan ke formulir Program PPG.
11. Bila AI mengusulkan tindakan baru, klik **Ajukan ke Action Catalog**. UPG Pusat/Admin kemudian memilih **Setujui ke katalog** atau **Tolak** dengan catatan review.
12. Setelah kandidat disetujui, klik **Gunakan sebagai draf Program PPG**. Saat draf disimpan, server memeriksa kembali bahwa snapshot, kartu, risiko, dan tindakan masih konsisten, lalu membekukan rekomendasi terpilih dalam snapshot program. Keputusan final, target, kontrol, dan klaster tetap ditetapkan manusia.

### 6.8 Menetapkan Program PPG

1. Buka **Program PPG** dari kandidat analitik.
2. Pastikan **Risiko generik utama** benar. Satu program hanya mempunyai satu risiko utama.
3. Tinjau Insight A, Insight B, baseline, komponen formula, serta panel **Landasan Selera Risiko Satker**.
4. Pastikan jumlah satker di atas selera, cakupan penetapan appetite, dan jumlah satker upper-limit masuk akal. Risiko berstatus **Monitor/justifikasi override** tetap dapat dipilih, tetapi alasan profesionalnya perlu dicatat.
5. Pilih tindakan katalog dan kontrol yang sudah dipetakan ke risiko.
6. Isi nama, jadwal, PIC jabatan, sasaran, frekuensi pengukuran, dan target cakupan satker.
7. Tinjau KRI dan ambang hijau/waspada/merah.
8. Tentukan target Outcome A dan Outcome B. Baseline mesin bersifat read-only.
9. Tinjau fokus tiga klaster:
    1. **Realisasi kritis** — dampak 4–5 atau kejadian berulang;
    2. **Realisasi terbatas/preventif** — satu kejadian dengan dampak di bawah 4;
    3. **Terkendali/monitoring** — belum ada loss event tervalidasi.
10. Isi catatan keputusan bila rekomendasi disesuaikan atau UPG Pusat melakukan override atas hasil **Monitor**.
11. Klik **Simpan rancangan Program PPG nasional berklaster**. Basis appetite dan upper limit ikut dibekukan pada snapshot program. Status awal program adalah **Dirancang**.
12. Tinjau kembali kartu program, isi **Catatan penetapan UPG Pusat**, lalu klik **Tetapkan Program PPG**. Waktu dan pengguna yang menetapkan disimpan sebagai audit trail.
13. Setelah ditetapkan, program tersedia bagi Satker anggota klaster untuk dialokasikan pada Risk Register yang sesuai. UPG Pusat tidak mengisi pelaksanaan atas nama Satker.

### 6.9 Memperbarui dan memvalidasi bukti efektivitas kontrol

1. UPG Satker membuka **Penilaian Risiko** dan menuju bagian **Monitoring bukti efektivitas kontrol**.
2. Pilih efektivitas aktual kontrol, isi tautan bukti bila tersedia, lalu simpan pembaruan.
3. UPG Pusat membuka penilaian yang sama dan memilih **Disetujui**, **Perlu perbaikan**, atau **Ditolak** pada kolom **Validasi UPG Pusat**.
4. Status berhasil atau pesan kesalahan tampil pada baris kontrol yang diproses. Muat ulang halaman untuk memastikan status tersimpan.
5. Pilihan **Disetujui** hanya dapat disimpan bila kontrol mempunyai URL bukti. Bila bukti belum ada, aplikasi menolak persetujuan dan menampilkan pesan agar UPG Satker melengkapinya.

### 6.10 Pra Pelaksanaan dan Pasca Pelaksanaan Program PPG

**Fase 1 — Pra Pelaksanaan oleh UPG Satker**

1. Buka **Program PPG**, lalu bagian **Alokasi dan rencana Program PPG Satker**.
2. Pilih Risk Register Satker yang akan menerima treatment.
3. Pilih program yang telah ditetapkan UPG Pusat. Dropdown hanya menampilkan program yang menangani risiko generik yang sama dan menempatkan Satker dalam klaster penerima.
4. Isi tanggal mulai rencana, tanggal selesai rencana, PIC berbasis jabatan, dan catatan perencanaan bila diperlukan. Jadwal harus berada dalam jendela program UPG Pusat.
5. Klik **Simpan rencana pra pelaksanaan**. Pada tahap ini efektivitas, evidence realisasi, dan treated risk belum diisi.

**Fase 2 — Pasca Pelaksanaan oleh UPG Satker**

6. Setelah kegiatan benar-benar selesai, buka kartu alokasi dan pilih **Isi realisasi pascapelaksanaan**.
7. Isi tanggal selesai aktual serta uraian kegiatan, capaian, kendala, dan hasilnya.
8. Pilih efektivitas Program PPG, nilai probabilitas/dampak treated, dan masukkan URL evidence HTTPS.
9. Klik **Ajukan realisasi untuk validasi UPG Pusat**. Status berubah menjadi **Menunggu**.
10. UPG Pusat memonitor kedua fase secara read-only. Pada realisasi yang diajukan, UPG Pusat memilih **Disetujui**, **Perlu perbaikan**, atau **Ditolak**, kemudian menyimpan validasi.
11. Jika berstatus **Perlu perbaikan**, Satker membuka kembali formulir realisasi, memperbaiki data, dan mengajukannya ulang.
12. Baca perbandingan residual → treated. Aplikasi memberi label **Turun**, **Naik**, atau **Tetap** berdasarkan selisih skor.

> Peringatan: Jangan mengisi treated risk hanya karena program telah dijadwalkan. Nilai ini baru bermakna setelah treatment dilaksanakan dan bukti hasil tersedia.

### 6.11 Membaca CEI dan mengkurasi kontrol bottom-up

1. UPG Pusat/Admin membuka **Risk and Control Library** lalu menuju panel efektivitas kontrol.
2. Baca **Skor CEI** pada setiap kontrol aktif. Jika belum ada penilaian efektivitas yang dapat dihitung, aplikasi menampilkan **Belum dinilai**, bukan angka nol.
3. Klik ikon informasi di dekat CEI untuk melihat kriteria sementara:
   - **0–49 (merah/rendah):** perlu kaji ulang dan dapat menjadi kandidat penonaktifan bila kelemahan berlangsung konsisten;
   - **50–79 (kuning/kurang efektif):** perlu perbaikan desain/implementasi dan monitoring lebih ketat;
   - **80–100 (hijau/tinggi):** masih efektif, dapat dipertahankan dengan monitoring berkala.
4. Gunakan skor sebagai sinyal keputusan, bukan perintah otomatis. Sistem tidak menonaktifkan kontrol hanya karena CEI rendah.
5. Tinjau panel kandidat kontrol bottom-up. Kandidat berasal dari mitigasi berstatus selesai, dikelompokkan berdasarkan teks yang dinormalisasi dan risiko generiknya, serta menghitung jumlah **satker unik**.
6. Promosikan kandidat yang layak ke Control Library atau nonaktifkan kontrol lama setelah kajian dan keputusan manusia. Riwayat pemakaian kontrol pada register tetap dipertahankan.

CEI dihitung dari penilaian kontrol yang tersedia: **Efektif = 100**, **Sebagian = 50**, dan **Tidak Efektif = 0**; status **Belum dinilai** diabaikan. Nilai dasar kemudian dikurangi **5 poin untuk setiap loss event yang memenuhi syarat** dan mereferensikan kontrol tersebut. Untuk data historis yang belum memiliki referensi kontrol gagal terstruktur, penalti tetap dapat diterapkan pada semua kontrol dalam register terkait agar perilaku historis tidak hilang.

## 7. Save Slot Data Riil dan Simulasi Lengkap

Pada bagian kanan header modul Khusus PPG tersedia pemilih **Data Riil** dan **Simulasi Lengkap**. Pilihan tersimpan per pengguna dan berlaku untuk seluruh submenu PPG, termasuk Ringkasan, Risk/Control Library, Selera Risiko, Penilaian Risiko, Loss Event, Titik Rawan, Program PPG, Referensi & Impor, laporan, dan ekspor.

- **Data Riil** merupakan slot default dan berisi data operasional resmi yang sudah ada.
- **Simulasi Lengkap** berisi data dummy yang sengaja dibuat untuk memperlihatkan siklus PPG secara utuh: lima risiko generik, delapan kontrol, hingga 60 pengadilan dengan penilaian dan selera risiko, 369 laporan, sekitar 12 loss event per risiko, validasi, mitigasi, kurasi bottom-up, analitik, program berklaster, monitoring, dan treated risk.
- Pemanggilan Gemini dan penyimpanan rekomendasi AI hanya diaktifkan pada **Simulasi Lengkap**. Tombol AI dinonaktifkan pada Data Riil untuk mencegah pengiriman data operasional ke layanan Free Tier.
- Banner kuning **MODE SIMULASI AKTIF** selalu muncul selama slot dummy digunakan. Data pada mode ini tidak boleh dipakai untuk pelaporan resmi.
- Perubahan pada satu slot tidak mengubah isi, analitik, laporan, atau ekspor slot lain.
- Admin Sistem dapat menekan tombol reset di samping pilihan Simulasi Lengkap untuk mengembalikan seluruh data dummy ke kondisi awal. Reset tidak menyentuh Data Riil.

Pada halaman **Program PPG**, panel **Nilai treated risk pasca-Program PPG** ditempatkan paling bawah karena evaluasi tersebut baru dilakukan setelah program dirancang, dijalankan, dimonitor, dan selesai.

## 8. Glosarium

- **PPG** — Program Pengendalian Gratifikasi.
- **UPG** — Unit Pengendalian Gratifikasi.
- **Risk Library** — kamus bersama risiko generik yang dapat dipakai banyak satker.
- **Control Library** — katalog kontrol standar yang dapat dipetakan ke risiko.
- **CEI (Control Effectiveness Index)** — indeks 0–100 yang merangkum penilaian efektivitas kontrol dan sinyal kegagalan dari loss event terkait.
- **Generic risk** — risiko yang redaksinya berlaku luas, bukan catatan milik satu satker.
- **Risk register** — daftar risiko yang dinilai oleh unit kerja pada periode tertentu.
- **Staging** — ruang tunggu data impor sebelum menjadi data resmi.
- **Kurasi** — pemeriksaan, penyatuan duplikasi, dan standardisasi redaksi oleh UPG Pusat.
- **Similarity** — skor kemiripan redaksi untuk membantu pengelompokan; bukan keputusan final.
- **Inherent risk** — risiko sebelum kontrol dipertimbangkan.
- **Residual risk** — risiko yang tersisa setelah kontrol saat ini berjalan.
- **Selera risiko/risk appetite** — skor residual maksimum yang bersedia diterima UPG Satker untuk suatu kategori dan tahun.
- **Di atas selera** — skor residual lebih besar daripada appetite; menjadi dasar awal untuk mempertimbangkan treatment.
- **Dalam selera** — skor residual sama dengan atau lebih kecil daripada appetite; risiko dapat diterima dengan monitoring.
- **Treated risk** — risiko setelah treatment Program PPG dilaksanakan.
- **Efektivitas Program PPG** — penilaian hasil program pada register tertentu, terpisah dari efektivitas masing-masing kontrol.
- **Loss event** — kejadian aktual yang menunjukkan risiko benar-benar terealisasi.
- **RCA** — Root Cause Analysis atau analisis akar masalah.
- **Insight A** — indeks paparan dari pola laporan gratifikasi.
- **Insight B** — indeks realisasi risiko dari loss event tervalidasi lintas satker.
- **Baseline** — nilai awal indikator sebelum program dijalankan.
- **Outcome** — perubahan keadaan yang hendak dicapai, bukan sekadar jumlah kegiatan.
- **Output** — hasil langsung kegiatan, misalnya jumlah sosialisasi atau satker yang dijangkau.
- **KRI** — Key Risk Indicator, yaitu indikator peringatan dini bahwa risiko bergerak menuju kondisi yang tidak diinginkan.
- **Snapshot analitik** — salinan tetap data dan hasil analisis yang menjadi dasar keputusan program.
- **Snapshot rekomendasi AI** — rekaman tetap satu proses Generate/Regenerasi beserta input agregat, model, versi prompt, kartu keluaran, pembuat, dan waktu.
- **Kandidat tindakan AI** — tindakan baru yang diusulkan model dan masih harus direview sebelum dapat dipromosikan ke Action Catalog.
- **Upper limit** — loss event yang memenuhi ambang dampak tinggi sesuai konfigurasi periode.
- **Klaster satker** — kelompok satker yang menerima intensitas treatment berbeda berdasarkan bukti realisasi risiko.

## 9. Pemeriksaan Sebelum Menetapkan Program

- Pastikan periode analisis dan baseline sesuai.
- Pastikan satker telah menetapkan selera untuk tahun dan kategori register yang dianalisis; bedakan nilai saran dari nilai yang sudah disimpan.
- Pastikan status **Di atas/Dalam selera** berasal dari residual risk, bukan inherent atau treated risk.
- Periksa apakah terdapat upper-limit yang mengharuskan eskalasi meskipun residual masih dalam selera.
- Pastikan data laporan gratifikasi dan loss event cukup lengkap.
- Pastikan loss event telah tervalidasi dan terhubung ke risiko generik yang benar.
- Pastikan hanya satu risiko generik utama dipilih.
- Pastikan kontrol yang dipilih memang relevan dan aktif.
- Jika memakai draf AI, pastikan bukti angka, risiko, tindakan, keterbatasan, dan tingkat keyakinan pada kartu telah ditinjau; ubah rekomendasi bila konteks kebijakan memerlukannya.
- Pastikan treated risk hanya diisi pada fase Pasca Pelaksanaan, setelah assignment Pra Pelaksanaan tersimpan dan bukti realisasi tersedia.
- Bedakan KRI, output, dan outcome.
- Pastikan target berbentuk persentase satker bila indikator menggunakan cakupan nasional.
- Catat alasan jika keputusan UPG Pusat berbeda dari rekomendasi mesin.
- Simpan laporan perencanaan sebagai jejak keputusan dan laporan pelaksanaan sebagai bukti evaluasi.

## 10. Pemecahan Masalah Umum

| Gejala | Penyebab yang mungkin | Tindakan |
| --- | --- | --- |
| Submenu atau data Selera Risiko belum tampil | Migrasi database belum diperbarui | Jalankan seluruh `supabase/migration_ppg.sql` terbaru, lalu muat ulang aplikasi. |
| Pesan `there is no unique or exclusion constraint matching the ON CONFLICT specification` | Memakai salinan migrasi lama yang belum kompatibel dengan unique key save-slot | Salin ulang file migrasi terbaru dan jalankan dari awal; versi terbaru memakai conflict handling yang kompatibel dan dapat dijalankan ulang. |
| Penilaian menampilkan “Selera belum ditetapkan” | Tidak ada record untuk kombinasi satker dan tahun register | Buka Selera Risiko, pilih tahun yang sama, tetapkan tujuh ambang, lalu reload Penilaian Risiko. |
| Angka saran terlihat tetapi status belum ditetapkan | Form belum disimpan | Klik **Tetapkan Selera Risiko PPG**; nilai saran bukan penetapan otomatis. |
| UPG Pusat tidak dapat mengubah nilai | Sesuai desain akuntabilitas | Nilai ditetapkan UPG Satker; UPG Pusat hanya memantau. Admin Sistem dapat melakukan koreksi administratif. |
| Data simulasi masih memakai cakupan lama | Seed simulasi lama masih tersimpan | Setelah migrasi berhasil, pilih **Simulasi Lengkap** dan gunakan **Reset Simulasi** sebagai Admin Sistem. |
| Program tidak muncul pada Pra Pelaksanaan | Program belum ditetapkan, risiko register tidak sama, atau Satker tidak berada dalam klaster penerima | Periksa metadata penetapan, risiko generik item, dan anggota klaster Program PPG. |
| Realisasi tidak dapat diisi | Belum ada assignment Pra Pelaksanaan | Simpan dahulu Risk Register, program, jadwal rencana, dan PIC pada Fase 1. |
| Realisasi kembali berstatus Menunggu | Satker mengajukan ulang setelah perbaikan | Ini perilaku yang benar; UPG Pusat perlu memvalidasi versi realisasi terbaru. |
| Tombol Generate rekomendasi AI nonaktif | Save slot aktif adalah Data Riil | Pindah ke **Simulasi Lengkap**; AI sengaja tidak tersedia pada Data Riil. |
| Pesan `GEMINI_API_KEY belum dikonfigurasi` | Secret belum tersedia pada environment server aktif | Tambahkan `GEMINI_API_KEY` pada `.env.local` dan Vercel, lalu restart/redeploy. Jangan memakai prefix `NEXT_PUBLIC_`. |
| Gemini ditolak, timeout, atau kuota habis | API key/model tidak aktif, jaringan terganggu, atau free-tier rate limit tercapai | Periksa akses project/model di AI Studio, tunggu lalu regenerasi. Metrik rule-based tetap tersedia. |
| Gemini API gagal `503`/permintaan tinggi | Kapasitas model utama sedang penuh; bukan kerusakan data atau schema aplikasi | Aplikasi terbaru mencoba ulang otomatis dengan jeda bertahap, lalu memakai `gemini-2.5-flash-lite` sebagai fallback. Bila keduanya masih penuh, tunggu beberapa menit dan coba kembali. |
| Gemini mengembalikan JSON tidak lengkap/terpotong | Provider tidak menutup object JSON sebelum batas output atau respons menyimpang dari schema | Versi terbaru membersihkan Markdown fence/teks pembungkus dan mencoba ulang sekali dengan keluaran lebih ringkas. Jika pesan `MAX_TOKENS` tetap muncul, pilih periode lebih sempit atau coba kembali. |
| Snapshot AI atau antrean kandidat belum tersedia | Migrasi tabel AI belum dijalankan | Jalankan `supabase/migration_ppg.sql` terbaru dan reload aplikasi. |
| Tautan **Gunakan sebagai draf Program PPG** ditolak saat penyimpanan | Snapshot/kartu/tindakan sudah tidak cocok atau kandidat tindakan belum disetujui | Kembali ke Titik Rawan, pilih kartu yang masih valid atau selesaikan review kandidat tindakan, lalu buka ulang draf program. |
