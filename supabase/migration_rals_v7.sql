-- RALS v7 — Teknik Identifikasi Risiko: Structured Interview (solo per peserta).
-- Jalankan di Supabase SQL editor (setelah v6).

-- ── 1. Sesi wawancara — metadata narasumber & fokus (Proses/Subproses Bisnis) ──
create table if not exists public.rals_interview_session (
  id                 uuid primary key default gen_random_uuid(),
  session_id         uuid not null references public.rals_session(id) on delete cascade,
  participant_id     uuid not null references public.rals_participant(id) on delete cascade,
  narasumber_nama    text not null default '',
  narasumber_jabatan text not null default '',
  l1_kode            text not null default '',
  l1_nama            text not null default '',
  l2_kode            text not null default '',
  l2_nama            text not null default '',
  created_at         timestamptz not null default now()
);

alter table public.rals_interview_session enable row level security;
create policy "authenticated read rals_interview_session"   on public.rals_interview_session for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_interview_session"  on public.rals_interview_session for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_interview_session" on public.rals_interview_session for delete using (auth.role() = 'authenticated');

-- ── 2. Draf hasil analisis per pertanyaan — sebelum dipromosikan ke register ──
create table if not exists public.rals_interview_draft (
  id                 uuid primary key default gen_random_uuid(),
  interview_id       uuid not null references public.rals_interview_session(id) on delete cascade,
  session_id         uuid not null references public.rals_session(id) on delete cascade,
  participant_id     uuid not null references public.rals_participant(id) on delete cascade,
  pertanyaan         text not null default '',
  jawaban_narasumber text not null default '',
  pernyataan         text not null default '',
  kategori           text not null default '',
  penyebab           text not null default '',   -- rantai 5 Whys, dipisah " → "
  dampak             text not null default '',   -- potensi dampak terpilih, dipisah "; "
  ada_kontrol        boolean,
  catatan_kontrol    text not null default '',
  promoted_risk_id   uuid references public.rals_risk(id) on delete set null,
  created_at         timestamptz not null default now()
);

alter table public.rals_interview_draft enable row level security;
create policy "authenticated read rals_interview_draft"   on public.rals_interview_draft for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_interview_draft"  on public.rals_interview_draft for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_interview_draft" on public.rals_interview_draft for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_interview_draft" on public.rals_interview_draft for delete using (auth.role() = 'authenticated');

-- Catatan: tidak ditambahkan ke publication realtime — teknik ini solo per
-- peserta (bukan papan kolaboratif seperti Brainstorming), jadi tidak perlu live-sync.
