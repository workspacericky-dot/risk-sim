-- ============================================================
-- Migration: E-Perjadin Bawas — M5 (Anti-Fraud Dasbor, Audit Trail, Pelaporan Manajerial)
-- PRD: docs/PRD-E-Perjadin-Bawas.md  (F-6.2, F-6.3, O4)
-- Prasyarat: migrasi M0 … M4.
-- Jalankan di Supabase SQL editor. Aman dijalankan ulang.
--
-- Ruang lingkup migrasi ini kecil — sebagian besar M5 adalah halaman & ekspor
-- yang membaca data yang sudah ada. Di sini: (1) kolom penugasan_id opsional di
-- perjadin_log untuk rekonstruksi cepat, (2) peninjauan RLS (auditor_perjadin
-- boleh membaca jejak audit — F-6.3, PRD R-5).
-- ============================================================

-- ── perjadin_log: tautan langsung ke penugasan (rekonstruksi paket audit) ─
alter table public.perjadin_log
  add column if not exists penugasan_id uuid references public.perjadin_penugasan(id) on delete set null;
create index if not exists perjadin_log_penugasan_idx on public.perjadin_log (penugasan_id) where penugasan_id is not null;

-- ── Peninjauan RLS: jejak audit dapat dibaca auditor_perjadin (F-6.3) ────
-- Tetap insert-only untuk semua peran (tidak ada policy UPDATE/DELETE).
drop policy if exists "perjadin_log baca" on public.perjadin_log;
create policy "perjadin_log baca" on public.perjadin_log for select using (
  public.perjadin_is_admin() or public.perjadin_has_role('auditor_perjadin')
);

-- ── Ringkasan peninjauan RLS perjadin_* (R-5) — status per 31 Agu 2026 ──
-- perjadin_peran/_sbm/_pagu/_parameter : baca authenticated, tulis admin_sistem     [OK]
-- perjadin_log                          : sisip authenticated (aktor = self),
--                                         baca admin + auditor_perjadin, tanpa UPDATE/DELETE  [OK — insert-only]
-- perjadin_penugasan/_peserta/_dokumen  : baca via perjadin_boleh_lihat_penugasan()
--                                         (pelaksana: penugasan yang memuatnya; pengawas/keuangan: semua)  [OK]
-- perjadin_penugasan_pagu/_komitmen     : baca perjadin_peran_pengawas(); komitmen insert-only PPK/admin   [OK]
-- perjadin_presensi                     : sisip peserta sendiri; putus PPK/admin; baca via visibilitas     [OK]
-- perjadin_laporan/_segmen(/_versi)     : tulis anggota tim + pengelola/admin; baca via visibilitas         [OK]
-- perjadin_biaya                        : tulis peserta sendiri atau pengawas; baca via visibilitas         [OK]
-- perjadin_espj/_espj_peserta           : espj tulis anggota/pengawas; espj_peserta tulis pengawas          [OK]
-- perjadin_temuan                       : sisip pengawas; putus PPK/admin; baca pengawas                    [OK]
-- Catatan: penulisan lintas-peran (kunci biaya seluruh tim, pelepasan pagu oleh
-- Bendahara, transisi status oleh Bendahara) sengaja lewat service role di server
-- action yang sudah memvalidasi peran — bukan celah RLS.
