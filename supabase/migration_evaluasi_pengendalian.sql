-- ============================================================
-- Migration: Evaluasi Pengendalian Utama + Penyebab Risiko Detail
-- ============================================================

-- 1. Add questionnaire columns to analisis_risiko
--    (replaces simple boolean efektivitas_control with 4-question assessment)
ALTER TABLE public.analisis_risiko
  ADD COLUMN IF NOT EXISTS q1_ada_pengendalian_pencegah  BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS q2_pengendalian_memadai       BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS q3_dilaksanakan_konsisten     BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS q4_risiko_tidak_terjadi       BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS kecukupan_pengendalian        VARCHAR(60) DEFAULT NULL;
-- kecukupan_pengendalian values:
--   'Memadai'                    (Q4=Ya)
--   'Cukup Memadai'              (Q3=Ya, Q4=Tidak)
--   'Kurang Memadai'             (Q2=Ya, Q3=Tidak)
--   'Tidak Memadai'              (Q1=Ya, Q2=Tidak)
--   'Tidak Memiliki Pengendalian' (Q1=Tidak)

-- 2. Table for Evaluasi Pengendalian Utama (Lampiran ~)
CREATE TABLE IF NOT EXISTS public.evaluasi_pengendalian_utama (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risiko_id             UUID NOT NULL REFERENCES public.risiko(id) ON DELETE CASCADE,
  konteks_id            UUID NOT NULL REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
  pengendalian_eksisting TEXT DEFAULT NULL,
  pengendalian_utama    TEXT DEFAULT NULL,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (risiko_id)
);

-- 3. Table for Penyebab Risiko Detail (Analisis Akar Masalah / 5 Whys)
CREATE TABLE IF NOT EXISTS public.penyebab_risiko_detail (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  risiko_id             UUID NOT NULL REFERENCES public.risiko(id) ON DELETE CASCADE,
  -- Kolom 1: kode (auto from kode_risiko)
  -- Kolom 2: pernyataan_risiko (looked up from risiko)
  why1                  TEXT DEFAULT NULL,
  why2                  TEXT DEFAULT NULL,
  why3                  TEXT DEFAULT NULL,
  why4                  TEXT DEFAULT NULL,
  why5                  TEXT DEFAULT NULL,
  akar_penyebab         TEXT DEFAULT NULL,
  kategori_penyebab     VARCHAR(10) DEFAULT NULL, -- MN, MY, MD, MR, MC, EX
  kode_penyebab         VARCHAR(100) DEFAULT NULL, -- auto: [kode_risiko].[kategori].[nomor]
  kegiatan_pengendalian TEXT DEFAULT NULL,
  nomor_urut_dalam_kategori INTEGER DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);
-- Note: one risk can have multiple penyebab rows (one per akar penyebab identified)

-- Enable RLS (inherit policy from parent tables)
ALTER TABLE public.evaluasi_pengendalian_utama ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penyebab_risiko_detail      ENABLE ROW LEVEL SECURITY;

-- Permissive policies (adjust to your auth model as needed)
CREATE POLICY "Allow all for authenticated" ON public.evaluasi_pengendalian_utama
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all for authenticated" ON public.penyebab_risiko_detail
  FOR ALL USING (auth.role() = 'authenticated');
