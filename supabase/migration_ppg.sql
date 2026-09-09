-- Modul Khusus PPG — Program Pengendalian Gratifikasi
-- Jalankan melalui Supabase SQL Editor. Data pusat dikelola admin_sistem/UPG Pusat;
-- UPG Satker mengelola penilaian risiko dan loss event unitnya.

create or replace function public.is_admin_sistem()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.users where id = auth.uid() and role = 'admin_sistem') $$;

create or replace function public.ppg_is_pusat()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.users where id = auth.uid() and status_aktif = true and role in ('admin_sistem','upg_pusat')) $$;

create or replace function public.ppg_is_satker()
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from public.users where id = auth.uid() and status_aktif = true and role = 'upg_satker' and unit_kerja_id is not null) $$;

create or replace function public.ppg_user_unit_id()
returns uuid language sql stable security definer set search_path = public
as $$ select unit_kerja_id from public.users where id = auth.uid() and status_aktif = true limit 1 $$;

create table if not exists public.ppg_risk_library (
  id uuid primary key default gen_random_uuid(), kode text not null unique,
  proses_bisnis text not null default '', subproses_bisnis text not null default '', kategori text not null default '',
  klasifikasi_risiko text not null default '', faktor_penyebab text not null default '',
  penyebab text not null default '', peristiwa text not null, dampak text not null default '',
  versi integer not null default 1 check (versi > 0),
  status text not null default 'draft' check (status in ('draft','review','aktif','nonaktif')),
  alasan_nonaktif text not null default '', nonaktif_at timestamptz, nonaktif_by uuid references auth.users(id),
  source_sheet text, source_row integer, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ppg_control_library (
  id uuid primary key default gen_random_uuid(), kode text not null unique, nama text not null,
  jenis text not null default '', uraian text not null default '', versi integer not null default 1 check (versi > 0),
  status text not null default 'aktif' check (status in ('draft','review','aktif','nonaktif')),
  alasan_nonaktif text not null default '', nonaktif_at timestamptz, nonaktif_by uuid references auth.users(id),
  source_sheet text, source_row integer, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Pemetaan generik milik UPG Pusat. Relasi ini tidak menyatakan bahwa kontrol
-- sudah diterapkan oleh satker; penerapan aktual dicatat pada ppg_risk_controls.
create table if not exists public.ppg_library_risk_controls (
  risk_library_id uuid not null references public.ppg_risk_library(id) on delete cascade,
  control_id uuid not null references public.ppg_control_library(id) on delete restrict,
  catatan_keterkaitan text not null default '', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key(risk_library_id, control_id)
);

create table if not exists public.ppg_register (
  id uuid primary key default gen_random_uuid(), kode text not null,
  risk_library_id uuid references public.ppg_risk_library(id) on delete set null,
  unit_kerja_id uuid not null references public.unit_kerja(id) on delete restrict, unit_nama text not null,
  tahun integer not null check (tahun between 2000 and 2200), periode text not null default 'Tahunan',
  kategori text not null default '', proses_bisnis text not null default '', subproses_bisnis text not null default '', klasifikasi_risiko text not null default '', faktor_penyebab text not null default '',
  penyebab text not null default '', peristiwa text not null, dampak text not null default '',
  kemungkinan_inherent smallint not null check (kemungkinan_inherent between 1 and 5),
  dampak_inherent smallint not null check (dampak_inherent between 1 and 5),
  skor_inherent smallint not null check (skor_inherent = kemungkinan_inherent * dampak_inherent),
  level_inherent text not null check (level_inherent in ('Sangat Rendah','Rendah','Sedang','Tinggi','Sangat Tinggi')),
  kemungkinan_existing smallint not null check (kemungkinan_existing between 1 and 5),
  dampak_existing smallint not null check (dampak_existing between 1 and 5),
  skor_existing smallint not null check (skor_existing = kemungkinan_existing * dampak_existing),
  level_existing text not null check (level_existing in ('Sangat Rendah','Rendah','Sedang','Tinggi','Sangat Tinggi')),
  kemungkinan_treated smallint check (kemungkinan_treated between 1 and 5),
  dampak_treated smallint check (dampak_treated between 1 and 5),
  skor_treated smallint check (skor_treated is null or skor_treated = kemungkinan_treated * dampak_treated),
  level_treated text check (level_treated is null or level_treated in ('Sangat Rendah','Rendah','Sedang','Tinggi','Sangat Tinggi')),
  status text not null default 'draft' check (status in ('draft','review','aktif','ditutup')),
  source_sheet text, source_row integer, created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(kode, tahun, periode, unit_nama)
);

create table if not exists public.ppg_risk_controls (
  risk_id uuid not null references public.ppg_register(id) on delete cascade,
  control_id uuid not null references public.ppg_control_library(id) on delete restrict,
  efektivitas text not null default 'belum_dinilai' check (efektivitas in ('belum_dinilai','tidak_efektif','sebagian','efektif')),
  catatan text not null default '', bukti_efektivitas_url text not null default '',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  primary key(risk_id, control_id)
);

-- Kontrol yang sudah dipakai dipertahankan untuk menjaga histori penilaian.
alter table public.ppg_risk_controls drop constraint if exists ppg_risk_controls_control_id_fkey;
alter table public.ppg_risk_controls add constraint ppg_risk_controls_control_id_fkey
  foreign key (control_id) references public.ppg_control_library(id) on delete restrict;

-- Hasil validasi dipisahkan agar UPG Satker tidak dapat mengesahkan buktinya sendiri.
create table if not exists public.ppg_risk_control_validations (
  risk_id uuid not null, control_id uuid not null,
  status text not null default 'belum_ditinjau' check (status in ('belum_ditinjau','disetujui','perlu_perbaikan','ditolak')),
  catatan text not null default '', validated_by uuid references auth.users(id), validated_at timestamptz,
  primary key(risk_id, control_id),
  foreign key(risk_id, control_id) references public.ppg_risk_controls(risk_id, control_id) on delete cascade
);

create table if not exists public.ppg_mitigations (
  id uuid primary key default gen_random_uuid(), register_id uuid not null references public.ppg_register(id) on delete cascade,
  tindakan text not null, pic_jabatan text not null default '', tenggat date,
  status text not null default 'belum_dimulai' check (status in ('belum_dimulai','berjalan','terhambat','selesai')),
  progres smallint not null default 0 check (progres between 0 and 100), bukti_url text, catatan text not null default '',
  kemungkinan_residual smallint check (kemungkinan_residual between 1 and 5), dampak_residual smallint check (dampak_residual between 1 and 5),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ppg_import_batches (
  id uuid primary key default gen_random_uuid(), nama_file text not null, file_hash text,
  source_sheet text not null, status text not null check (status in ('diproses','selesai','selesai_dengan_error','gagal')),
  total_baris integer not null default 0, baris_diterima integer not null default 0, baris_ditolak integer not null default 0,
  catatan text, created_by uuid references auth.users(id), created_at timestamptz not null default now(), completed_at timestamptz,
  unique(file_hash, source_sheet)
);

-- Sengaja tidak memiliki kolom nama, NIK, atau nama pemberi.
create table if not exists public.ppg_reports (
  id uuid primary key default gen_random_uuid(), import_batch_id uuid references public.ppg_import_batches(id) on delete cascade,
  source_row integer, nomor_laporan text not null default '', jabatan_penerima text not null default '',
  unit_kerja_id uuid references public.unit_kerja(id) on delete set null, unit_nama text not null default '',
  jenis_penerimaan text not null default '', tanggal_penerimaan date, objek text not null default '',
  nilai_penetapan numeric(18,2) check (nilai_penetapan is null or nilai_penetapan >= 0), tanggal_pelaporan date,
  status_penetapan text not null default '', nomor_sk text not null default '', kategori_objek text not null default '',
  label_skenario text, tipe_pemberi text not null default '', kegiatan text not null default '', dugaan_momen text not null default '',
  rule_version integer, classification_source text check (classification_source is null or classification_source in ('eksplisit','kata_kunci','manual')),
  review_status text not null default 'belum_ditinjau' check (review_status in ('belum_ditinjau','disetujui','ditolak')),
  created_at timestamptz not null default now(), unique(import_batch_id, source_row)
);

-- Menghapus satu riwayat impor harus sekaligus membersihkan seluruh laporan
-- yang berasal dari batch tersebut agar analitik berikutnya tidak tercampur.
alter table public.ppg_reports drop constraint if exists ppg_reports_import_batch_id_fkey;
alter table public.ppg_reports
  add constraint ppg_reports_import_batch_id_fkey
  foreign key (import_batch_id) references public.ppg_import_batches(id) on delete cascade;

create table if not exists public.ppg_classification_rules (
  id uuid primary key default gen_random_uuid(), versi integer not null, label text not null, kata_kunci text[] not null default '{}',
  aktif boolean not null default true, created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  unique(versi, label)
);

create table if not exists public.ppg_audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  entity_type text not null, entity_id text not null, action text not null, changes jsonb not null default '{}', created_at timestamptz not null default now()
);

-- Snapshot menjaga jejak analisis yang menjadi dasar setiap rancangan Program PPG.
create table if not exists public.ppg_analysis_snapshots (
  id uuid primary key default gen_random_uuid(),
  analysis_start date not null, analysis_end date not null,
  baseline_start date not null, baseline_end date not null,
  period_label text not null, program_label text not null,
  method_version text not null default 'exposure-v1',
  summary jsonb not null default '{}', recommendations jsonb not null default '[]',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  check (analysis_start <= analysis_end), check (baseline_start <= baseline_end)
);

-- Impor Risk Register baku merupakan staging berjejak, bukan jalur langsung ke
-- library. Data sumber tetap dipertahankan ketika beberapa variasi satker
-- digabungkan menjadi satu usulan risiko generik.
create table if not exists public.ppg_risk_import_batches (
  id uuid primary key default gen_random_uuid(), nama_file text not null, file_hash text not null,
  source_sheet text not null default 'Risk Register 2026',
  mode text not null default 'bootstrap_library' check (mode in ('bootstrap_library','operasional_assessment')),
  tahun integer check (tahun between 2000 and 2200), periode text not null default '',
  status text not null default 'diproses' check (status in ('diproses','siap_dikurasi','selesai_dengan_error','gagal')),
  total_baris integer not null default 0, baris_valid integer not null default 0, baris_perlu_perbaikan integer not null default 0,
  catatan text not null default '', created_by uuid references auth.users(id),
  created_at timestamptz not null default now(), completed_at timestamptz,
  unique(file_hash, source_sheet, mode)
);

create table if not exists public.ppg_risk_import_rows (
  id uuid primary key default gen_random_uuid(), batch_id uuid not null references public.ppg_risk_import_batches(id) on delete cascade,
  source_row integer not null, unit_kerja_id uuid references public.unit_kerja(id) on delete set null,
  unit_nama_raw text not null default '', tahun integer check (tahun between 2000 and 2200), periode text not null default '',
  klasifikasi_risiko text not null default '', kategori text not null default '',
  proses_bisnis text not null default '', subproses_bisnis text not null default '', faktor_penyebab text not null default '',
  peristiwa text not null, penyebab text not null default '', dampak text not null default '',
  kemungkinan_inherent smallint check (kemungkinan_inherent between 1 and 5), dampak_inherent smallint check (dampak_inherent between 1 and 5),
  kemungkinan_residual smallint check (kemungkinan_residual between 1 and 5), dampak_residual smallint check (dampak_residual between 1 and 5),
  kemungkinan_treated smallint check (kemungkinan_treated between 1 and 5), dampak_treated smallint check (dampak_treated between 1 and 5),
  control_text text not null default '', mitigation_text text not null default '',
  normalized_signature text not null, validation_errors text[] not null default '{}', raw_payload jsonb not null default '{}',
  match_status text not null default 'belum_diproses' check (match_status in ('belum_diproses','kandidat_baru','kandidat_tergabung','cocok_library','perlu_review','register_dibuat','diabaikan')),
  matched_library_id uuid references public.ppg_risk_library(id) on delete set null,
  created_register_id uuid references public.ppg_register(id) on delete set null,
  created_at timestamptz not null default now(), unique(batch_id, source_row)
);

create table if not exists public.ppg_risk_candidates (
  id uuid primary key default gen_random_uuid(),
  klasifikasi_risiko text not null default '', kategori text not null default '',
  proses_bisnis text not null default '', subproses_bisnis text not null default '', faktor_penyebab text not null default '',
  peristiwa text not null, penyebab text not null default '', dampak text not null default '', normalized_signature text not null,
  confidence numeric(5,2) not null default 0 check (confidence between 0 and 100),
  status text not null default 'usulan' check (status in ('usulan','review','disetujui','digabung','ditolak')),
  library_id uuid references public.ppg_risk_library(id) on delete set null,
  catatan_keputusan text not null default '', created_by uuid references auth.users(id), reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(), reviewed_at timestamptz, updated_at timestamptz not null default now()
);

create table if not exists public.ppg_risk_candidate_members (
  candidate_id uuid not null references public.ppg_risk_candidates(id) on delete cascade,
  import_row_id uuid not null references public.ppg_risk_import_rows(id) on delete cascade,
  similarity numeric(5,2) not null default 100 check (similarity between 0 and 100),
  primary key(candidate_id, import_row_id)
);

-- Snapshot analitik menyimpan hasil kompilasi nasional per risiko generik.
-- Loss event tetap milik Satker, sedangkan keputusan Program PPG menggunakan
-- agregat persentase Satker agar volume kejadian satu Satker tidak mendominasi.

create table if not exists public.ppg_action_catalog (
  id uuid primary key default gen_random_uuid(), kode text not null unique, nama text not null,
  uraian text not null default '', jenis_kontrol text not null default 'preventif',
  risk_categories text[] not null default '{}', target_default text not null default '',
  lead_time_days integer not null default 30 check (lead_time_days between 0 and 365),
  output_indicator text not null default '', outcome_indicator text not null default '',
  status text not null default 'aktif' check (status in ('aktif','nonaktif')),
  versi integer not null default 1 check (versi > 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

insert into public.ppg_action_catalog
  (kode,nama,uraian,jenis_kontrol,risk_categories,target_default,lead_time_days,output_indicator,outcome_indicator)
values
  ('PPG-HR-01','Pengendalian gratifikasi menjelang periode rawan','Sosialisasi tematik, pengingat kanal pelaporan, dan kesiapan penerimaan/penolakan gratifikasi sebelum periode rawan.','preventif',array['Risiko Kecurangan','Risiko Kepatuhan'],'Seluruh pegawai dan pemangku kepentingan satker',42,'Persentase satker yang melaksanakan paket komunikasi tepat waktu','Perubahan jumlah dan ketepatan waktu laporan pada periode rawan'),
  ('PPG-UANG-01','Penguatan protokol penolakan uang dan setara uang','Simulasi penolakan, pengamanan bukti, dan pelaporan cepat untuk uang, transfer, atau instrumen setara uang.','preventif',array['Risiko Kecurangan','Risiko Kepatuhan'],'Pegawai pada fungsi layanan',30,'Persentase pegawai sasaran mengikuti simulasi','Persentase laporan uang yang ditolak dan dilaporkan tepat waktu'),
  ('PPG-EKSTERNAL-01','Deklarasi integritas dan komunikasi pihak eksternal','Komunikasi larangan gratifikasi dan deklarasi integritas kepada vendor, bank, profesi hukum, dan mitra lainnya.','preventif',array['Risiko Kecurangan','Risiko Kemitraan'],'Satker dengan interaksi pihak eksternal',30,'Persentase pihak eksternal sasaran menerima komunikasi','Penurunan pemberian berulang dari pihak eksternal'),
  ('PPG-LAPOR-01','Klinik pelaporan dan pengingat batas waktu','Pendampingan operator dan pengingat berkala untuk meningkatkan kepatuhan pelaporan.','korektif',array['Risiko Kepatuhan','Risiko Operasional'],'UPG Satker dan pelapor',14,'Jumlah klinik dan persentase satker yang dijangkau','Penurunan proporsi laporan lebih dari 30 hari'),
  ('PPG-DATA-01','Peningkatan kualitas data laporan gratifikasi','Validasi kelengkapan objek, konteks, kegiatan, momen, dan tanggal sebelum data dikirim.','korektif',array['Risiko Operasional'],'Operator UPG Satker',14,'Persentase operator yang menggunakan daftar periksa','Penurunan proporsi data tanpa konteks'),
  ('PPG-PIMPINAN-01','Briefing integritas berbasis jabatan prioritas','Briefing terarah untuk jabatan yang memiliki paparan laporan paling tinggi.','preventif',array['Risiko Kecurangan','Risiko Kepatuhan'],'Jabatan prioritas hasil analisis',30,'Persentase pejabat sasaran mengikuti briefing','Perubahan pola laporan pada jabatan sasaran')
on conflict (kode) do update set nama=excluded.nama, uraian=excluded.uraian,
  jenis_kontrol=excluded.jenis_kontrol, risk_categories=excluded.risk_categories,
  target_default=excluded.target_default, lead_time_days=excluded.lead_time_days,
  output_indicator=excluded.output_indicator, outcome_indicator=excluded.outcome_indicator,
  updated_at=now();

create table if not exists public.ppg_programs (
  id uuid primary key default gen_random_uuid(), kode text not null unique, nama text not null,
  snapshot_id uuid references public.ppg_analysis_snapshots(id) on delete set null,
  analysis_start date not null, analysis_end date not null,
  program_start date not null, program_end date not null, period_label text not null,
  cakupan_model text not null default 'nasional_berklaster' check (cakupan_model in ('nasional','nasional_berklaster')),
  status text not null default 'dirancang' check (status in ('dirancang','dijadwalkan','berjalan','terhambat','selesai','dibatalkan')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (analysis_start <= analysis_end), check (program_start <= program_end)
);

create table if not exists public.ppg_program_items (
  id uuid primary key default gen_random_uuid(), program_id uuid not null references public.ppg_programs(id) on delete cascade,
  register_id uuid references public.ppg_register(id) on delete set null,
  risk_library_id uuid not null references public.ppg_risk_library(id) on delete restrict,
  control_id uuid references public.ppg_control_library(id) on delete set null,
  action_catalog_id uuid not null references public.ppg_action_catalog(id) on delete restrict,
  rationale text not null default '', target text not null default '', pic_jabatan text not null default '',
  mulai date, selesai_rencana date,
  status text not null default 'belum_dimulai' check (status in ('belum_dimulai','berjalan','terhambat','selesai','dibatalkan')),
  progres smallint not null default 0 check (progres between 0 and 100),
  output_target text not null default '', outcome_target text not null default '',
  sasaran_program text not null default '', indikator_program text not null default '',
  baseline_indikator text not null default '', target_indikator text not null default '', satuan_indikator text not null default '',
  arah_target text not null default 'minimal' check (arah_target in ('minimal','maksimal','meningkat','menurun','tepat')),
  sumber_data_indikator text not null default '', frekuensi_pengukuran text not null default '',
  target_cakupan_satker numeric(5,2) not null default 100 check (target_cakupan_satker between 0 and 100),
  kri_indikator text not null default '', kri_ambang_hijau text not null default '',
  kri_ambang_waspada text not null default '', kri_ambang_merah text not null default '',
  outcome_a_indikator text not null default '', outcome_a_baseline_pct numeric(5,2), outcome_a_target_pct numeric(5,2),
  outcome_b_indikator text not null default '', outcome_b_baseline_pct numeric(5,2), outcome_b_target_pct numeric(5,2),
  catatan_keputusan text not null default '',
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Satu program memiliki paket inti nasional dan tiga modul tematik. Keanggotaan
-- disimpan sebagai snapshot agar perpindahan klaster pada periode berikutnya
-- tidak mengubah dasar keputusan program yang sudah disahkan.
create table if not exists public.ppg_program_clusters (
  id uuid primary key default gen_random_uuid(),
  program_item_id uuid not null references public.ppg_program_items(id) on delete cascade,
  kode smallint not null check (kode between 1 and 3), nama text not null,
  kriteria text not null default '', fokus_tindakan text not null default '',
  target_cakupan_satker numeric(5,2) not null default 100 check (target_cakupan_satker between 0 and 100),
  created_at timestamptz not null default now(), unique(program_item_id, kode)
);

create table if not exists public.ppg_program_cluster_units (
  program_cluster_id uuid not null references public.ppg_program_clusters(id) on delete cascade,
  unit_kerja_id uuid not null references public.unit_kerja(id) on delete restrict,
  basis jsonb not null default '{}', primary key(program_cluster_id, unit_kerja_id)
);

create table if not exists public.ppg_program_updates (
  id uuid primary key default gen_random_uuid(), program_item_id uuid not null references public.ppg_program_items(id) on delete cascade,
  tanggal date not null default current_date,
  status text not null check (status in ('belum_dimulai','berjalan','terhambat','selesai','dibatalkan')),
  progres smallint not null check (progres between 0 and 100), realisasi_indikator text not null default '',
  output_realisasi text not null default '', outcome_realisasi text not null default '', catatan text not null default '', bukti_url text,
  created_by uuid references auth.users(id), created_at timestamptz not null default now()
);

create table if not exists public.ppg_program_item_controls (
  program_item_id uuid not null references public.ppg_program_items(id) on delete cascade,
  control_id uuid not null references public.ppg_control_library(id) on delete restrict,
  primary key(program_item_id, control_id)
);

-- Hasil treated risk merupakan evaluasi dampak Program PPG terhadap residual
-- risk satker. Kolom-kolom ini menyimpan program sumber dan evidence terbaru.
alter table public.ppg_register add column if not exists treated_program_id uuid references public.ppg_programs(id) on delete set null;
alter table public.ppg_register add column if not exists efektivitas_program text;
alter table public.ppg_register add column if not exists bukti_efektivitas_program_url text not null default '';
alter table public.ppg_register add column if not exists treated_assessed_by uuid references auth.users(id);
alter table public.ppg_register add column if not exists treated_assessed_at timestamptz;
alter table public.ppg_register drop constraint if exists ppg_register_efektivitas_program_check;
alter table public.ppg_register add constraint ppg_register_efektivitas_program_check
  check (efektivitas_program is null or efektivitas_program in ('tidak_efektif','kurang_efektif','cukup_efektif','efektif')) not valid;

create table if not exists public.ppg_led_limit_versions (
  id uuid primary key default gen_random_uuid(), tahun integer not null unique check (tahun between 2000 and 2200),
  level_dampak_upper smallint not null default 4 check (level_dampak_upper between 1 and 5),
  status text not null default 'aktif' check (status in ('draft','aktif','nonaktif')),
  created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.ppg_loss_events (
  id uuid primary key default gen_random_uuid(), kode text not null unique,
  unit_kerja_id uuid not null references public.unit_kerja(id) on delete restrict, unit_nama text not null,
  nama_peristiwa text not null, tanggal_kejadian date not null, tanggal_diketahui date, tanggal_dilaporkan date not null default current_date,
  sumber_informasi text not null default 'laporan_gratifikasi', lokasi text not null default '',
  kategori_risiko text not null default '', proses_bisnis text not null default '', kronologi text not null,
  register_id uuid references public.ppg_register(id) on delete set null,
  risk_library_id uuid not null references public.ppg_risk_library(id) on delete restrict,
  metode_rca text not null default '', akar_masalah text not null default '', kegagalan_kontrol text not null default '',
  jenis_dampak text not null default '', level_dampak smallint not null default 1 check (level_dampak between 1 and 5),
  uraian_dampak text not null default '',
  limit_version_id uuid references public.ppg_led_limit_versions(id) on delete set null,
  klasifikasi_limit text not null default 'belum_dinilai' check (klasifikasi_limit in ('belum_dinilai','under_limit','upper_limit')),
  lesson_learned text not null default '', bukti_path text,
  status text not null default 'draft' check (status in ('draft','diajukan','perlu_perbaikan','tervalidasi','tindak_lanjut','ditutup')),
  catatan_validasi text not null default '', created_by uuid references auth.users(id), validated_by uuid references auth.users(id),
  submitted_at timestamptz, validated_at timestamptz, closed_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

-- Kontrol gagal direferensikan ke Control Library. Free-form
-- ppg_loss_events.kegagalan_kontrol tetap dipakai sebagai keterangan tambahan.
create table if not exists public.ppg_loss_event_controls (
  loss_event_id uuid not null references public.ppg_loss_events(id) on delete cascade,
  control_id uuid not null references public.ppg_control_library(id) on delete restrict,
  created_by uuid references auth.users(id), created_at timestamptz not null default now(),
  primary key(loss_event_id, control_id)
);

-- Nomor urut disimpan terpisah agar kode yang sudah pernah diterbitkan tidak
-- digunakan kembali meskipun loss event kemudian dihapus. Nomor dimulai ulang
-- setiap tahun kejadian: LED-2026-001, LED-2026-002, dan seterusnya.
create table if not exists public.ppg_loss_event_code_counters (
  tahun integer primary key check (tahun between 2000 and 2200),
  nomor_terakhir integer not null default 0 check (nomor_terakhir >= 0),
  updated_at timestamptz not null default now()
);

insert into public.ppg_loss_event_code_counters (tahun, nomor_terakhir)
select split_part(kode, '-', 2)::integer, max(split_part(kode, '-', 3)::integer)
from public.ppg_loss_events
where kode ~ '^LED-[0-9]{4}-[0-9]+$'
group by split_part(kode, '-', 2)::integer
on conflict (tahun) do update
set nomor_terakhir = greatest(public.ppg_loss_event_code_counters.nomor_terakhir, excluded.nomor_terakhir),
    updated_at = now();

create or replace function public.ppg_assign_loss_event_code()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  event_year integer;
  next_number integer;
begin
  event_year := extract(year from new.tanggal_kejadian)::integer;
  insert into public.ppg_loss_event_code_counters (tahun, nomor_terakhir)
  values (event_year, 1)
  on conflict (tahun) do update
  set nomor_terakhir = public.ppg_loss_event_code_counters.nomor_terakhir + 1,
      updated_at = now()
  returning nomor_terakhir into next_number;

  new.kode := 'LED-' || event_year::text || '-' ||
    case when next_number < 1000 then lpad(next_number::text, 3, '0') else next_number::text end;
  return new;
end
$$;

drop trigger if exists ppg_loss_event_code_trigger on public.ppg_loss_events;
create trigger ppg_loss_event_code_trigger
before insert on public.ppg_loss_events
for each row execute function public.ppg_assign_loss_event_code();

alter table public.ppg_loss_event_code_counters enable row level security;
revoke all on function public.ppg_assign_loss_event_code() from public;

create table if not exists public.ppg_loss_event_report_links (
  loss_event_id uuid not null references public.ppg_loss_events(id) on delete cascade,
  report_id uuid not null references public.ppg_reports(id) on delete cascade,
  link_type text not null check (link_type in ('dilaporkan_satker','kandidat_mesin','terkonfirmasi','ditolak')),
  match_score numeric(5,2), match_reasons jsonb not null default '[]',
  created_by uuid references auth.users(id), reviewed_by uuid references auth.users(id), created_at timestamptz not null default now(), reviewed_at timestamptz,
  primary key(loss_event_id, report_id)
);

create table if not exists public.ppg_program_loss_events (
  program_item_id uuid not null references public.ppg_program_items(id) on delete cascade,
  loss_event_id uuid not null references public.ppg_loss_events(id) on delete restrict,
  primary key(program_item_id, loss_event_id)
);

-- Tetap aman bila migrasi versi awal sudah pernah dijalankan.
alter table public.ppg_risk_library add column if not exists klasifikasi_risiko text not null default '';
alter table public.ppg_risk_library add column if not exists faktor_penyebab text not null default '';
alter table public.ppg_risk_library add column if not exists subproses_bisnis text not null default '';
alter table public.ppg_risk_library add column if not exists alasan_nonaktif text not null default '';
alter table public.ppg_risk_library add column if not exists nonaktif_at timestamptz;
alter table public.ppg_risk_library add column if not exists nonaktif_by uuid references auth.users(id);
alter table public.ppg_control_library add column if not exists alasan_nonaktif text not null default '';
alter table public.ppg_control_library add column if not exists nonaktif_at timestamptz;
alter table public.ppg_control_library add column if not exists nonaktif_by uuid references auth.users(id);
alter table public.ppg_risk_controls add column if not exists bukti_efektivitas_url text not null default '';
alter table public.ppg_risk_controls add column if not exists created_by uuid references auth.users(id);
alter table public.ppg_risk_controls add column if not exists created_at timestamptz not null default now();
alter table public.ppg_risk_controls add column if not exists updated_at timestamptz not null default now();
alter table public.ppg_led_limit_versions add column if not exists level_dampak_upper smallint not null default 4;
alter table public.ppg_led_limit_versions drop constraint if exists ppg_led_limit_versions_level_dampak_upper_check;
alter table public.ppg_led_limit_versions add constraint ppg_led_limit_versions_level_dampak_upper_check check (level_dampak_upper between 1 and 5);
alter table public.ppg_loss_events add column if not exists jenis_dampak text not null default '';
alter table public.ppg_loss_events add column if not exists level_dampak smallint not null default 1;
alter table public.ppg_loss_events add column if not exists uraian_dampak text not null default '';
alter table public.ppg_loss_events add column if not exists risk_library_id uuid references public.ppg_risk_library(id) on delete restrict;
update public.ppg_loss_events e set risk_library_id = r.risk_library_id
from public.ppg_register r
where e.risk_library_id is null and e.register_id = r.id and r.risk_library_id is not null;
alter table public.ppg_loss_events drop constraint if exists ppg_loss_events_primary_risk_required;
alter table public.ppg_loss_events add constraint ppg_loss_events_primary_risk_required
  check (risk_library_id is not null) not valid;
-- Instalasi lama boleh masih memiliki kolom dampak nonfinansial/finansial.
-- Nilainya dipertahankan dan hanya dibaca sekali untuk mengisi model terpadu.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ppg_loss_events' and column_name = 'level_nonfinansial'
  ) then
    execute $sql$update public.ppg_loss_events set level_dampak = level_nonfinansial where level_nonfinansial between 1 and 5 and jenis_dampak = ''$sql$;
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'ppg_loss_events' and column_name = 'dampak_nonfinansial'
  ) then
    execute $sql$update public.ppg_loss_events set uraian_dampak = dampak_nonfinansial where uraian_dampak = '' and dampak_nonfinansial <> ''$sql$;
  end if;
end $$;
alter table public.ppg_loss_events drop constraint if exists ppg_loss_events_level_dampak_check;
alter table public.ppg_loss_events add constraint ppg_loss_events_level_dampak_check check (level_dampak between 1 and 5);
alter table public.ppg_loss_events drop constraint if exists ppg_loss_events_jenis_dampak_check;
alter table public.ppg_loss_events add constraint ppg_loss_events_jenis_dampak_check check (jenis_dampak in (
  '', 'Kerugian Keuangan Negara dan Pihak Ketiga', 'Penurunan Reputasi', 'Kesehatan dan Keselamatan Kerja',
  'Realisasi Capaian Kinerja Sasaran Strategis', 'Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Badan Pengawasan',
  'Gangguan terhadap Layanan Tusi Organisasi'
)) not valid;
-- Versi terdahulu keliru menempatkan pemilik satker pada master risiko.
-- Relasi tersebut hanya sah pada ppg_register (hasil adopsi/penilaian satker).
alter table public.ppg_risk_library drop column if exists unit_kerja_id;
alter table public.ppg_risk_library drop column if exists unit_nama;

-- Normalisasi kode lama yang pernah memuat kode satker. risk_library_id tetap
-- menjadi penghubung sehingga histori penilaian tidak terputus.
do $$ begin
  create temporary table ppg_library_code_map on commit drop as
    with candidates as (
      select id, kategori, created_at,
        case kategori
          when 'Risiko Strategis' then '1' when 'Risiko Kebijakan' then '2'
          when 'Risiko Kecurangan' then '3' when 'Risiko Bencana' then '4'
          when 'Risiko Kepatuhan' then '5' when 'Risiko Operasional' then '6'
          when 'Risiko Kemitraan' then '7' else '0' end as category_code
      from public.ppg_risk_library
      where kode !~ '^PPG\.[0-7]\.[0-9]+$'
    ), existing_max as (
      select kategori, coalesce(max(split_part(kode, '.', 3)::integer), 0) as max_sequence
      from public.ppg_risk_library where kode ~ '^PPG\.[0-7]\.[0-9]+$' group by kategori
    )
    select c.id,
      'PPG.' || c.category_code || '.' ||
      (coalesce(m.max_sequence, 0) + row_number() over (partition by c.kategori order by c.created_at, c.id))::text as new_code
    from candidates c left join existing_max m on m.kategori = c.kategori;

  update public.ppg_register r set kode = '__PPG_MIG__' || r.risk_library_id::text
    where r.risk_library_id in (select id from ppg_library_code_map);
  update public.ppg_risk_library l set kode = '__PPG_MIG__' || l.id::text
    where l.id in (select id from ppg_library_code_map);
  update public.ppg_risk_library l set kode = m.new_code
    from ppg_library_code_map m where m.id = l.id;
  update public.ppg_register r set kode = m.new_code
    from ppg_library_code_map m where m.id = r.risk_library_id;
end $$;
alter table public.ppg_register add column if not exists klasifikasi_risiko text not null default '';
alter table public.ppg_register add column if not exists faktor_penyebab text not null default '';
alter table public.ppg_register add column if not exists kategori text not null default '';
alter table public.ppg_register add column if not exists subproses_bisnis text not null default '';
alter table public.ppg_program_items add column if not exists sasaran_program text not null default '';
alter table public.ppg_programs add column if not exists cakupan_model text not null default 'nasional_berklaster';
alter table public.ppg_program_items add column if not exists risk_library_id uuid references public.ppg_risk_library(id) on delete restrict;
alter table public.ppg_program_items add column if not exists control_id uuid references public.ppg_control_library(id) on delete set null;
alter table public.ppg_program_items add column if not exists indikator_program text not null default '';
alter table public.ppg_program_items add column if not exists baseline_indikator text not null default '';
alter table public.ppg_program_items add column if not exists target_indikator text not null default '';
alter table public.ppg_program_items add column if not exists satuan_indikator text not null default '';
alter table public.ppg_program_items add column if not exists arah_target text not null default 'minimal';
alter table public.ppg_program_items add column if not exists sumber_data_indikator text not null default '';
alter table public.ppg_program_items add column if not exists frekuensi_pengukuran text not null default '';
alter table public.ppg_program_items add column if not exists target_cakupan_satker numeric(5,2) not null default 100;
alter table public.ppg_program_items add column if not exists kri_indikator text not null default '';
alter table public.ppg_program_items add column if not exists kri_ambang_hijau text not null default '';
alter table public.ppg_program_items add column if not exists kri_ambang_waspada text not null default '';
alter table public.ppg_program_items add column if not exists kri_ambang_merah text not null default '';
alter table public.ppg_program_items add column if not exists outcome_a_indikator text not null default '';
alter table public.ppg_program_items add column if not exists outcome_a_baseline_pct numeric(5,2);
alter table public.ppg_program_items add column if not exists outcome_a_target_pct numeric(5,2);
alter table public.ppg_program_items add column if not exists outcome_b_indikator text not null default '';
alter table public.ppg_program_items add column if not exists outcome_b_baseline_pct numeric(5,2);
alter table public.ppg_program_items add column if not exists outcome_b_target_pct numeric(5,2);
alter table public.ppg_program_items add column if not exists catatan_keputusan text not null default '';
alter table public.ppg_program_updates add column if not exists realisasi_indikator text not null default '';
alter table public.ppg_register add column if not exists kemungkinan_treated smallint;
alter table public.ppg_register add column if not exists dampak_treated smallint;
alter table public.ppg_register add column if not exists skor_treated smallint;
alter table public.ppg_register add column if not exists level_treated text;
alter table public.ppg_risk_import_rows add column if not exists created_register_id uuid references public.ppg_register(id) on delete set null;
alter table public.ppg_risk_import_rows drop constraint if exists ppg_risk_import_rows_match_status_check;
alter table public.ppg_risk_import_rows add constraint ppg_risk_import_rows_match_status_check check (match_status in ('belum_diproses','kandidat_baru','kandidat_tergabung','cocok_library','perlu_review','register_dibuat','diabaikan')) not valid;
alter table public.ppg_register drop constraint if exists ppg_register_treated_check;
alter table public.ppg_register add constraint ppg_register_treated_check check (
  (kemungkinan_treated is null and dampak_treated is null and skor_treated is null and level_treated is null) or
  (kemungkinan_treated between 1 and 5 and dampak_treated between 1 and 5 and
   skor_treated = kemungkinan_treated * dampak_treated and
   level_treated in ('Sangat Rendah','Rendah','Sedang','Tinggi','Sangat Tinggi'))
) not valid;
comment on column public.ppg_register.kemungkinan_existing is 'Nama kolom legacy; makna bisnisnya adalah kemungkinan residual setelah kontrol yang berjalan.';
comment on column public.ppg_register.dampak_existing is 'Nama kolom legacy; makna bisnisnya adalah dampak residual setelah kontrol yang berjalan.';
comment on column public.ppg_register.skor_existing is 'Nama kolom legacy; makna bisnisnya adalah skor residual setelah kontrol yang berjalan.';
comment on column public.ppg_register.level_existing is 'Nama kolom legacy; makna bisnisnya adalah level residual setelah kontrol yang berjalan.';

update public.ppg_program_items i set risk_library_id = r.risk_library_id
from public.ppg_register r
where i.risk_library_id is null and i.register_id = r.id and r.risk_library_id is not null;
alter table public.ppg_program_items drop constraint if exists ppg_program_items_generic_risk_required;
alter table public.ppg_program_items add constraint ppg_program_items_generic_risk_required
  check (risk_library_id is not null) not valid;
alter table public.ppg_programs drop constraint if exists ppg_programs_cakupan_model_check;
alter table public.ppg_programs add constraint ppg_programs_cakupan_model_check
  check (cakupan_model in ('nasional','nasional_berklaster')) not valid;
alter table public.ppg_program_items drop constraint if exists ppg_program_items_target_cakupan_satker_check;
alter table public.ppg_program_items add constraint ppg_program_items_target_cakupan_satker_check
  check (target_cakupan_satker between 0 and 100) not valid;
alter table public.ppg_program_items drop constraint if exists ppg_program_items_outcome_percentage_check;
alter table public.ppg_program_items add constraint ppg_program_items_outcome_percentage_check check (
  (outcome_a_baseline_pct is null or outcome_a_baseline_pct between 0 and 100) and
  (outcome_a_target_pct is null or outcome_a_target_pct between 0 and 100) and
  (outcome_b_baseline_pct is null or outcome_b_baseline_pct between 0 and 100) and
  (outcome_b_target_pct is null or outcome_b_target_pct between 0 and 100)
) not valid;

-- Bawa pilihan kontrol tunggal dari versi sebelumnya ke model many-to-many.
insert into public.ppg_program_item_controls(program_item_id, control_id)
select id, control_id from public.ppg_program_items where control_id is not null
on conflict (program_item_id, control_id) do nothing;
alter table public.ppg_control_library drop constraint if exists ppg_control_library_jenis_check;
alter table public.ppg_control_library add constraint ppg_control_library_jenis_check check (jenis in ('','Preventif','Detektif','Korektif')) not valid;
alter table public.ppg_program_items drop constraint if exists ppg_program_items_arah_target_check;
alter table public.ppg_program_items add constraint ppg_program_items_arah_target_check check (arah_target in ('minimal','maksimal','meningkat','menurun','tepat')) not valid;
alter table public.ppg_register drop constraint if exists ppg_register_unit_required;
alter table public.ppg_register add constraint ppg_register_unit_required check (unit_kerja_id is not null and unit_nama <> '') not valid;
alter table public.ppg_register drop constraint if exists ppg_register_periode_check;
alter table public.ppg_register add constraint ppg_register_periode_check check (periode in (
  'Tahunan','Semester I','Semester II','Triwulan I','Triwulan II','Triwulan III','Triwulan IV',
  'Bulanan - Januari','Bulanan - Februari','Bulanan - Maret','Bulanan - April','Bulanan - Mei','Bulanan - Juni',
  'Bulanan - Juli','Bulanan - Agustus','Bulanan - September','Bulanan - Oktober','Bulanan - November','Bulanan - Desember'
)) not valid;

alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_klasifikasi_check;
alter table public.ppg_risk_library add constraint ppg_risk_library_klasifikasi_check check (klasifikasi_risiko in ('','Sektor Pelayanan Publik','Sektor Pengadaan Barang dan/atau Jasa','Sektor Pengelolaan Sumber Daya Manusia','Sektor Perizinan','Sektor Pemeriksaan/Audit','Sektor Lainnya'));
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_faktor_check;
alter table public.ppg_risk_library add constraint ppg_risk_library_faktor_check check (faktor_penyebab in ('','Pemahaman','Penegakan Aturan','Pemeriksaan','Sistem','Lain-lain'));
alter table public.ppg_register drop constraint if exists ppg_register_klasifikasi_check;
alter table public.ppg_register add constraint ppg_register_klasifikasi_check check (klasifikasi_risiko in ('','Sektor Pelayanan Publik','Sektor Pengadaan Barang dan/atau Jasa','Sektor Pengelolaan Sumber Daya Manusia','Sektor Perizinan','Sektor Pemeriksaan/Audit','Sektor Lainnya'));
alter table public.ppg_register drop constraint if exists ppg_register_faktor_check;
alter table public.ppg_register add constraint ppg_register_faktor_check check (faktor_penyebab in ('','Pemahaman','Penegakan Aturan','Pemeriksaan','Sistem','Lain-lain'));
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_kategori_check;
alter table public.ppg_risk_library add constraint ppg_risk_library_kategori_check check (kategori in ('','Risiko Strategis','Risiko Kebijakan','Risiko Kecurangan','Risiko Bencana','Risiko Kepatuhan','Risiko Operasional','Risiko Kemitraan')) not valid;
alter table public.ppg_register drop constraint if exists ppg_register_kategori_check;
alter table public.ppg_register add constraint ppg_register_kategori_check check (kategori in ('','Risiko Strategis','Risiko Kebijakan','Risiko Kecurangan','Risiko Bencana','Risiko Kepatuhan','Risiko Operasional','Risiko Kemitraan')) not valid;
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_proses_check;
alter table public.ppg_risk_library add constraint ppg_risk_library_proses_check check (proses_bisnis in ('','Manajemen Peradilan','Pelayanan Publik','Administrasi Umum','Administrasi Perkara','Administrasi Persidangan','Pengawasan (Internal dan Eksternal)','Penanganan Pengaduan')) not valid;
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_subproses_check;
alter table public.ppg_risk_library add constraint ppg_risk_library_subproses_check check ((proses_bisnis = '' and subproses_bisnis = '') or (proses_bisnis = 'Administrasi Umum' and subproses_bisnis <> '') or (proses_bisnis not in ('','Administrasi Umum') and subproses_bisnis = '')) not valid;
alter table public.ppg_register drop constraint if exists ppg_register_proses_check;
alter table public.ppg_register add constraint ppg_register_proses_check check (proses_bisnis in ('','Manajemen Peradilan','Pelayanan Publik','Administrasi Umum','Administrasi Perkara','Administrasi Persidangan','Pengawasan (Internal dan Eksternal)','Penanganan Pengaduan')) not valid;
alter table public.ppg_register drop constraint if exists ppg_register_subproses_check;
alter table public.ppg_register add constraint ppg_register_subproses_check check ((proses_bisnis = '' and subproses_bisnis = '') or (proses_bisnis = 'Administrasi Umum' and subproses_bisnis <> '') or (proses_bisnis not in ('','Administrasi Umum') and subproses_bisnis = '')) not valid;

create index if not exists ppg_register_level_idx on public.ppg_register(level_existing, tahun);
create index if not exists ppg_mitigations_status_idx on public.ppg_mitigations(status, tenggat);
create index if not exists ppg_reports_date_idx on public.ppg_reports(tanggal_penerimaan);
create index if not exists ppg_reports_role_idx on public.ppg_reports(jabatan_penerima);
create index if not exists ppg_programs_period_idx on public.ppg_programs(program_start, program_end, status);
create index if not exists ppg_program_items_program_idx on public.ppg_program_items(program_id, status);
create index if not exists ppg_program_updates_item_idx on public.ppg_program_updates(program_item_id, tanggal desc);
create index if not exists ppg_loss_events_unit_date_idx on public.ppg_loss_events(unit_kerja_id, tanggal_kejadian desc);
create index if not exists ppg_loss_events_status_idx on public.ppg_loss_events(status, klasifikasi_limit);
create index if not exists ppg_loss_links_report_idx on public.ppg_loss_event_report_links(report_id, link_type);
create index if not exists ppg_library_controls_control_idx on public.ppg_library_risk_controls(control_id, risk_library_id);
create index if not exists ppg_program_item_controls_control_idx on public.ppg_program_item_controls(control_id, program_item_id);
create index if not exists ppg_loss_events_generic_risk_idx on public.ppg_loss_events(risk_library_id, tanggal_kejadian desc, status);
create index if not exists ppg_loss_event_controls_control_idx on public.ppg_loss_event_controls(control_id, loss_event_id);
create index if not exists ppg_register_treated_program_idx on public.ppg_register(treated_program_id, unit_kerja_id);
create index if not exists ppg_program_items_generic_risk_idx on public.ppg_program_items(risk_library_id, status);
create index if not exists ppg_program_cluster_units_unit_idx on public.ppg_program_cluster_units(unit_kerja_id, program_cluster_id);
create index if not exists ppg_risk_import_rows_batch_idx on public.ppg_risk_import_rows(batch_id, source_row);
create index if not exists ppg_risk_import_rows_library_idx on public.ppg_risk_import_rows(matched_library_id, match_status);
create index if not exists ppg_risk_candidates_status_idx on public.ppg_risk_candidates(status, created_at desc);
create index if not exists ppg_risk_candidate_members_row_idx on public.ppg_risk_candidate_members(import_row_id, candidate_id);

-- Referensi kriteria dampak resmi MA ditampilkan sebagai bagian Knowledge Base.
-- Dynamic SQL menjaga migrasi PPG tetap dapat dijalankan sebelum modul Knowledge dibuat.
do $ppg_knowledge$
begin
  if to_regclass('public.knowledge_items') is not null then
    execute $seed$
      insert into public.knowledge_items (id, judul, deskripsi, konten, kategori, tipe, penulis)
      values (
        '47500000-0000-4000-8000-000000000001',
        'Kriteria Dampak Manajemen Risiko Mahkamah Agung RI',
        'Referensi enam area dampak dan lima level dampak yang digunakan dalam pencatatan Loss Event Database PPG.',
        $md$## Petunjuk penggunaan

Pilih **area dampak** yang paling relevan dengan akibat aktual kejadian, kemudian pilih **level dampak** berdasarkan kriteria pada area tersebut. Uraian dampak pada loss event harus menjelaskan fakta yang mendukung level yang dipilih.

### 1. Kerugian Keuangan Negara dan Pihak Ketiga

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | ≤0,01% dari total anggaran non-Belanja Pegawai pada unit Pemilik Risiko. |
| 2 — Rendah | >0,01%–0,1% dari total anggaran non-Belanja Pegawai pada unit Pemilik Risiko. |
| 3 — Sedang | >0,1%–1% dari total anggaran non-Belanja Pegawai pada unit Pemilik Risiko. |
| 4 — Tinggi | >1%–5% dari total anggaran non-Belanja Pegawai pada unit Pemilik Risiko. |
| 5 — Sangat Tinggi | >5% dari total anggaran non-Belanja Pegawai pada unit Pemilik Risiko. |

### 2. Penurunan Reputasi

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | Jumlah keluhan pemangku kepentingan (*stakeholder*) kurang dari 10. |
| 2 — Rendah | Jumlah keluhan pemangku kepentingan sebanyak 10 sampai dengan 20. |
| 3 — Sedang | Jumlah keluhan pemangku kepentingan lebih dari 20. |
| 4 — Tinggi | Pemberitaan negatif di media lokal dan media sosial yang sesuai fakta. |
| 5 — Sangat Tinggi | Pemberitaan negatif di media massa nasional dan/atau media massa internasional. |

### 3. Kesehatan dan Keselamatan Kerja

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | Tidak berbahaya. |
| 2 — Rendah | Gangguan kesehatan fisik ringan; masih mampu bekerja pada hari yang sama. |
| 3 — Sedang | Gangguan kesehatan fisik dan/atau mental sedang; tidak mampu melaksanakan tugas lebih dari 1 hari sampai dengan 3 minggu. |
| 4 — Tinggi | Gangguan kesehatan fisik dan/atau mental berat; tidak mampu melaksanakan tugas lebih dari 3 minggu, mengakibatkan cacat tetap, atau gangguan jiwa permanen. |
| 5 — Sangat Tinggi | Kejadian fatal/kematian. |

### 4. Realisasi Capaian Kinerja Sasaran Strategis

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | Capaian IKU lebih dari 97% dan kurang dari 100%. |
| 2 — Rendah | Capaian IKU lebih dari 92% dan kurang dari 97%. |
| 3 — Sedang | Capaian IKU lebih dari 87% dan kurang dari 92%. |
| 4 — Tinggi | Capaian IKU lebih dari 80% dan kurang dari 87%. |
| 5 — Sangat Tinggi | Capaian IKU lebih dari 70% dan kurang dari 80%. |

### 5. Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Badan Pengawasan

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | Tidak ada temuan pengembalian uang ke kas negara dan penyimpangan material. |
| 2 — Rendah | Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan sampai dengan 0,1% dari total anggaran. |
| 3 — Sedang | Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan lebih dari 0,1% sampai dengan 1% dari total anggaran. |
| 4 — Tinggi | Ada temuan pengembalian uang ke kas negara dan/atau penyimpangan. |
| 5 — Sangat Tinggi | Temuan hasil pemeriksaan BPK dan hasil pengawasan Badan Pengawasan. |

### 6. Gangguan terhadap Layanan Tusi Organisasi

| Level | Kriteria |
| --- | --- |
| 1 — Sangat Rendah | Layanan terganggu maksimal 1 jam. |
| 2 — Rendah | Layanan terganggu lebih dari 1 jam sampai dengan 2,5 jam. |
| 3 — Sedang | Layanan terganggu lebih dari 2,5 jam sampai dengan 5 jam. |
| 4 — Tinggi | Layanan terganggu lebih dari 5 jam sampai dengan 7,5 jam. |
| 5 — Sangat Tinggi | Layanan terganggu maksimal 1 hari kerja. |

> Referensi: Tabel B. Kriteria Dampak Mahkamah Agung RI yang menjadi dasar konfigurasi modul PPG.$md$,
        'MR', 'Matriks', 'Mahkamah Agung RI'
      )
      on conflict (id) do update set judul = excluded.judul, deskripsi = excluded.deskripsi,
        konten = excluded.konten, kategori = excluded.kategori, tipe = excluded.tipe, penulis = excluded.penulis
    $seed$;
  end if;
end
$ppg_knowledge$;

do $$ declare t text; begin
  foreach t in array array['ppg_risk_library','ppg_control_library','ppg_library_risk_controls','ppg_register','ppg_risk_controls','ppg_risk_control_validations','ppg_mitigations','ppg_import_batches','ppg_reports','ppg_classification_rules','ppg_audit_log','ppg_analysis_snapshots','ppg_risk_import_batches','ppg_risk_import_rows','ppg_risk_candidates','ppg_risk_candidate_members','ppg_action_catalog','ppg_programs','ppg_program_items','ppg_program_item_controls','ppg_program_clusters','ppg_program_cluster_units','ppg_program_updates','ppg_led_limit_versions','ppg_loss_events','ppg_loss_event_controls','ppg_loss_event_report_links','ppg_program_loss_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "ppg admin select" on public.%I', t);
    execute format('drop policy if exists "ppg admin insert" on public.%I', t);
    execute format('drop policy if exists "ppg admin update" on public.%I', t);
    execute format('drop policy if exists "ppg admin delete" on public.%I', t);
    execute format('create policy "ppg admin select" on public.%I for select using (public.ppg_is_pusat())', t);
    execute format('create policy "ppg admin insert" on public.%I for insert with check (public.ppg_is_pusat())', t);
    execute format('create policy "ppg admin update" on public.%I for update using (public.ppg_is_pusat()) with check (public.ppg_is_pusat())', t);
    execute format('create policy "ppg admin delete" on public.%I for delete using (public.ppg_is_pusat())', t);
  end loop;
end $$;

-- Kontrol aktual: Satker mengelola kontrol milik register unitnya. UPG Pusat
-- membaca seluruhnya; validasi disimpan pada tabel terpisah khusus pusat.
drop policy if exists "ppg admin select" on public.ppg_risk_controls;
drop policy if exists "ppg admin insert" on public.ppg_risk_controls;
drop policy if exists "ppg admin update" on public.ppg_risk_controls;
drop policy if exists "ppg admin delete" on public.ppg_risk_controls;
drop policy if exists "ppg risk control select" on public.ppg_risk_controls;
drop policy if exists "ppg risk control insert" on public.ppg_risk_controls;
drop policy if exists "ppg risk control update" on public.ppg_risk_controls;
drop policy if exists "ppg risk control delete" on public.ppg_risk_controls;
create policy "ppg risk control select" on public.ppg_risk_controls for select using (
  public.ppg_is_pusat() or exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id())
);
create policy "ppg risk control insert" on public.ppg_risk_controls for insert with check (
  public.is_admin_sistem() or (public.ppg_is_satker() and exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id()))
);
create policy "ppg risk control update" on public.ppg_risk_controls for update using (
  public.is_admin_sistem() or (public.ppg_is_satker() and exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id()))
) with check (
  public.is_admin_sistem() or (public.ppg_is_satker() and exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id()))
);
create policy "ppg risk control delete" on public.ppg_risk_controls for delete using (
  public.is_admin_sistem() or (public.ppg_is_satker() and exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id()))
);

drop policy if exists "ppg satker validation select" on public.ppg_risk_control_validations;
create policy "ppg satker validation select" on public.ppg_risk_control_validations for select using (
  public.ppg_is_satker() and exists(select 1 from public.ppg_register r where r.id = risk_id and r.unit_kerja_id = public.ppg_user_unit_id())
);

-- Penilaian Risiko: UPG Satker mengelola register unitnya, UPG Pusat hanya
-- membaca seluruh hasil, dan Admin Sistem dapat melakukan koreksi penuh.
drop policy if exists "ppg admin select" on public.ppg_register;
drop policy if exists "ppg admin insert" on public.ppg_register;
drop policy if exists "ppg admin update" on public.ppg_register;
drop policy if exists "ppg admin delete" on public.ppg_register;
drop policy if exists "ppg register select" on public.ppg_register;
drop policy if exists "ppg register insert" on public.ppg_register;
drop policy if exists "ppg register update" on public.ppg_register;
drop policy if exists "ppg register delete" on public.ppg_register;
create policy "ppg register select" on public.ppg_register for select using (
  public.ppg_is_pusat() or
  (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id())
);
create policy "ppg register insert" on public.ppg_register for insert with check (
  public.is_admin_sistem() or
  (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id() and created_by = auth.uid())
);
create policy "ppg register update" on public.ppg_register for update using (
  public.is_admin_sistem() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id())
) with check (
  public.is_admin_sistem() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id())
);
create policy "ppg register delete" on public.ppg_register for delete using (
  public.is_admin_sistem() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id())
);

