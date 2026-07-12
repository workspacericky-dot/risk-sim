-- RALS — Risk Assessment Live Simulator (modul diklat, khusus edukasi)
-- Jalankan migrasi ini di Supabase SQL editor.
-- Terpisah total dari tabel MR produksi (prefix rals_).

-- ── 1. Sesi diklat ────────────────────────────────────────────────────────
create table if not exists public.rals_session (
  id           uuid primary key default gen_random_uuid(),
  kode         text not null unique,                 -- 6 karakter, dibagikan ke peserta
  judul        text not null default '',
  scenario_id  text not null default '',             -- id dari RALS_SCENARIOS (konstanta)
  tahap        text not null default 'lobby',        -- lobby|identifikasi|analisis|evaluasi|selesai
  created_by   uuid references public.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

alter table public.rals_session enable row level security;
create policy "authenticated read rals_session"   on public.rals_session for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_session"  on public.rals_session for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_session"  on public.rals_session for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_session"  on public.rals_session for delete using (auth.role() = 'authenticated');

-- ── 2. Peserta (identitas per-perangkat, tanpa akun sendiri) ──────────────
create table if not exists public.rals_participant (
  id           uuid primary key default gen_random_uuid(),
  session_id   uuid not null references public.rals_session(id) on delete cascade,
  nama         text not null default '',
  created_at   timestamptz not null default now()
);

alter table public.rals_participant enable row level security;
create policy "authenticated read rals_participant"   on public.rals_participant for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_participant"  on public.rals_participant for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_participant"  on public.rals_participant for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_participant"  on public.rals_participant for delete using (auth.role() = 'authenticated');

-- ── 3. Risiko hasil identifikasi peserta ──────────────────────────────────
create table if not exists public.rals_risk (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.rals_session(id) on delete cascade,
  participant_id uuid not null references public.rals_participant(id) on delete cascade,
  kode           text not null default '',
  pernyataan     text not null default '',
  kategori       text not null default '',   -- label kategori (risk-engine)
  dampak_uraian  text not null default '',
  penyebab       text not null default '',
  created_at     timestamptz not null default now()
);

alter table public.rals_risk enable row level security;
create policy "authenticated read rals_risk"   on public.rals_risk for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_risk"  on public.rals_risk for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_risk"  on public.rals_risk for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_risk"  on public.rals_risk for delete using (auth.role() = 'authenticated');

-- ── 4. Analisis risiko (melekat → residu) ─────────────────────────────────
create table if not exists public.rals_analysis (
  id                    uuid primary key default gen_random_uuid(),
  risk_id               uuid not null references public.rals_risk(id) on delete cascade unique,
  k_inheren             integer check (k_inheren between 1 and 5),
  d_inheren             integer check (d_inheren between 1 and 5),
  ada_pengendalian      boolean,
  pengendalian_memadai  boolean,
  k_residu              integer check (k_residu between 1 and 5),
  d_residu              integer check (d_residu between 1 and 5),
  updated_at            timestamptz not null default now()
);

alter table public.rals_analysis enable row level security;
create policy "authenticated read rals_analysis"   on public.rals_analysis for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_analysis"  on public.rals_analysis for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_analysis"  on public.rals_analysis for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_analysis"  on public.rals_analysis for delete using (auth.role() = 'authenticated');

-- ── 5. Realtime — dashboard instruktur & auto-navigasi peserta ────────────
alter publication supabase_realtime add table public.rals_session;
alter publication supabase_realtime add table public.rals_participant;
alter publication supabase_realtime add table public.rals_risk;
alter publication supabase_realtime add table public.rals_analysis;
