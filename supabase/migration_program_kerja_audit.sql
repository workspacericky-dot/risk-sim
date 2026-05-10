-- ============================================================
-- Migration: Program Kerja Audit (PKA)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.program_kerja_audit (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  konteks_id          UUID NOT NULL REFERENCES public.penetapan_konteks(id) ON DELETE CASCADE,
  risiko_id           UUID NOT NULL REFERENCES public.risiko(id) ON DELETE CASCADE,
  -- Uraian: synthesis of pengendalian eksisting + utama (generated, but editable)
  uraian              TEXT DEFAULT NULL,
  -- User-editable fields
  no_kka              VARCHAR(100) DEFAULT NULL,
  waktu_pelaksanaan   TEXT DEFAULT NULL,   -- free text: e.g. "Jan–Mar 2026" or date range
  dilaksanakan_oleh   TEXT DEFAULT NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (konteks_id, risiko_id)
);

ALTER TABLE public.program_kerja_audit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for authenticated" ON public.program_kerja_audit
  FOR ALL USING (auth.role() = 'authenticated');