-- Satker boleh membaca library pusat sebagai sumber adopsi, tanpa hak ubah.
drop policy if exists "ppg satker reference select" on public.ppg_risk_library;
create policy "ppg satker reference select" on public.ppg_risk_library for select using (public.ppg_is_satker());
drop policy if exists "ppg satker control reference select" on public.ppg_control_library;
create policy "ppg satker control reference select" on public.ppg_control_library for select using (public.ppg_is_satker() and status = 'aktif');
drop policy if exists "ppg satker library relation select" on public.ppg_library_risk_controls;
create policy "ppg satker library relation select" on public.ppg_library_risk_controls for select using (
  public.ppg_is_satker() and
  exists(select 1 from public.ppg_risk_library r where r.id = risk_library_id and r.status = 'aktif') and
  exists(select 1 from public.ppg_control_library c where c.id = control_id and c.status = 'aktif')
);

-- UPG Satker hanya mengelola draf/ajuan loss event milik unitnya. UPG Pusat
-- dan admin memiliki cakupan lintas satker; tabel PPG lainnya tetap pusat.
drop policy if exists "ppg admin select" on public.ppg_loss_events;
drop policy if exists "ppg admin insert" on public.ppg_loss_events;
drop policy if exists "ppg admin update" on public.ppg_loss_events;
drop policy if exists "ppg admin delete" on public.ppg_loss_events;
drop policy if exists "ppg loss select" on public.ppg_loss_events;
drop policy if exists "ppg loss insert" on public.ppg_loss_events;
drop policy if exists "ppg loss update" on public.ppg_loss_events;
drop policy if exists "ppg loss delete" on public.ppg_loss_events;
create policy "ppg loss select" on public.ppg_loss_events for select using (public.ppg_is_pusat() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id()));
create policy "ppg loss insert" on public.ppg_loss_events for insert with check (public.ppg_is_pusat() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id() and created_by = auth.uid()));
create policy "ppg loss update" on public.ppg_loss_events for update using (public.ppg_is_pusat() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id() and status in ('draft','perlu_perbaikan'))) with check (public.ppg_is_pusat() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id()));
create policy "ppg loss delete" on public.ppg_loss_events for delete using (public.ppg_is_pusat() or (public.ppg_is_satker() and unit_kerja_id = public.ppg_user_unit_id() and status = 'draft'));

