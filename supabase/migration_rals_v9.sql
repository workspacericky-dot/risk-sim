-- RALS v9 — tambah estimasi Kemungkinan pada Putaran 2 Delphi (selain Dampak/severitas).
-- Jalankan di Supabase SQL editor (setelah v8).

alter table public.rals_delphi_response
  add column if not exists kemungkinan integer check (kemungkinan between 1 and 5);
