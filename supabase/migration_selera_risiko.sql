-- Migration: Create / update selera_risiko_kategori table
-- Categories align with the official risk code reference:
--   1=Strategis, 2=Kebijakan, 3=Kecurangan, 4=Bencana, 5=Kepatuhan, 6=Operasional, 7=Kemitraan

CREATE TABLE IF NOT EXISTS selera_risiko_kategori (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  konteks_id   uuid        NOT NULL REFERENCES penetapan_konteks(id) ON DELETE CASCADE,
  strategis    integer     NOT NULL DEFAULT 9,
  kebijakan    integer     NOT NULL DEFAULT 9,
  kecurangan   integer     NOT NULL DEFAULT 4,
  bencana      integer     NOT NULL DEFAULT 9,
  kepatuhan    integer     NOT NULL DEFAULT 9,
  operasional  integer     NOT NULL DEFAULT 9,
  kemitraan    integer     NOT NULL DEFAULT 9,
  catatan      text,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now(),
  UNIQUE (konteks_id)
);

-- Add columns that may be missing if table was created in an older version
ALTER TABLE selera_risiko_kategori
  ADD COLUMN IF NOT EXISTS kebijakan   integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS bencana     integer NOT NULL DEFAULT 9,
  ADD COLUMN IF NOT EXISTS kemitraan   integer NOT NULL DEFAULT 9;

-- Old columns (reputasi, keuangan) are retained in the DB to avoid breaking
-- existing rows — they are simply no longer shown in the UI.

-- Enable RLS
ALTER TABLE selera_risiko_kategori ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'selera_risiko_kategori'
      AND policyname = 'Authenticated users can manage selera_risiko_kategori'
  ) THEN
    CREATE POLICY "Authenticated users can manage selera_risiko_kategori"
      ON selera_risiko_kategori
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
