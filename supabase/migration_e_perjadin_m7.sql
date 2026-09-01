-- ============================================================
-- Migration: E-Perjadin Bawas — M7 (pelunasan backlog)
-- Prasyarat: migrasi M0 … M6 (+ m6_seed).
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--   1) berkas ST alur Rampung   2) idempotency antrean presensi luring
-- ============================================================

-- ── Alur Rampung: berkas Surat Tugas eksternal ─────────────────────────
alter table public.perjadin_penugasan
  add column if not exists st_rampung_path text;

-- Bucket privat untuk berkas ST eksternal (unggah & signed URL via service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('perjadin-dokumen', 'perjadin-dokumen', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- ── Idempotency titik presensi luring (F-2.6) ─────────────────────────
alter table public.perjadin_presensi
  add column if not exists idempotency_key text;
create unique index if not exists perjadin_presensi_idem_idx
  on public.perjadin_presensi (idempotency_key) where idempotency_key is not null;
