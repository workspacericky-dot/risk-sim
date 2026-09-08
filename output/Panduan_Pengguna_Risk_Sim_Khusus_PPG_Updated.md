# Panduan Pengguna Risk Sim — Menu Khusus PPG

**Versi dokumen:** 2.0

**Tanggal pembaruan:** 7 September 2026

**Sasaran pembaca:** UPG Pusat, UPG Satker, dan Admin Sistem

## 1. Pengenalan Menu Khusus PPG

Menu **Khusus PPG** adalah ruang kerja terintegrasi untuk menyusun, menjalankan, dan mengevaluasi Program Pengendalian Gratifikasi di lingkungan Mahkamah Agung RI dan badan peradilan di bawahnya. Modul ini menghubungkan data laporan gratifikasi, risk register satker, Loss Event Database, analisis titik rawan, pustaka risiko dan kontrol, serta monitoring program dalam satu alur yang dapat ditelusuri.

Sistem membantu mesin melakukan pekerjaan kompilasi dan analisis, tetapi tidak menggantikan pertimbangan profesional. Insight, kandidat risiko generik, rekomendasi tindakan, baseline, dan klaster satker dapat dibuat otomatis. Keputusan menyetujui Risk Library dan menetapkan Program PPG tetap berada pada UPG Pusat atau Admin Sistem sesuai kewenangannya.

### 1.1 Submenu dan fungsinya

- **Ringkasan** — menampilkan kondisi umum register risiko, mitigasi, laporan gratifikasi, impor terakhir, dan program yang masih berjalan.
- **Risk and Control Library** — mengelola risiko generik dan kontrol standar lintas satker. Submenu ini juga memuat impor awal Risk Register dan antrean kurasi bottom-up.
- **Penilaian Risiko** — digunakan UPG Satker untuk mengadopsi risiko generik, menilai inherent risk dan residual risk, melihat peta risiko, serta mencatat treated risk setelah Program PPG dilaksanakan.
- **Loss Event** — mencatat kejadian aktual ketika risiko benar-benar terealisasi, lengkap dengan akar masalah, kontrol yang gagal, dampak, bukti, dan proses validasi UPG Pusat.
- **Titik Rawan** — mengolah laporan gratifikasi menjadi Insight A, mengolah loss event tervalidasi menjadi Insight B, lalu menyajikan visual fusi keduanya.
- **Program PPG** — membantu UPG Pusat menyusun program berdasarkan satu risiko generik utama, menentukan kontrol, KRI, target outcome, cakupan nasional/klaster, jadwal, PIC, serta melakukan monitoring.
- **Referensi & Impor** — mengimpor rekapitulasi laporan gratifikasi untuk analisis titik rawan dan menampilkan jejak batch impor.

### 1.2 Pembagian peran

| Peran | Kewenangan utama |
| --- | --- |
| UPG Satker | Menilai risiko unitnya, mengimpor Risk Register operasional, mencatat loss event, mengajukan kejadian, dan mengisi treated risk pascaprogram. |
| UPG Pusat | Mengelola Risk and Control Library, mengkurasi kandidat risiko, membaca penilaian seluruh satker, memvalidasi loss event, membaca Insight A/B, menetapkan dan memonitor Program PPG. |
| Admin Sistem | Memiliki kewenangan koreksi dan pengelolaan penuh untuk kebutuhan administrasi dan pemulihan data. |

## 2. Gambaran Alur Kerja

```text
Risk Register satker ──> staging & kurasi ──> Risk Library generik
                                                  │
                                                  ├──> Penilaian inherent & residual
Laporan gratifikasi ──> Insight A: paparan         │
Loss event aktual ────> Insight B: realisasi ─────┤
                                                  ▼
                                    Rancangan Program PPG
                                                  │
                                     pelaksanaan & monitoring
                                                  │
                                                  ▼
                                         Treated risk
```

