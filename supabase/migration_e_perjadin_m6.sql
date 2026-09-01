-- ============================================================
-- Migration: E-Perjadin Bawas — M6 (Model Ekonomi Nyata: DANOM, Kategori, AF-4, KPA)
-- Dasar: ref/E-Perjadin/plafon_danom.md, ref/E-Perjadin/durasi_dinas.md
--        (SE Kepala Bawas MA No. 1/2026; PMK 32/2025 SBM TA 2026)
-- Prasyarat: migrasi M0 … M5.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
-- Seed nilai plafon terpisah: migration_e_perjadin_m6_seed.sql.
-- ============================================================

-- ── Peran KPA (Kuasa Pengguna Anggaran = Sekretaris Bawas) ─────────────
alter table public.perjadin_peran drop constraint if exists perjadin_peran_peran_check;
alter table public.perjadin_peran add constraint perjadin_peran_peran_check
  check (peran in (
    'pengelola_kegiatan', 'pelaksana', 'pemberi_tugas', 'staf_ppk',
    'ppk', 'ppspm', 'bendahara', 'auditor_perjadin', 'kpa'
  ));

create or replace function public.perjadin_peran_pengawas()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.perjadin_is_admin() or exists (
    select 1 from public.perjadin_peran
    where user_id = auth.uid() and aktif and peran in (
      'pengelola_kegiatan', 'pemberi_tugas', 'staf_ppk', 'ppk', 'ppspm',
      'bendahara', 'auditor_perjadin', 'kpa'
    )
  )
$$;

-- ── perjadin_sbm: komponen tiket_pesawat ─────────────────────────────
-- Konvensi tingkat_biaya:
--   uang_harian     → '-'          (per provinsi saja)
--   penginapan      → '1' | '2'    (kategori pelaksana)
--   tiket_pesawat   → '-' rute utama, atau label sub-rute (mis. 'Jakarta - Silangit')
alter table public.perjadin_sbm drop constraint if exists perjadin_sbm_komponen_check;
alter table public.perjadin_sbm add constraint perjadin_sbm_komponen_check
  check (komponen in ('uang_harian', 'penginapan', 'uang_representasi', 'transport_lokal', 'tiket_pesawat'));

-- ── perjadin_peserta: kategori + estimasi komponen at-cost ───────────
alter table public.perjadin_peserta
  add column if not exists estimasi_pesawat  bigint  not null default 0,
  add column if not exists estimasi_dpr      bigint  not null default 0,
  add column if not exists penginapan_mode   text    not null default 'hotel',
  add column if not exists homebase_jabodetabek boolean not null default false;
alter table public.perjadin_peserta drop constraint if exists perjadin_peserta_penginapan_mode_chk;
alter table public.perjadin_peserta add constraint perjadin_peserta_penginapan_mode_chk
  check (penginapan_mode in ('hotel', '30persen', 'tidak'));
-- tingkat_biaya kini menyimpan kategori '1' | '2' (data lama dibiarkan; admin isi ulang).

-- ── perjadin_penugasan: dua jalur (ST & DANOM) ──────────────────────
alter table public.perjadin_penugasan
  add column if not exists st_status          text not null default 'draf',
  add column if not exists danom_status       text not null default 'draf',
  add column if not exists pemberi_tugas_oleh uuid references public.users(id),
  add column if not exists pemberi_tugas_pada timestamptz,
  add column if not exists kpa_oleh           uuid references public.users(id),
  add column if not exists kpa_pada           timestamptz,
  add column if not exists uang_muka_total    bigint,
  add column if not exists uang_muka_dibayar_pada timestamptz,
  add column if not exists uang_muka_bukti_path   text;
alter table public.perjadin_penugasan drop constraint if exists perjadin_penugasan_st_status_chk;
alter table public.perjadin_penugasan add constraint perjadin_penugasan_st_status_chk
  check (st_status in ('draf', 'diajukan', 'terbit'));
alter table public.perjadin_penugasan drop constraint if exists perjadin_penugasan_danom_status_chk;
alter table public.perjadin_penugasan add constraint perjadin_penugasan_danom_status_chk
  check (danom_status in ('draf', 'diajukan_ppk', 'diajukan_kpa', 'disetujui'));

-- Selaraskan penugasan lama (dibuat sebelum dua jalur) agar tidak macet.
update public.perjadin_penugasan set st_status = 'terbit', danom_status = 'disetujui'
  where status in ('Berjalan', 'Selesai') and st_status = 'draf';

-- ── perjadin_dokumen: jenis DANOM ───────────────────────────────────
alter table public.perjadin_dokumen drop constraint if exists perjadin_dokumen_jenis_chk;
alter table public.perjadin_dokumen add constraint perjadin_dokumen_jenis_chk
  check (jenis in ('ST', 'SPD', 'Laporan', 'RekapSPJ', 'DANOM'));

-- ── Parameter kontrol tambahan (plafon_danom.md, durasi_dinas.md) ────
insert into public.perjadin_parameter (key, nilai, keterangan) values
  ('tarif_dalam_kota_harian',          '210000', 'Uang harian dinas dalam kota > 8 jam (Rp/hari) — SE Bawas 1/2026.'),
  ('tarif_transport_lokal_dalam_kota', '170000', 'Biaya transport lokal dinas dalam kota (Rp/hari).'),
  ('tarif_dpr_default',                '300000', 'Estimasi bawaan Daftar Pengeluaran Riil (transport lokal lumpsum) per penugasan luar kota.'),
  ('toleransi_overbudget_tiket',       '500000', 'Batas overbudget tiket pesawat yang dapat dipertanggungjawabkan (Rp/orang).'),
  ('ambang_durasi_lokasi_menit',       '360',    'Durasi minimal di lokasi penugasan (In→Out) agar dinas dalam kota diakui > 8 jam (AF-4). Min 360; unit boleh menaikkan.'),
  ('faktor_penginapan_30persen',       '0.30',   'Faktor biaya penginapan bagi pelaksana yang tidak menginap hotel.')
on conflict (key) do nothing;
