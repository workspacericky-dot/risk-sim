# PRD — E-Perjadin Bawas

| | |
|---|---|
| **Nama Produk** | E-Perjadin Bawas — Sistem Perjalanan Dinas Pengawasan Terintegrasi |
| **Versi PRD** | 1.0 (Draft untuk direview) |
| **Tanggal** | 31 Agustus 2026 |
| **Pemilik Produk** | (diisi) |
| **Tipe PRD** | Standard (comprehensive) |
| **Modul induk** | Risk-Sim — Aplikasi Manajemen Risiko & Pengawasan Badan Pengawasan MA RI |
| **Sumber konsep** | `ref/E-Perjadin/Fase 1.md`, `Fase 2.md`, `Fase 3.md` |
| **Dasar rujukan** | PMK 113/PMK.05/2012 jo. PMK 119/2023 (perjalanan dinas dalam negeri); praktik E-Perjadin Kemenkeu, Perjadin Pemkot Samarinda, Bisma/MAP BPKP |

---

## 0. Keputusan Lingkup yang Mendasari PRD Ini

Dokumen Fase 1–3 menggambarkan sistem berskala Kementerian Keuangan yang bertumpu pada integrasi lintas-instansi. Risk-Sim adalah aplikasi web Next.js + Supabase milik Badan Pengawasan MA. Tiga keputusan berikut menjembatani keduanya dan **mengikat seluruh isi PRD ini**:

| # | Keputusan | Konsekuensi |
|---|---|---|
| **K-1** | Modul dibangun sebagai **sistem operasional end-to-end** untuk perjalanan dinas Bawas sendiri (bukan sekadar alat analisis gaya modul CA), lengkap dengan Anti-Fraud Engine sesuai Fase 3. | Modul bersifat transaksional dan persisten di Supabase — berbeda dari modul CA yang stateless dan berbasis unggah berkas. |
| **K-2** | **Integrasi sistem eksternal dikeluarkan dari lingkup**: SAKTI, Nadin, BSrE/TTE, dan API merchant tiket/hotel **tidak** dibangun, tidak diasumsikan tersedia, dan tidak menjadi prasyarat rilis. | Sistem berdiri sendiri (*self-contained*). Kontrol pengganti dirancang khusus — lihat §8.6. Konsekuensi hukum TTE diangkat di §13. |
| **K-3** | Presensi lapangan dijalankan sebagai **PWA di atas stack Next.js yang sama**; aplikasi native ditunda ke fase lanjutan. | Deteksi *mock location* dan *liveness* tingkat perangkat tidak tersedia di MVP; digantikan **kontrol kompensasi berbasis server** — lihat §8.5. |

> **Prinsip penyusunan:** setiap fitur dalam PRD ini dapat dibangun dengan aset yang sudah dimiliki Risk-Sim (Next.js 16 App Router, Supabase Auth/Postgres/Storage/RLS, Tailwind, ExcelJS) tanpa menunggu persetujuan pihak ketiga.

---

## 1. Executive Summary

**E-Perjadin Bawas** adalah modul perjalanan dinas terintegrasi di dalam Risk-Sim yang mengelola siklus penuh perjalanan dinas pengawasan Badan Pengawasan Mahkamah Agung: **perencanaan & komitmen anggaran → eksekusi lapangan dengan presensi geotagging → pelaporan hasil pengawasan → pertanggungjawaban keuangan (E-SPJ)**, di atas satu *Anti-Fraud Engine* yang memeriksa setiap transaksi secara otomatis.

Bawas adalah aparat pengawasan internal (APIP) Mahkamah Agung. Setiap tahun, tim pemeriksa Bawas melakukan pemeriksaan reguler dan khusus ke ratusan satuan kerja peradilan yang tersebar di seluruh Indonesia. Perjalanan dinas adalah **instrumen kerja utama** sekaligus **pos belanja terbesar** dari fungsi pengawasan tersebut. Ironi struktural yang dijawab modul ini: unit yang bertugas menguji kepatuhan satker lain masih mengelola perjalanan dinasnya sendiri dengan berkas kertas dan lembar kerja Excel yang tidak dapat diuji ulang.

Modul ini memindahkan proses itu ke sistem dengan tiga penegasan yang tidak ada di proses manual:

1. **Kehadiran fisik menjadi syarat pembayaran.** Uang harian dan komponen biaya lain hanya dapat diklaim atas titik presensi geotagged yang lolos validasi otomatis — bukan atas tanda tangan di lembar SPD.
2. **Anggaran terkunci di muka.** Pagu dan tarif SBM tersimpan sebagai data acuan; komitmen dipesan saat Surat Tugas terbit, dan klaim di atas SBM tertahan otomatis.
3. **Segregation of Duties ditegakkan sistem.** Peran Pengelola Kegiatan, Pelaksana, Staf PPK, PPK, PPSPM, dan Bendahara dipisah dan saling mengunci; tidak ada satu aktor yang dapat mengajukan, menyetujui, dan mencairkan sendiri.

Nilai tambah yang **hanya muncul karena modul ini berada di dalam Risk-Sim**: setiap Surat Tugas dapat ditautkan ke **Program Kerja Audit** dan register risiko satker tujuan yang sudah ada di aplikasi. Untuk pertama kalinya, biaya perjalanan pengawasan dapat dibaca berdampingan dengan keluaran pengawasan yang dihasilkannya — *cost per penugasan*, cakupan satker, dan risiko mana yang benar-benar diuji di lapangan.

---

## 2. Problem Statement

### Masalah

Pengelolaan perjalanan dinas pengawasan Bawas hari ini bertumpu pada dokumen kertas, berkas Excel terpisah, dan verifikasi manual. Akibatnya:

- **Kehadiran fisik tidak terbukti secara independen.** Bukti kehadiran berupa tanda tangan dan stempel satker tujuan di lembar SPD — bukti yang dibuat oleh pihak yang sedang diperiksa, tanpa jejak waktu dan lokasi yang dapat diuji ulang. Risiko *perjalanan dinas fiktif* tidak dapat dibantah maupun dibuktikan.
- **Pembebanan ganda tidak terdeteksi di muka.** Ketika seorang pemeriksa masuk ke dua tim penugasan pada tanggal beririsan, tidak ada mekanisme yang memblokir; penyimpangan baru terlihat saat rekonsiliasi akhir — jika terlihat.
- **Pertanggungjawaban lambat dan berulang direvisi.** Berkas SPJ berpindah fisik antar meja, sering tidak lengkap, dan dikembalikan berkali-kali. Sisa uang muka mengendap tanpa batas waktu yang ditegakkan.
- **Kepatuhan SBM diuji belakangan.** Kelebihan klaim baru ditemukan saat verifikasi manual — setelah biaya terlanjur dikeluarkan pelaksana.
- **Laporan hasil dinas tercerai dari biayanya.** Laporan pengawasan dan pertanggungjawaban keuangan hidup di dua tumpukan berkas berbeda. Pertanyaan "berapa biaya yang dikeluarkan untuk menguji risiko X di satker Y" tidak terjawab.
- **Tidak ada jejak audit yang layak uji.** Ketika BPK atau Itjen meminta rekonstruksi satu penugasan, penyusunannya adalah pekerjaan manual berhari-hari.

### Mengapa sekarang

- Risk-Sim sudah memuat **fondasi data yang dibutuhkan**: hierarki 1.800+ satuan kerja (`unit_kerja`), basis pengguna dan peran (`users`), kalender hari libur nasional/cuti bersama (`kalender_libur`), dan Program Kerja Audit (`program_kerja_audit`). Modul perjadin tidak perlu membangun ulang master data ini.
- Modul CA (Capaian Audit) telah membuktikan bahwa Bawas siap memindahkan pekerjaan analitis ke aplikasi. Langkah berikutnya adalah memindahkan pekerjaan **transaksional**.
- Standar akuntabilitas belanja perjalanan dinas terus dinaikkan pasca PMK 119/2023. Sebagai APIP, Bawas berada dalam posisi yang menuntut praktik terbaik pada prosesnya sendiri.

### Jika tidak diselesaikan

Bawas terus memikul risiko temuan atas belanja perjalanan dinasnya sendiri — jenis temuan yang paling merusak kredibilitas sebuah unit pengawasan — sekaligus kehilangan kemampuan mengukur efisiensi fungsi pengawasannya.

---

## 3. Goals & Objectives

### North Star Metric

**Tingkat Perjalanan Dinas Tuntas-Terverifikasi (TDT).**
Persentase penugasan yang memenuhi **ketiga** syarat sekaligus:
(a) seluruh titik presensi wajib terekam dan lolos validasi otomatis tanpa intervensi manual;
(b) laporan hasil dinas terbit di sistem;
(c) E-SPJ disetujui PPK ≤ 14 hari kalender sejak tanggal kembali.

*Target:* **≥ 85%** pada akhir kuartal kedua operasi penuh.

Metrik ini dipilih karena satu angka ini hanya naik bila kontrol, kecepatan, dan kelengkapan bergerak bersama — tidak bisa dinaikkan dengan mengorbankan salah satunya.

### Objectives & Key Results

> Baseline setiap KR diukur pada tahap M0 (§10) dari data perjadin 12 bulan terakhir. Angka target bersifat usulan dan dikonfirmasi bersama PPK & Sekretariat Bawas.

