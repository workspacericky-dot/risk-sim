# Desain (draf untuk direview) — Revisi Bernomor Penugasan Pasca-Terbit

**Konteks.** Setelah Surat Tugas terbit (`st_status = 'terbit'`) atau penugasan `Berjalan`,
header/tim/tanggal terkunci. Realita lapangan menuntut perubahan: anggota tim diganti karena
sakit, tanggal bergeser karena tiket, satker tujuan bertambah/berubah. PRD F-1.4 mensyaratkan
perubahan ini lewat **pembatalan/revisi bernomor yang tercatat**, bukan penyuntingan diam-diam.
Saat ini satu-satunya jalan adalah **Batalkan + buat ulang** — mahal dan memutus jejak.

---

## 1. Ruang lingkup perubahan per fase

| Fase penugasan | Yang boleh direvisi | Yang tidak |
|---|---|---|
| `st_status='terbit'`, DANOM belum disetujui KPA | tanggal, anggota tim, satker/provinsi, jenis dinas, PKA | — |
| DANOM `disetujui`, presensi belum ada | tanggal, anggota tim (rekalkulasi DANOM + komitmen), satker | uang_muka_persen bila uang muka sudah dibayar |
| Presensi sudah ada untuk sebagian anggota | tambah anggota; perpanjang tanggal; **tidak** boleh mempersingkat di bawah cakupan presensi; anggota berpresensi **tidak** boleh dihapus (hanya "ditarik" — lihat §5) | mengurangi tanggal di bawah titik presensi terakhir |
| E-SPJ sudah `diajukan` atau lebih | **tidak ada revisi** — hanya pembatalan sisa/koreksi via verifikasi E-SPJ | semua |
| `Selesai` / `Dibatalkan` | tidak ada | semua |

---

## 2. Model data

```sql
create table perjadin_penugasan_revisi (
  id              uuid primary key default gen_random_uuid(),
  penugasan_id    uuid not null references perjadin_penugasan(id) on delete cascade,
  nomor_revisi    integer not null,                 -- 1, 2, 3… per penugasan
  jenis_perubahan text[] not null,                  -- {'tanggal','tim','satker','jenis_dinas','pka'}
  alasan          text not null,
  snapshot_lama   jsonb not null,                   -- header + daftar peserta ringkas sebelum
  snapshot_baru   jsonb not null,                   -- sesudah (diisi saat diajukan)
  status          text not null default 'draf',     -- draf | diajukan | disetujui | ditolak
  dampak_danom    boolean not null default false,   -- true bila estimasi/komitmen berubah
  diusulkan_oleh  uuid references users(id),
  disetujui_oleh  uuid references users(id),
  disetujui_pada  timestamptz,
  menggantikan_dokumen_id uuid references perjadin_dokumen(id),  -- ST lama yang digantikan
  dokumen_id      uuid references perjadin_dokumen(id),          -- ST revisi yang terbit
  created_at      timestamptz not null default now(),
  unique (penugasan_id, nomor_revisi)
);
```

`perjadin_dokumen` mendapat kolom opsional `menggantikan_id uuid` + `nomor` revisi berformat
`123/ST/BAWAS/2026 Rev.1`. Dokumen ST lama **tidak dihapus** (F-6.3) — hanya ditandai digantikan.

---

## 3. Alur

```
Pengelola: "Buat Revisi"  → perjadin_penugasan_revisi(status=draf, nomor_revisi=next)
        ↓  (form: pilih perubahan, edit field pada salinan draf, isi alasan)
Pengelola: "Ajukan Revisi" → snapshot_baru diisi; dampak_danom dihitung; status=diajukan
        ↓
Pemberi Tugas: "Setujui Revisi"
        │  jalankan ulang AF-1 (tumpang tindih) untuk anggota/tanggal baru — blocking
        │  jalankan ulang AF-2 (anti-backdate) bila tanggal berangkat berubah — blocking
        │  terapkan snapshot_baru ke perjadin_penugasan & perjadin_peserta
        │  terbitkan ST revisi (perjadin_dokumen jenis ST, nomor "…Rev.n", menggantikan=ST lama)
        │  terbitkan ulang SPD untuk anggota baru; SPD anggota keluar ditandai batal
        │  rekalkulasi DANOM seluruh peserta (recomputeEstimasi)
        │  status revisi = disetujui
        ↓
JIKA dampak_danom == true DAN danom_status was 'disetujui':
        danom_status → 'diajukan_kpa' (kembali ke KPA untuk mengesahkan delta anggaran)
        selisih komitmen pagu disesuaikan: pesan tambahan / lepas kelebihan
JIKA dampak_danom == true DAN danom_status ∈ {diajukan_ppk, diajukan_kpa}:
        danom_status → 'draf' (ulang dari PPK)
```

**Penolakan revisi** (Pemberi Tugas) → `status=ditolak`, tak ada perubahan diterapkan.

---

## 4. Efek turunan

- **Pagu**: rekalkulasi total estimasi → `alokasiKomitmen` menghitung delta; sisipkan baris
  `perjadin_komitmen` `pesan` (delta positif) atau `lepas` (delta negatif). AF-6 diblokir bila
  delta positif melampaui pagu tersedia.
- **Uang muka**: bila sudah dibayar dan total turun → catat "kelebihan uang muka" sebagai
  piutang di penyelesaian; bila naik → tambahan uang muka menyusul (tandai `uang_muka_dibayar_pada=null`
  untuk selisih? → sederhananya: kunci `uang_muka_persen` bila sudah dibayar; delta ditangani di E-SPJ).
- **Presensi & biaya anggota keluar**: dipertahankan (append-only), ditandai `peserta.ditarik_pada`;
  tidak masuk rekap E-SPJ; muncul di paket audit.
- **Portal verifikasi QR**: token ST lama tetap valid tetapi menampilkan "Digantikan oleh Rev.n".

---

## 5. "Menarik" anggota vs menghapus

Anggota yang sudah punya presensi/biaya tidak dihapus. Aksi `tarikPeserta(pesertaId, alasan)`:
kolom baru `perjadin_peserta.ditarik_pada`, `ditarik_alasan`. Peserta ditarik:
- tidak menghasilkan SPD baru, SPD lama ditandai batal,
- dikeluarkan dari rekap DANOM & E-SPJ,
- presensi/biaya yang sudah ada tetap tersimpan & tampil di paket audit,
- jika belum ada presensi/biaya sama sekali → boleh dihapus penuh (seperti sekarang).

---

## 6. Alternatif yang dipertimbangkan

| Opsi | Kenapa tidak dipilih |
|---|---|
| Batalkan + buat ulang (status quo) | memutus jejak, nomor ST baru tak terkait, komitmen dilepas-pesan penuh |
| Edit langsung + log perubahan | melanggar F-1.4 (harus bernomor & disetujui), tak ada dokumen ST revisi |
| Revisi tanpa persetujuan ulang | membuka celah backdate & tumpang tindih pasca-terbit |

---

## 7. Perkiraan pekerjaan

1 migrasi (`perjadin_penugasan_revisi` + kolom `ditarik_*`, `menggantikan_id`) · ~4 server action
(`buatRevisi`, `ajukanRevisi`, `setujuiRevisi`, `tolakRevisi`, `tarikPeserta`) · 1 halaman revisi
+ komponen · penyesuaian `recomputeEstimasi` & alokasi komitmen delta · badge "Rev.n" di cetak/verifikasi.
Estimasi: setara 1 milestone kecil (M1-M3 skala).
