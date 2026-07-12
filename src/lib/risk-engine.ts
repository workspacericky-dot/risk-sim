// Sumber tunggal "mesin risiko" SPIP untuk RALS.
// Nilai matriks & ambang level identik dengan halaman analisis/evaluasi induk
// (Lampiran 3 Pedoman MA). Dikonsolidasikan di sini agar tidak drift.

// RISK_MATRIX[kemungkinan][dampak] → besaran (1–25)
export const RISK_MATRIX: Record<number, Record<number, number>> = {
  5: { 1: 9,  2: 15, 3: 18, 4: 23, 5: 25 },
  4: { 1: 6,  2: 12, 3: 16, 4: 19, 5: 24 },
  3: { 1: 4,  2: 8,  3: 14, 4: 17, 5: 22 },
  2: { 1: 2,  2: 7,  3: 10, 4: 13, 5: 21 },
  1: { 1: 1,  2: 3,  3: 5,  4: 11, 5: 20 },
}

export function getBesaran(k: number | null | undefined, d: number | null | undefined): number | null {
  if (!k || !d) return null
  return RISK_MATRIX[k]?.[d] ?? null
}

export type Level = { label: string; color: string }

// Ambang identik dengan evaluasi induk: ≥20 ST, ≥16 T, ≥11 M, ≥6 R, else SR.
export function getLevel(besaran: number | null): Level {
  if (!besaran)     return { label: '–',              color: '#94a3b8' } // slate-400
  if (besaran >= 20) return { label: 'Sangat Tinggi',  color: '#b91c1c' } // red-700
  if (besaran >= 16) return { label: 'Tinggi',         color: '#ea580c' } // orange-600
  if (besaran >= 11) return { label: 'Moderat',        color: '#ca8a04' } // yellow-600
  if (besaran >= 6)  return { label: 'Rendah',         color: '#16a34a' } // green-600
  return               { label: 'Sangat Rendah',  color: '#0891b2' }      // cyan-600
}

// 7 kategori risiko + hint untuk membantu peserta memilih (Lampiran 4).
export type Kategori = { key: string; label: string; hint: string }

export const KATEGORI_RISIKO: Kategori[] = [
  { key: 'strategis',   label: 'Risiko Strategis',   hint: 'Gagal mencapai sasaran/tujuan jangka panjang unit.' },
  { key: 'kebijakan',   label: 'Risiko Kebijakan',   hint: 'Kebijakan yang keliru atau tidak tepat sasaran.' },
  { key: 'kecurangan',  label: 'Risiko Kecurangan',  hint: 'Fraud: korupsi, suap, penyalahgunaan wewenang.' },
  { key: 'bencana',     label: 'Risiko Bencana',     hint: 'Peristiwa di luar kendali: bencana alam, kebakaran, gangguan besar.' },
  { key: 'kepatuhan',   label: 'Risiko Kepatuhan',   hint: 'Pelanggaran atas peraturan perundang-undangan.' },
  { key: 'operasional', label: 'Risiko Operasional', hint: 'Kegagalan proses/SDM/sistem dalam operasi sehari-hari.' },
  { key: 'kemitraan',   label: 'Risiko Kemitraan',   hint: 'Kegagalan pihak ketiga / mitra kerja sama.' },
]

// Cari ambang selera dari kategori (string label) → key preset skenario.
export function getKategoriKey(kategoriLabel: string | null): string | null {
  if (!kategoriLabel) return null
  const k = kategoriLabel.toLowerCase()
  return KATEGORI_RISIKO.find((c) => k.includes(c.key) || (c.key === 'kecurangan' && k.includes('fraud')))?.key ?? null
}

// Label deskriptif skala 1–5 untuk slider terpandu (bukan angka telanjang).
export const KEMUNGKINAN_LABELS: Record<number, string> = {
  1: 'Hampir tidak terjadi',
  2: 'Kemungkinan kecil terjadi',
  3: 'Mungkin terjadi',
  4: 'Kemungkinan besar terjadi',
  5: 'Hampir pasti terjadi',
}

export const DAMPAK_LABELS: Record<number, string> = {
  1: 'Tidak signifikan',
  2: 'Minor',
  3: 'Moderat',
  4: 'Signifikan',
  5: 'Sangat signifikan',
}
