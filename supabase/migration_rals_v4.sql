-- RALS v4 — Teknik Identifikasi Risiko: Brainstorming (papan kolaboratif per sesi).
-- Jalankan di Supabase SQL editor (setelah v3).

-- ── 1. Ide mentah (Fase 1: Brain Dump) — anonim di papan, tapi tercatat penulisnya ──
create table if not exists public.rals_brainstorm_idea (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.rals_session(id) on delete cascade,
  participant_id uuid not null references public.rals_participant(id) on delete cascade,
  teks           text not null default '',
  created_at     timestamptz not null default now()
);

alter table public.rals_brainstorm_idea enable row level security;
create policy "authenticated read rals_brainstorm_idea"   on public.rals_brainstorm_idea for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_brainstorm_idea"  on public.rals_brainstorm_idea for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_brainstorm_idea" on public.rals_brainstorm_idea for delete using (auth.role() = 'authenticated');

-- ── 2. Upvote — satu suara per peserta per ide (toggle via delete) ──────────
create table if not exists public.rals_brainstorm_vote (
  id             uuid primary key default gen_random_uuid(),
  idea_id        uuid not null references public.rals_brainstorm_idea(id) on delete cascade,
  participant_id uuid not null references public.rals_participant(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (idea_id, participant_id)
);

alter table public.rals_brainstorm_vote enable row level security;
create policy "authenticated read rals_brainstorm_vote"   on public.rals_brainstorm_vote for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_brainstorm_vote"  on public.rals_brainstorm_vote for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_brainstorm_vote" on public.rals_brainstorm_vote for delete using (auth.role() = 'authenticated');

-- ── 3. Draf hasil penyulingan (Fase 2: Refinery) — sebelum dipromosikan ke register ──
create table if not exists public.rals_brainstorm_draft (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.rals_session(id) on delete cascade,
  participant_id    uuid not null references public.rals_participant(id) on delete cascade,
  idea_id           uuid references public.rals_brainstorm_idea(id) on delete set null,
  pernyataan        text not null default '',
  kategori          text not null default '',
  penyebab          text not null default '',   -- "Gara-gara..."
  dampak            text not null default '',   -- "Maka berakibat..."
  promoted_risk_id  uuid references public.rals_risk(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.rals_brainstorm_draft enable row level security;
create policy "authenticated read rals_brainstorm_draft"   on public.rals_brainstorm_draft for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_brainstorm_draft"  on public.rals_brainstorm_draft for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_brainstorm_draft" on public.rals_brainstorm_draft for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_brainstorm_draft" on public.rals_brainstorm_draft for delete using (auth.role() = 'authenticated');

-- ── 4. Realtime — papan ide & suara harus terasa hidup ──────────────────────
alter publication supabase_realtime add table public.rals_brainstorm_idea;
alter publication supabase_realtime add table public.rals_brainstorm_vote;
