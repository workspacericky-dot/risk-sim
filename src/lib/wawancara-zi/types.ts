export type QuestionRole = 'Kunci' | 'Penunjang' | 'Kontrol'
export type QuestionKind = 'Wajib' | 'Pendalaman' | 'Uji Acak' | 'Klarifikasi ANDOK' | 'Penutup'

export type InterviewQuestion = {
  no: number
  code: string
  dimension: string
  role: QuestionRole
  minutes: number
  indicator: string
  kind: QuestionKind
  critical: boolean
  target: string
  question: string
  evidence: string
  probes: string[]
}
export type Consistency = 'belum' | 'konsisten' | 'sebagian' | 'bertentangan' | 'na'
export type SupportingResult = 'belum' | 'ya' | 'tidak' | 'na'

export type QuestionResponse = {
  answer: string
  evidence: string
  consistency: Consistency
  score: number | null
  supportingResult: SupportingResult
  redFlag: boolean
  redFlagControlled: boolean
  followUp: string
  interviewer: string
  asked: boolean
  usedProbes: string[]
}

export type AndokIssue = {
  id: string
  source: string
  dimension: string
  finding: string
  risk: string
  clarification: string
  expectedEvidence: string
  evaluator: string
  required: boolean
}

export type InterviewSnapshot = {
  version: 1
  metadata: Record<string, string>
  preparation: {
    andokIssues: AndokIssue[]
    readiness: Record<string, boolean>
    notes: string
  }
  responses: Record<string, QuestionResponse>
  reconciliation: Record<string, string>
  timer: { secondsRemaining: number }
}

export type InterviewSessionRow = {
  id: string
  unit_name: string
  court_type: string | null
  interview_date: string | null
  candidate_stage: string | null
  kke_number: string | null
  team_name: string
  secretary_name: string | null
  status: 'persiapan' | 'berlangsung' | 'rekonsiliasi' | 'selesai'
  snapshot: InterviewSnapshot
  created_at: string
  updated_at: string
}
