-- ============================================================
-- Migration: Maturitas Penilaian + risiko.sasaran_strategis_item
-- ============================================================

-- Add sasaran_strategis_item to risiko table (Kolom 2 per-risiko)
ALTER TABLE public.risiko
  ADD COLUMN IF NOT EXISTS sasaran_strategis_item TEXT DEFAULT NULL;

-- ============================================================
-- Table: maturitas_penilaian
-- Stores Maturitas Manajemen Risiko assessment per konteks
-- ============================================================

CREATE TABLE IF NOT EXISTS public.maturitas_penilaian (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  konteks_id        UUID NOT NULL REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
  -- Array of 15 item scores: [{dokumen, wawancara, observasi, skor}]
  scores            JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_skor        INTEGER NOT NULL DEFAULT 0,
  level_maturitas   INTEGER NOT NULL DEFAULT 1,
  label_maturitas   VARCHAR(50) DEFAULT NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (konteks_id)
);

ALTER TABLE public.maturitas_penilaian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.maturitas_penilaian
  FOR ALL USING (auth.role() = 'authenticated');
