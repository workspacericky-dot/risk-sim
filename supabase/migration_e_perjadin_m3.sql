-- ============================================================
-- Migration: E-Perjadin Bawas — M3 (Laporan Hasil Dinas Tersegmentasi & Dokumen)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (F-4.1 … F-4.4)
-- Prasyarat: migrasi M0, M1, M2.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
-- ============================================================

-- ── Helper: apakah pemanggil anggota tim penugasan ─────────────────────
create or replace function public.perjadin_anggota_penugasan(p_penugasan_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perjadin_peserta
    where penugasan_id = p_penugasan_id and user_id = auth.uid()
  )
$$;

-- ── Lebarkan jenis dokumen resmi (F-4.3) ──────────────────────────────
alter table public.perjadin_dokumen drop constraint if exists perjadin_dokumen_jenis_chk;
alter table public.perjadin_dokumen add constraint perjadin_dokumen_jenis_chk
  check (jenis in ('ST', 'SPD', 'Laporan', 'RekapSPJ'));

-- ── perjadin_laporan: satu laporan per penugasan (F-4.2) ──────────────
create table if not exists public.perjadin_laporan (
  id               uuid primary key default gen_random_uuid(),
  penugasan_id     uuid not null unique references public.perjadin_penugasan(id) on delete cascade,
  status           text not null default 'draf',
  difinalkan_oleh  uuid references public.users(id),
  difinalkan_pada  timestamptz,
  diteruskan_pada  timestamptz,                    -- penanda manual "sudah diteruskan" (F-4.4)
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint perjadin_laporan_status_chk check (status in ('draf', 'final'))
);

alter table public.perjadin_laporan enable row level security;
drop policy if exists "perjadin_laporan baca"  on public.perjadin_laporan;
drop policy if exists "perjadin_laporan tulis" on public.perjadin_laporan;
create policy "perjadin_laporan baca" on public.perjadin_laporan for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_laporan tulis" on public.perjadin_laporan for all using (
  public.perjadin_anggota_penugasan(penugasan_id)
  or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
) with check (
  public.perjadin_anggota_penugasan(penugasan_id)
  or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
);

-- ── perjadin_laporan_segmen: satu baris per segmen tata naskah (F-4.1) ─
create table if not exists public.perjadin_laporan_segmen (
  id             uuid primary key default gen_random_uuid(),
  laporan_id     uuid not null references public.perjadin_laporan(id) on delete cascade,
  kunci          text not null,
  isi            text not null default '',
  ditugaskan_ke  uuid references public.users(id) on delete set null,
  disunting_oleh uuid references public.users(id),
  disunting_pada timestamptz,
  versi          integer not null default 0,
  updated_at     timestamptz not null default now(),
  unique (laporan_id, kunci),
  constraint perjadin_segmen_kunci_chk check (kunci in (
    'latar_belakang', 'maksud_tujuan', 'ruang_lingkup', 'hasil_pelaksanaan', 'kesimpulan', 'saran'
  ))
);
create index if not exists perjadin_segmen_laporan_idx on public.perjadin_laporan_segmen (laporan_id);

alter table public.perjadin_laporan_segmen enable row level security;
drop policy if exists "perjadin_segmen baca"  on public.perjadin_laporan_segmen;
drop policy if exists "perjadin_segmen tulis" on public.perjadin_laporan_segmen;
create policy "perjadin_segmen baca" on public.perjadin_laporan_segmen for select using (
  exists (select 1 from public.perjadin_laporan l where l.id = laporan_id
          and public.perjadin_boleh_lihat_penugasan(l.penugasan_id))
);
create policy "perjadin_segmen tulis" on public.perjadin_laporan_segmen for all using (
  exists (select 1 from public.perjadin_laporan l where l.id = laporan_id
          and (public.perjadin_anggota_penugasan(l.penugasan_id)
               or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()))
) with check (
  exists (select 1 from public.perjadin_laporan l where l.id = laporan_id
          and (public.perjadin_anggota_penugasan(l.penugasan_id)
               or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()))
);

-- ── perjadin_laporan_segmen_versi: riwayat pemulihan (F-4.1) ──────────
create table if not exists public.perjadin_laporan_segmen_versi (
  id            uuid primary key default gen_random_uuid(),
  segmen_id     uuid not null references public.perjadin_laporan_segmen(id) on delete cascade,
  isi           text not null,
  versi         integer not null,
  disimpan_oleh uuid references public.users(id),
  disimpan_pada timestamptz not null default now()
);
create index if not exists perjadin_segmen_versi_idx on public.perjadin_laporan_segmen_versi (segmen_id, versi desc);

alter table public.perjadin_laporan_segmen_versi enable row level security;
drop policy if exists "perjadin_segmen_versi baca"  on public.perjadin_laporan_segmen_versi;
drop policy if exists "perjadin_segmen_versi sisip" on public.perjadin_laporan_segmen_versi;
create policy "perjadin_segmen_versi baca" on public.perjadin_laporan_segmen_versi for select using (
  exists (select 1 from public.perjadin_laporan_segmen s
          join public.perjadin_laporan l on l.id = s.laporan_id
          where s.id = segmen_id and public.perjadin_boleh_lihat_penugasan(l.penugasan_id))
);
create policy "perjadin_segmen_versi sisip" on public.perjadin_laporan_segmen_versi for insert with check (
  exists (select 1 from public.perjadin_laporan_segmen s
          join public.perjadin_laporan l on l.id = s.laporan_id
          where s.id = segmen_id
            and (public.perjadin_anggota_penugasan(l.penugasan_id)
                 or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()))
);
