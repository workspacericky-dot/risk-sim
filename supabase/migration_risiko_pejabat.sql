-- Migration: add pejabat columns to risiko table
-- Run this in Supabase SQL editor

ALTER TABLE risiko
  ADD COLUMN IF NOT EXISTS nama_pemilik_risiko     TEXT,
  ADD COLUMN IF NOT EXISTS jabatan_pemilik_risiko  TEXT,
  ADD COLUMN IF NOT EXISTS nama_pengelola_risiko   TEXT,
  ADD COLUMN IF NOT EXISTS jabatan_pengelola_risiko TEXT,
  ADD COLUMN IF NOT EXISTS proses_bisnis_item      TEXT;