Risk Library menjadi bahasa risiko bersama. Penilaian dan loss event tetap memiliki identitas satker, sedangkan Program PPG menggunakan risiko generik sebagai fokus agar dapat berlaku nasional atau pada beberapa klaster satker.

## 3. Pemetaan Variabel Input

### 3.1 Impor Risk Register baku

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Mode impor | Dropdown | Wajib | **Bootstrap Risk Library** untuk kurasi awal atau **Penilaian operasional** untuk membuat draf penilaian satker. |
| File Risk Register | File `.xlsx` | Wajib | Workbook yang mempunyai sheet baku bernama **Risk Register 2026**. Ukuran maksimum 10 MB. |
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
| Treated risk | Angka 1–5 | Diisi kemudian | Tidak direka oleh mesin; diisi setelah Program PPG dilaksanakan. |

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

### 3.3 Penilaian risiko satker

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Satker penilai | Master unit | Otomatis/Wajib | Otomatis dari akun UPG Satker; Admin memilih satker. |
| Risiko generik | Dropdown pencarian | Wajib | Dipilih dari Risk Library berstatus aktif. |
| Tahun dan periode | Angka/Dropdown | Wajib | Periode penilaian risiko. |
| Probabilitas inherent | Dropdown 1–5 | Wajib | Kemungkinan sebelum mempertimbangkan kontrol. |
| Dampak inherent | Dropdown 1–5 | Wajib | Dampak sebelum mempertimbangkan kontrol. |
| Probabilitas residual | Dropdown 1–5 | Wajib | Kemungkinan setelah kontrol yang sedang berjalan. |
| Dampak residual | Dropdown 1–5 | Wajib | Dampak setelah kontrol yang sedang berjalan. |
| Kontrol dan efektivitas | Pilihan/Dropdown | Opsional | Kontrol aktual, status efektivitas, dan bukti penerapan pada satker. |
| Probabilitas treated | Dropdown 1–5 | Diisi pascaprogram | Kemungkinan sesudah treatment Program PPG. |
| Dampak treated | Dropdown 1–5 | Diisi pascaprogram | Dampak sesudah treatment Program PPG. |

### 3.4 Loss Event

| Nama variabel | Jenis data | Sifat | Deskripsi singkat |
| --- | --- | --- | --- |
| Risiko generik utama | Dropdown | Wajib | Satu risiko dari Risk Library yang paling tepat menjelaskan kejadian. |
| Register satker | Dropdown | Opsional | Menghubungkan kejadian dengan penilaian risiko spesifik satker. |
| Nama peristiwa | Teks | Wajib | Judul singkat kejadian aktual. |
| Tanggal kejadian/pelaporan | Tanggal | Wajib | Dasar periode analisis dan ketepatan waktu pelaporan. |
| Kronologi | Teks panjang | Wajib | Fakta urutan kejadian tanpa asumsi. |
| Metode RCA dan akar masalah | Dropdown/Teks | Opsional | Metode dan hasil analisis akar masalah. |
| Kegagalan kontrol | Teks | Opsional | Kontrol yang tidak ada, tidak berjalan, atau tidak efektif. |
| Jenis dan level dampak | Dropdown 1–5 | Wajib | Area dampak resmi dan tingkat dampak aktual. |
| Lesson learned | Teks | Opsional | Pembelajaran yang dapat diterapkan lintas satker. |
| Bukti | File | Opsional | Dokumen atau gambar privat; tautan akses berlaku terbatas. |

### 3.5 Program PPG

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

## 4. Pemetaan Variabel Output

