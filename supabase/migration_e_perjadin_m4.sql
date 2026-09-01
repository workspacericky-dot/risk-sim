-- ============================================================
-- Migration: E-Perjadin Bawas — M4 (Biaya Riil & E-SPJ)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (F-3.1 … F-3.4, F-5.1 … F-5.4, AF-3/5/8/9/10, §8.2)
-- Prasyarat: migrasi M0, M1, M2, M3.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
-- ============================================================

-- ── perjadin_biaya: komponen biaya riil + bukti digital (F-3.1 … F-3.4) ─
create table if not exists public.perjadin_biaya (
  id                 uuid primary key default gen_random_uuid(),
  penugasan_id       uuid not null references public.perjadin_penugasan(id) on delete cascade,
  peserta_id         uuid not null references public.perjadin_peserta(id) on delete cascade,
  komponen           text not null,
  uraian             text not null default '',
  tanggal            date,
  jumlah_diajukan    bigint not null check (jumlah_diajukan >= 0),
  jumlah_diakui      bigint not null default 0,
  melebihi_sbm       boolean not null default false,     -- AF-5
  batas_sbm          bigint,
  alasan_pelaksana   text,
  disetujui_ppk      boolean not null default false,     -- pengakuan di atas SBM (F-3.2)
  tanpa_bukti        boolean not null default false,     -- Daftar Pengeluaran Riil (F-3.3)
  path_bukti         text,
  hash_bukti         text,                               -- SHA-256 (F-3.4)
  status_verifikasi  text not null default 'menunggu',
  catatan_verifikasi text,
  dikunci            boolean not null default false,      -- terkunci saat E-SPJ diajukan (F-5.1)
  dibuat_oleh        uuid not null references public.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint perjadin_biaya_komponen_chk check (komponen in ('transport', 'penginapan', 'transport_lokal', 'lainnya')),
  constraint perjadin_biaya_status_chk   check (status_verifikasi in ('menunggu', 'sesuai', 'perbaiki', 'tolak'))
);
create index if not exists perjadin_biaya_penugasan_idx on public.perjadin_biaya (penugasan_id);
create index if not exists perjadin_biaya_peserta_idx on public.perjadin_biaya (peserta_id);
create index if not exists perjadin_biaya_hash_idx on public.perjadin_biaya (hash_bukti) where hash_bukti is not null;

alter table public.perjadin_biaya enable row level security;
drop policy if exists "perjadin_biaya baca"  on public.perjadin_biaya;
drop policy if exists "perjadin_biaya tulis" on public.perjadin_biaya;
create policy "perjadin_biaya baca" on public.perjadin_biaya for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_biaya tulis" on public.perjadin_biaya for all using (
  public.perjadin_peserta_saya(peserta_id) or public.perjadin_peran_pengawas()
) with check (
  public.perjadin_peserta_saya(peserta_id) or public.perjadin_peran_pengawas()
);

-- ── perjadin_espj: header pertanggungjawaban per penugasan (F-5) ────────
create table if not exists public.perjadin_espj (
  id                            uuid primary key default gen_random_uuid(),
  penugasan_id                  uuid not null unique references public.perjadin_penugasan(id) on delete cascade,
  status                        text not null default 'draf',
  siklus_revisi                 integer not null default 0,
  catatan_pengembalian          text,
  daftar_pengeluaran_disetujui  boolean not null default false,
  diajukan_oleh    uuid references public.users(id),
  diajukan_pada    timestamptz,
  diverifikasi_oleh uuid references public.users(id),
  diverifikasi_pada timestamptz,
  disetujui_oleh   uuid references public.users(id),
  disetujui_pada   timestamptz,
  ditutup_oleh     uuid references public.users(id),
  ditutup_pada     timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint perjadin_espj_status_chk check (status in ('draf', 'diajukan', 'diverifikasi', 'dikembalikan', 'disetujui', 'selesai'))
);

alter table public.perjadin_espj enable row level security;
drop policy if exists "perjadin_espj baca"  on public.perjadin_espj;
drop policy if exists "perjadin_espj tulis" on public.perjadin_espj;
create policy "perjadin_espj baca" on public.perjadin_espj for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_espj tulis" on public.perjadin_espj for all using (
  public.perjadin_anggota_penugasan(penugasan_id) or public.perjadin_peran_pengawas()
) with check (
  public.perjadin_anggota_penugasan(penugasan_id) or public.perjadin_peran_pengawas()
);

-- ── perjadin_espj_peserta: baris penyelesaian per SPD (F-5.3) ──────────
create table if not exists public.perjadin_espj_peserta (
  id               uuid primary key default gen_random_uuid(),
  espj_id          uuid not null references public.perjadin_espj(id) on delete cascade,
  peserta_id       uuid not null references public.perjadin_peserta(id) on delete cascade,
  hak_sbm          bigint not null default 0,
  biaya_riil       bigint not null default 0,
  uang_muka        bigint not null default 0,
  selisih          bigint not null default 0,    -- hak_sbm (+ tambahan diakui) − uang_muka
  selisih_final    bigint,                       -- override PPK (F-5.2)
  status_bayar     text not null default 'menunggu',
  tanggal_bayar    date,
  bukti_bayar_path text,
  catatan_bayar    text,
  unique (espj_id, peserta_id),
  constraint perjadin_espj_peserta_bayar_chk check (status_bayar in ('menunggu', 'lunas'))
);
create index if not exists perjadin_espj_peserta_idx on public.perjadin_espj_peserta (espj_id);

alter table public.perjadin_espj_peserta enable row level security;
drop policy if exists "perjadin_espj_peserta baca"  on public.perjadin_espj_peserta;
drop policy if exists "perjadin_espj_peserta tulis" on public.perjadin_espj_peserta;
create policy "perjadin_espj_peserta baca" on public.perjadin_espj_peserta for select using (
  exists (select 1 from public.perjadin_espj e where e.id = espj_id
          and public.perjadin_boleh_lihat_penugasan(e.penugasan_id))
);
create policy "perjadin_espj_peserta tulis" on public.perjadin_espj_peserta for all using (
  public.perjadin_peran_pengawas()
) with check (
  public.perjadin_peran_pengawas()
);

-- ── Supabase Storage: bucket privat bukti biaya (§8.4) ────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'perjadin-bukti', 'perjadin-bukti', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do nothing;
