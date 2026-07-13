-- RALS v2 — model per-akun untuk peserta consulting.
-- Jalankan di Supabase SQL editor (setelah migration_rals.sql).

-- Kaitkan peserta ke akun pengguna, agar bisa lanjut di perangkat mana pun.
alter table public.rals_participant
  add column if not exists user_id uuid references public.users(id) on delete cascade;

-- Satu peserta = satu baris per sesi.
create unique index if not exists rals_participant_session_user_uniq
  on public.rals_participant(session_id, user_id);

-- Ganti istilah role: diklat → consulting.
update public.users set role = 'peserta_consulting' where role = 'peserta_diklat';
