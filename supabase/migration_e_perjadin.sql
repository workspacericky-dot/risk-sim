-- ============================================================
-- Migration: E-Perjadin Bawas — M0 (Fondasi & Master Data)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (§8.2, §8.4, F-6.1, F-6.3, F-6.4)
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--
-- Lingkup M0: tabel master (peran, SBM, pagu, parameter), jejak audit
-- append-only, dan kolom koordinat pada unit_kerja. Tabel transaksional
-- (perjadin_penugasan, _peserta, _presensi, _biaya, _komitmen, dst.) dan
-- kebijakan RLS berbasis peran per-baris menyusul di migrasi M1–M4, ditinjau
-- tersendiri sesuai PRD R-5 sebelum ada data keuangan/pribadi.
-- ============================================================

-- ── Helper: apakah pemanggil admin_sistem ────────────────────────────────
-- security definer agar bisa membaca public.users menembus RLS-nya.
create or replace function public.perjadin_is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin_sistem'
  )
$$;

-- ── unit_kerja: koordinat & radius geofence (F-6.4) ──────────────────────
-- Kolom lama `lokasi` (teks nama kota) tidak diubah maknanya.
alter table public.unit_kerja add column if not exists lintang          double precision;
alter table public.unit_kerja add column if not exists bujur            double precision;
alter table public.unit_kerja add column if not exists radius_geofence  integer;

-- ── perjadin_peran: relasi banyak-ke-banyak, menegakkan SoD (F-6.1) ──────
create table if not exists public.perjadin_peran (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  peran       text not null,
  aktif       boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, peran)
);

alter table public.perjadin_peran drop constraint if exists perjadin_peran_peran_check;
alter table public.perjadin_peran add constraint perjadin_peran_peran_check
  check (peran in (
    'pengelola_kegiatan', 'pelaksana', 'pemberi_tugas', 'staf_ppk',
    'ppk', 'ppspm', 'bendahara', 'auditor_perjadin'
  ));

create index if not exists perjadin_peran_user_idx on public.perjadin_peran (user_id) where aktif;

alter table public.perjadin_peran enable row level security;
drop policy if exists "perjadin_peran baca"  on public.perjadin_peran;
drop policy if exists "perjadin_peran tulis" on public.perjadin_peran;
-- Baca: semua terautentikasi (gerbang akses & pemeriksaan SoD membacanya).
create policy "perjadin_peran baca" on public.perjadin_peran
  for select using (auth.role() = 'authenticated');
-- Tulis: hanya admin_sistem (Lampiran B RACI: R/A pada pengelolaan peran).
create policy "perjadin_peran tulis" on public.perjadin_peran
  for all using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());

-- ── perjadin_sbm: tarif per TA × provinsi × komponen × tingkat (F-6.4) ───
create table if not exists public.perjadin_sbm (
  id             uuid primary key default gen_random_uuid(),
  tahun          integer not null,
  provinsi       text not null,
  komponen       text not null,
  tingkat_biaya  text not null,
  nilai          bigint not null check (nilai >= 0),   -- rupiah bulat
  satuan         text not null default 'OH',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tahun, provinsi, komponen, tingkat_biaya)
);

alter table public.perjadin_sbm drop constraint if exists perjadin_sbm_komponen_check;
alter table public.perjadin_sbm add constraint perjadin_sbm_komponen_check
  check (komponen in ('uang_harian', 'penginapan', 'uang_representasi', 'transport_lokal'));

create index if not exists perjadin_sbm_lookup_idx
  on public.perjadin_sbm (tahun, provinsi, tingkat_biaya);

alter table public.perjadin_sbm enable row level security;
drop policy if exists "perjadin_sbm baca"  on public.perjadin_sbm;
drop policy if exists "perjadin_sbm tulis" on public.perjadin_sbm;
create policy "perjadin_sbm baca" on public.perjadin_sbm
  for select using (auth.role() = 'authenticated');
