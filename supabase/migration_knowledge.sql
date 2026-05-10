-- Knowledge items table
-- Run in Supabase SQL Editor

create table if not exists public.knowledge_items (
  id          uuid primary key default gen_random_uuid(),
  judul       text not null,
  deskripsi   text not null default '',
  konten      text not null,
  kategori    text not null default 'Umum',
  tipe        text not null default 'Artikel',
  penulis     text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.knowledge_items enable row level security;
create policy "authenticated read knowledge"   on public.knowledge_items for select using (auth.role() = 'authenticated');
create policy "authenticated write knowledge"  on public.knowledge_items for insert with check (auth.role() = 'authenticated');
create policy "authenticated delete knowledge" on public.knowledge_items for delete using (auth.role() = 'authenticated');

-- Seed: Matriks Perbandingan Terminologi (tanpa kolom Sumber)
insert into public.knowledge_items (judul, deskripsi, konten, kategori, tipe, penulis)
values (
  'Matriks Perbandingan Terminologi Tahapan Risiko Antar Standar',
  'Perbandingan istilah untuk setiap tahapan risiko (Inherent, Existing, Residual, Monitoring) lintas 7 standar: SK SEKMA 475, Dokumen 7, Draft SK KMA, ISO 31000, COSO ERM, The Orange Book, dan BPKP.',
  E'## Matriks Perbandingan Terminologi Tahapan Risiko Antar Standar\n\n| Tahapan Risiko | SK SEKMA 475 | Dokumen 7 | Draft SK KMA | ISO 31000 | COSO ERM | The Orange Book | BPKP |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| Sebelum Pengendalian | Status Risiko yang Melekat/Bawaan (Inherent Risk) | Risiko Bawaan (Inherent Risk) | Risiko yang melekat (Inherent Risk) | Analisis Risiko (identifikasi sumber sebelum intervensi) | Risiko Bawaan (Inherent Risk) | Penilaian Risiko Bawaan (Inherent Assessment) | Tingkat Risiko Inheren |\n| Setelah Pengendalian yang Ada | Status Risiko Sisa (Residual Risk) dalam Form-3 | Risiko Saat Ini (Existing Risk) | Risiko residu setelah pengendalian yang ada (Residual Risk) | Mempertimbangkan efektivitas kendali yang ada (existing controls) | Control Activities (landasan respon risiko) | Posisi Risiko Saat Ini (Current Risk Position) | Risiko Residual |\n| Setelah Penanganan Baru | Tingkat Risiko yang Ditargetkan / Toleransi Risiko | Status Risiko Sisa (Residual Risk) | Status risiko setelah respon risiko (Treated Risk) | Risiko Sisa (Residual Risk) | Risiko Residual (Residual Risk) | Posisi Risiko Optimal atau Posisi Risiko yang Dapat Ditoleransi | Nilai Risiko Harapan |\n| Pemantauan Akhir | Pencatatan pemantauan kegiatan (tanpa nomenklatur khusus) | Pencatatan pemantauan kegiatan (tanpa nomenklatur khusus) | Status Risiko Aktual | Pemantauan dan Tinjauan (Monitoring and Review) | Pemantauan (Monitoring) melalui dashboard | Tinjauan Hasil Risiko (Review of Risk Outcomes) | Monitoring atas Keterjadian Risiko / Peringkat Risiko Akhir |',
  'SMAP',
  'Matriks',
  'Ricky Pramoedya Hermawan'
);

-- If already seeded: strip the Referensi Sumber section from existing row
update public.knowledge_items
set konten = E'## Matriks Perbandingan Terminologi Tahapan Risiko Antar Standar\n\n| Tahapan Risiko | SK SEKMA 475 | Dokumen 7 | Draft SK KMA | ISO 31000 | COSO ERM | The Orange Book | BPKP |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n| Sebelum Pengendalian | Status Risiko yang Melekat/Bawaan (Inherent Risk) | Risiko Bawaan (Inherent Risk) | Risiko yang melekat (Inherent Risk) | Analisis Risiko (identifikasi sumber sebelum intervensi) | Risiko Bawaan (Inherent Risk) | Penilaian Risiko Bawaan (Inherent Assessment) | Tingkat Risiko Inheren |\n| Setelah Pengendalian yang Ada | Status Risiko Sisa (Residual Risk) dalam Form-3 | Risiko Saat Ini (Existing Risk) | Risiko residu setelah pengendalian yang ada (Residual Risk) | Mempertimbangkan efektivitas kendali yang ada (existing controls) | Control Activities (landasan respon risiko) | Posisi Risiko Saat Ini (Current Risk Position) | Risiko Residual |\n| Setelah Penanganan Baru | Tingkat Risiko yang Ditargetkan / Toleransi Risiko | Status Risiko Sisa (Residual Risk) | Status risiko setelah respon risiko (Treated Risk) | Risiko Sisa (Residual Risk) | Risiko Residual (Residual Risk) | Posisi Risiko Optimal atau Posisi Risiko yang Dapat Ditoleransi | Nilai Risiko Harapan |\n| Pemantauan Akhir | Pencatatan pemantauan kegiatan (tanpa nomenklatur khusus) | Pencatatan pemantauan kegiatan (tanpa nomenklatur khusus) | Status Risiko Aktual | Pemantauan dan Tinjauan (Monitoring and Review) | Pemantauan (Monitoring) melalui dashboard | Tinjauan Hasil Risiko (Review of Risk Outcomes) | Monitoring atas Keterjadian Risiko / Peringkat Risiko Akhir |'
where judul = 'Matriks Perbandingan Terminologi Tahapan Risiko Antar Standar';
