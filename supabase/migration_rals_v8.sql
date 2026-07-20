-- RALS v8 — Teknik Identifikasi Risiko: Delphi Technique.
-- Instruktur = Fasilitator (kontrol putaran), semua peserta sesi = Panel Pakar anonim.
-- Jalankan di Supabase SQL editor (setelah v7).

-- ── 1. Topik Delphi — dibuat & dikendalikan instruktur ──────────────────────
create table if not exists public.rals_delphi_topic (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.rals_session(id) on delete cascade,
  pertanyaan            text not null default '',   -- skenario/pertanyaan strategis Putaran 1
  ronde                 text not null default 'eksplorasi', -- eksplorasi|konvergensi|selesai
  ringkasan_fasilitator text not null default '',   -- sintesis fasilitator untuk Putaran 2
  rumusan_penyebab      text not null default '',   -- konsensus final: Sebab
  rumusan_pernyataan    text not null default '',   -- konsensus final: Kejadian
  rumusan_dampak        text not null default '',   -- konsensus final: Dampak
  rumusan_kategori      text not null default '',
  created_by            uuid references public.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

alter table public.rals_delphi_topic enable row level security;
create policy "authenticated read rals_delphi_topic"   on public.rals_delphi_topic for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_delphi_topic"  on public.rals_delphi_topic for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_delphi_topic" on public.rals_delphi_topic for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_delphi_topic" on public.rals_delphi_topic for delete using (auth.role() = 'authenticated');

-- ── 2. Respons pakar — anonim (tidak pernah ditampilkan ke siapa pun) ───────
create table if not exists public.rals_delphi_response (
  id              uuid primary key default gen_random_uuid(),
  topic_id        uuid not null references public.rals_delphi_topic(id) on delete cascade,
  participant_id  uuid not null references public.rals_participant(id) on delete cascade,
  ronde           text not null,               -- eksplorasi|konvergensi
  opini           text not null default '',    -- Putaran 1: opini bebas
  konsensus_skor  integer check (konsensus_skor between 1 and 5), -- Putaran 2: slider setuju/tidak
  severitas       integer check (severitas between 1 and 5),      -- Putaran 2: estimasi dampak
  revisi          text not null default '',    -- Putaran 2: catatan revisi (opsional)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (topic_id, participant_id, ronde)
);

alter table public.rals_delphi_response enable row level security;
create policy "authenticated read rals_delphi_response"   on public.rals_delphi_response for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_delphi_response"  on public.rals_delphi_response for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_delphi_response" on public.rals_delphi_response for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_delphi_response" on public.rals_delphi_response for delete using (auth.role() = 'authenticated');

-- ── 3. Pelacakan "sudah ditambahkan ke register" per peserta ────────────────
create table if not exists public.rals_delphi_promotion (
  id             uuid primary key default gen_random_uuid(),
  topic_id       uuid not null references public.rals_delphi_topic(id) on delete cascade,
  participant_id uuid not null references public.rals_participant(id) on delete cascade,
  risk_id        uuid references public.rals_risk(id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (topic_id, participant_id)
);

alter table public.rals_delphi_promotion enable row level security;
create policy "authenticated read rals_delphi_promotion"  on public.rals_delphi_promotion for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_delphi_promotion" on public.rals_delphi_promotion for insert with check (auth.role() = 'authenticated');

-- ── 4. Realtime — putaran & respons harus terasa hidup di kedua sisi ────────
alter publication supabase_realtime add table public.rals_delphi_topic;
alter publication supabase_realtime add table public.rals_delphi_response;
