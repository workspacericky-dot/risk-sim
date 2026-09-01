# Desain (draf untuk direview) — TDT & Metrik Manajerial

**Konteks.** PRD §3 & §6 menetapkan North Star **TDT** dan sederet KR/HEART/anti-metrik yang
harus tampil sebagai **tren mingguan** di dasbor pimpinan. Modul saat ini baru punya angka
titik-waktu (dasbor Anomali) dan laporan biaya/cakupan (laporan manajerial). Yang kurang:
definisi terhitung yang pasti, penyimpanan deret waktu, dan visualisasi tren.

---

## 1. Definisi terhitung

### 1.1 North Star — TDT (Tingkat Perjalanan Dinas Tuntas-Terverifikasi)

Untuk populasi = penugasan `Non-Rampung` yang **tanggal kembalinya ≤ tanggal evaluasi**
(sudah seharusnya tuntas). TDT = pembilang / penyebut.

Satu penugasan masuk **pembilang** bila **ketiganya** benar:

| Syarat | Sumber data | Rumus |
|---|---|---|
| (a) semua titik presensi wajib lolos **otomatis** tanpa intervensi | `perjadin_presensi` + `hitungTitikWajib` | `titikBelumTerekam(...) == []` **dan** tidak ada baris `status_verifikasi ∈ {anomali, pernyataan_pending}` **dan** tidak ada baris yang pernah `diputus` PPK (kolom `diputus_pada is null` untuk semua) |
| (b) laporan hasil dinas terbit | `perjadin_laporan.status` | `= 'final'` |
| (c) E-SPJ disetujui PPK ≤ 14 hari kalender sejak tanggal kembali | `perjadin_espj.disetujui_pada`, `perjadin_penugasan.tanggal_kembali` | `disetujui_pada` tidak null **dan** `disetujui_pada::date - tanggal_kembali ≤ 14` |

Target PRD: **≥ 85%** akhir kuartal-2 operasi penuh.

### 1.2 KR (O1–O5) — turunan langsung

| KR | Rumus mingguan |
|---|---|
| KR1.1 zero off-system | `count(penugasan Bawas dengan nomor ST) / count(seluruh penugasan Bawas)` — 100% target |
| KR1.2 irisan lolos ke bayar | `count(temuan AF-1 yang muncul setelah st_status='terbit')` — target 0 |
| KR1.3 titik tervalidasi otomatis | `count(presensi status='lolos' tanpa keputusan) / count(presensi wajib)` |
| KR2.1 median tanggal kembali→E-SPJ disetujui | `median(disetujui_pada::date - tanggal_kembali)` dalam hari kerja |
| KR2.2 ≤ 1 siklus revisi | `count(espj disetujui dengan siklus_revisi ≤ 1) / count(espj disetujui)` |
| KR2.3 sisa UM > 30 hari | `count(espj_peserta lebih bayar belum lunas, disetujui_pada > 30 hari lalu)` — target 0 |
| KR3.1 komitmen > pagu | `count(temuan AF-6)` — target 0 |
| KR3.2 klaim > SBM tertahan | `count(biaya melebihi_sbm) / count(biaya melebihi_sbm) ` selalu 100% by design; ukur **positif palsu** = disetujui PPK ÷ total melebihi |
| KR4.1 ST tertaut satker & PKA | `count(penugasan dengan unit_tujuan_id dan pka_id) / count(penugasan)` |
| KR5.1 aksi tercatat | selalu 100% (invariansi RLS); ukur **gap** = aksi tanpa baris `perjadin_log` (harusnya 0) |
| KR5.2 waktu ekspor paket audit | telemetri durasi route `paket-audit` (dicatat ke `perjadin_log` nilai `ms`) |

### 1.3 Anti-metrik (§6) — deret mingguan

- pemakaian jalur fallback: `count(perjadin_presensi sumber='fallback' minggu itu)`
- persetujuan PPK atas klaim di atas SBM: `count(perjadin_biaya disetujui_ppk minggu itu)`
- penugasan berjalur Rampung: `count(perjadin_penugasan jenis_alur='Rampung' minggu itu) / total minggu itu`

