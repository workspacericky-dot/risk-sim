-- Migration: rencana_tindak_pengendalian
-- Lampiran Pedoman No. 10 — Rencana Tindak Pengendalian
-- One row per penyebab_risiko_detail row that belongs to a priority risk

CREATE TABLE IF NOT EXISTS rencana_tindak_pengendalian (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  penyebab_id         UUID NOT NULL REFERENCES penyebab_risiko_detail(id) ON DELETE CASCADE,
  risiko_id           UUID NOT NULL REFERENCES risiko(id) ON DELETE CASCADE,
  konteks_id          UUID NOT NULL REFERENCES penetapan_konteks(id) ON DELETE CASCADE,
  -- Column 6: Klasifikasi Sub Unsur SPIP
  klasifikasi_spip    TEXT NOT NULL DEFAULT '',
  -- Column 7: Penanggung Jawab
  penanggung_jawab    TEXT NOT NULL DEFAULT '',
  -- Column 8: Indikator Keluaran
  indikator_keluaran  TEXT NOT NULL DEFAULT '',
  -- Column 9: Target Waktu
  target_waktu        TEXT NOT NULL DEFAULT '',
  -- Column 10: Frekuensi Rencana (1-5, kemungkinan setelah pengendalian diimplementasi)
  frekuensi_rencana   INTEGER CHECK (frekuensi_rencana IS NULL OR frekuensi_rencana BETWEEN 1 AND 5),
  -- Column 11: Dampak Rencana (1-5, dampak setelah pengendalian diimplementasi)
  dampak_rencana      INTEGER CHECK (dampak_rencana IS NULL OR dampak_rencana BETWEEN 1 AND 5),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(penyebab_id)
);

-- Row Level Security
ALTER TABLE rencana_tindak_pengendalian ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated users full access rtp"
  ON rencana_tindak_pengendalian
  FOR ALL
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_rtp_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER rtp_updated_at
  BEFORE UPDATE ON rencana_tindak_pengendalian
  FOR EACH ROW EXECUTE FUNCTION update_rtp_updated_at();
