-- RALS v16 — Tipe sesi: "terkontrol" (default, perilaku lama — instruktur
-- membuka tahap satu per satu) vs "mandiri" (peserta bebas berpindah tahap
-- sendiri, untuk latihan mandiri pasca-pelatihan tanpa instruktur aktif).
-- Jalankan di Supabase SQL editor (setelah v15).

alter table public.rals_session
  add column if not exists mode text not null default 'terkontrol'
  check (mode in ('terkontrol', 'mandiri'));

-- Tahap masing-masing peserta sendiri, hanya dipakai saat sesi bermode
-- 'mandiri' (sesi 'terkontrol' tetap memakai rals_session.tahap untuk semua).
alter table public.rals_participant
  add column if not exists tahap text not null default 'konteks';
