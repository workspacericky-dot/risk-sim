-- RALS v10 — Teknik Identifikasi Risiko: SWIFT Analysis (solo per peserta).
-- Jalankan di Supabase SQL editor (setelah v9).

-- ── 1. Sesi pemetaan proses — fokus Proses/Subproses Bisnis ────────────────
create table if not exists public.rals_swift_session (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.rals_session(id) on delete cascade,
  participant_id uuid not null references public.rals_participant(id) on delete cascade,
  l1_kode        text not null default '',
  l1_nama        text not null default '',
  l2_kode        text not null default '',
  l2_nama        text not null default '',
  created_at     timestamptz not null default now()
);

alter table public.rals_swift_session enable row level security;
create policy "authenticated read rals_swift_session"   on public.rals_swift_session for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_swift_session"  on public.rals_swift_session for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_swift_session" on public.rals_swift_session for delete using (auth.role() = 'authenticated');

-- ── 2. Langkah proses (node) — maksimal 10, ditegakkan di sisi klien ───────
create table if not exists public.rals_swift_node (
  id                uuid primary key default gen_random_uuid(),
  swift_session_id  uuid not null references public.rals_swift_session(id) on delete cascade,
  step_order        integer not null default 1,
  step_description  text not null default '',
  created_at        timestamptz not null default now()
);

alter table public.rals_swift_node enable row level security;
create policy "authenticated read rals_swift_node"   on public.rals_swift_node for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_swift_node"  on public.rals_swift_node for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_swift_node" on public.rals_swift_node for delete using (auth.role() = 'authenticated');

-- ── 3. Skenario what-if (efek domino) — draf sebelum dipromosikan ──────────
create table if not exists public.rals_swift_scenario (
  id                     uuid primary key default gen_random_uuid(),
  swift_session_id       uuid not null references public.rals_swift_session(id) on delete cascade,
  node_id                uuid references public.rals_swift_node(id) on delete cascade,
  session_id             uuid not null references public.rals_session(id) on delete cascade,
  participant_id         uuid not null references public.rals_participant(id) on delete cascade,
  generated_prompt       text not null default '',
  what_if_scenario       text not null default '',   -- Card 1: Trigger
  immediate_impact       text not null default '',   -- Card 2: Dampak Langsung
  final_outcome          text not null default '',   -- Card 3: Konsekuensi Lanjutan
  risk_priority          text not null default 'Low' check (risk_priority in ('Low','Med Low','Med High','High')),
  current_control        text not null default '',   -- wajib diisi jika prioritas Med High/High
  treatment_recommendation text not null default '', -- wajib diisi jika prioritas Med High/High
  kategori               text not null default '',   -- diisi belakangan saat promosi ke register
  promoted_risk_id       uuid references public.rals_risk(id) on delete set null,
  created_at             timestamptz not null default now()
);

alter table public.rals_swift_scenario enable row level security;
create policy "authenticated read rals_swift_scenario"   on public.rals_swift_scenario for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_swift_scenario"  on public.rals_swift_scenario for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_swift_scenario" on public.rals_swift_scenario for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_swift_scenario" on public.rals_swift_scenario for delete using (auth.role() = 'authenticated');

-- Catatan: tidak ditambahkan ke publication realtime — solo per peserta, tidak perlu live-sync.