| Nama output | Format tampilan | Makna/interpretasi hasil |
| --- | --- | --- |
| Kandidat risiko generik | Kartu antrean | Kelompok redaksi risiko satker yang dinilai serupa dan perlu keputusan manusia. |
| Similarity | Persentase | Kedekatan teks kandidat dengan anggota sumber; bukan probabilitas kebenaran. |
| Skor risiko | Angka 1–25 | Hasil `probabilitas × dampak`. |
| Level risiko | Label warna | Sangat Rendah, Rendah, Sedang, Tinggi, atau Sangat Tinggi. |
| Peta residual risk | Matriks 5×5 | Posisi risiko setelah kontrol yang sedang berjalan. |
| Insight A | Skor 0–100, narasi, tabel komponen, grafik | Kekuatan paparan berdasarkan laporan gratifikasi: konsentrasi skenario/jabatan, musim, objek uang, dan tren. |
| Baseline Outcome A | Persentase | Nilai awal indikator paparan yang paling relevan dengan rekomendasi tindakan. |
| Insight B | Skor 0–100, narasi, tabel nasional | Bukti realisasi risiko berdasarkan persentase seluruh satker dengan loss event tervalidasi. |
| Baseline Outcome B | Persentase satker | Persentase satker dengan loss event tervalidasi untuk risiko generik utama. |
| Prioritas fusi A×B | Matriks sebar dan label | Klasifikasi prioritas nasional, preventif, perbaikan kontrol, atau monitoring. |
| Klaster satker | Tiga kelompok | Klaster 1: kritis; Klaster 2: realisasi terbatas/preventif; Klaster 3: terkendali/monitoring. |
| Snapshot analitik | Rekaman basis keputusan | Membekukan data, formula, baseline, dan rekomendasi yang dipakai saat program dibuat. |
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

Insight B menjawab: **“Seberapa luas risiko tersebut benar-benar terjadi?”** Dasarnya hanya loss event yang tervalidasi dan terhubung dengan satu risiko generik. Penyebutnya seluruh satker pada master unit kerja, bukan jumlah laporan mentah.

Contoh: bila terdapat 1.000 satker dan satu satker memiliki loss event tervalidasi, maka **Satker terdampak = 0,1%**. Satu satker dengan banyak kejadian tetap dihitung satu satker untuk ukuran terdampak, tetapi dapat masuk indikator berulang.

Skor Insight B dihitung dari:

```text
B = min(100,
        2 × % satker terdampak
      + 4 × % satker berdampak tinggi
      + 4 × % satker berulang
      + 2 × % satker dengan kegagalan kontrol)
```

### 5.3 Fusi A × B

| Kondisi | Interpretasi | Respons umum |
| --- | --- | --- |
| A ≥ 55 dan B ≥ 45 | Prioritas nasional | Pencegahan luas sekaligus perbaikan kontrol. |
| A ≥ 55 dan B < 45 | Preventif | Paparan kuat, realisasi belum luas; bertindak sebelum kejadian meningkat. |
| A < 55 dan B ≥ 45 | Perbaikan kontrol | Paparan laporan tidak dominan, tetapi realisasi aktual sudah penting. |
| A < 55 dan B < 45 | Monitoring | Pertahankan kontrol dan tingkatkan kualitas data. |

> Tip: Insight B rendah tidak selalu berarti aman. Periksa kualitas dan kelengkapan pelaporan loss event sebelum mengambil kesimpulan.

## 6. Panduan Penggunaan Langkah demi Langkah

### 6.1 Menyiapkan Risk Library secara bottom-up

1. Masuk sebagai **UPG Pusat** atau **Admin Sistem**.
2. Buka **Khusus PPG → Risk and Control Library**.
3. Pada area impor, klik **Unduh template baku** jika perlu.
4. Pastikan workbook menggunakan sheet **Risk Register 2026** tanpa mengubah nama sheet atau susunan kolom.
5. Pilih mode **Bootstrap Risk Library**.
6. Pilih file `.xlsx`, lalu klik tombol impor.
7. Baca ringkasan jumlah baris lengkap dan baris yang perlu dilengkapi.
8. Buka **Antrean kurasi bottom-up**. Expand bukti sumber untuk melihat satker, nomor baris, peristiwa, penyebab, dampak, kontrol, dan similarity.
9. Rapikan kategori, proses, klasifikasi, faktor penyebab, peristiwa, penyebab, dan dampak menjadi redaksi generik.
10. Pilih salah satu keputusan:
    - **Setujui sebagai risiko baru** untuk membuat entri aktif;
    - **Gabungkan ke risiko yang sudah ada** untuk mencegah duplikasi;
    - **Tolak** bila kandidat tidak layak atau bukan risiko PPG.

