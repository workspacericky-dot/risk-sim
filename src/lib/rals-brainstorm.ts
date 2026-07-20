// Tipe data Teknik Identifikasi Risiko: Brainstorming (papan kolaboratif per sesi).

export type BrainstormIdea = {
  id: string
  session_id: string
  participant_id: string
  teks: string
  created_at: string
}

export type BrainstormVote = {
  id: string
  idea_id: string
  participant_id: string
}

export type BrainstormDraft = {
  id: string
  session_id: string
  participant_id: string
  idea_id: string | null
  pernyataan: string
  kategori: string
  penyebab: string
  dampak: string
  promoted_risk_id: string | null
  created_at: string
}
