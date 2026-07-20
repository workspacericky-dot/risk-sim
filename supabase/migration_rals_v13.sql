-- RALS v13 — Detail Pengendalian yang Ada pada Analisis Risiko:
-- control library SPIP 25 Subunsur + uraian + evidence keberadaan/kememadaian.
-- Jalankan di Supabase SQL editor (setelah v12).

alter table public.rals_analysis
  add column if not exists unsur_spip           text not null default '',
  add column if not exists subunsur_spip        text not null default '',
  add column if not exists uraian_pengendalian  text not null default '',
  add column if not exists evidence_keberadaan  text not null default '',
  add column if not exists evidence_kememadaian text not null default '';
