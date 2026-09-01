-- ============================================================
-- Migration: E-Perjadin Bawas — M1 (Perencanaan & Penerbitan ST/SPD)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (F-1.1 … F-1.5, AF-1, AF-2, AF-6, §8.2)
-- Prasyarat: migration_e_perjadin.sql (M0) sudah dijalankan.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--
-- Catatan RLS: kebijakan di bawah berbasis peran perjadin (bukan pola
-- `authenticated` menyeluruh). Sesuai PRD R-5, seluruh kebijakan RLS modul
-- ini ditinjau tersendiri sebelum M4. Aturan transisi status & SoD ditegakkan
-- di server action; RLS hanya membatasi jangkauan baca/tulis per peran.
--
-- Struktur berkas: (1) helper peran, (2) semua CREATE TABLE + enable RLS,
-- (3) helper visibilitas penugasan, (4) semua kebijakan RLS. Urutan ini perlu
-- karena helper (3) merujuk tabel yang dibuat di (2).
-- ============================================================

-- ══ 1. Helper peran ═══════════════════════════════════════════════════════
create or replace function public.perjadin_has_role(p text)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.perjadin_peran
    where user_id = auth.uid() and peran = p and aktif
  )
$$;

-- "peran pengawas/keuangan": melihat seluruh penugasan (PRD §8.4).
create or replace function public.perjadin_peran_pengawas()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.perjadin_is_admin() or exists (
    select 1 from public.perjadin_peran
    where user_id = auth.uid() and aktif and peran in (
      'pengelola_kegiatan', 'pemberi_tugas', 'staf_ppk', 'ppk', 'ppspm',
      'bendahara', 'auditor_perjadin'
    )
  )
$$;

-- ══ 2. Tabel ═════════════════════════════════════════════════════════════

-- Penomoran dokumen otomatis per tahun (F-1.4).
create table if not exists public.perjadin_counter (
  kunci  text primary key,
  nilai  integer not null default 0
);
alter table public.perjadin_counter enable row level security;
-- Tidak ada policy: hanya diakses lewat fungsi security definer di bawah.

create or replace function public.perjadin_next_nomor(p_jenis text, p_tahun integer)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  v_nilai integer;
begin
  insert into public.perjadin_counter (kunci, nilai)
  values (p_jenis || ':' || p_tahun, 1)
  on conflict (kunci) do update set nilai = public.perjadin_counter.nilai + 1
  returning nilai into v_nilai;
  return v_nilai;
end
$$;

-- Header Surat Tugas.
create table if not exists public.perjadin_penugasan (
  id                uuid primary key default gen_random_uuid(),
  nomor             text unique,                       -- null hingga ST terbit
  jenis_alur        text not null default 'Non-Rampung',
  jenis_dinas       text not null default 'Luar Kota',
  maksud            text not null,
  unit_tujuan_id    uuid references public.unit_kerja(id) on delete restrict,
  provinsi          text not null,                     -- acuan lookup SBM (F-1.2)
  pka_id            uuid,                              -- tautan opsional (F-1.1); FK bersyarat di bawah
  tanggal_berangkat date not null,
  tanggal_kembali   date not null,
  tahun_anggaran    integer not null,
  uang_muka_persen  integer not null default 0,
  status            text not null default 'Draf',
  alasan_batal      text,
  dibuat_oleh       uuid not null references public.users(id),
  disetujui_oleh    uuid references public.users(id),
  disetujui_pada    timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint perjadin_penugasan_tanggal_chk check (tanggal_kembali >= tanggal_berangkat),
  constraint perjadin_penugasan_alur_chk    check (jenis_alur in ('Non-Rampung', 'Rampung')),
  constraint perjadin_penugasan_dinas_chk   check (jenis_dinas in ('Luar Kota', 'Dalam Kota > Ambang', 'Dalam Kota <= Ambang')),
  constraint perjadin_penugasan_um_chk      check (uang_muka_persen in (0, 50, 100)),
  constraint perjadin_penugasan_status_chk  check (status in ('Draf', 'Menunggu Persetujuan', 'Berjalan', 'Selesai', 'Dibatalkan'))
);
create index if not exists perjadin_penugasan_status_idx on public.perjadin_penugasan (status);
create index if not exists perjadin_penugasan_pembuat_idx on public.perjadin_penugasan (dibuat_oleh);
alter table public.perjadin_penugasan enable row level security;

-- pka_id: FK ke program_kerja_audit hanya dipasang bila tabel itu ada di basis
-- data ini (belum tentu — lihat migration_program_kerja_audit.sql). Tautan PKA
-- bersifat opsional (F-1.1), jadi ketiadaan tabel tidak boleh menggagalkan migrasi.
do $$
begin
  if to_regclass('public.program_kerja_audit') is not null
     and not exists (select 1 from pg_constraint where conname = 'perjadin_penugasan_pka_fk')
  then
    alter table public.perjadin_penugasan
      add constraint perjadin_penugasan_pka_fk
      foreign key (pka_id) references public.program_kerja_audit(id) on delete set null;
  end if;
