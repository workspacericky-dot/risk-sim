-- RALS v12 — Bowtie kini menganalisis risiko yang SUDAH diidentifikasi
-- (via teknik lain / register manual), bukan membuat Top Event baru.
-- Bowtie fokus murni pada Ancaman (penyebab) & Dampak (akibat) + perisai.
-- Jalankan di Supabase SQL editor (setelah v11).

alter table public.rals_bowtie
  add column if not exists risk_id uuid references public.rals_risk(id) on delete cascade;

-- Satu risiko maksimal punya satu diagram bowtie.
create unique index if not exists rals_bowtie_risk_id_uniq on public.rals_bowtie(risk_id);

-- Kolom lama tidak lagi relevan — Top Event, kategori, dan konteks proses
-- bisnis kini diambil langsung dari risiko yang dipilih.
alter table public.rals_bowtie drop column if exists top_event;
alter table public.rals_bowtie drop column if exists l1_kode;
alter table public.rals_bowtie drop column if exists l1_nama;
alter table public.rals_bowtie drop column if exists l2_kode;
alter table public.rals_bowtie drop column if exists l2_nama;
alter table public.rals_bowtie drop column if exists kategori;
alter table public.rals_bowtie drop column if exists promoted_risk_id;
