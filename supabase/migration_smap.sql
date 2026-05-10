-- SMAP (Sistem Manajemen Anti Penyuapan) tables
-- Run this migration in Supabase SQL editor

-- ── 1. Konteks SMAP ──────────────────────────────────────────────────────
create table if not exists public.smap_konteks (
  id                      uuid primary key default gen_random_uuid(),
  unit_kerja_id           uuid not null references public.unit_kerja(id) on delete cascade,
  tahun                   integer not null,
  nama_pemilik_risiko     text not null default '',
  jabatan_pemilik_risiko  text not null default '',
  created_at              timestamptz not null default now(),
  unique (unit_kerja_id, tahun)
);

alter table public.smap_konteks enable row level security;
create policy "authenticated read smap_konteks"  on public.smap_konteks for select  using (auth.role() = 'authenticated');
create policy "authenticated write smap_konteks" on public.smap_konteks for insert  with check (auth.role() = 'authenticated');
create policy "authenticated update smap_konteks" on public.smap_konteks for update using (auth.role() = 'authenticated');
create policy "authenticated delete smap_konteks" on public.smap_konteks for delete using (auth.role() = 'authenticated');

-- ── 2. Risiko SMAP (Form 1) ──────────────────────────────────────────────
create table if not exists public.smap_risiko (
  id                      uuid primary key default gen_random_uuid(),
  konteks_id              uuid not null references public.smap_konteks(id) on delete cascade,
  no_urut                 integer not null default 1,
  kegiatan_utama_kode     text not null default '',   -- L1 kode
  kegiatan_utama_nama     text not null default '',   -- L1 nama (denormalized for display)
  jenis_kegiatan_kode     text not null default '',   -- L2 kode
  jenis_kegiatan_nama     text not null default '',   -- L2 nama (denormalized for display)
  proses_kegiatan         text not null default '',   -- free text: tahapan pelaksanaan
  jenis_korupsi           text not null default '',   -- e.g. "Suap Menyuap"
  uraian_risiko_ref_id    text not null default '',   -- id dari SMAP_URAIAN_RISIKO konstanta
  uraian_risiko_final     text not null default '',   -- auto-generated sentence, editable
  penyebab                text not null default '',
  dampak                  text not null default '',
  risk_owner              text not null default '',
  created_at              timestamptz not null default now()
);

alter table public.smap_risiko enable row level security;
create policy "authenticated read smap_risiko"   on public.smap_risiko for select  using (auth.role() = 'authenticated');
create policy "authenticated write smap_risiko"  on public.smap_risiko for insert  with check (auth.role() = 'authenticated');
create policy "authenticated update smap_risiko" on public.smap_risiko for update  using (auth.role() = 'authenticated');
create policy "authenticated delete smap_risiko" on public.smap_risiko for delete  using (auth.role() = 'authenticated');

-- ── 3. Analisis SMAP (Form 2) ────────────────────────────────────────────
create table if not exists public.smap_analisis (
  id                      uuid primary key default gen_random_uuid(),
  risiko_id               uuid not null references public.smap_risiko(id) on delete cascade unique,
  -- Inherent Risk
  kemungkinan_inherent    integer check (kemungkinan_inherent between 1 and 5),
  dampak_inherent         integer check (dampak_inherent between 1 and 5),
  status_inherent         integer,   -- K × D
  -- Existing Risk
  kontrol_saat_ini        text not null default '',
  kemungkinan_existing    integer check (kemungkinan_existing between 1 and 5),
  dampak_existing         integer check (dampak_existing between 1 and 5),
  status_existing         integer,   -- K × D
  updated_at              timestamptz not null default now()
);

alter table public.smap_analisis enable row level security;
create policy "authenticated read smap_analisis"   on public.smap_analisis for select  using (auth.role() = 'authenticated');
create policy "authenticated write smap_analisis"  on public.smap_analisis for insert  with check (auth.role() = 'authenticated');
create policy "authenticated update smap_analisis" on public.smap_analisis for update  using (auth.role() = 'authenticated');
create policy "authenticated delete smap_analisis" on public.smap_analisis for delete  using (auth.role() = 'authenticated');

-- ── 4. Evaluasi SMAP (Form 3) ────────────────────────────────────────────
create table if not exists public.smap_evaluasi (
  id                      uuid primary key default gen_random_uuid(),
  risiko_id               uuid not null references public.smap_risiko(id) on delete cascade unique,
  uraian_penanganan       text not null default '',
  batas_waktu             date,
  pic                     text not null default '',
  efektif                 boolean,   -- true = Efektif, false = Tidak Efektif
  kemungkinan_residual    integer check (kemungkinan_residual between 1 and 5),
  dampak_residual         integer check (dampak_residual between 1 and 5),
  status_residual         integer,   -- K × D
  target_level            text,      -- "Sangat Rendah" | "Rendah" | "Moderat" | "Tinggi" | "Ekstrim"
  updated_at              timestamptz not null default now()
);

alter table public.smap_evaluasi enable row level security;
create policy "authenticated read smap_evaluasi"   on public.smap_evaluasi for select  using (auth.role() = 'authenticated');
create policy "authenticated write smap_evaluasi"  on public.smap_evaluasi for insert  with check (auth.role() = 'authenticated');
create policy "authenticated update smap_evaluasi" on public.smap_evaluasi for update  using (auth.role() = 'authenticated');
create policy "authenticated delete smap_evaluasi" on public.smap_evaluasi for delete  using (auth.role() = 'authenticated');
