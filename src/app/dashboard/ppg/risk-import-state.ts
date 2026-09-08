export type RiskImportActionState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialRiskImportState: RiskImportActionState = {
  status: 'idle',
  message: '',
}