**O1 — Menutup celah perjalanan dinas fiktif dan pembebanan ganda.**
- KR1.1: **100%** Surat Tugas perjalanan dinas Bawas terbit dari sistem (*zero off-system assignment*).
- KR1.2: **0** kasus penugasan beririsan (NIP × tanggal) yang lolos ke tahap pembayaran.
- KR1.3: **≥ 95%** titik presensi wajib tervalidasi otomatis, tanpa jalur pengecualian manual.

**O2 — Mempercepat dan menyederhanakan pertanggungjawaban.**
- KR2.1: Median waktu *tanggal kembali → E-SPJ disetujui* **≤ 10 hari kerja**.
- KR2.2: **≥ 90%** berkas E-SPJ disetujui dengan **maksimal satu** siklus revisi.
- KR2.3: **0** sisa uang muka yang belum direkonsiliasi melewati 30 hari.

**O3 — Menegakkan pagu dan SBM secara preventif, bukan korektif.**
- KR3.1: **0** komitmen anggaran yang melampaui pagu terdaftar.
- KR3.2: **100%** klaim di atas tarif SBM tertahan sistem sebelum verifikasi manusia.

**O4 — Menautkan biaya pengawasan ke keluaran pengawasan.**
- KR4.1: **≥ 95%** Surat Tugas tertaut ke satker tujuan dan (bila relevan) ke Program Kerja Audit.
- KR4.2: Laporan *biaya per penugasan* dan *cakupan satker* tersedia sebagai ekspor mandiri.

**O5 — Menjadikan setiap penugasan dapat direkonstruksi.**
- KR5.1: **100%** aksi pengguna tercatat pada log *append-only*.
- KR5.2: Paket audit satu penugasan (dokumen + metadata presensi + jejak persetujuan) dapat diekspor **< 5 menit** oleh auditor.

### Non-Goals

Lihat §7.2 untuk daftar lengkap. Ringkasnya: modul ini **bukan** sistem pembayaran, **tidak** menerbitkan SPM/SP2D, **tidak** berintegrasi dengan sistem eksternal mana pun pada rilis ini, dan **tidak** mengelola perjalanan dinas luar negeri.

---

## 4. User Personas

### Persona 1 — Pemeriksa Bawas / Pelaksana SPD ("Pak Hendra", 44)
Auditor pada Inspektorat Wilayah. Melakukan 8–14 penugasan pemeriksaan per tahun ke pengadilan tingkat pertama dan banding, sering ke kota kecil dengan penerbangan lanjutan dan sinyal seluler tidak stabil.
- **Kebutuhan:** presensi cepat di lapangan tanpa banyak langkah; kepastian bahwa presensinya tercatat meski sinyal buruk; menulis laporan panjang di laptop hotel tanpa takut draf hilang; tahu persis berapa haknya sebelum berangkat.
- **Frustrasi:** mengumpulkan tanda tangan dan stempel; menyusun ulang kuitansi tercecer setelah pulang; SPJ dikembalikan karena satu lampiran kurang.
- **Kendala teknis:** memakai ponsel pribadi; kuota terbatas; beberapa anggota tim tidak punya ponsel yang mendukung fitur lokasi presisi.

### Persona 2 — Pengelola Kegiatan / Sekretariat Bawas ("Bu Ratna", 38)
Menyusun jadwal penugasan tim pemeriksa, menerbitkan Surat Tugas, dan mengawal kelengkapan administrasi seluruh tim.
- **Kebutuhan:** membentuk tim (Pengendali Mutu, Pengendali Teknis, Ketua Tim, Anggota) sekali kerja untuk satu penugasan; melihat siapa yang sedang tidak tersedia; menerbitkan ST + SPD untuk seluruh anggota dalam satu langkah.
- **Frustrasi:** bentrok jadwal baru ketahuan setelah ST terbit; menyalin data pegawai berulang-ulang; mengejar SPJ satu per satu lewat pesan pribadi.

### Persona 3 — Staf PPK & PPK ("Pak Anwar", 51)
PPK memegang kewenangan komitmen anggaran; Staf PPK melakukan pemetaan pagu dan pengujian bukti.
- **Kebutuhan:** memastikan setiap komitmen ada pagunya; menguji bukti secara berurutan tanpa membuka tumpukan kertas; melihat klaim mana yang menyimpang dari SBM sebelum menyetujui; jejak persetujuan yang melindungi secara hukum.
- **Frustrasi:** menghitung ulang hak keuangan secara manual; menerima berkas tak lengkap; menanggung risiko atas dokumen yang tidak dapat diverifikasi keasliannya.

### Persona 4 — Bendahara Pengeluaran ("Bu Lestari", 46)
Membayarkan uang muka dan menyelesaikan kurang/lebih bayar.
- **Kebutuhan:** daftar kewajiban bayar dan piutang sisa uang muka yang selalu mutakhir; rekap per penugasan siap cetak.
- **Frustrasi:** sisa uang muka yang tak kunjung disetor dan tidak tercatat di satu tempat.

### Persona 5 — Pimpinan Bawas & Auditor Eksternal/Internal ("Pak Irfan", 55)
Pimpinan unit dan pemeriksa (Itjen/BPK) yang menguji belanja perjalanan dinas Bawas.
- **Kebutuhan:** dasbor anomali dan kepatuhan; rekonstruksi satu penugasan secara utuh; ekspor paket bukti yang tidak dapat disunting.
- **Frustrasi:** rekonstruksi manual dari berkas kertas; tidak ada cara memverifikasi keaslian dokumen cetak yang diserahkan.

---

## 5. User Stories & Requirements

Penomoran: **F-x.y** = kebutuhan fungsional; **AF-n** = aturan Anti-Fraud Engine (rinci di §8.6); **AC** = *acceptance criteria* yang dapat diuji.

---

### Modul A — Perencanaan & Komitmen Anggaran (F-1)

#### F-1.1 Pembuatan penugasan & pembentukan tim

> **Sebagai** Pengelola Kegiatan, **saya ingin** membuat satu penugasan berisi maksud, satker tujuan, rentang tanggal, dan seluruh anggota tim sekaligus, **agar** saya tidak menyalin data yang sama berulang kali untuk setiap orang.

**AC:**
- Form menerima: jenis dinas (luar kota / dalam kota > ambang jam / dalam kota ≤ ambang jam), maksud penugasan, satker tujuan (dipilih dari `unit_kerja` yang sudah ada), tanggal berangkat & kembali, dan alur (Rampung / Non-Rampung).
- Anggota tim dipilih dari basis pengguna aktif; setiap anggota diberi **peran tim** (Pengendali Mutu / Pengendali Teknis / Ketua Tim / Anggota Tim) dan **tingkat biaya** yang menentukan tarif SBM.
- Pelaksana non-pegawai (narasumber/tenaga ahli) dapat ditambahkan sebagai peserta eksternal dengan identitas manual, tanpa akun aplikasi.
- Penugasan dapat ditautkan (opsional) ke satu entri **Program Kerja Audit** yang sudah ada.
- Menyimpan penugasan **tidak** menerbitkan Surat Tugas; status awal `Draf`.

#### F-1.2 Kalkulasi hak keuangan otomatis berbasis SBM

> **Sebagai** Pengelola Kegiatan, **saya ingin** sistem menghitung estimasi hak keuangan setiap peserta secara otomatis, **agar** angka yang saya ajukan tidak pernah keliru terhadap tarif resmi.

**AC:**
- Sistem menghitung per peserta: uang harian × jumlah hari, batas biaya penginapan × malam, uang representasi (bila berhak), dan transport lokal — seluruhnya dari tabel SBM aktif sesuai **provinsi satker tujuan**, **tahun anggaran**, dan **tingkat biaya** peserta.
- Jumlah hari dihitung inklusif dari tanggal berangkat s.d. kembali; hari Sabtu, Minggu, dan tanggal pada `kalender_libur` **tetap diakui sebagai hari sah** tanpa surat pernyataan tambahan (adopsi Fase 2 §3).
- Bila tarif SBM untuk kombinasi provinsi/tingkat/tahun tidak ditemukan, sistem menolak melanjutkan dan menampilkan pesan yang menyebut kombinasi yang hilang — **tidak** memakai nilai default diam-diam.
- Estimasi ditampilkan sebagai rincian per komponen per orang, dapat dicetak.

#### F-1.3 Penguncian pagu (budget lock)

> **Sebagai** Staf PPK, **saya ingin** setiap penugasan membebani mata anggaran tertentu dan mengurangi pagu tersedia saat disetujui, **agar** total komitmen tidak pernah melampaui pagu.

**AC:**
- Staf PPK memetakan penugasan ke satu atau lebih mata anggaran dari **Master Pagu** (§8.3).
- Saat PPK menyetujui, sistem membuat **pemesanan anggaran** (*reservation*) sebesar estimasi biaya; pagu tersedia berkurang seketika.
- Bila estimasi melebihi pagu tersedia, persetujuan **diblokir** dengan pesan yang menyebut selisihnya (**AF-6**).
- Pembatalan penugasan atau penyelesaian E-SPJ dengan nilai lebih rendah **melepas kembali** selisihnya ke pagu tersedia.
- Saldo pagu ditampilkan sebagai: pagu — terpesan — terealisasi = tersedia.

#### F-1.4 Alur ganda Rampung / Non-Rampung & penerbitan ST/SPD

> **Sebagai** PPK, **saya ingin** menyetujui komitmen anggaran dan menerbitkan Surat Tugas serta SPD elektronik dalam satu tindakan, **agar** tidak ada penugasan yang berjalan tanpa dasar anggaran.