### 1.4 HEART

Butuh input non-sistem: survei pasca-penugasan (Happiness, "proses lebih mudah 1–5"),
"presensi berhasil percobaan pertama" (butuh kolom `perjadin_presensi.percobaan_ke` — tambahan
kecil), "median waktu merekam satu titik" (client mengirim `durasi_rekam_detik`). Sisanya
(Engagement, Adoption, Retention, Task Success) terhitung dari data yang sudah ada.

---

## 2. Penyimpanan

```sql
create table perjadin_metrik_mingguan (
  minggu_mulai   date primary key,       -- Senin
  tdt_pembilang  integer not null default 0,
  tdt_penyebut   integer not null default 0,
  kr             jsonb not null default '{}',   -- {kr1_1: 1.0, kr2_1: 8, ...}
  anti_metrik    jsonb not null default '{}',   -- {fallback: 3, atas_sbm: 1, rampung_ratio: 0.1}
  dihitung_pada  timestamptz not null default now()
);
```

RLS: baca `perjadin_peran_pengawas()`; tulis admin/service-role saja.

**Kenapa snapshot, bukan hitung on-the-fly:** TDT butuh window berjalan lintas beberapa tabel
besar; historisnya harus stabil walau data lama berubah (mis. E-SPJ lama disetujui belakangan
tidak boleh mengubah TDT minggu-minggu sebelumnya). Snapshot mingguan = kebenaran historis;
minggu berjalan dihitung on-demand (tidak disimpan sampai minggu tutup).

---

## 3. Komputasi

- Fungsi murni `hitungMetrikMingguan(rows): { tdtPembilang, tdtPenyebut, kr, antiMetrik }` di
  `src/lib/e-perjadin/metrik.ts`, diberi baris mentah (penugasan+presensi+laporan+espj+temuan+biaya
  untuk satu window) — dapat diuji tanpa DB + self-check di `scripts/verifikasi-e-perjadin.ts`.
- Loader server `muatMentahMetrik(supabase, mingguMulai, mingguSelesai)`.
- Route `POST /api/e-perjadin/metrik/hitung?minggu=YYYY-MM-DD` → hitung & upsert snapshot; dilindungi
  service-role/cron secret.

---

## 4. Penjadwalan

Pilihan (untuk diputuskan):

| Opsi | Cara | Catatan |
|---|---|---|
| **Vercel Cron** (`vercel.ts` crons) | `{ path: '/api/e-perjadin/metrik/hitung', schedule: '5 1 * * 1' }` (Senin 01:05) | paling native untuk deployment ini; route memakai `CRON_SECRET` |
| Supabase `pg_cron` + `pg_net` | panggil route dari DB | perlu ekstensi diaktifkan |
| Manual/tombol "Hitung minggu lalu" di dasbor | admin klik | cukup untuk uji operasional M6 |

Rekomendasi: mulai dari **tombol manual** (M6 uji terbatas), naikkan ke **Vercel Cron** saat
peluncuran penuh.

---

## 5. Dasbor (`/dashboard/e-perjadin/tdt` atau perluasan laporan-manajerial)

- **Kartu TDT besar** + tren garis (Recharts — sudah dependency) 12 minggu terakhir, garis target 85%.
- **Grid KR** dengan nilai terkini + panah tren + target.
- **Sparkline anti-metrik** 3 baris, berdampingan dengan metrik keberhasilan (PRD §6 mewajibkan
  keduanya satu layar).
- Filter periode; ekspor Excel deret waktu.
- Akses: `perjadin_peran_pengawas()` + `admin_sistem`.

---

## 6. Perkiraan pekerjaan

1 migrasi (`perjadin_metrik_mingguan` + kolom kecil `percobaan_ke`, `durasi_rekam_detik` di
`perjadin_presensi`) · `metrik.ts` murni + self-check · loader + route hitung · 1 halaman dasbor
dengan Recharts · (opsional) `vercel.ts` cron. Estimasi: setara M5.
