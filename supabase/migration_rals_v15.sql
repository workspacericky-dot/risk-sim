-- RALS v15 — Tahap Penanganan Risiko (mirip modul Rencana Tindak
-- Pengendalian utama), muncul setelah Evaluasi untuk risiko prioritas.
-- Jalankan di Supabase SQL editor (setelah v14).

create table if not exists public.rals_treatment (
  id                    uuid primary key default gen_random_uuid(),
  risk_id               uuid not null references public.rals_risk(id) on delete cascade unique,
  session_id            uuid not null references public.rals_session(id) on delete cascade,
  participant_id        uuid not null references public.rals_participant(id) on delete cascade,
  kegiatan_pengendalian text not null default '',
  unsur_spip            text not null default '',
  subunsur_spip         text not null default '',
  penanggung_jawab      text not null default '',
  indikator_keluaran    text not null default '',
  target_waktu          text not null default '',
  frekuensi_rencana     integer check (frekuensi_rencana between 1 and 5),
  dampak_rencana        integer check (dampak_rencana between 1 and 5),
  updated_at            timestamptz not null default now()
);

alter table public.rals_treatment enable row level security;
create policy "authenticated read rals_treatment"   on public.rals_treatment for select using (auth.role() = 'authenticated');
create policy "authenticated write rals_treatment"  on public.rals_treatment for insert with check (auth.role() = 'authenticated');
create policy "authenticated update rals_treatment" on public.rals_treatment for update using (auth.role() = 'authenticated');
