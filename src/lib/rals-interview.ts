// Tipe & konstanta Teknik Identifikasi Risiko: Structured Interview.

export type InterviewSession = {
  id: string
  session_id: string
  participant_id: string
  narasumber_nama: string
  narasumber_jabatan: string
  l1_kode: string
  l1_nama: string
  l2_kode: string
  l2_nama: string
  created_at: string
}

export type InterviewDraft = {
  id: string
  interview_id: string
  session_id: string
  participant_id: string
  pertanyaan: string
  jawaban_narasumber: string
  pernyataan: string
  kategori: string
  penyebab: string
  dampak: string
  ada_kontrol: boolean | null
  catatan_kontrol: string
  promoted_risk_id: string | null
  created_at: string
}

export type StandardQuestion = { key: string; pertanyaan: string; panduan: string }

// 3 pertanyaan baku generik — berlaku untuk proses bisnis apa pun (bukan
// dipatok ke satu topik), mengikuti pola "gali kendala → gali kecurangan →
// gali kesiapan darurat" dari teknik Structured Interview.
export const STANDARD_QUESTIONS: StandardQuestion[] = [
  {
    key: 'kendala',
    pertanyaan: 'Apa kendala atau hambatan yang paling sering terjadi dalam pelaksanaan proses ini?',
    panduan: 'Gali fakta operasional konkret — minta contoh kejadian nyata, bukan opini umum.',
  },
  {
    key: 'kecurangan',
    pertanyaan: 'Adakah celah yang berpotensi disalahgunakan — kecurangan, pelanggaran prosedur, atau manipulasi data — dalam proses ini?',
    panduan: 'Tanyakan dengan hati-hati. Fokus pada kelemahan sistem/prosedur, bukan menuduh individu.',
  },
  {
    key: 'kesiapan',
    pertanyaan: 'Seberapa siap proses ini bila terjadi gangguan besar atau tidak terduga (bencana, gangguan sistem, dsb.)?',
    panduan: 'Cari tahu apakah sudah ada rencana pemulihan/SOP darurat, atau justru belum pernah dipikirkan.',
  },
]

export const DAMPAK_OPTIONS: string[] = [
  'Terhentinya/tertundanya layanan kepada masyarakat',
  'Kerugian keuangan negara',
  'Sanksi hukum/administratif',
  'Menurunnya kepercayaan publik terhadap peradilan',
  'Kebocoran atau kehilangan data',
  'Kerusakan reputasi institusi',
]
