-- Ruang kerja Wawancara Zona Integritas.
-- Snapshot JSONB menjaga autosave atomik saat evaluator berpindah antarpertanyaan.

create extension if not exists "uuid-ossp";

create or replace function public.zi_can_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.users
    where id = auth.uid()
      and status_aktif = true
      and role in ('admin_sistem', 'evaluator_apip')
  )
$$;

revoke all on function public.zi_can_access() from public;
grant execute on function public.zi_can_access() to authenticated;

create table if not exists public.zi_interview_sessions (
  id uuid primary key default uuid_generate_v4(),
  unit_name text not null check (length(trim(unit_name)) >= 3),
  court_type text,
  interview_date date,
  candidate_stage text,
  kke_number text,
  team_name text not null default 'TIM 4',
  secretary_name text,
  status text not null default 'persiapan'
    check (status in ('persiapan','berlangsung','rekonsiliasi','selesai')),
  snapshot jsonb not null default '{"version":1,"metadata":{},"preparation":{},"responses":{},"reconciliation":{},"timer":{"secondsRemaining":5400}}'::jsonb,
  created_by uuid not null references public.users(id) on delete restrict,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists zi_interview_sessions_status_idx
  on public.zi_interview_sessions(status, interview_date desc, updated_at desc);
create index if not exists zi_interview_sessions_unit_idx
  on public.zi_interview_sessions(lower(unit_name));

alter table public.zi_interview_sessions enable row level security;

drop policy if exists "zi interview evaluator access" on public.zi_interview_sessions;
create policy "zi interview evaluator access"
  on public.zi_interview_sessions
  for all
  using (public.zi_can_access())
  with check (public.zi_can_access());

comment on table public.zi_interview_sessions is
  'Sesi, catatan persiapan, respons, probing, bukti, penilaian, dan rekonsiliasi Wawancara ZI.';
