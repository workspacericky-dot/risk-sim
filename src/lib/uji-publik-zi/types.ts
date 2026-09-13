export type ZiImportRow = {
  sourceRow: number
  no: string
  nama: string
  usia: string
  kelamin: 'L' | 'P' | ''
  pekerjaan: string
  unitKerja: string
  sourceTags: string[]
  pendapat: string
  ratingBintang: number | null
  errors: string[]
}

export type ZiResponseForAnalysis = {
  id?: string
  unitId: string | null
  unitName: string
  sourceTags: string[]
  opinion: string
  starRating: number
}

export type ZiAnalysisResult = {
  sentimentScore: number
  sentimentLabel: 'positif' | 'netral' | 'negatif'
  mismatch: boolean
  mismatchReason: string | null
  aiTags: string[]
  highRiskTags: string[]
  confidence: number
  modelName: string
}

export type ZiCriWeights = {
  lowRating: number
  highRiskTag: number
  negativeSentiment: number
}

