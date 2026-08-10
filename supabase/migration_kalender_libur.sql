-- Kalender hari libur nasional, cuti bersama, dan Ramadhan.
-- Dipakai modul CA Bid. Kepegawaian untuk menentukan hari kerja efektif.
-- Data referensi publik — bukan data personalia.
-- Jalankan migrasi ini di Supabase SQL editor.

-- Kategori 'Libur Daerah' bersifat opsional dan khas per satker (mis. HUT daerah).
-- Sama seperti Libur Nasional/Cuti Bersama, hari itu tidak dinilai sebagai hari kerja.

create table if not exists public.kalender_libur (
  id          uuid primary key default gen_random_uuid(),
  tanggal     date not null unique,
  kategori    text not null,
  keterangan  text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Ditulis terpisah agar aman dijalankan ulang, termasuk pada basis data yang
-- sudah dibuat sebelum kategori 'Libur Daerah' ada.
alter table public.kalender_libur drop constraint if exists kalender_libur_kategori_check;
alter table public.kalender_libur add constraint kalender_libur_kategori_check
  check (kategori in ('Libur Nasional', 'Cuti Bersama', 'Libur Daerah', 'Ramadhan'));

create index if not exists kalender_libur_tanggal_idx on public.kalender_libur (tanggal);

alter table public.kalender_libur enable row level security;

-- Semua pengguna terautentikasi boleh membaca; perubahan lewat server action
-- yang sudah memeriksa peran admin.
create policy "authenticated read kalender_libur"
  on public.kalender_libur for select using (auth.role() = 'authenticated');
create policy "authenticated write kalender_libur"
  on public.kalender_libur for insert with check (auth.role() = 'authenticated');
create policy "authenticated update kalender_libur"
  on public.kalender_libur for update using (auth.role() = 'authenticated');
create policy "authenticated delete kalender_libur"
  on public.kalender_libur for delete using (auth.role() = 'authenticated');
