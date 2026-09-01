-- ============================================================
-- Migration: E-Perjadin Bawas — M8 (master pegawai + sub-rute pesawat)
-- Prasyarat: migrasi M0 … M7.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
-- ============================================================

-- ── Master pegawai Bawas (referensi; sumber: pegawai_bawas_per_1_sept.xlsx) ─
create table if not exists public.perjadin_pegawai (
  nip        text primary key,
  nama       text not null,
  nik        text,
  jabatan    text,
  golongan   text,
  kategori   text not null default '2',   -- kategori pelaksana '1' | '2' (plafon_danom)
  satker     text,
  wilayah    text,
  aktif      boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint perjadin_pegawai_kategori_chk check (kategori in ('1', '2'))
);
create index if not exists perjadin_pegawai_nama_idx on public.perjadin_pegawai (nama);

alter table public.perjadin_pegawai enable row level security;
drop policy if exists "perjadin_pegawai baca"  on public.perjadin_pegawai;
drop policy if exists "perjadin_pegawai tulis" on public.perjadin_pegawai;
create policy "perjadin_pegawai baca" on public.perjadin_pegawai for select using (auth.role() = 'authenticated');
create policy "perjadin_pegawai tulis" on public.perjadin_pegawai for all
  using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());

-- NIP pada akun aplikasi (opsional) — menautkan users ke master pegawai & AF-1.
alter table public.users add column if not exists nip text;
create index if not exists users_nip_idx on public.users (nip) where nip is not null;

-- ── Peserta: sub-rute pesawat & tautan NIP master ─────────────────────
alter table public.perjadin_peserta
  add column if not exists rute_pesawat text,     -- label sub-rute (mis. 'Jakarta - Silangit'); null = rute utama
  add column if not exists pegawai_nip  text;     -- referensi ke perjadin_pegawai.nip
