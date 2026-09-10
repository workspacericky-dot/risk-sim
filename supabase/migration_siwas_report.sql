-- Konfigurasi gerbang PIN untuk Laporan Analisis SIWAS.
-- Nilai PIN tidak pernah disimpan; hanya salt dan hash scrypt yang tersimpan.
create table if not exists public.siwas_report_settings (
  report_key text primary key,
  pin_salt text not null,
  pin_hash text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.users(id) on delete set null
);

alter table public.siwas_report_settings enable row level security;

-- Aplikasi mengakses tabel ini hanya melalui service role di server.
revoke all on table public.siwas_report_settings from anon, authenticated;

comment on table public.siwas_report_settings is
  'Hash PIN server-side untuk membuka laporan SIWAS; tidak berisi PIN mentah.';
