// Tipe & konstanta Teknik Identifikasi Risiko: SWIFT Analysis (Structured What-If Technique).

export const SWIFT_MAX_NODES = 10

export type SwiftSession = {
  id: string
  session_id: string
  participant_id: string
  l1_kode: string
  l1_nama: string
  l2_kode: string
  l2_nama: string
  created_at: string
}

export type SwiftNode = {
  id: string
  swift_session_id: string
  step_order: number
  step_description: string
  created_at: string
}

export type SwiftPriority = 'Low' | 'Med Low' | 'Med High' | 'High'

export type SwiftScenario = {
  id: string
  swift_session_id: string
  node_id: string | null
  session_id: string
  participant_id: string
  generated_prompt: string
  what_if_scenario: string
  immediate_impact: string
  final_outcome: string
  risk_priority: SwiftPriority
  current_control: string
  treatment_recommendation: string
  kategori: string
  promoted_risk_id: string | null
  created_at: string
}

export type SwiftGuideword = { key: string; label: string; template: (step: string) => string }

// Kata kunci pemicu "Bagaimana jika...?" — generik, berlaku untuk proses apa pun.
export const SWIFT_GUIDEWORDS: SwiftGuideword[] = [
  { key: 'timing',      label: 'Timing',              template: (s) => `Bagaimana jika ${s} terlambat atau tidak tepat waktu?` },
  { key: 'volume',      label: 'Volume/Jumlah',        template: (s) => `Bagaimana jika ${s} terjadi jauh lebih banyak atau lebih sedikit dari biasanya?` },
  { key: 'orang',       label: 'Orang',                template: (s) => `Bagaimana jika petugas yang menjalankan ${s} tidak kompeten atau tidak hadir?` },
  { key: 'sistem',      label: 'Sistem/Teknologi',     template: (s) => `Bagaimana jika sistem yang mendukung ${s} gagal atau down?` },
  { key: 'kepatuhan',   label: 'Kepatuhan Prosedur',   template: (s) => `Bagaimana jika ${s} dilakukan tanpa mengikuti prosedur yang berlaku?` },
  { key: 'komunikasi',  label: 'Komunikasi/Informasi', template: (s) => `Bagaimana jika informasi pada ${s} salah, tidak lengkap, atau tidak sampai?` },
  { key: 'eksternal',   label: 'Gangguan Eksternal',   template: (s) => `Bagaimana jika terjadi gangguan eksternal (bencana, mati listrik, dsb.) saat ${s}?` },
  { key: 'kecurangan',  label: 'Kecurangan',           template: (s) => `Bagaimana jika ada pihak yang menyalahgunakan ${s} untuk kepentingan pribadi?` },
]

// Warna disamakan dengan skema level risk-engine agar bahasa visual konsisten se-RALS.
export const SWIFT_PRIORITIES: { key: SwiftPriority; color: string }[] = [
  { key: 'Low',      color: '#16a34a' }, // green-600
  { key: 'Med Low',  color: '#ca8a04' }, // yellow-600
  { key: 'Med High', color: '#ea580c' }, // orange-600
  { key: 'High',     color: '#b91c1c' }, // red-700
]

export function isHighPriority(p: SwiftPriority): boolean {
  return p === 'Med High' || p === 'High'
}

// Konversi struktural "Bagaimana jika [klausa]?" -> "[Klausa]." — melepas
// bingkai pertanyaan eksplorasi SWIFT jadi kalimat berita untuk register
// risiko, tanpa mengubah kata atau makna sedikit pun. Setiap template di
// SWIFT_GUIDEWORDS sengaja ditulis agar klausa setelah "Bagaimana jika"
// sudah gramatikal berdiri sendiri sebagai kalimat berita.
export function toDeclarativeStatement(text: string): string {
  const match = text.trim().match(/^bagaimana jika\s+(.+?)\s*\??\s*$/i)
  if (!match) return text.trim()
  const clause = match[1].trim()
  const capitalized = clause.charAt(0).toUpperCase() + clause.slice(1)
  return capitalized.endsWith('.') ? capitalized : `${capitalized}.`
}
