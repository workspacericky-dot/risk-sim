-- Uji Publik Zona Integritas
-- Impor respons XLSX, hasil NLP, metrik risiko unit, dan jejak audit.

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

create table if not exists public.zi_analysis_config (
  id smallint primary key default 1 check (id = 1),
  low_rating_weight numeric(6,5) not null default 0.40 check (low_rating_weight between 0 and 1),
  high_risk_tag_weight numeric(6,5) not null default 0.35 check (high_risk_tag_weight between 0 and 1),
  negative_sentiment_weight numeric(6,5) not null default 0.25 check (negative_sentiment_weight between 0 and 1),
  high_risk_tags text[] not null default array['Integritas Pimpinan','Pungutan Liar','Gratifikasi','Suap'],
  model_name text not null default 'rule-based-id-v1',
  updated_by uuid references public.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (abs((low_rating_weight + high_risk_tag_weight + negative_sentiment_weight) - 1.0) < 0.00001)
);

insert into public.zi_analysis_config (id) values (1) on conflict (id) do nothing;

create table if not exists public.zi_import_batches (
  id uuid primary key default uuid_generate_v4(),
  nama_file text not null,
  file_hash text not null unique,
  source_sheet text not null,
  status text not null default 'diproses' check (status in ('diproses','menunggu_analisis','selesai','selesai_dengan_error','gagal')),
  total_baris integer not null default 0 check (total_baris >= 0),
  baris_valid integer not null default 0 check (baris_valid >= 0),
  baris_perlu_perbaikan integer not null default 0 check (baris_perlu_perbaikan >= 0),
  catatan text,
  imported_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.zi_responses (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid not null references public.zi_import_batches(id) on delete cascade,
  source_row integer not null check (source_row > 0),
  respondent_name text not null,
  respondent_hash text not null,
  age_group text not null,
  gender text not null check (gender in ('L','P')),
  occupation text not null,
  unit_kerja_id uuid references public.unit_kerja(id) on delete set null,
  unit_nama_raw text not null,
  source_tags text[] not null default '{}',
  opinion text not null,
  star_rating smallint not null check (star_rating between 1 and 5),
  dedupe_hash text not null unique,
  validation_warnings text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (batch_id, source_row)
);

create table if not exists public.zi_response_analysis (
  response_id uuid primary key references public.zi_responses(id) on delete cascade,
  status text not null default 'menunggu' check (status in ('menunggu','diproses','selesai','perlu_reviu','gagal')),
  sentiment_score numeric(7,6) check (sentiment_score between -1 and 1),
  sentiment_label text check (sentiment_label is null or sentiment_label in ('positif','netral','negatif')),
  mismatch boolean not null default false,
  mismatch_reason text,
  ai_tags text[] not null default '{}',
  high_risk_tags text[] not null default '{}',
  confidence numeric(6,5) check (confidence is null or confidence between 0 and 1),
  model_name text,
  model_version text,
  analyzed_at timestamptz,
  error_message text,
  updated_at timestamptz not null default now()
);

create table if not exists public.zi_analysis_runs (
  id uuid primary key default uuid_generate_v4(),
  batch_id uuid references public.zi_import_batches(id) on delete set null,
  status text not null default 'menunggu' check (status in ('menunggu','diproses','selesai','gagal')),
  model_name text not null,
  started_at timestamptz,
  completed_at timestamptz,
  total_responses integer not null default 0,
  processed_responses integer not null default 0,
  result_summary jsonb not null default '{}',
  error_message text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.zi_unit_metrics (
  id uuid primary key default uuid_generate_v4(),
  unit_kerja_id uuid not null references public.unit_kerja(id) on delete cascade,
  batch_id uuid references public.zi_import_batches(id) on delete cascade,
  sample_size integer not null check (sample_size >= 0),
  average_rating numeric(5,2) not null check (average_rating between 1 and 5),
  low_rating_pct numeric(7,4) not null check (low_rating_pct between 0 and 100),
  high_risk_tag_pct numeric(7,4) not null check (high_risk_tag_pct between 0 and 100),
  negative_sentiment_intensity numeric(7,4) not null check (negative_sentiment_intensity between 0 and 100),
  cri_score numeric(7,4) not null check (cri_score between 0 and 100),
  risk_level text not null check (risk_level in ('rendah','menengah','tinggi')),
  cluster_label text,
  breakdown jsonb not null default '{}',
  calculated_at timestamptz not null default now(),
  unique (unit_kerja_id, batch_id)
);

create table if not exists public.zi_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists zi_responses_batch_idx on public.zi_responses(batch_id, source_row);
create index if not exists zi_responses_unit_idx on public.zi_responses(unit_kerja_id, star_rating);
create index if not exists zi_responses_dimensions_idx on public.zi_responses(age_group, gender, occupation);
create index if not exists zi_response_analysis_mismatch_idx on public.zi_response_analysis(mismatch) where mismatch = true;
create index if not exists zi_unit_metrics_cri_idx on public.zi_unit_metrics(cri_score desc);

alter table public.zi_analysis_config enable row level security;
alter table public.zi_import_batches enable row level security;
alter table public.zi_responses enable row level security;
alter table public.zi_response_analysis enable row level security;
alter table public.zi_analysis_runs enable row level security;
alter table public.zi_unit_metrics enable row level security;
alter table public.zi_audit_log enable row level security;

do $$
declare table_name text;
begin
  foreach table_name in array array[
    'zi_analysis_config','zi_import_batches','zi_responses','zi_response_analysis',
    'zi_analysis_runs','zi_unit_metrics','zi_audit_log'
  ] loop
    execute format('drop policy if exists "zi evaluator access" on public.%I', table_name);
    execute format('create policy "zi evaluator access" on public.%I for all using (public.zi_can_access()) with check (public.zi_can_access())', table_name);
  end loop;
end $$;

revoke all on function public.zi_can_access() from public;
grant execute on function public.zi_can_access() to authenticated;
