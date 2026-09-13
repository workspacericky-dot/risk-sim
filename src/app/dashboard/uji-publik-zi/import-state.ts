export type ZiImportState = {
  status: 'idle' | 'success' | 'error'
  message: string
}

export const initialZiImportState: ZiImportState = {
  status: 'idle',
  message: '',
}