end $$;

-- Peserta (satu baris = satu SPD).
create table if not exists public.perjadin_peserta (
  id                 uuid primary key default gen_random_uuid(),
  penugasan_id       uuid not null references public.perjadin_penugasan(id) on delete cascade,
  user_id            uuid references public.users(id) on delete set null,   -- null utk peserta eksternal
  nama               text not null,
  nip                text,
  jabatan            text,
  peran_tim          text not null,
  tingkat_biaya      text not null,
  berhak_representasi boolean not null default false,
  eksternal          boolean not null default false,
  estimasi_rincian   jsonb not null default '[]'::jsonb,  -- snapshot BarisHak[] saat kalkulasi
  estimasi_total     bigint not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint perjadin_peserta_peran_chk check (peran_tim in ('Pengendali Mutu', 'Pengendali Teknis', 'Ketua Tim', 'Anggota Tim'))
);
create index if not exists perjadin_peserta_penugasan_idx on public.perjadin_peserta (penugasan_id);
create index if not exists perjadin_peserta_user_idx on public.perjadin_peserta (user_id) where user_id is not null;
alter table public.perjadin_peserta enable row level security;

-- Pemetaan penugasan → mata anggaran (F-1.3).
create table if not exists public.perjadin_penugasan_pagu (
  id            uuid primary key default gen_random_uuid(),
  penugasan_id  uuid not null references public.perjadin_penugasan(id) on delete cascade,
  pagu_id       uuid not null references public.perjadin_pagu(id) on delete restrict,
  urutan        integer not null default 0,
  unique (penugasan_id, pagu_id)
);
create index if not exists perjadin_penugasan_pagu_idx on public.perjadin_penugasan_pagu (penugasan_id);
alter table public.perjadin_penugasan_pagu enable row level security;

-- Buku besar pemesanan/pelepasan pagu (F-1.3, §8.2). Append-only.
create table if not exists public.perjadin_komitmen (
  id            uuid primary key default gen_random_uuid(),
  pagu_id       uuid not null references public.perjadin_pagu(id) on delete restrict,
  penugasan_id  uuid not null references public.perjadin_penugasan(id) on delete cascade,
  jenis         text not null,                         -- 'pesan' | 'lepas'
  jumlah        bigint not null check (jumlah >= 0),   -- rupiah bulat
  keterangan    text not null default '',
  dibuat_oleh   uuid references public.users(id),
  created_at    timestamptz not null default now(),
  constraint perjadin_komitmen_jenis_chk check (jenis in ('pesan', 'lepas'))
);
create index if not exists perjadin_komitmen_pagu_idx on public.perjadin_komitmen (pagu_id);
create index if not exists perjadin_komitmen_penugasan_idx on public.perjadin_komitmen (penugasan_id);
alter table public.perjadin_komitmen enable row level security;

-- ST & SPD terbit (F-1.4, F-4.3). Tidak dapat dihapus/diubah.
create table if not exists public.perjadin_dokumen (
  id                uuid primary key default gen_random_uuid(),
  penugasan_id      uuid not null references public.perjadin_penugasan(id) on delete cascade,
  peserta_id        uuid references public.perjadin_peserta(id) on delete cascade,  -- diisi utk SPD
  jenis             text not null,
  nomor             text not null,
  token_qr          text not null unique,
  diterbitkan_pada  timestamptz not null default now(),
  diterbitkan_oleh  uuid references public.users(id),
  constraint perjadin_dokumen_jenis_chk check (jenis in ('ST', 'SPD'))
);
create index if not exists perjadin_dokumen_penugasan_idx on public.perjadin_dokumen (penugasan_id);
alter table public.perjadin_dokumen enable row level security;

-- Hasil Anti-Fraud Engine (F-6.2, §8.6).
create table if not exists public.perjadin_temuan (
  id            uuid primary key default gen_random_uuid(),
  penugasan_id  uuid references public.perjadin_penugasan(id) on delete cascade,
  peserta_id    uuid references public.perjadin_peserta(id) on delete set null,
  kode          text not null,                         -- 'AF-1' … 'AF-10'
  keparahan     text not null,                         -- 'blocking' | 'warning' | 'informational'
  ringkasan     text not null,
  status        text not null default 'terbuka',       -- 'terbuka' | 'diputus'
  keputusan     text,
  alasan        text,
  diputus_oleh  uuid references public.users(id),
  diputus_pada  timestamptz,
  created_at    timestamptz not null default now(),
  constraint perjadin_temuan_keparahan_chk check (keparahan in ('blocking', 'warning', 'informational')),
  constraint perjadin_temuan_status_chk    check (status in ('terbuka', 'diputus'))
);
create index if not exists perjadin_temuan_penugasan_idx on public.perjadin_temuan (penugasan_id);
create index if not exists perjadin_temuan_status_idx on public.perjadin_temuan (status);
alter table public.perjadin_temuan enable row level security;

