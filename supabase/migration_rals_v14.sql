-- RALS v14 — Selera Risiko per sesi, ditetapkan instruktur (mirip modul
-- Selera Risiko utama), menggantikan DEFAULT_SELERA statis di tahap Evaluasi.
-- Jalankan di Supabase SQL editor (setelah v13).

create table if not exists public.rals_selera_risiko (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.rals_session(id) on delete cascade unique,
  strategis    integer not null default 9,
  kebijakan    integer not null default 9,
  kecurangan   integer not null default 4,
  bencana      integer not null default 9,
  kepatuhan    integer not null default 9,
  operasional  integer not null default 9,
  kemitraan    integer not null default 9,
  catatan      text not null default '',
  updated_at   timestamptz not null default now()
);

alter table public.rals_selera_risiko enable row level security;
create policy "authenticated read rals_selera_risiko"   on public.rals_selera_risiko for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_selera_risiko"  on public.rals_selera_risiko for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_selera_risiko" on public.rals_selera_risiko for update using (auth.role() = 'authenticated');
