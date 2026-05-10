-- SMAP v2 migration — run in Supabase SQL Editor
-- Safe to run: uses IF NOT EXISTS / IF EXISTS guards

-- 1. Add 5 Whys columns to smap_risiko
alter table public.smap_risiko
  add column if not exists why1 text not null default '',
  add column if not exists why2 text not null default '',
  add column if not exists why3 text not null default '',
  add column if not exists why4 text not null default '',
  add column if not exists why5 text not null default '';

-- 2. Add efektif_level (text conclusion from questionnaire) to smap_evaluasi
alter table public.smap_evaluasi
  add column if not exists efektif_level text;
