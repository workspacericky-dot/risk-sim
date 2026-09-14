import { DIMENSIONS, INTERVIEW_QUESTIONS, KEY_DIMENSIONS, blankResponse } from './questions.ts'
import type { InterviewQuestion, InterviewSnapshot, QuestionResponse } from './types'

export function isQuestionComplete(question: InterviewQuestion, response: QuestionResponse) {
  if (response.consistency === 'na' || response.supportingResult === 'na') return true
  if (!response.asked) return false
  if (!response.answer.trim() || !response.evidence.trim() || response.consistency === 'belum') return false
  return question.role === 'Kunci' ? response.score !== null : response.supportingResult !== 'belum'
}

export function computeInterviewSummary(snapshot: InterviewSnapshot) {
  const dimensions = DIMENSIONS.map((dimension) => {
    const questions = INTERVIEW_QUESTIONS.filter((question) => question.dimension === dimension)
    const rows = questions.map((question) => ({ question, response: snapshot.responses[question.code] ?? blankResponse() }))
    const complete = rows.filter(({ question, response }) => isQuestionComplete(question, response)).length
    const applicable = rows.filter(({ response }) => response.consistency !== 'na' && response.supportingResult !== 'na')
    const scores = applicable.filter(({ question, response }) => question.role === 'Kunci' && response.score !== null).map(({ response }) => response.score as number)
    const average = scores.length ? scores.reduce((sum, value) => sum + value, 0) / scores.length : null
    const criticalScores = applicable.filter(({ question, response }) => question.critical && response.score !== null).map(({ response }) => response.score as number)
    const openFlags = rows.filter(({ response }) => response.redFlag && !response.redFlagControlled).length
    const noAnswers = rows.filter(({ response }) => response.supportingResult === 'tidak').length
    const key = KEY_DIMENSIONS.includes(dimension)
    let status = 'BELUM LENGKAP'
    if (complete === questions.length) {
      if (key) status = openFlags > 0 || average === null || average < 2 || (criticalScores.length > 0 && Math.min(...criticalScores) < 2) ? 'TIDAK MEMADAI' : 'MEMADAI'
      else status = noAnswers > 0 || openFlags > 0 ? 'PERLU TINDAK LANJUT' : 'TERPENUHI'
    }
    return { dimension, key, total: questions.length, complete, average, criticalMin: criticalScores.length ? Math.min(...criticalScores) : null, openFlags, noAnswers, status }
  })
  const keyRows = dimensions.filter((row) => row.key)
  const allComplete = dimensions.every((row) => row.complete === row.total)
  const finalStatus = keyRows.some((row) => row.status === 'TIDAK MEMADAI') ? 'TIDAK LULUS' : allComplete && keyRows.every((row) => row.status === 'MEMADAI') ? 'LULUS' : 'BELUM DAPAT DISIMPULKAN'
  return { dimensions, finalStatus, complete: dimensions.reduce((sum, row) => sum + row.complete, 0), openFlags: dimensions.reduce((sum, row) => sum + row.openFlags, 0) }
}
