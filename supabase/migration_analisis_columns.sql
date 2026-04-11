-- Migration: Ensure all analisis_risiko columns required by the app are present.
-- Safe to run multiple times (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).

-- Columns added in migration_lampiran6.sql (may already exist):
ALTER TABLE public.analisis_risiko
  ADD COLUMN IF NOT EXISTS ada_pengendalian       BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS residual_kemungkinan   INTEGER CHECK (residual_kemungkinan BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_dampak        INTEGER CHECK (residual_dampak      BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS residual_level         INTEGER;

-- Columns that were in schema.sql but may be missing if table was created differently:
ALTER TABLE public.analisis_risiko
  ADD COLUMN IF NOT EXISTS existing_control       TEXT,
  ADD COLUMN IF NOT EXISTS efektivitas_control    BOOLEAN,
  ADD COLUMN IF NOT EXISTS di_atas_selera_risiko  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS status_risiko          INTEGER;

-- Ensure risiko_id has the UNIQUE constraint needed for upsert onConflict.
-- This will fail gracefully if already exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_constraint c
    JOIN   pg_class t ON t.oid = c.conrelid
    WHERE  t.relname = 'analisis_risiko'
      AND  c.contype = 'u'
      AND  c.conname = 'analisis_risiko_risiko_id_key'
  ) THEN
    ALTER TABLE public.analisis_risiko
      ADD CONSTRAINT analisis_risiko_risiko_id_key UNIQUE (risiko_id);
  END IF;
END$$;

-- Kolom risiko di Lampiran 5 (juga dari migration_lampiran6):
ALTER TABLE public.risiko
  ADD COLUMN IF NOT EXISTS indikator_konteks       TEXT,
  ADD COLUMN IF NOT EXISTS metode_pencapaian_spip  TEXT;
