-- ============================================================
-- Migration: E-Perjadin Bawas — M9
--   (1) Tempat Sah keberangkatan/kepulangan (PMK 119/2023)
--   (2) Revisi bernomor penugasan pasca-terbit (F-1.4)
--   (3) Metrik mingguan TDT & KR (§3, §6)
-- Prasyarat: migrasi M0 … M8.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
-- ============================================================

-- ══ 1. Tempat Sah (PMK 119/2023) ══════════════════════════════════════
-- Titik Start/End boleh direkam dari lokasi selain tempat kedudukan:
-- flexible working space, lokasi cuti, lokasi libur resmi, atau lokasi
-- penugasan lain. Biaya transport tetap dibatasi estimasi kantor→tujuan.
alter table public.perjadin_presensi
  add column if not exists dari_tempat_sah        boolean not null default false,
  add column if not exists tempat_sah_jenis       text,
  add column if not exists tempat_sah_keterangan  text;
alter table public.perjadin_presensi drop constraint if exists perjadin_presensi_tempat_sah_chk;
alter table public.perjadin_presensi add constraint perjadin_presensi_tempat_sah_chk
  check (tempat_sah_jenis is null or tempat_sah_jenis in ('fws', 'cuti', 'libur', 'penugasan_lain'));

-- Deklarasi Tempat Sah di tingkat peserta (untuk pembatasan biaya transport riil).
alter table public.perjadin_peserta
  add column if not exists berangkat_tempat_sah boolean not null default false,
  add column if not exists pulang_tempat_sah    boolean not null default false;

-- Metadata HEART: percobaan presensi & durasi rekam (§6).
alter table public.perjadin_presensi
  add column if not exists percobaan_ke       integer,
  add column if not exists durasi_rekam_detik integer;

-- ══ 2. Revisi bernomor penugasan ═════════════════════════════════════
alter table public.perjadin_peserta
  add column if not exists ditarik_pada   timestamptz,
  add column if not exists ditarik_alasan text;

alter table public.perjadin_dokumen
  add column if not exists menggantikan_id uuid references public.perjadin_dokumen(id) on delete set null,
  add column if not exists digantikan      boolean not null default false;

create table if not exists public.perjadin_penugasan_revisi (
  id              uuid primary key default gen_random_uuid(),
  penugasan_id    uuid not null references public.perjadin_penugasan(id) on delete cascade,
  nomor_revisi    integer not null,
  jenis_perubahan text[] not null default '{}',
  alasan          text not null,
  snapshot_lama   jsonb not null,
  snapshot_baru   jsonb,
  status          text not null default 'draf',
  dampak_danom    boolean not null default false,
  diusulkan_oleh  uuid references public.users(id),
  disetujui_oleh  uuid references public.users(id),
  disetujui_pada  timestamptz,
  dokumen_id      uuid references public.perjadin_dokumen(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (penugasan_id, nomor_revisi),
  constraint perjadin_revisi_status_chk check (status in ('draf', 'diajukan', 'disetujui', 'ditolak'))
);
create index if not exists perjadin_revisi_penugasan_idx on public.perjadin_penugasan_revisi (penugasan_id);

alter table public.perjadin_penugasan_revisi enable row level security;
drop policy if exists "perjadin_revisi baca"  on public.perjadin_penugasan_revisi;
drop policy if exists "perjadin_revisi tulis" on public.perjadin_penugasan_revisi;
create policy "perjadin_revisi baca" on public.perjadin_penugasan_revisi for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_revisi tulis" on public.perjadin_penugasan_revisi for all using (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_has_role('pemberi_tugas') or public.perjadin_is_admin()
) with check (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_has_role('pemberi_tugas') or public.perjadin_is_admin()
);

-- ══ 3. Metrik mingguan (TDT & KR) ════════════════════════════════════
create table if not exists public.perjadin_metrik_mingguan (
  minggu_mulai   date primary key,        -- Senin
  tdt_pembilang  integer not null default 0,
  tdt_penyebut   integer not null default 0,
  kr             jsonb not null default '{}'::jsonb,
  anti_metrik    jsonb not null default '{}'::jsonb,
  heart          jsonb not null default '{}'::jsonb,
  dihitung_pada  timestamptz not null default now(),
  dihitung_oleh  uuid references public.users(id)
);

alter table public.perjadin_metrik_mingguan enable row level security;
drop policy if exists "perjadin_metrik baca"  on public.perjadin_metrik_mingguan;
drop policy if exists "perjadin_metrik tulis" on public.perjadin_metrik_mingguan;
create policy "perjadin_metrik baca" on public.perjadin_metrik_mingguan for select using (
  public.perjadin_peran_pengawas()
);
create policy "perjadin_metrik tulis" on public.perjadin_metrik_mingguan for all
  using (public.perjadin_is_admin()) with check (public.perjadin_is_admin());