drop policy if exists "ppg loss control select" on public.ppg_loss_event_controls;
create policy "ppg loss control select" on public.ppg_loss_event_controls for select using (
  public.ppg_is_pusat() or exists(
    select 1 from public.ppg_loss_events e
    where e.id = loss_event_id and e.unit_kerja_id = public.ppg_user_unit_id()
  )
);

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('ppg-led-bukti','ppg-led-bukti',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

revoke all on function public.is_admin_sistem() from public;
grant execute on function public.is_admin_sistem() to authenticated;
revoke all on function public.ppg_is_pusat() from public;
revoke all on function public.ppg_is_satker() from public;
revoke all on function public.ppg_user_unit_id() from public;
grant execute on function public.ppg_is_pusat() to authenticated;
grant execute on function public.ppg_is_satker() to authenticated;
grant execute on function public.ppg_user_unit_id() to authenticated;

-- ============================================================================
-- Scenario/save slot PPG
-- Data lama selalu menjadi slot riil. Slot simulasi dipilih per pengguna dan
-- dipisahkan pada lapisan database agar tidak masuk analitik/ekspor slot lain.
-- ============================================================================
create table if not exists public.ppg_scenarios (
  id uuid primary key,
  key text not null unique check (key in ('real','demo')),
  nama text not null,
  deskripsi text not null default '',
  is_demo boolean not null default false,
  created_at timestamptz not null default now()
);

insert into public.ppg_scenarios (id,key,nama,deskripsi,is_demo) values
  ('00000000-0000-4000-8000-000000000001','real','Data Riil','Data operasional resmi PPG.',false),
  ('00000000-0000-4000-8000-000000000002','demo','Simulasi Lengkap','Data dummy untuk demonstrasi alur PPG.',true)
on conflict (id) do update set key=excluded.key,nama=excluded.nama,deskripsi=excluded.deskripsi,is_demo=excluded.is_demo;

create table if not exists public.ppg_user_scenario_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  scenario_id uuid not null references public.ppg_scenarios(id) on delete restrict
    default '00000000-0000-4000-8000-000000000001',
  updated_at timestamptz not null default now()
);

