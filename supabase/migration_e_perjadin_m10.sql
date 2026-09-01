-- ============================================================
-- Migration: E-Perjadin Bawas — M10 (revisi model perhitungan DANOM)
-- Prasyarat: migrasi M0 … M9.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--
-- Rujukan: ref/E-Perjadin/komponen_biaya_perjadin.md & contoh_penghitungan.md
--   • Uang representasi luar kota  → pakai kolom perjadin_peserta.berhak_representasi
--     yang SUDAH ADA (m1); hanya perlu parameter tarif (di-seed via UI Parameter).
--   • Uang harian 60% bila transport lokal riil / >1 obrik  → kolom baru.
--   • Kendaraan dinas → tanpa transport lokal                → kolom baru.
-- ============================================================

alter table public.perjadin_peserta
  add column if not exists transport_lokal_riil   boolean not null default false,
  add column if not exists pakai_kendaraan_dinas  boolean not null default false;

comment on column public.perjadin_peserta.transport_lokal_riil is
  'Transport lokal dibayar riil / kunjungan lebih dari satu obrik → uang harian 60%.';
comment on column public.perjadin_peserta.pakai_kendaraan_dinas is
  'Memakai kendaraan dinas/operasional → biaya transport lokal tidak dibayarkan.';

-- Parameter kontrol baru (isi lewat layar Parameter → "isi bawaan hilang", atau seed manual):
insert into public.perjadin_parameter (key, nilai, keterangan) values
  ('tarif_representasi_luar_kota', '150000',
   'Uang representasi luar kota per orang/hari (lumpsum), hanya bagi peserta yang berhak (mis. Eselon II).'),
  ('faktor_harian_transport_riil', '0.6',
   'Faktor uang harian bila transport lokal dibayar riil / kunjungan lebih dari satu obrik (60%).')
on conflict (key) do nothing;
