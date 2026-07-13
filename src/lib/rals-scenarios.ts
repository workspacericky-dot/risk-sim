// Skenario consulting RALS — konstanta statis (tidak perlu tabel DB).
// selera: ambang besaran (1–25) per kategori; risiko dengan besaran residu
// DI ATAS ambang → masuk prioritas saat evaluasi.

export type RalsScenario = {
  id: string
  nama: string
  deskripsiUnit: string
  sasaran: string
  prosesBisnis: string[]
  selera: Record<string, number> // key kategori (risk-engine) → ambang
}

export const RALS_SCENARIOS: RalsScenario[] = [
  {
    id: 'ptsp-pn',
    nama: 'Pelayanan PTSP Pengadilan Negeri',
    deskripsiUnit:
      'Unit Pelayanan Terpadu Satu Pintu (PTSP) pada sebuah Pengadilan Negeri Kelas I A yang melayani pendaftaran perkara, permintaan informasi, dan pengambilan salinan putusan.',
    sasaran: 'Terwujudnya pelayanan publik peradilan yang cepat, transparan, dan akuntabel.',
    prosesBisnis: [
      'Pendaftaran perkara',
      'Permintaan informasi publik',
      'Pengambilan salinan putusan/penetapan',
      'Pengelolaan pengaduan masyarakat',
    ],
    selera: {
      strategis: 14,
      kebijakan: 14,
      kecurangan: 6,   // toleransi rendah untuk fraud
      bencana: 17,
      kepatuhan: 10,
      operasional: 12,
      kemitraan: 14,
    },
  },
]

export function getScenario(id: string | null | undefined): RalsScenario | null {
  return RALS_SCENARIOS.find((s) => s.id === id) ?? null
}