-- ══ 3. Helper visibilitas (butuh tabel di atas) ══════════════════════════
-- security definer → subquery di dalamnya menembus RLS, sehingga kebijakan
-- perjadin_penugasan & perjadin_peserta tidak saling memicu rekursi.
create or replace function public.perjadin_boleh_lihat_penugasan(p_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.perjadin_peran_pengawas()
    or exists (select 1 from public.perjadin_penugasan where id = p_id and dibuat_oleh = auth.uid())
    or exists (select 1 from public.perjadin_peserta where penugasan_id = p_id and user_id = auth.uid())
$$;

-- ══ 4. Kebijakan RLS ═════════════════════════════════════════════════════

-- perjadin_penugasan — pelaksana hanya melihat penugasan yang memuat dirinya.
drop policy if exists "perjadin_penugasan baca"  on public.perjadin_penugasan;
drop policy if exists "perjadin_penugasan tulis" on public.perjadin_penugasan;
drop policy if exists "perjadin_penugasan ubah"  on public.perjadin_penugasan;
drop policy if exists "perjadin_penugasan hapus" on public.perjadin_penugasan;
create policy "perjadin_penugasan baca" on public.perjadin_penugasan for select using (
  public.perjadin_boleh_lihat_penugasan(id)
);
create policy "perjadin_penugasan tulis" on public.perjadin_penugasan for insert with check (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
);
create policy "perjadin_penugasan ubah" on public.perjadin_penugasan for update using (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_has_role('ppk') or public.perjadin_is_admin()
);
-- Hanya draf yang boleh dihapus — ST terbit hanya dibatalkan (F-1.4).
create policy "perjadin_penugasan hapus" on public.perjadin_penugasan for delete using (
  (public.perjadin_is_admin() or dibuat_oleh = auth.uid()) and status = 'Draf'
);

-- perjadin_peserta
drop policy if exists "perjadin_peserta baca"  on public.perjadin_peserta;
drop policy if exists "perjadin_peserta tulis" on public.perjadin_peserta;
create policy "perjadin_peserta baca" on public.perjadin_peserta for select using (
  user_id = auth.uid() or public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_peserta tulis" on public.perjadin_peserta for all using (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
) with check (
  public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
);

-- perjadin_penugasan_pagu
drop policy if exists "perjadin_penugasan_pagu baca"  on public.perjadin_penugasan_pagu;
drop policy if exists "perjadin_penugasan_pagu tulis" on public.perjadin_penugasan_pagu;
create policy "perjadin_penugasan_pagu baca" on public.perjadin_penugasan_pagu for select using (
  public.perjadin_peran_pengawas()
);
create policy "perjadin_penugasan_pagu tulis" on public.perjadin_penugasan_pagu for all using (
  public.perjadin_has_role('staf_ppk') or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
) with check (
  public.perjadin_has_role('staf_ppk') or public.perjadin_has_role('pengelola_kegiatan') or public.perjadin_is_admin()
);

-- perjadin_komitmen — append-only: hanya select + insert.
drop policy if exists "perjadin_komitmen baca"  on public.perjadin_komitmen;
drop policy if exists "perjadin_komitmen sisip" on public.perjadin_komitmen;
create policy "perjadin_komitmen baca" on public.perjadin_komitmen for select using (
  public.perjadin_peran_pengawas()
);
create policy "perjadin_komitmen sisip" on public.perjadin_komitmen for insert with check (
  (public.perjadin_has_role('ppk') or public.perjadin_is_admin()) and dibuat_oleh = auth.uid()
);

-- perjadin_dokumen — tidak dapat dihapus/diubah: hanya select + insert.
drop policy if exists "perjadin_dokumen baca"  on public.perjadin_dokumen;
drop policy if exists "perjadin_dokumen sisip" on public.perjadin_dokumen;
create policy "perjadin_dokumen baca" on public.perjadin_dokumen for select using (
  public.perjadin_boleh_lihat_penugasan(penugasan_id)
);
create policy "perjadin_dokumen sisip" on public.perjadin_dokumen for insert with check (
  public.perjadin_has_role('ppk') or public.perjadin_is_admin()
);

-- perjadin_temuan — keputusan hanya oleh PPK (Lampiran B RACI).
drop policy if exists "perjadin_temuan baca"  on public.perjadin_temuan;
drop policy if exists "perjadin_temuan sisip" on public.perjadin_temuan;
drop policy if exists "perjadin_temuan putus" on public.perjadin_temuan;
create policy "perjadin_temuan baca" on public.perjadin_temuan for select using (
  public.perjadin_peran_pengawas()
);
create policy "perjadin_temuan sisip" on public.perjadin_temuan for insert with check (
  public.perjadin_peran_pengawas()
);
create policy "perjadin_temuan putus" on public.perjadin_temuan for update using (
  public.perjadin_has_role('ppk') or public.perjadin_is_admin()
);
