// Definisi kolom/judul ekspor RALS per tahap, dipakai bersama oleh
// buildOrgStageExport (rals-org-export.ts), /api/rals/export (Excel),
// /dashboard/rals/print (PDF via cetak browser), dan generator template
// (scripts/gen-rals-templates.mjs) agar tidak drift. Definisi kolom & judul
// sendiri tinggal di rals-export-columns.json — satu sumber untuk app & generator.
import stageDefs from './rals-export-columns.json'

export const EXPORT_STAGES = ['konteks', 'identifikasi', 'analisis', 'evaluasi', 'penanganan'] as const
export type ExportStage = (typeof EXPORT_STAGES)[number]

export type ExportColumn = { header: string; key: string; width?: number }
export type ExportRow = Record<string, string | number>
export type ExportSheet = { title: string; columns: ExportColumn[]; rows: ExportRow[] }

export const STAGE_TITLES = Object.fromEntries(
  EXPORT_STAGES.map((s) => [s, stageDefs[s].title]),
) as Record<ExportStage, string>