**AC:**
- **Alur Non-Rampung:** ST dan SPD di-*generate* sistem; opsi uang muka **0% / 50% / 100%** dari estimasi; pembuatan **ditolak** bila tanggal berangkat sudah lewat (**AF-2** anti-backdate).
- **Alur Rampung:** ST diunggah sebagai berkas (kegiatan yang surat tugasnya terbit di luar sistem, mis. undangan pimpinan); tanpa opsi uang muka; perekaman dibatasi maksimal **H+30** sejak tanggal berakhir kegiatan.
- ST/SPD terbit memuat nomor urut otomatis, QR Code verifikasi (§F-4.3), dan seluruh peserta beserta rincian haknya.
- Setelah ST terbit, status menjadi `Berjalan`; perubahan peserta atau tanggal memerlukan **pembatalan/revisi bernomor** yang tercatat, bukan penyuntingan diam-diam.
- ST yang telah terbit **tidak dapat dihapus** — hanya dibatalkan dengan alasan tertulis.

#### F-1.5 Pencegahan penugasan beririsan

> **Sebagai** PPK, **saya ingin** sistem menolak penugasan yang tanggalnya beririsan untuk orang yang sama, **agar** tidak terjadi pembebanan ganda.

**AC:**
- Sebelum ST terbit, sistem memeriksa seluruh peserta terhadap penugasan lain berstatus `Berjalan`/`Selesai` pada rentang tanggal yang beririsan (**AF-1**).
- Irisan **diblokir keras**; pesan menyebut nama, nomor ST lain, dan tanggal yang bertabrakan.
- Pengelola dapat melihat **kalender ketersediaan tim** sebelum menyusun penugasan.

---

### Modul B — Presensi & Geotagging Lapangan (F-2)

#### F-2.1 Presensi 4-titik dengan pola "212"

> **Sebagai** Pelaksana SPD, **saya ingin** merekam kehadiran saya di titik-titik wajib lewat ponsel, **agar** hak keuangan saya terbukti tanpa perlu tanda tangan dan stempel.

**AC:**
- Empat titik wajib: **Start** (berangkat dari tempat kedudukan), **In** (tiba di lokasi tujuan), **Out** (meninggalkan lokasi tujuan), **End** (tiba kembali).
- Untuk penugasan multi-hari, sistem menerapkan pola **"212"** (Fase 2): 2 titik pada hari berangkat, ≥1 titik per hari kegiatan di lokasi penugasan, 2 titik pada hari pulang. Titik harian kegiatan bersifat wajib dan menjadi dasar pengakuan uang harian per hari.
- Setiap presensi merekam: **waktu server** (otoritatif), waktu perangkat, lintang, bujur, akurasi (meter), foto swafoto, dan sidik perangkat.
- Presensi ditolak bila akurasi GPS di atas ambang yang dapat dikonfigurasi (usulan awal: 100 m) — pengguna diminta mencoba ulang di ruang terbuka.
- PWA menampilkan status jelas: titik mana sudah terekam, mana yang belum, dan batas waktunya.

#### F-2.2 Validasi lokasi terhadap satker tujuan (geofence)

> **Sebagai** PPK, **saya ingin** presensi diuji terhadap koordinat satker tujuan, **agar** kehadiran di lokasi penugasan benar-benar terbukti.

**AC:**
- Titik **In**, **Out**, dan titik harian kegiatan divalidasi terhadap koordinat satker tujuan dengan radius yang dapat dikonfigurasi per satker (usulan awal: 500 m untuk kantor, 1 km untuk kota kecil).
- Di luar radius → presensi tetap tersimpan tetapi **ditandai anomali** dan wajib diverifikasi manual PPK; presensi tidak dibuang diam-diam.
- Titik **Start** dan **End** divalidasi terhadap koordinat tempat kedudukan (kantor Bawas).
- Jarak dihitung dengan formula haversine di sisi server; **tidak** memerlukan PostGIS.

#### F-2.3 Multi-Point Activity Tagging

> **Sebagai** Pelaksana SPD, **saya ingin** menambahkan titik presensi kegiatan tambahan, **agar** kunjungan ke lebih dari satu lokasi dalam sehari terekam apa adanya.

**AC:**
- Tombol "Tambah Titik Kegiatan" tersedia sepanjang penugasan berjalan.
- Setiap titik tambahan wajib disertai **satu foto** dan keterangan singkat kegiatan (adopsi Referensi A, Fase 2).
- Titik tambahan tidak menambah hak keuangan secara otomatis; ia memperkuat bukti dan muncul di lampiran laporan.

#### F-2.4 Mode berbagi perangkat (device sharing)

> **Sebagai** Ketua Tim, **saya ingin** merekam presensi anggota tim yang ponselnya tidak mendukung, **agar** seluruh anggota tetap terbukti hadir.

**AC:**
- Mode berbagi perangkat mengharuskan **login–logout eksplisit** per peserta pada perangkat yang sama; tidak ada perekaman massal satu tombol.
- Setiap presensi mencatat bahwa ia dibuat dalam mode berbagi, beserta identitas pemilik perangkat.
- Sistem menandai anomali bila satu perangkat merekam presensi lebih dari **N** peserta dalam satu hari (usulan awal N = 4) — untuk membedakan berbagi yang sah dari perekaman kolektif fiktif (**AF-7c**).

#### F-2.5 Rekonsiliasi mandiri (modul ISPD)

> **Sebagai** Pelaksana SPD, **saya ingin** menarik data presensi kantor saya untuk melengkapi titik keberangkatan/kepulangan, **agar** saya tidak perlu mengajukan verifikasi manual ke PPK.