create policy "perjadin_sbm tulis" on public.perjadin_sbm
  for all using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());

-- ── perjadin_pagu: pagu per mata anggaran per TA (F-1.3, F-6.4) ──────────
create table if not exists public.perjadin_pagu (
  id             uuid primary key default gen_random_uuid(),
  tahun          integer not null,
  mata_anggaran  text not null,
  uraian         text not null default '',
  pagu           bigint not null check (pagu >= 0),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (tahun, mata_anggaran)
);

alter table public.perjadin_pagu enable row level security;
drop policy if exists "perjadin_pagu baca"  on public.perjadin_pagu;
drop policy if exists "perjadin_pagu tulis" on public.perjadin_pagu;
create policy "perjadin_pagu baca" on public.perjadin_pagu
  for select using (auth.role() = 'authenticated');
create policy "perjadin_pagu tulis" on public.perjadin_pagu
  for all using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());

-- ── perjadin_parameter: ambang kontrol yang dapat dikonfigurasi (F-6.4) ──
create table if not exists public.perjadin_parameter (
  key         text primary key,
  nilai       text not null,
  keterangan  text not null default '',
  updated_at  timestamptz not null default now()
);

-- Nilai bawaan = "usulan awal" PRD §8.6 / §F-6.4. Tidak ditimpa bila sudah ada.
insert into public.perjadin_parameter (key, nilai, keterangan) values
  ('ambang_durasi_dinas_dalam_kota_jam', '8',   'Batas jam dinas dalam kota untuk AF-4 (PMK 113/2012). Lihat PRD Q-2.'),
  ('radius_geofence_default_m',          '500', 'Radius geofence bawaan bila satker belum punya nilai sendiri.'),
  ('ambang_akurasi_gps_m',              '100', 'Presensi ditolak bila akurasi GPS di atas nilai ini.'),
  ('batas_peserta_per_perangkat',       '4',   'Ambang mode berbagi perangkat sebelum ditandai anomali (AF-7c).'),
  ('ambang_selisih_waktu_menit',        '5',   'Selisih waktu perangkat vs server yang memicu anomali (AF-7a).')
on conflict (key) do nothing;

alter table public.perjadin_parameter enable row level security;
drop policy if exists "perjadin_parameter baca"  on public.perjadin_parameter;
drop policy if exists "perjadin_parameter tulis" on public.perjadin_parameter;
create policy "perjadin_parameter baca" on public.perjadin_parameter
  for select using (auth.role() = 'authenticated');
create policy "perjadin_parameter tulis" on public.perjadin_parameter
  for all using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());

-- ── perjadin_log: jejak audit append-only (F-6.3) ───────────────────────
-- Kebijakan RLS sengaja HANYA insert + select. Tidak ada policy UPDATE/DELETE
-- untuk peran mana pun (termasuk admin_sistem) → tabel bersifat insert-only.
create table if not exists public.perjadin_log (
  id          uuid primary key default gen_random_uuid(),
  aktor_id    uuid references public.users(id),
  aksi        text not null,
  entitas     text,
  entitas_id  text,
  nilai_lama  jsonb,
  nilai_baru  jsonb,
  waktu_server timestamptz not null default now()
);

create index if not exists perjadin_log_entitas_idx on public.perjadin_log (entitas, entitas_id);
create index if not exists perjadin_log_waktu_idx   on public.perjadin_log (waktu_server desc);

alter table public.perjadin_log enable row level security;
drop policy if exists "perjadin_log sisip" on public.perjadin_log;
drop policy if exists "perjadin_log baca"  on public.perjadin_log;
create policy "perjadin_log sisip" on public.perjadin_log
  for insert with check (auth.role() = 'authenticated' and aktor_id = auth.uid());
-- Baca dibatasi admin di M0; peran auditor_perjadin ditambahkan di M5.
create policy "perjadin_log baca" on public.perjadin_log
  for select using (public.perjadin_is_admin());