create or replace function public.ppg_current_scenario_id()
returns uuid language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select scenario_id from public.ppg_user_scenario_preferences where user_id = auth.uid()),
    '00000000-0000-4000-8000-000000000001'::uuid
  )
$$;

do $$ declare t text; begin
  foreach t in array array[
    'ppg_risk_library','ppg_control_library','ppg_library_risk_controls','ppg_register',
    'ppg_risk_controls','ppg_risk_control_validations','ppg_mitigations','ppg_import_batches',
    'ppg_reports','ppg_audit_log','ppg_analysis_snapshots','ppg_risk_import_batches',
    'ppg_risk_import_rows','ppg_risk_candidates','ppg_risk_candidate_members','ppg_programs',
    'ppg_program_items','ppg_program_item_controls','ppg_program_clusters',
    'ppg_program_cluster_units','ppg_program_updates','ppg_loss_events',
    'ppg_loss_event_controls','ppg_loss_event_report_links','ppg_program_loss_events'
  ] loop
    execute format(
      'alter table public.%I add column if not exists scenario_id uuid not null default public.ppg_current_scenario_id() references public.ppg_scenarios(id) on delete restrict', t
    );
    execute format('create index if not exists %I on public.%I(scenario_id)', t || '_scenario_idx', t);
    execute format('drop policy if exists "ppg scenario isolation" on public.%I', t);
    execute format(
      'create policy "ppg scenario isolation" on public.%I as restrictive for all using (scenario_id = public.ppg_current_scenario_id()) with check (scenario_id = public.ppg_current_scenario_id())', t
    );
  end loop;
