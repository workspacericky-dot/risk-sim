-- Sasaran dan Rencana Kerja SMAP (Form 4)
-- Run in Supabase SQL Editor

create table if not exists public.smap_sasaran (
  id                  uuid primary key default gen_random_uuid(),
  risiko_id           uuid not null references public.smap_risiko(id) on delete cascade,
  indikator_kinerja   text not null default '',
  sasaran_pencapaian  text not null default '100%',
  evaluasi_pelaporan  text not null default '',
  sanksi_hukuman      text not null default '',
  updated_at          timestamptz not null default now(),
  unique(risiko_id)
);

alter table public.smap_sasaran enable row level security;

create policy "authenticated all smap_sasaran"
  on public.smap_sasaran
  for all
  using (auth.role() = 'authenticated')
  with check (auth.role() = 'authenticated');
