import assert from 'node:assert/strict'
import { DIMENSIONS, INTERVIEW_QUESTIONS, KEY_DIMENSIONS, emptySnapshot } from '../src/lib/wawancara-zi/questions.ts'
import { computeInterviewSummary } from '../src/lib/wawancara-zi/scoring.ts'

assert.equal(INTERVIEW_QUESTIONS.length, 28, 'Bank operasional harus berisi 28 pertanyaan')
assert.equal(INTERVIEW_QUESTIONS.reduce((sum, question) => sum + question.minutes, 0), 90, 'Total waktu pertanyaan harus 90 menit')
assert.equal(DIMENSIONS.length, 9, 'Harus ada 9 dimensi operasional')
assert.equal(KEY_DIMENSIONS.length, 4, 'Harus ada 4 dimensi kunci')
assert.equal(new Set(INTERVIEW_QUESTIONS.map((question) => question.code)).size, 28, 'Kode pertanyaan harus unik')
assert.ok(INTERVIEW_QUESTIONS.every((question) => question.probes.length >= 3), 'Setiap pertanyaan harus memiliki probing khusus')

const empty = emptySnapshot()
assert.equal(computeInterviewSummary(empty).finalStatus, 'BELUM DAPAT DISIMPULKAN')

const complete = emptySnapshot()
for (const question of INTERVIEW_QUESTIONS) {
  complete.responses[question.code] = {
    ...complete.responses[question.code],
    asked: true,
    answer: 'Jawaban faktual dengan contoh proses dan dampak.',
    evidence: 'Dokumen, log, data, dan konfirmasi lintas pihak.',
    consistency: 'konsisten',
    score: question.role === 'Kunci' ? 2 : null,
    supportingResult: question.role === 'Kunci' ? 'belum' : 'ya',
  }
}
assert.equal(computeInterviewSummary(complete).complete, 28)
assert.equal(computeInterviewSummary(complete).finalStatus, 'LULUS')

complete.responses['D3.1'].score = 1
assert.equal(computeInterviewSummary(complete).finalStatus, 'TIDAK LULUS', 'Skor kritis di bawah 2 harus menggugurkan')
complete.responses['D3.1'].score = 2
complete.responses['D6.1'].redFlag = true
assert.equal(computeInterviewSummary(complete).finalStatus, 'TIDAK LULUS', 'Red flag terbuka pada dimensi kunci harus menggugurkan')
complete.responses['D6.1'].redFlagControlled = true
assert.equal(computeInterviewSummary(complete).finalStatus, 'LULUS', 'Red flag yang telah terkendali tidak boleh tetap menggugurkan')

console.log('Verifikasi Wawancara ZI berhasil.')