end $$;

-- Kode bisnis boleh sama pada dua slot karena record-nya tetap terisolasi.
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_kode_key;
alter table public.ppg_risk_library drop constraint if exists ppg_risk_library_scenario_kode_key;
alter table public.ppg_risk_library add constraint ppg_risk_library_scenario_kode_key unique(scenario_id,kode);
alter table public.ppg_control_library drop constraint if exists ppg_control_library_kode_key;
alter table public.ppg_control_library drop constraint if exists ppg_control_library_scenario_kode_key;
alter table public.ppg_control_library add constraint ppg_control_library_scenario_kode_key unique(scenario_id,kode);
alter table public.ppg_register drop constraint if exists ppg_register_kode_tahun_periode_unit_nama_key;
alter table public.ppg_register drop constraint if exists ppg_register_scenario_business_key;
alter table public.ppg_register add constraint ppg_register_scenario_business_key unique(scenario_id,kode,tahun,periode,unit_nama);
alter table public.ppg_import_batches drop constraint if exists ppg_import_batches_file_hash_source_sheet_key;
alter table public.ppg_import_batches drop constraint if exists ppg_import_batches_scenario_source_key;
alter table public.ppg_import_batches add constraint ppg_import_batches_scenario_source_key unique(scenario_id,file_hash,source_sheet);
alter table public.ppg_risk_import_batches drop constraint if exists ppg_risk_import_batches_file_hash_source_sheet_mode_key;
alter table public.ppg_risk_import_batches drop constraint if exists ppg_risk_import_batches_scenario_source_key;
alter table public.ppg_risk_import_batches add constraint ppg_risk_import_batches_scenario_source_key unique(scenario_id,file_hash,source_sheet,mode);
alter table public.ppg_programs drop constraint if exists ppg_programs_kode_key;
alter table public.ppg_programs drop constraint if exists ppg_programs_scenario_kode_key;
alter table public.ppg_programs add constraint ppg_programs_scenario_kode_key unique(scenario_id,kode);

alter table public.ppg_scenarios enable row level security;
alter table public.ppg_user_scenario_preferences enable row level security;
drop policy if exists "ppg scenario read" on public.ppg_scenarios;
create policy "ppg scenario read" on public.ppg_scenarios for select to authenticated using (true);
drop policy if exists "ppg own scenario preference" on public.ppg_user_scenario_preferences;
create policy "ppg own scenario preference" on public.ppg_user_scenario_preferences
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on function public.ppg_current_scenario_id() from public;
grant execute on function public.ppg_current_scenario_id() to authenticated;