> Tip: Risiko generik tidak menyebut nama satker, nama pegawai, atau kejadian tunggal. Redaksinya harus dapat digunakan oleh banyak satker.

### 6.2 Mengimpor penilaian operasional satker

1. Masuk sebagai **UPG Satker** dan buka **Penilaian Risiko**.
2. Unduh atau gunakan template baku **Risk Register 2026**.
3. Unggah file pada area **Impor penilaian operasional**.
4. Buka draf staging hasil impor.
5. Periksa risiko generik yang dicocokkan mesin. Pilih secara manual jika belum cocok.
6. Periksa nilai inherent yang diekstrak.
7. Isi probabilitas dan dampak **residual**. Kolom ini sengaja tidak diisi otomatis bila tidak tersedia pada template.
8. Klik **Buat draf Penilaian Risiko**.
9. Periksa hasil pada tabel dan peta residual risk.

### 6.3 Menambah penilaian secara manual

1. Buka **Penilaian Risiko**.
2. Pilih **Risiko generik** aktif.
3. Isi tahun dan periode.
4. Isi probabilitas dan dampak inherent.
5. Isi probabilitas dan dampak residual berdasarkan kontrol yang berjalan.
6. Klik **Simpan penilaian**.

### 6.4 Mencatat dan mengajukan loss event

1. Buka **Loss Event**.
2. Pilih satu **Risiko generik utama**.
3. Isi nama kejadian, tanggal, lokasi, sumber informasi, dan kronologi.
4. Bila tersedia, hubungkan ke register risiko satker.
5. Isi RCA, akar masalah, kontrol gagal, jenis dampak, level dampak, dan uraian dampak.
6. Unggah bukti bila diperlukan.
7. Simpan sebagai draf, periksa kembali, kemudian ajukan ke UPG Pusat.
8. UPG Pusat meninjau dan menetapkan status tervalidasi, perlu perbaikan, atau tindak lanjut.

### 6.5 Membaca analisis titik rawan

1. UPG Pusat membuka **Titik Rawan**.
2. Pilih tahun dan, bila perlu, triwulan.
3. Periksa cakupan data dan periode baseline.
4. Baca visual Insight A: tren, musim, peringkat jabatan/objek/skenario, dan asosiasi.
5. Baca tabel Insight B nasional per risiko generik.
6. Gunakan matriks A×B untuk memahami prioritas.
7. Expand rincian formula pada kandidat yang akan dipakai.
8. Klik **Buat draf berbantuan** pada risiko yang relevan.

### 6.6 Menetapkan Program PPG

1. Buka **Program PPG** dari kandidat analitik.
2. Pastikan **Risiko generik utama** benar. Satu program hanya mempunyai satu risiko utama.
3. Tinjau Insight A, Insight B, baseline, komponen formula, dan rekomendasi mesin.
4. Pilih tindakan katalog dan kontrol yang sudah dipetakan ke risiko.
5. Isi nama, jadwal, PIC jabatan, sasaran, frekuensi pengukuran, dan target cakupan satker.
6. Tinjau KRI dan ambang hijau/waspada/merah.
7. Tentukan target Outcome A dan Outcome B. Baseline mesin bersifat read-only.
8. Tinjau fokus tiga klaster:
    1. **Realisasi kritis** — dampak 4–5 atau kejadian berulang;
    2. **Realisasi terbatas/preventif** — satu kejadian dengan dampak di bawah 4;
    3. **Terkendali/monitoring** — belum ada loss event tervalidasi.
