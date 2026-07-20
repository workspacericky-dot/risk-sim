// Tipe & konstanta Teknik Identifikasi Risiko: Delphi Technique.
// Instruktur = Fasilitator, seluruh peserta sesi = Panel Pakar anonim.

export type DelphiRonde = 'eksplorasi' | 'konvergensi' | 'selesai'

export type DelphiTopic = {
  id: string
  session_id: string
  pertanyaan: string
  ronde: DelphiRonde
  ringkasan_fasilitator: string
  rumusan_penyebab: string
  rumusan_pernyataan: string
  rumusan_dampak: string
  rumusan_kategori: string
  created_at: string
}

export type DelphiResponse = {
  id: string
  topic_id: string
  participant_id: string
  ronde: 'eksplorasi' | 'konvergensi'
  opini: string
  konsensus_skor: number | null
  severitas: number | null
  revisi: string
  created_at: string
  updated_at: string
}

export type DelphiPromotion = {
  id: string
  topic_id: string
  participant_id: string
  risk_id: string | null
}

// Skala Slider Konsensus (Putaran 2): seberapa setuju pakar terhadap ringkasan fasilitator.
export const AGREEMENT_LABELS: Record<number, string> = {
  1: 'Sangat Tidak Setuju',
  2: 'Tidak Setuju',
  3: 'Netral',
  4: 'Setuju',
  5: 'Sangat Setuju',
}
