-- RALS v3 — penetapan konteks pindah ke peserta.
-- Jalankan di Supabase SQL editor (setelah v2).

-- Konteks per-peserta: proses/subproses bisnis + pemangku kepentingan (JSON).
alter table public.rals_participant
  add column if not exists konteks text;
