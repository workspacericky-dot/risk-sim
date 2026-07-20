-- RALS v11 — Teknik Identifikasi Risiko: Bowtie Analysis (solo per peserta).
-- Struktur graf: Top Event ← Ancaman (+ barrier pencegahan) | Dampak (+ barrier pemulihan) → dengan faktor eskalasi.
-- Jalankan di Supabase SQL editor (setelah v10).

-- ── 1. Top Event (jangkar diagram) + fokus proses bisnis ───────────────────
create table if not exists public.rals_bowtie (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references public.rals_session(id) on delete cascade,
  participant_id    uuid not null references public.rals_participant(id) on delete cascade,
  l1_kode           text not null default '',
  l1_nama           text not null default '',
  l2_kode           text not null default '',
  l2_nama           text not null default '',
  top_event         text not null default '',
  kategori          text not null default '',
  promoted_risk_id  uuid references public.rals_risk(id) on delete set null,
  created_at        timestamptz not null default now()
);

alter table public.rals_bowtie enable row level security;
create policy "authenticated read rals_bowtie"   on public.rals_bowtie for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_bowtie"  on public.rals_bowtie for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_bowtie" on public.rals_bowtie for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_bowtie" on public.rals_bowtie for delete using (auth.role() = 'authenticated');

-- ── 2. Elemen: Ancaman (kiri) atau Dampak (kanan) ──────────────────────────
create table if not exists public.rals_bowtie_element (
  id         uuid primary key default gen_random_uuid(),
  bowtie_id  uuid not null references public.rals_bowtie(id) on delete cascade,
  tipe       text not null check (tipe in ('THREAT','CONSEQUENCE')),
  deskripsi  text not null default '',
  created_at timestamptz not null default now()
);

alter table public.rals_bowtie_element enable row level security;
create policy "authenticated read rals_bowtie_element"   on public.rals_bowtie_element for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_bowtie_element"  on public.rals_bowtie_element for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_bowtie_element" on public.rals_bowtie_element for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_bowtie_element" on public.rals_bowtie_element for delete using (auth.role() = 'authenticated');

-- ── 3. Barrier (perisai): pencegahan pada Ancaman, pemulihan pada Dampak ───
create table if not exists public.rals_bowtie_barrier (
  id           uuid primary key default gen_random_uuid(),
  element_id   uuid not null references public.rals_bowtie_element(id) on delete cascade,
  deskripsi    text not null default '',
  efektivitas  text not null default 'Memadai' check (efektivitas in ('Memadai','Kurang Memadai')),
  created_at   timestamptz not null default now()
);

alter table public.rals_bowtie_barrier enable row level security;
create policy "authenticated read rals_bowtie_barrier"   on public.rals_bowtie_barrier for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_bowtie_barrier"  on public.rals_bowtie_barrier for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_bowtie_barrier" on public.rals_bowtie_barrier for update using (auth.role() = 'authenticated');
create policy "authenticated delete rals_bowtie_barrier" on public.rals_bowtie_barrier for delete using (auth.role() = 'authenticated');

-- ── 4. Faktor Eskalasi (retakan pada perisai) + rekomendasi tindak lanjut ──
create table if not exists public.rals_bowtie_escalation (
  id           uuid primary key default gen_random_uuid(),
  barrier_id   uuid not null references public.rals_bowtie_barrier(id) on delete cascade,
  faktor       text not null default '',
  rekomendasi  text not null default '',
  created_at   timestamptz not null default now()
);

alter table public.rals_bowtie_escalation enable row level security;
create policy "authenticated read rals_bowtie_escalation"   on public.rals_bowtie_escalation for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_bowtie_escalation"  on public.rals_bowtie_escalation for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete rals_bowtie_escalation" on public.rals_bowtie_escalation for delete using (auth.role() = 'authenticated');

-- Catatan: tidak ditambahkan ke publication realtime — solo per peserta.
