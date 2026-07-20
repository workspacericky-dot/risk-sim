// Tipe data Teknik Identifikasi Risiko: Bowtie Analysis.

export type BowtieElementType = 'THREAT' | 'CONSEQUENCE'
export type BarrierEfektivitas = 'Memadai' | 'Kurang Memadai'

export type Bowtie = {
  id: string
  session_id: string
  participant_id: string
  risk_id: string
  created_at: string
}

// Risiko yang sudah ada di register — Top Event bowtie diambil dari sini.
export type BowtieRisk = {
  id: string
  kode: string | null
  pernyataan: string
  kategori: string | null
  penyebab: string | null
  dampak_uraian: string | null
}

export type BowtieElement = {
  id: string
  bowtie_id: string
  tipe: BowtieElementType
  deskripsi: string
  created_at: string
}

export type BowtieBarrier = {
  id: string
  element_id: string
  deskripsi: string
  efektivitas: BarrierEfektivitas
  created_at: string
}

export type BowtieEscalation = {
  id: string
  barrier_id: string
  faktor: string
  rekomendasi: string
  created_at: string
}
