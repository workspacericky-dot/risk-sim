// Tipe data Teknik Identifikasi Risiko: Bowtie Analysis.

export type BowtieElementType = 'THREAT' | 'CONSEQUENCE'
export type BarrierEfektivitas = 'Memadai' | 'Kurang Memadai'

export type Bowtie = {
  id: string
  session_id: string
  participant_id: string
  l1_kode: string
  l1_nama: string
  l2_kode: string
  l2_nama: string
  top_event: string
  kategori: string
  promoted_risk_id: string | null
  created_at: string
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
