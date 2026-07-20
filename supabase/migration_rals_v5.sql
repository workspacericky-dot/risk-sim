-- RALS v5 — hashtag proses bisnis pada ide Brainstorming.
-- Jalankan di Supabase SQL editor (setelah v4).

alter table public.rals_brainstorm_idea
  add column if not exists l1_kode text not null default '',
  add column if not exists l1_nama text not null default '',
  add column if not exists l2_kode text not null default '',
  add column if not exists l2_nama text not null default '';
