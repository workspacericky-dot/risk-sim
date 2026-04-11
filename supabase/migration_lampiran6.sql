-- Migration: Add columns for Lampiran 5 (risiko) and Lampiran 6 (analisis_risiko)

ALTER TABLE public.risiko
  ADD COLUMN IF NOT EXISTS indikator_konteks TEXT,
  ADD COLUMN IF NOT EXISTS metode_pencapaian_spip TEXT;

ALTER TABLE public.analisis_risiko
  ADD COLUMN IF NOT EXISTS ada_pengendalian BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS residual_kemungkinan INTEGER CHECK (residual_kemungkinan BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_dampak INTEGER CHECK (residual_dampak BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_level INTEGER;
