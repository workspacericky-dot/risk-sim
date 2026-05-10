-- Migration: penetapan_konteks v2
-- Adds new fields for the full Formulir Penetapan Konteks Manajemen Risiko

ALTER TABLE penetapan_konteks
  ADD COLUMN IF NOT EXISTS nama_pemilik_risiko     TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS jabatan_pemilik_risiko   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS nama_pengelola_risiko    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS jabatan_pengelola_risiko TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS periode_mulai            DATE,
  ADD COLUMN IF NOT EXISTS periode_selesai          DATE,
  -- proses_bisnis_json: [{kode, nama, indikator}]
  ADD COLUMN IF NOT EXISTS proses_bisnis_json       JSONB NOT NULL DEFAULT '[]',
  -- pemangku_kepentingan: [{nama, keterangan}]
  ADD COLUMN IF NOT EXISTS pemangku_kepentingan     JSONB NOT NULL DEFAULT '[]';

-- NOTE: sasaran_strategis column format is upgraded from string[]
-- to [{sasaran: string, indikator: string[]}]
-- The identifikasi page handles both formats via backward-compat parsing.
