-- ============================================================
-- Migration: E-Perjadin Bawas — M2 (Presensi & Geotagging Lapangan)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (F-2.1 … F-2.4, F-2.6, AF-7, §8.5)
-- Prasyarat: migration_e_perjadin.sql (M0) & migration_e_perjadin_m1.sql (M1).
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--
-- F-2.5 (modul ISPD) TIDAK termasuk — menunggu sumber data presensi kantor (PRD D-4).
-- ============================================================

-- ── Helper: apakah p_peserta_id adalah baris peserta milik pemanggil ────
create or replace function public.perjadin_peserta_saya(p_peserta_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perjadin_peserta
    where id = p_peserta_id and user_id = auth.uid()
  )
$$;

-- ── perjadin_presensi ──────────────────────────────────────────────────
create table if not exists public.perjadin_presensi (
  id                 uuid primary key default gen_random_uuid(),
  penugasan_id       uuid not null references public.perjadin_penugasan(id) on delete cascade,
  peserta_id         uuid not null references public.perjadin_peserta(id) on delete cascade,
  jenis              text not null,
  tanggal            date not null,                 -- hari yang diwakili titik (model "212")
  waktu_server       timestamptz not null default now(),
  waktu_perangkat    timestamptz,
  lintang            double precision,
  bujur              double precision,
  akurasi_m          double precision,
  path_foto          text,
  keterangan         text not null default '',      -- wajib utk Kegiatan/Tambahan
  device_id          text,
  mode_berbagi       boolean not null default false,
  pemilik_perangkat  text,
  sumber             text not null default 'pwa',
  path_pernyataan    text,                          -- Surat Pernyataan Kepatuhan (jalur fallback)
  alasan_fallback    text,
  jarak_m            double precision,              -- jarak ke titik acuan; null bila acuan tak tersedia
  dalam_geofence     boolean,                       -- null = tidak dievaluasi (koordinat acuan kosong)
  selisih_waktu_detik integer,
  status_verifikasi  text not null default 'lolos',
  catatan_verifikasi text,
  diputus_oleh       uuid references public.users(id),
  diputus_pada       timestamptz,
  dibuat_oleh        uuid not null references public.users(id),
  created_at         timestamptz not null default now(),
  constraint perjadin_presensi_jenis_chk  check (jenis in ('Start', 'In', 'Kegiatan', 'Out', 'End', 'Tambahan')),
  constraint perjadin_presensi_sumber_chk check (sumber in ('pwa', 'fallback')),
  constraint perjadin_presensi_status_chk check (status_verifikasi in ('lolos', 'anomali', 'pernyataan_pending', 'ditolak'))
);
create index if not exists perjadin_presensi_penugasan_idx on public.perjadin_presensi (penugasan_id);
create index if not exists perjadin_presensi_peserta_idx on public.perjadin_presensi (peserta_id);
create index if not exists perjadin_presensi_device_idx on public.perjadin_presensi (device_id, tanggal);

alter table public.perjadin_presensi enable row level security;
drop policy if exists "perjadin_presensi baca"   on public.perjadin_presensi;
drop policy if exists "perjadin_presensi sisip"  on public.perjadin_presensi;
drop policy if exists "perjadin_presensi putus"  on public.perjadin_presensi;
create policy "perjadin_presensi baca" on public.perjadin_presensi for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
-- Peserta merekam presensi dirinya sendiri (mode berbagi: peserta login eksplisit — F-2.4).
create policy "perjadin_presensi sisip" on public.perjadin_presensi for insert with check (
  dibuat_oleh = auth.uid()
  and (public.perjadin_peserta_saya(peserta_id) or public.perjadin_peran_pengawas())
);
-- Keputusan atas anomali / jalur pernyataan hanya oleh PPK (F-2.2, F-2.6).
create policy "perjadin_presensi putus" on public.perjadin_presensi for update using (
  public.perjadin_has_role('ppk') or public.perjadin_is_admin()
);

-- Tautkan temuan ke titik presensi asalnya (resolusi anomali AF-7 yang presisi).
alter table public.perjadin_temuan
  add column if not exists presensi_id uuid references public.perjadin_presensi(id) on delete set null;

-- ── Parameter kontrol tambahan (§8.5) ─────────────────────────────────
insert into public.perjadin_parameter (key, nilai, keterangan) values
  ('kedudukan_lintang',        '-6.17540',  'Lintang tempat kedudukan (Badan Pengawasan MA, Jakarta) — geofence titik Start/End.'),
  ('kedudukan_bujur',          '106.84780', 'Bujur tempat kedudukan.'),
  ('kedudukan_radius_m',       '500',       'Radius geofence tempat kedudukan (meter).'),
  ('ambang_kecepatan_kmh',     '900',       'Kecepatan antar titik presensi di atas nilai ini ditandai anomali (AF-7b).'),
  ('ambang_fallback_berulang', '2',         'Pemakaian jalur fallback oleh orang yang sama melebihi nilai ini ditandai anomali (AF-7d).')
on conflict (key) do nothing;

-- ── Supabase Storage: bucket privat foto presensi (§8.4) ──────────────
-- Unggah & signed URL dilakukan sisi server memakai service role, jadi tidak
-- perlu policy pada storage.objects untuk peran authenticated.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'perjadin-presensi', 'perjadin-presensi', false, 5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