9. Isi catatan keputusan bila rekomendasi disesuaikan.
10. Klik **Simpan rancangan Program PPG nasional berklaster**.

### 6.7 Monitoring dan treated risk

1. Buka program yang sedang berjalan.
2. Catat tanggal pembaruan, status, progres, realisasi indikator, output, outcome, catatan, dan tautan bukti.
3. Setelah treatment program benar-benar diterapkan, buka **Penilaian Risiko**.
4. Pada **Nilai treated risk pasca-Program PPG**, pilih register terkait.
5. Isi probabilitas dan dampak treated berdasarkan kondisi pascaprogram.
6. Klik **Simpan treated risk**.
7. Bandingkan inherent → residual → treated untuk melihat perubahan profil risiko.

> Peringatan: Jangan mengisi treated risk hanya karena program telah dijadwalkan. Nilai ini baru bermakna setelah treatment dilaksanakan dan bukti hasil tersedia.

## 7. Glosarium

- **PPG** — Program Pengendalian Gratifikasi.
- **UPG** — Unit Pengendalian Gratifikasi.
- **Risk Library** — kamus bersama risiko generik yang dapat dipakai banyak satker.
- **Control Library** — katalog kontrol standar yang dapat dipetakan ke risiko.
- **Generic risk** — risiko yang redaksinya berlaku luas, bukan catatan milik satu satker.
- **Risk register** — daftar risiko yang dinilai oleh unit kerja pada periode tertentu.
- **Staging** — ruang tunggu data impor sebelum menjadi data resmi.
- **Kurasi** — pemeriksaan, penyatuan duplikasi, dan standardisasi redaksi oleh UPG Pusat.
- **Similarity** — skor kemiripan redaksi untuk membantu pengelompokan; bukan keputusan final.
- **Inherent risk** — risiko sebelum kontrol dipertimbangkan.
- **Residual risk** — risiko yang tersisa setelah kontrol saat ini berjalan.
- **Treated risk** — risiko setelah treatment Program PPG dilaksanakan.
- **Loss event** — kejadian aktual yang menunjukkan risiko benar-benar terealisasi.
- **RCA** — Root Cause Analysis atau analisis akar masalah.
- **Insight A** — indeks paparan dari pola laporan gratifikasi.
- **Insight B** — indeks realisasi risiko dari loss event tervalidasi lintas satker.
- **Baseline** — nilai awal indikator sebelum program dijalankan.
- **Outcome** — perubahan keadaan yang hendak dicapai, bukan sekadar jumlah kegiatan.
- **Output** — hasil langsung kegiatan, misalnya jumlah sosialisasi atau satker yang dijangkau.
- **KRI** — Key Risk Indicator, yaitu indikator peringatan dini bahwa risiko bergerak menuju kondisi yang tidak diinginkan.
- **Snapshot analitik** — salinan tetap data dan hasil analisis yang menjadi dasar keputusan program.
- **Upper limit** — loss event yang memenuhi ambang dampak tinggi sesuai konfigurasi periode.
- **Klaster satker** — kelompok satker yang menerima intensitas treatment berbeda berdasarkan bukti realisasi risiko.

## 8. Pemeriksaan Sebelum Menetapkan Program

- Pastikan periode analisis dan baseline sesuai.
- Pastikan data laporan gratifikasi dan loss event cukup lengkap.
- Pastikan loss event telah tervalidasi dan terhubung ke risiko generik yang benar.
- Pastikan hanya satu risiko generik utama dipilih.
- Pastikan kontrol yang dipilih memang relevan dan aktif.
- Bedakan KRI, output, dan outcome.
- Pastikan target berbentuk persentase satker bila indikator menggunakan cakupan nasional.
- Catat alasan jika keputusan UPG Pusat berbeda dari rekomendasi mesin.
- Simpan laporan perencanaan sebagai jejak keputusan dan laporan pelaksanaan sebagai bukti evaluasi.