**AC:**
- Bila perjalanan dimulai atau berakhir dari lokasi kantor pada jam kerja, pelaksana dapat menarik catatan presensi kantor pada tanggal tersebut untuk mengisi titik **Start**/**End**.
- Data tarikan diberi label sumber `ISPD` dan tetap tercatat di jejak audit; tidak menyamar sebagai presensi geotagging lapangan.
- Fitur ini **hanya** berlaku untuk titik Start/End — tidak pernah untuk titik In/Out/kegiatan.

> **Catatan ketergantungan:** Risk-Sim belum memuat data presensi harian pegawai. F-2.5 memerlukan sumber data presensi kantor (mis. hasil unggah rekap SIKEP yang sudah dikenal modul CA Kepegawaian). Lihat §12 D-4.

#### F-2.6 Kontrol fallback saat jaringan/perangkat gagal

> **Sebagai** Pelaksana SPD di lokasi tanpa sinyal, **saya ingin** tetap dapat merekam kehadiran, **agar** hak saya tidak hangus karena keadaan di luar kendali saya.

**AC:**
- **Mode luring:** presensi disimpan di perangkat (IndexedDB) beserta koordinat dan waktu perangkat, lalu tersinkron otomatis saat daring kembali. Selisih waktu sinkronisasi tercatat dan ditampilkan kepada verifikator.
- **Jalur pernyataan:** bila lokasi tetap gagal terekam, pelaksana mengunggah foto bergeotag beserta **Surat Pernyataan Kepatuhan**; jalur ini **wajib disetujui PPK secara eksplisit** dan tidak pernah lolos otomatis.
- Setiap penugasan menampilkan **hitungan pemakaian jalur fallback**; pemakaian berulang oleh orang yang sama menjadi indikator anomali (**AF-7d**).

> *Istilah "Fallak Control" pada dokumen Fase 1 dibaca sebagai "Fallback Control" dan digunakan dengan istilah tersebut di PRD ini.*

---

### Modul C — Perekaman Biaya Riil & Bukti Digital (F-3)

> Karena integrasi API merchant dikeluarkan dari lingkup (**K-2**), pemesanan tiket dan hotel tetap dilakukan di luar sistem. Modul ini menggantikan *merchant ingestion* dengan perekaman bukti yang tetap dapat diuji.

#### F-3.1 Perekaman komponen biaya riil

> **Sebagai** Pelaksana SPD, **saya ingin** mencatat pengeluaran riil beserta buktinya sepanjang perjalanan, **agar** saya tidak menyusun ulang semuanya setelah pulang.

**AC:**
- Komponen: transport (tiket berangkat/pulang), penginapan, transport lokal, dan biaya riil lainnya.
- Setiap entri memuat tanggal, uraian, jumlah, dan **berkas bukti** (foto/PDF, maks. 10 MB) — kecuali komponen yang menempuh jalur Daftar Pengeluaran Riil (F-3.3).
- Entri dapat ditambahkan kapan saja sejak ST terbit hingga E-SPJ dikunci.

#### F-3.2 Pembatasan otomatis terhadap SBM

> **Sebagai** Staf PPK, **saya ingin** klaim yang melampaui SBM tertahan sistem, **agar** saya tidak perlu mengecek setiap angka secara manual.

**AC:**
- Saat entri disimpan, sistem membandingkan jumlah terhadap batas SBM komponen tersebut (**AF-5**).
- Di atas batas → entri ditandai `Melebihi SBM`, jumlah yang diakui **otomatis dipotong ke batas SBM**, dan selisihnya ditampilkan sebagai beban pribadi pelaksana.
- Pelaksana dapat mengajukan alasan; hanya PPK yang dapat menyetujui pengakuan di atas batas, dengan alasan tertulis yang tersimpan permanen.

#### F-3.3 Daftar Pengeluaran Riil

> **Sebagai** Pelaksana SPD yang kehilangan kuitansi, **saya ingin** membuat Daftar Pengeluaran Riil, **agar** biaya yang benar-benar saya keluarkan tetap dapat dipertanggungjawabkan.

**AC:**
- Sistem menghasilkan Daftar Pengeluaran Riil berformat baku dari entri yang ditandai "bukti tidak diperoleh".
- Dokumen memuat pernyataan tanggung jawab pelaksana dan wajib disetujui PPK.
- Jumlah entri tanpa bukti per penugasan ditampilkan sebagai indikator kepada verifikator.

#### F-3.4 Deteksi bukti ganda

> **Sebagai** Staf PPK, **saya ingin** sistem mengenali bukti yang sudah pernah dipakai, **agar** satu kuitansi tidak diklaim dua kali.

**AC:**
- Setiap berkas bukti disimpan bersama **hash SHA-256**-nya.
- Hash yang identik dengan bukti pada penugasan/peserta lain memicu peringatan kepada verifikator beserta tautan ke pemakaian sebelumnya (**AF-10**).
- Peringatan bersifat menahan verifikasi, bukan menolak unggahan.

---

### Modul D — Pelaporan Hasil Dinas Tersegmentasi (F-4)

#### F-4.1 Penyusunan laporan per segmen dengan proteksi draf

> **Sebagai** Pelaksana SPD, **saya ingin** menulis laporan per bagian dengan penyimpanan otomatis, **agar** tulisan panjang saya tidak hilang karena sesi berakhir.

**AC:**
- Laporan dibagi menjadi segmen baku tata naskah: **Latar Belakang, Maksud & Tujuan, Ruang Lingkup, Hasil Pelaksanaan, Kesimpulan, Saran**.
- Setiap segmen tersimpan **terpisah** dan otomatis (*debounce* ≤ 5 detik setelah berhenti mengetik), dengan indikator "tersimpan HH:MM".
- Kehilangan koneksi tidak menghapus ketikan; isi tertahan lokal dan dikirim ulang saat pulih.
- Segmen menyimpan riwayat versi sederhana (versi terakhir sebelum setiap penyimpanan) untuk pemulihan.

#### F-4.2 Pembagian kerja laporan tim

> **Sebagai** Ketua Tim, **saya ingin** anggota mengisi segmen berbeda dari laporan yang sama, **agar** penyusunan laporan tidak menumpuk pada satu orang.

**AC:**
- Satu penugasan memiliki **satu** laporan; setiap segmen dapat ditugaskan ke anggota tertentu.
- Penyuntingan bersamaan pada segmen yang sama dicegah dengan penguncian lembut (peringatan "sedang disunting oleh …").
- Hanya Ketua Tim yang dapat menyatakan laporan **final**.

#### F-4.3 Dokumen cetak ber-QR Code & portal verifikasi

> **Sebagai** penerima dokumen, **saya ingin** memverifikasi keaslian lembar cetak, **agar** dokumen palsu dapat dikenali.

**AC:**
- Setiap dokumen resmi (ST, SPD, Laporan, Rekap SPJ) menghasilkan PDF dengan **kop Badan Pengawasan MA** (memakai komponen kop cetak yang sudah ada di aplikasi), QR Code, nomor dokumen, dan cap waktu cetak.
- QR mengarah ke **halaman verifikasi publik-terbatas** yang menampilkan: nomor dokumen, jenis, penugasan, peserta, status, dan cap waktu penerbitan — **tanpa** memuat data pribadi atau nominal.
- Lampiran laporan memuat rekap foto presensi bergeotag beserta koordinat dan waktunya.

#### F-4.4 Berkas naskah siap edar

> **Sebagai** Pelaksana SPD, **saya ingin** mengunduh laporan sebagai berkas naskah yang rapi, **agar** dapat diteruskan sesuai tata naskah dinas yang berlaku.

**AC:**
- Laporan final dapat diunduh sebagai PDF (utama) dan DOCX (untuk penyuntingan lanjutan).
- Karena integrasi Nadin di luar lingkup (**K-2**), berkas ini adalah keluaran akhir sistem; penerusan ke persuratan dilakukan di luar aplikasi. Status "sudah diteruskan" dapat dicatat manual sebagai penanda.

---

### Modul E — E-SPJ & Penyelesaian Biaya (F-5)

#### F-5.1 Pengajuan E-SPJ

> **Sebagai** Pelaksana SPD, **saya ingin** mengajukan pertanggungjawaban dalam satu berkas digital, **agar** saya tidak mengantar tumpukan kertas antar meja.

**AC:**
- Pengajuan **hanya terbuka** bila: seluruh titik presensi wajib terpenuhi (atau anomalinya sudah diputus PPK) **dan** laporan hasil dinas berstatus final.
- Sistem menyusun rekap otomatis: hak berbasis SBM, biaya riil terekam, uang muka diterima, dan hasil akhir **kurang/lebih bayar**.
- Setelah diajukan, entri biaya terkunci; perubahan hanya melalui pengembalian berkas oleh verifikator.

#### F-5.2 Verifikasi berjenjang Staf PPK → PPK

> **Sebagai** Staf PPK, **saya ingin** menguji bukti butir demi butir dengan catatan, **agar** pengembalian berkas menjadi spesifik dan tidak berulang.

**AC:**
- Staf PPK menandai setiap entri: `Sesuai` / `Perbaiki` / `Tolak`, disertai catatan pada entri yang bermasalah.
- Berkas dikembalikan **utuh sekali** dengan seluruh catatan sekaligus — bukan bertahap.
- PPK melihat ringkasan hasil pengujian, seluruh temuan Anti-Fraud Engine yang masih terbuka, dan menyetujui atau menolak berkas.
- PPK **tidak dapat** menyetujui selama masih ada temuan anti-fraud berkategori *blocking* yang belum diputus.
- Persetujuan PPK mengunci berkas secara permanen (*immutable*).

#### F-5.3 Penyelesaian & rekonsiliasi uang muka

> **Sebagai** Bendahara, **saya ingin** melihat kewajiban bayar dan sisa uang muka yang belum kembali, **agar** tidak ada dana yang mengendap tanpa pengawasan.

**AC:**
- Setelah persetujuan PPK, penugasan masuk daftar penyelesaian dengan nilai kurang bayar (dibayarkan) atau lebih bayar (disetor kembali).
- Bendahara mencatat tanggal dan bukti pembayaran/penyetoran; sistem menutup penugasan dan **melepas sisa pemesanan pagu**.
- Sisa uang muka yang belum disetor > 30 hari muncul sebagai **daftar tunggakan** dengan peringatan bertingkat.

#### F-5.4 Berkas pertanggungjawaban siap proses

> **Sebagai** PPK, **saya ingin** mengunduh berkas pertanggungjawaban lengkap, **agar** proses pembayaran di luar sistem dapat berjalan tanpa menyusun ulang dokumen.

**AC:**
- Ekspor satu penugasan menghasilkan: rekap biaya (Excel, memakai konvensi ExcelJS yang sudah dipakai modul lain), dokumen rekap PDF ber-QR, dan seluruh lampiran bukti dalam satu arsip.
- Isi ekspor identik dengan data yang telah disetujui; tidak ada perhitungan ulang saat ekspor.

---

### Modul F — Tata Kelola, IAM & Anti-Fraud Engine (F-6)

#### F-6.1 Peran modul & penegakan Segregation of Duties

> **Sebagai** Administrator Sistem, **saya ingin** memberi peran perjadin terpisah dari peran manajemen risiko, **agar** satu orang dapat menjadi auditor sekaligus pelaksana tanpa merusak pemisahan tugas keuangan.

**AC:**
- Peran modul disimpan **terpisah** dari `users.role` (yang bersifat tunggal dan sudah dipakai alur manajemen risiko). Seorang pengguna dapat memegang lebih dari satu peran perjadin.
- Peran: `pengelola_kegiatan`, `pelaksana`, `pemberi_tugas`, `staf_ppk`, `ppk`, `ppspm`, `bendahara`, `auditor_perjadin`.
- **Kombinasi terlarang ditolak sistem:** `ppk` + `bendahara`, `ppk` + `staf_ppk`, `pengelola_kegiatan` + `ppk`.
- Akses modul terbuka bagi pemegang peran perjadin mana pun dan `admin_sistem`; pengguna lain tidak melihat menu ini — mengikuti pola gerbang akses yang sudah ada pada modul CA.
- Seluruh aturan ditegakkan di **server** (server action + RLS), bukan hanya di antarmuka.

#### F-6.2 Dasbor Anti-Fraud

> **Sebagai** Pimpinan Bawas, **saya ingin** melihat seluruh anomali lintas penugasan dalam satu layar, **agar** pola penyimpangan terlihat sebelum menjadi temuan.

**AC:**
- Dasbor menampilkan temuan aktif dikelompokkan menurut aturan (**AF-1 … AF-10**), tingkat keparahan (*blocking* / *warning* / *informational*), status penyelesaian, dan penugasan terkait.
- Tersedia penyaring: periode, satker tujuan, peserta, jenis aturan.
- Setiap temuan dapat ditelusuri ke transaksi asalnya dalam satu klik.
- Dasbor dapat diekspor ke Excel.

#### F-6.3 Jejak audit append-only

> **Sebagai** Auditor, **saya ingin** merekonstruksi satu penugasan secara utuh, **agar** pengujian tidak bergantung pada ingatan atau berkas kertas.

**AC:**
- Setiap aksi (buat, ubah, setujui, tolak, presensi, unggah, unduh dokumen) tercatat dengan aktor, waktu server, nilai lama, dan nilai baru.
- Tabel log memiliki kebijakan RLS **hanya-sisip** (*insert-only*): tidak ada jalur ubah maupun hapus untuk peran mana pun, termasuk `admin_sistem`.
- Ekspor "paket audit" satu penugasan menghasilkan satu arsip berisi dokumen, metadata presensi (lintang, bujur, akurasi, waktu server & perangkat, sidik perangkat), dan seluruh jejak persetujuan.

#### F-6.4 Master data modul

> **Sebagai** Administrator Sistem, **saya ingin** mengelola tarif SBM, pagu, dan koordinat satker, **agar** perhitungan sistem selalu mengikuti ketentuan yang berlaku.

**AC:**
- **Master SBM:** per tahun anggaran × provinsi × komponen × tingkat biaya; mendukung impor Excel dan versi per tahun (tarif lama tidak boleh disunting setelah dipakai transaksi — tambahkan tahun baru).
- **Master Pagu:** mata anggaran, uraian, pagu, tahun; menampilkan terpesan/terealisasi/tersedia.
- **Koordinat satker:** lintang, bujur, dan radius geofence sebagai perluasan data `unit_kerja` yang sudah ada (saat ini hanya memuat nama kota sebagai teks bebas).
- **Parameter kontrol:** ambang durasi dinas dalam kota, radius baku geofence, ambang akurasi GPS, batas peserta per perangkat — seluruhnya dapat dikonfigurasi tanpa penggantian kode.

---

## 6. Success Metrics

### North Star & OKR
Lihat §3. TDT dihitung mingguan dan ditampilkan sebagai tren pada dasbor modul.

### Kerangka HEART (kualitas pengalaman)

| Dimensi | Metrik | Target |
|---|---|---|
| **Happiness** | Survei pasca-penugasan: "proses perjadin lebih mudah dari sebelumnya" (1–5) | ≥ 4,0 rata-rata |
| **Engagement** | Titik presensi direkam mandiri oleh pelaksana (bukan mode berbagi/fallback) | ≥ 85% dari seluruh titik |
| **Adoption** | Penugasan Bawas yang dibuat di sistem | 100% dalam 2 siklus penugasan |
| **Retention** | Pelaksana yang menyelesaikan penugasan kedua tanpa bantuan pendampingan | ≥ 90% |
| **Task Success** | Presensi berhasil pada percobaan pertama | ≥ 90% |
| | Median waktu merekam satu titik presensi | ≤ 45 detik |
| | E-SPJ disetujui tanpa revisi | ≥ 60% |

### Metrik kesehatan sistem

- Kegagalan sinkronisasi presensi luring: < 1% dari total titik.
- Waktu muat halaman presensi PWA pada jaringan 3G: < 3 detik.
- Rasio positif palsu Anti-Fraud Engine (temuan yang diputus "wajar" oleh PPK): < 15% — bila lebih tinggi, ambang aturan disetel ulang.

### Anti-metrik (sinyal bahwa kontrol dilonggarkan diam-diam)

- Kenaikan pemakaian jalur fallback dan Surat Pernyataan.
- Kenaikan persetujuan PPK atas klaim di atas SBM.
- Kenaikan penugasan berjalur Rampung (yang tidak terkena anti-backdate).

Ketiganya wajib tampil di dasbor pimpinan berdampingan dengan metrik keberhasilan.

---

## 7. Scope

### 7.1 Dalam lingkup (MVP)

- Perjalanan dinas **dalam negeri** untuk **pegawai dan penugasan Badan Pengawasan MA**.
- Alur **Rampung** dan **Non-Rampung**, termasuk uang muka 0/50/100%.
- Presensi geotagging berbasis **PWA** (4 titik + pola 212 + titik kegiatan tambahan + mode berbagi perangkat + mode luring + jalur fallback).
- Kalkulasi SBM, penguncian pagu, dan pembatasan klaim otomatis.
- Laporan hasil dinas tersegmentasi + PDF ber-QR + portal verifikasi dokumen.
- E-SPJ, verifikasi berjenjang, penyelesaian kurang/lebih bayar, dan rekonsiliasi uang muka.
- Anti-Fraud Engine (AF-1 … AF-10), dasbor anomali, dan jejak audit *append-only*.
- Master data: SBM, Pagu, koordinat satker, parameter kontrol, peran perjadin.
- Ekspor: rekap Excel, PDF dokumen, paket audit.

### 7.2 Di luar lingkup (dinyatakan tegas)

| Dikecualikan | Alasan |
|---|---|
| Integrasi **SAKTI** (SPP/SPM/SP2D) | Keputusan **K-2**. Sistem berhenti pada berkas pertanggungjawaban siap proses; penerbitan SPP/SPM/SP2D dilakukan di luar aplikasi. |
| Integrasi **Nadin** (naskah dinas) | **K-2**. Sistem menghasilkan PDF/DOCX final; penerusan dilakukan manual. |
| **TTE BSrE / HSM** | **K-2**. Digantikan persetujuan berjenjang di sistem + QR verifikasi. **Bukan** pengganti tanda tangan elektronik tersertifikasi secara hukum — lihat §13 Q-1. |
| **API merchant** tiket & hotel | **K-2**. Pemesanan tetap di luar sistem; bukti diunggah dan diuji lewat pembatasan SBM + deteksi bukti ganda. |
| **Aplikasi native** (deteksi mock GPS, liveness biometrik) | **K-3**. Fase lanjutan; kontrol kompensasi di §8.5. |
| Perjalanan dinas **luar negeri** | Aturan tarif dan valuta berbeda; volume kecil. |
| Perjadin **satker peradilan lain** | Modul melayani Bawas terlebih dahulu; perluasan menjadi keputusan tersendiri. |
| **Pembayaran elektronik** / integrasi perbankan | Bukan kewenangan aplikasi. |
| Pengelolaan **persediaan/aset** perjalanan | Tidak relevan. |

### 7.3 Fase lanjutan (disebut agar arsitektur tidak menutup jalannya)

Aplikasi native, integrasi SAKTI/Nadin/TTE, dan perluasan ke satker lain **tidak dirancang sekarang**, tetapi model data dijaga agar tidak menghalangi: identitas peserta memakai NIP, dokumen menyimpan nomor dan hash, dan seluruh nilai uang tersimpan sebagai komponen terpisah (bukan hanya total).

---

## 8. Technical Considerations

### 8.1 Kesesuaian dengan arsitektur Risk-Sim

Modul mengikuti pola yang sudah berjalan di aplikasi:

- **Next.js 16 App Router** — halaman di `src/app/dashboard/e-perjadin/`, logika murni di `src/lib/e-perjadin/`.
- **Server Components** untuk pemuatan data + **Server Actions** untuk mutasi, sebagaimana `konteks`, `kelola-pengguna`, dan `master-data/kalender-libur`.
- **Supabase** untuk Auth, Postgres, RLS, dan **Storage** (kapabilitas baru bagi aplikasi ini — foto presensi & bukti SPJ).
- **Gerbang akses** mengikuti pola `src/lib/ca-audit-akses.ts`: satu berkas pemeriksa peran, dipakai halaman *dan* item navigasi.
- **Ekspor** memakai ExcelJS (pola `export-excel.ts` yang sudah ada) dan komponen kop cetak `PrintKop.tsx` untuk dokumen PDF.

**Perbedaan penting:** modul CA bersifat *stateless* (unggah → analisis di peramban → ekspor). E-Perjadin bersifat **transaksional dan persisten**, dengan status, persetujuan, dan uang. Ini adalah modul pertama Risk-Sim dengan karakter tersebut — implikasinya pada RLS dan pengujian dibahas di §8.4 dan §11.

### 8.2 Model data (usulan)

Seluruh tabel berawalan `perjadin_` agar tidak bertabrakan dengan skema manajemen risiko.

| Tabel | Isi pokok |
|---|---|
| `perjadin_peran` | `user_id`, `peran`, `aktif` — relasi banyak-ke-banyak; menegakkan SoD (F-6.1) |
| `perjadin_penugasan` | header ST: nomor, jenis alur, jenis dinas, maksud, `unit_tujuan_id` → `unit_kerja`, `pka_id` → `program_kerja_audit` (opsional), tanggal, status, pembuat |
| `perjadin_peserta` | satu baris per orang (= satu SPD): `user_id` (nullable untuk eksternal), nama, NIP, jabatan, peran tim, tingkat biaya, skema uang muka, estimasi & realisasi per komponen |
| `perjadin_rute` | urutan, dari, ke, moda, tanggal |
| `perjadin_presensi` | jenis titik, waktu server, waktu perangkat, lintang, bujur, akurasi, path foto, IP, sidik perangkat, sumber (`pwa`/`ispd`/`fallback`), status verifikasi |
| `perjadin_laporan_segmen` | satu baris per segmen — bentuk alami untuk *save per-segment* (F-4.1) |
| `perjadin_biaya` | komponen, uraian, jumlah diajukan, jumlah diakui, path bukti, **hash bukti**, status verifikasi, catatan |
| `perjadin_sbm` | tahun, provinsi, komponen, tingkat biaya, nilai, satuan |
| `perjadin_pagu` | tahun, mata anggaran, uraian, pagu |
| `perjadin_komitmen` | pemesanan & pelepasan pagu per penugasan (buku besar, bukan kolom yang ditimpa) |
| `perjadin_dokumen` | jenis, nomor, path PDF, hash, token QR, waktu terbit |
| `perjadin_temuan` | kode aturan AF, keparahan, penugasan/peserta terkait, status, keputusan & alasan |
| `perjadin_log` | jejak *append-only* (F-6.3) |
| `perjadin_parameter` | ambang kontrol yang dapat dikonfigurasi |

**Perubahan pada tabel yang sudah ada:** `unit_kerja` memerlukan tambahan `lintang`, `bujur`, `radius_geofence` (kolom `lokasi` saat ini hanya teks bebas nama kota). Tidak ada kolom lama yang diubah maknanya.

**Prinsip pencatatan uang:** seluruh nominal disimpan sebagai bilangan bulat rupiah; komitmen dan realisasi dicatat sebagai **baris buku besar**, bukan kolom saldo yang ditimpa — agar setiap perubahan pagu dapat direkonstruksi.

### 8.3 Ketergantungan data pada aset Risk-Sim yang sudah ada

| Aset | Pemakaian | Status |
|---|---|---|
| `unit_kerja` (1.868 satker di `ref/ref_satker.csv`) | Satker tujuan & geofence | Tersedia; **koordinat belum ada** — lihat §11 R-3 |
| `users` | Peserta & aktor persetujuan | Tersedia |
| `kalender_libur` | Pengakuan hari libur/akhir pekan sebagai hari sah (F-1.2) | Tersedia; dipakai bersama modul CA Kepegawaian |
| `program_kerja_audit` | Penautan penugasan ke rencana pengawasan (F-1.1, O4) | Tersedia |
| `PrintKop.tsx` | Kop dokumen cetak | Tersedia (sudah berkop Badan Pengawasan) |

### 8.4 Keamanan & RLS

- Setiap tabel memakai RLS dengan kebijakan **berbasis peran perjadin**, bukan sekadar `auth.role() = 'authenticated'` sebagaimana beberapa tabel lama. Pelaksana hanya melihat penugasan yang memuat dirinya; Staf PPK/PPK melihat seluruh penugasan pada lingkup anggarannya; `auditor_perjadin` memperoleh akses baca menyeluruh.
- `perjadin_log` memiliki kebijakan **insert-only** — tanpa `UPDATE`/`DELETE` untuk peran mana pun.
- **Storage:** dua bucket privat (`perjadin-presensi`, `perjadin-bukti`) dengan akses melalui URL bertanda tangan berumur pendek; tidak ada berkas publik.
- Seluruh transisi status dan pemeriksaan SoD dijalankan di server; antarmuka hanya mencerminkan hasilnya.
- Data pribadi (NIP, foto wajah, koordinat) diperlakukan sebagai data pribadi: dibatasi peran, tercatat setiap aksesnya, dan tidak pernah muncul di portal verifikasi QR publik.

### 8.5 Presensi PWA — batas kemampuan & kontrol kompensasi

**Yang tidak dapat dilakukan PWA** (dan karenanya tidak dijanjikan): mendeteksi *Mock Location API*, memaksa kamera langsung (foto galeri sulit dibedakan secara pasti), *liveness detection* tingkat perangkat, dan akses biometrik perangkat.

**Kontrol kompensasi yang menggantikannya:**

| Kontrol | Cara kerja |
|---|---|
| **Waktu server otoritatif** | Waktu perangkat direkam hanya sebagai pembanding; selisih > 5 menit menjadi anomali (**AF-7a**) |
| **Deteksi kecepatan mustahil** | Jarak antar titik berurutan ÷ selisih waktu; melampaui kecepatan moda yang wajar → anomali (**AF-7b**) |
| **Ambang akurasi GPS** | Presensi dengan akurasi buruk ditolak di tempat, bukan diterima lalu dipersoalkan kemudian |
| **Silang IP & sidik perangkat** | Geolokasi kasar dari IP publik dibandingkan koordinat GPS; sidik perangkat yang berpindah antar peserta ditandai |
| **Deteksi koordinat identik** | Koordinat yang sama persis (presisi penuh) antar peserta/waktu adalah tanda salin-tempel |
| **Metadata foto** | EXIF dipertahankan; foto tanpa EXIF atau bercap waktu janggal ditandai untuk verifikasi |
| **Kelangkaan sebagai sinyal** | Pemakaian jalur fallback dan mode berbagi perangkat dihitung dan ditampilkan; anomali muncul dari pola, bukan dari satu kejadian |

Kejujuran yang perlu dinyatakan ke pemangku kepentingan: **MVP menaikkan biaya dan jejak kecurangan secara signifikan, tetapi tidak membuatnya mustahil secara teknis.** Jaminan tingkat perangkat memerlukan aplikasi native (fase lanjutan).

### 8.6 Anti-Fraud Engine — katalog aturan

Aturan dijalankan di server pada titik transisi status, dan hasilnya ditulis ke `perjadin_temuan`.

| Kode | Aturan | Pemicu | Keparahan |
|---|---|---|---|
| **AF-1** | Penugasan beririsan (NIP × tanggal) | Sebelum ST terbit | *Blocking* |
| **AF-2** | Anti-backdate (Non-Rampung) & batas H+30 (Rampung) | Pembuatan penugasan | *Blocking* |
| **AF-3** | Zero off-system assignment — E-SPJ hanya dari ST sistem | Pengajuan E-SPJ | *Blocking* |
| **AF-4** | *Duration guard* dinas dalam kota (selisih Start–End < ambang) | Perhitungan hak | *Blocking* — komponen hangus |
| **AF-5** | Klaim melampaui SBM | Penyimpanan entri biaya | *Blocking* — dipotong; pengecualian butuh PPK |
| **AF-6** | Komitmen melampaui pagu tersedia | Persetujuan PPK | *Blocking* |
| **AF-7** | Anomali presensi: (a) selisih waktu perangkat, (b) kecepatan mustahil, (c) perangkat melayani > N peserta, (d) fallback berulang, (e) koordinat identik, (f) di luar geofence | Perekaman presensi | *Warning* — wajib diputus PPK |
| **AF-8** | Titik presensi wajib tidak lengkap | Pengajuan E-SPJ | *Blocking* |
| **AF-9** | Laporan hasil dinas belum final | Pengajuan E-SPJ | *Blocking* |
| **AF-10** | Bukti ganda (hash identik) | Unggah bukti / verifikasi | *Warning* — menahan verifikasi |

Temuan *blocking* menghentikan transisi status. Temuan *warning* tidak menghentikan proses, tetapi **wajib diputus PPK dengan alasan tertulis** sebelum persetujuan akhir — keputusan itu sendiri tersimpan sebagai bukti audit.

### 8.7 Kinerja & ketahanan

- Presensi adalah jalur paling kritis dan paling sering dipakai pada jaringan terburuk: halaman presensi dibuat seringan mungkin, bekerja luring, dan mengantre unggahan foto secara terpisah dari perekaman titik (titik tercatat lebih dulu; foto menyusul).
- Foto dikompres di sisi peramban sebelum unggah (target ≤ 300 KB) untuk menghemat kuota pelaksana.
- Perhitungan SBM dan Anti-Fraud Engine ditulis sebagai fungsi murni di `src/lib/e-perjadin/` — dapat diuji tanpa basis data, mengikuti pola `src/lib/ca-kepeg/analisis.ts`.

---

## 9. Design & UX Requirements

### 9.1 Prinsip

1. **Dua permukaan, dua tujuan.** PWA lapangan dioptimalkan untuk satu tugas dalam 45 detik pada satu tangan; portal web dioptimalkan untuk pekerjaan meja yang panjang (menyusun tim, memverifikasi, menulis laporan). Adopsi pemisahan Referensi A (Fase 2) — dan menolak memaksa keduanya ke satu tampilan yang sama.
2. **Status selalu terlihat.** Pelaksana harus dapat menjawab "apa yang harus saya lakukan sekarang" tanpa membuka menu.
3. **Kegagalan tidak menghukum pengguna.** Sinyal buruk, kuota habis, atau sesi berakhir tidak boleh menghapus pekerjaan.
4. **Kontrol menjelaskan dirinya.** Setiap penolakan sistem menyebutkan aturan yang dilanggar, angkanya, dan langkah pemulihannya.

### 9.2 Permukaan lapangan (PWA)

- **Layar utama:** kartu penugasan aktif, titik presensi berikutnya sebagai tombol utama berukuran besar, dan garis waktu titik yang telah/belum terekam.
- **Alur presensi:** buka → tampilkan lokasi & akurasi terkini → ambil foto → kirim. Maksimal **tiga ketukan** hingga terkirim.
- **Indikator luring:** status "tersimpan di perangkat, menunggu sinyal" yang jelas, dengan jumlah antrean.
- **Mode berbagi perangkat:** ditampilkan sebagai layar berbeda dengan identitas peserta aktif yang menonjol, agar salah rekam sulit terjadi.

### 9.3 Permukaan meja (portal web)

- **Dasbor per peran.** Pelaksana: penugasan saya & tenggat. Pengelola: penugasan yang perlu diterbitkan. Staf PPK/PPK: antrean verifikasi. Bendahara: kewajiban & tunggakan. Pimpinan/Auditor: anomali & tren.
- **Penyusun laporan** dengan daftar segmen di sisi kiri, editor di kanan, dan indikator simpan per segmen — tanpa satu tombol "Simpan" besar yang menanggung seluruh dokumen.
- **Layar verifikasi** menampilkan bukti dan entri berdampingan; penilaian per entri tanpa berpindah halaman.
- Mengikuti bahasa visual aplikasi yang sudah ada (Tailwind, palet slate, kartu ber-*rounded-xl*, ikon Lucide) — modul ini tidak memperkenalkan sistem desain baru.

### 9.4 Aksesibilitas & lapangan

- Target sentuh ≥ 44 px; kontras memenuhi WCAG AA; dapat dioperasikan dengan satu tangan.
- Terbaca di bawah sinar matahari (kontras tinggi, bukan abu-abu tipis pada putih).
- Seluruh label, pesan, dan dokumen dalam **Bahasa Indonesia** dengan istilah baku tata naskah dinas.
- Dokumen cetak mengikuti format tata naskah dinas MA dan kop yang sudah dipakai aplikasi.

---

## 10. Timeline & Milestones

Estimasi mengasumsikan satu tim kecil yang sudah mengenal basis kode Risk-Sim. Setiap milestone menghasilkan sesuatu yang dapat dicoba, bukan hanya kode.

| # | Milestone | Isi | Kriteria selesai |
|---|---|---|---|
| **M0** | **Fondasi & master data** | Skema `perjadin_*`, peran & SoD, master SBM, master pagu, koordinat satker, parameter kontrol. Pengukuran **baseline** untuk seluruh KR. | Admin dapat mengisi SBM & pagu; kombinasi peran terlarang benar-benar ditolak; baseline tercatat |
| **M1** | **Perencanaan & penerbitan ST/SPD** | F-1.1 … F-1.5, AF-1, AF-2, AF-6 | Satu penugasan tim dapat dibuat, dihitung otomatis, disetujui, dan menerbitkan ST/SPD ber-QR; pagu berkurang |
| **M2** | **Presensi PWA** | F-2.1 … F-2.4, F-2.6, AF-7 | Uji lapangan nyata pada satu penugasan sungguhan; presensi luring tersinkron; anomali muncul di dasbor |
| **M3** | **Laporan tersegmentasi & dokumen** | F-4.1 … F-4.4, portal verifikasi QR | Laporan tim tersusun tanpa kehilangan draf; PDF ber-QR terverifikasi di portal |
| **M4** | **Biaya riil & E-SPJ** | F-3.1 … F-3.4, F-5.1 … F-5.4, AF-3, AF-5, AF-8, AF-9, AF-10 | Satu penugasan tuntas dari ST hingga penyelesaian kurang/lebih bayar |
| **M5** | **Anti-fraud, audit trail & pelaporan manajerial** | F-6.2, F-6.3, laporan biaya per penugasan & cakupan satker (O4) | Auditor mengekspor paket audit satu penugasan < 5 menit |
| **M6** | **Uji operasional terbatas** | Satu inspektorat wilayah, satu siklus penugasan penuh | TDT terukur; daftar penyetelan ambang aturan tersusun |
| **M7** | **Peluncuran penuh Bawas** | Migrasi seluruh unit, pendampingan, penonaktifan jalur manual | 100% ST Bawas terbit dari sistem (KR1.1) |
| **—** | *Fase lanjutan* | F-2.5 (ISPD, menunggu sumber data presensi), aplikasi native, integrasi eksternal | Keputusan terpisah |

**Urutan ini disengaja:** M2 (presensi) mendahului M4 (uang) karena presensi adalah asumsi paling berisiko dari seluruh produk — bila pelaksana tidak dapat atau tidak mau merekam presensi di lapangan, seluruh rantai kontrol runtuh dan lebih baik diketahui sedini mungkin.

---

## 11. Risks & Mitigation

| # | Risiko | Dampak | Mitigasi |
|---|---|---|---|
| **R-1** | **Presensi gagal di lapangan** (sinyal buruk, ponsel tak memadai, penolakan pengguna) — risiko terbesar produk | Kontrol utama tidak berjalan; pelaksana dirugikan; modul ditinggalkan | Mode luring; mode berbagi perangkat; jalur fallback dengan persetujuan PPK; uji lapangan nyata di M2 sebelum uang dipertaruhkan |
| **R-2** | **PWA tidak dapat mencegah *fake GPS*** | Klaim kehadiran palsu tetap mungkin secara teknis | Kontrol kompensasi §8.5 (kecepatan mustahil, koordinat identik, silang IP, selisih waktu); pola anomali diawasi; nyatakan batas ini secara terbuka; jalur native disiapkan |
| **R-3** | **Koordinat 1.868 satker belum tersedia** — `unit_kerja.lokasi` hanya teks nama kota | Geofence (F-2.2) tidak dapat berjalan | Pekerjaan data eksplisit di M0: mulai dari satker yang benar-benar menjadi tujuan penugasan (bukan seluruhnya); geofence otomatis nonaktif untuk satker tanpa koordinat, presensi tetap tercatat dan diverifikasi manual |
| **R-4** | **Tarif SBM salah atau usang** | Seluruh perhitungan hak keuangan salah; risiko temuan | SBM berversi per tahun; tarif yang sudah dipakai transaksi tidak dapat disunting; setiap perubahan tercatat pemiliknya; pemeriksaan silang manual pada penugasan pertama tiap tahun anggaran |
| **R-5** | **Modul transaksional pertama di Risk-Sim** — RLS aplikasi saat ini banyak memakai `authenticated` menyeluruh | Pola lama tidak memadai untuk data keuangan & pribadi | RLS berbasis peran ditulis khusus untuk `perjadin_*`; ditinjau tersendiri sebelum M4; **tidak** menyalin pola tabel lama |
| **R-6** | **Penolakan pengguna** — proses baru terasa lebih berat, terutama bagi pemeriksa senior | Adopsi rendah; jalur manual bertahan diam-diam | Pendampingan di M6; hitung dan tampilkan waktu yang dihemat; hilangkan jalur manual hanya setelah TDT stabil; libatkan pemeriksa senior sejak M1 |
| **R-7** | **Ketiadaan TTE bersertifikat** | Keabsahan hukum dokumen elektronik dipersoalkan pemeriksa eksternal | Dokumen tetap dicetak dan ditandatangani basah bila diperlukan; QR memverifikasi kesesuaian cetakan dengan sistem; status hukum ditanyakan ke Biro Hukum (§13 Q-1) |
| **R-8** | **Positif palsu Anti-Fraud Engine membanjiri PPK** | Verifikator mulai menyetujui tanpa membaca — kontrol menjadi ritual | Seluruh ambang dapat dikonfigurasi; rasio positif palsu diukur (§6); penyetelan wajib pada M6; temuan *warning* tidak pernah memblokir kerja, hanya menuntut keputusan |
| **R-9** | **Foto & bukti membengkakkan Storage** | Biaya dan kinerja | Kompresi sisi peramban; kebijakan retensi (foto presensi disimpan sesuai masa daluwarsa pertanggungjawaban); arsip berkas lama dipindahkan |
| **R-10** | **Kebocoran data pribadi** (foto wajah, koordinat, NIP) | Pelanggaran perlindungan data pribadi | Bucket privat + URL bertanda tangan berumur pendek; portal QR tidak memuat data pribadi; akses tercatat; peran auditor bersifat baca |

---

## 12. Dependencies & Assumptions

### Ketergantungan

| # | Ketergantungan | Pemilik | Kritis untuk |
|---|---|---|---|
| **D-1** | Penetapan resmi **tarif SBM** yang berlaku dan tingkat biaya per jabatan di Bawas | PPK / Bagian Keuangan | M0 — seluruh kalkulasi |
| **D-2** | Data **pagu perjalanan dinas** tahun berjalan | PPK / Perencanaan | M0 — penguncian pagu |
| **D-3** | **Koordinat satker** tujuan penugasan | Sekretariat Bawas (pengumpulan data) | M2 — geofence |
| **D-4** | Sumber **data presensi kantor** untuk modul ISPD (F-2.5) | Kepegawaian / SIKEP | Fase lanjutan — F-2.5 ditunda hingga tersedia |
| **D-5** | **Supabase Storage** aktif beserta kuota memadai | Admin Sistem | M2 |
| **D-6** | Penetapan **peran PPK, Staf PPK, PPSPM, Bendahara** secara formal | Sekretariat Bawas | M0 — SoD |
| **D-7** | Kepastian **status hukum** dokumen elektronik tanpa TTE | Biro Hukum MA | M3 |
| **D-8** | Ponsel pelaksana mendukung geolokasi & kamera pada peramban modern | Pelaksana | M2 |

### Asumsi

| # | Asumsi | Bila keliru |
|---|---|---|
| **A-1** | Perjalanan dinas Bawas seluruhnya **dalam negeri** | Perjadin luar negeri memerlukan modul tarif terpisah |
| **A-2** | Pemesanan tiket & hotel dilakukan di luar sistem dan buktinya dapat diunggah | Bila pemesanan terpusat lewat agen, perlu jalur unggah kolektif |
| **A-3** | Seluruh pelaksana memiliki akun Risk-Sim aktif | Peserta eksternal ditangani sebagai peserta tanpa akun (F-1.1) |
| **A-4** | Satu penugasan membebani **satu tahun anggaran** | Penugasan lintas tahun anggaran memerlukan aturan pembebanan tersendiri |
| **A-5** | Ambang durasi dinas dalam kota mengikuti ketentuan yang berlaku di MA | Parameter dapat diubah tanpa penggantian kode (§13 Q-2) |
| **A-6** | Uang muka hanya berlaku pada alur Non-Rampung | Sesuai baseline Fase 1 |
| **A-7** | Volume ≤ ±500 penugasan/tahun dengan puncak musiman | Volume jauh lebih besar menuntut peninjauan kinerja & biaya Storage |

---

## 13. Open Questions

| # | Pertanyaan | Kepada | Mengapa penting | Batas waktu |
|---|---|---|---|---|
| **Q-1** | Tanpa TTE bersertifikat BSrE, apakah ST/SPD/laporan terbitan sistem sah sebagai dokumen elektronik, atau tetap wajib dicetak dan ditandatangani basah? | Biro Hukum / PPK | Menentukan apakah QR + persetujuan sistem cukup, atau perlu alur cetak-tanda tangan-unggah kembali | Sebelum M3 |
| **Q-2** | Ambang durasi dinas **dalam kota**: 8 jam (PMK 113/2012) atau 6 jam (praktik BPKP pada Fase 2)? | PPK | Menentukan aturan **AF-4** yang menghanguskan komponen biaya | Sebelum M1 |
| **Q-3** | Apakah **uang muka** benar-benar dipakai di Bawas, dan pada besaran mana (50%/100%)? | Bendahara / PPK | Bila tidak dipakai, F-5.3 dan rekonsiliasi tunggakan dapat disederhanakan drastis | Sebelum M1 |
| **Q-4** | Siapa **pemberi tugas** yang sah untuk pemeriksaan reguler, dan apakah persetujuannya harus terekam di sistem sebelum PPK? | Sekretariat Bawas | Menentukan jumlah tahap persetujuan sebelum ST terbit | Sebelum M1 |
| **Q-5** | Berapa **radius geofence** yang wajar untuk pengadilan di kota kecil dan daerah terpencil? | Uji lapangan M2 | Radius terlalu ketat menghasilkan banjir anomali palsu | Selama M2 |
| **Q-6** | Berapa lama **retensi** foto presensi dan bukti SPJ? | PPK / Arsip | Menentukan kebijakan Storage dan biaya | Sebelum M4 |
| **Q-7** | Apakah penugasan wajib tertaut ke **Program Kerja Audit**, atau opsional? | Pimpinan Bawas | Menentukan apakah KR4.1 dapat ditegakkan sistem atau hanya diukur | Sebelum M1 |
| **Q-8** | Apakah **pemeriksaan khusus/mendadak** memerlukan alur cepat yang melewati sebagian kontrol? | Pimpinan Bawas | Alur pengecualian yang tidak dirancang akan menjadi celah — lebih baik dirancang eksplisit | Sebelum M1 |
| **Q-9** | Siapa pemilik dan penyetuju **perubahan tarif SBM** di sistem? | Sekretariat / PPK | Ini adalah data paling sensitif di modul; perubahannya mengubah seluruh perhitungan | Sebelum M0 selesai |

---

## Lampiran A — Keterlacakan terhadap Dokumen Fase 1–3

| Fitur pada dokumen sumber | Sumber | Status di PRD ini |
|---|---|---|
| Perekaman kegiatan, rute, DIPA, penunjukan pelaksana | Fase 1 §a.1 | **MVP** — F-1.1, F-1.3 |
| Otomasi SPD & Surat Tugas | Fase 1 §a.1 | **MVP** — F-1.4 (tanpa pendorongan ke Nadin) |
| Skema uang muka 50%/100% & alur Rampung/Non-Rampung | Fase 1 §a.1, §b.1 | **MVP** — F-1.4 |
| Kalkulasi biaya otomatis terkunci SBM | Fase 1 §a.1 | **MVP** — F-1.2, F-3.2 |
| Presensi geotagging & biometrik mobile | Fase 1 §a.2 | **Sebagian (MVP)** — F-2.1 geotagging PWA; biometrik perangkat → fase native (**K-3**) |
| Tracking 4 titik (Start, In, Out, End) | Fase 1 §a.2 | **MVP** — F-2.1 |
| *Fallback control* saat kendala jaringan | Fase 1 §a.2 | **MVP** — F-2.6 |
| Interkoneksi merchant & *digital receipt ingestion* | Fase 1 §a.3 | **Di luar lingkup** (**K-2**) — digantikan F-3.1, F-3.2, F-3.4 |
| Input pengeluaran riil & unggah bukti | Fase 1 §a.4 | **MVP** — F-3.1 |
| Verifikasi berjenjang Staf PPK → PPK | Fase 1 §a.4 | **MVP** — F-5.2 |
| Daftar Pengeluaran Riil | Fase 1 §a.4 | **MVP** — F-3.3 |
| Laporan hasil dinas & unggah dokumen | Fase 1 §a.5 | **MVP** — F-4.1, F-4.4 |
| Auto-generate naskah ke Nadin | Fase 1 §a.5 | **Di luar lingkup** (**K-2**) — digantikan unduhan PDF/DOCX |
| Matriks otorisasi berjenjang (SoD) | Fase 1 §a.6 | **MVP** — F-6.1 |
| SSO & TTE | Fase 1 §a.6 | **Sebagian** — otentikasi memakai Supabase Auth aplikasi; TTE di luar lingkup (**K-2**) |
| Penerbitan SPP/SPM via SAKTI, pencairan SP2D | Fase 1 §b.3 | **Di luar lingkup** (**K-2**) — berhenti di F-5.4 |
| Penguncian pagu (*automated budget lock*) | Fase 1 §c.2 | **MVP** — F-1.3, AF-6 (pagu internal, bukan SAKTI) |
| Anti-backdate & batas waktu H+30 | Fase 1 §c.5 | **MVP** — AF-2 |
| Pencegahan perjadin rangkap (*double funding*) | Fase 1 §c.6 | **MVP** — F-1.5, AF-1 |
| *Audit trail* digital permanen | Fase 1 §c.6 | **MVP** — F-6.3 |
| Pemisahan UI mobile (presensi) vs web (laporan) | Fase 2 §1 / Ref. A | **MVP** — §9.1, §9.2, §9.3 |
| *Save per-segment* laporan | Fase 2 §2.1 / Ref. A | **MVP** — F-4.1 |
| *Multi-Point Activity Tagging* | Fase 2 §2.4 / Ref. A | **MVP** — F-2.3 |
| Mode *device sharing* | Fase 2 §2.4 / Ref. A | **MVP** — F-2.4 |
| Formula "212" | Fase 2 §1 / Ref. B | **MVP** — F-2.1 |
| Hari libur/cuti/extend otomatis sah, terkunci SBM | Fase 2 §2.3 / Ref. B | **MVP** — F-1.2 (memakai `kalender_libur` yang sudah ada) |
| Modul ISPD (rekonsiliasi presensi mandiri) | Fase 2 §2.2 / Ref. B | **Fase lanjutan** — F-2.5, menunggu D-4 |
| *Zero off-system assignment* | Fase 2 §2.5 / Ref. B | **MVP** — AF-3 |
| *Duration guard* dinas dalam kota | Fase 2 §2.5 / Ref. B | **MVP** — AF-4 (ambang → Q-2) |
| Dokumen ber-QR Code, timestamp, foto geotagged tertanam | Fase 2 §1 / Ref. A | **MVP** — F-4.3 |
| Deteksi & blokir *fake GPS*, *liveness detection* | Fase 3 §4.a | **Fase native** (**K-3**) — digantikan kontrol kompensasi §8.5 |
| Triangulasi sinyal (IP, BSSID, Cell ID) | Fase 3 §4.a | **Sebagian (MVP)** — silang IP publik; BSSID/Cell ID hanya dapat diakses aplikasi native |
| *Price capping* merchant vs SBM | Fase 3 §4.b | **Sebagian (MVP)** — pembatasan atas klaim yang diunggah (F-3.2), bukan atas harga merchant |
| *Immutable event logs* (WORM) | Fase 3 §4.c | **MVP** — F-6.3 via RLS *insert-only* |
| Portal verifikasi QR | Fase 3 §4.c | **MVP** — F-4.3 |
| Persistensi metadata presensi untuk audit | Fase 3 §4.c | **MVP** — F-6.3 |
| PostgreSQL + PostGIS, MinIO, microservices, K8s, HSM, DRC | Fase 3 §5 | **Digantikan** — Supabase Postgres (haversine, tanpa PostGIS), Supabase Storage, arsitektur Next.js monolit. Penempatan data & kedaulatan mengikuti kebijakan yang sudah berlaku bagi Risk-Sim (§13 dapat ditinjau bila kebijakan PDN diberlakukan) |

---

## Lampiran B — Matriks RACI

Mengadaptasi Fase 3 §3, disesuaikan dengan lingkup yang telah diputuskan (tanpa SAKTI/SPM/SP2D).

| Aktivitas | Admin Sistem | Pengelola Kegiatan | Pelaksana SPD | Pemberi Tugas | Staf PPK | PPK | Bendahara | Auditor |
|:--|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Pengelolaan peran & master data | **R/A** | I | I | I | C | C | I | I |
| Penyusunan penugasan & tim | I | **R** | I | **C** | C | **A** | I | I |
| Pemetaan pagu & penguncian SBM | I | C | I | I | **R** | **A** | I | I |
| Penerbitan ST & SPD | I | R | I | **A** | C | **A** | I | I |
| Presensi geotagging | I | I | **R/A** | I | I | C | I | I |
| Perekaman biaya riil & bukti | I | I | **R/A** | I | C | I | I | I |
| Penyusunan laporan hasil dinas | I | I | **R** | **A** | I | I | I | I |
| Pengujian bukti E-SPJ | I | I | C | I | **R** | **A** | I | I |
| Keputusan atas temuan anti-fraud | I | I | C | C | C | **R/A** | I | I |
| Pembayaran & rekonsiliasi uang muka | I | I | C | I | C | C | **R/A** | I |
| Pemantauan & jejak audit | I | I | I | I | I | I | I | **R/A** |

---

*Dokumen ini adalah draf untuk direview. Seluruh angka target, ambang kontrol, dan tenggat bersifat usulan yang menunggu konfirmasi pemangku kepentingan sebagaimana tercatat pada §13.*
