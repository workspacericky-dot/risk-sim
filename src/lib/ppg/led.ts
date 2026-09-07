export type LossEventCandidate = { reportId: string; score: number; reasons: string[] }

export function matchLossEventReports(event: Record<string, unknown>, reports: Record<string, unknown>[]): LossEventCandidate[] {
  const unit = normalize(event.unit_nama)
  const eventDate = iso(event.tanggal_kejadian)
  const eventText = tokens(`${value(event.nama_peristiwa)} ${value(event.kronologi)} ${value(event.akar_masalah)} ${value(event.jenis_dampak)} ${value(event.uraian_dampak)}`)
  return reports.map((report) => {
    let score = 0
    const reasons: string[] = []
    const reportUnit = normalize(report.unit_nama)
    if (unit && reportUnit && unit !== reportUnit) return { reportId: '', score: 0, reasons }
    if (unit && reportUnit && unit === reportUnit) { score += 40; reasons.push('satker sama') }
    const reportDate = iso(report.tanggal_penerimaan)
    if (eventDate && reportDate) {
      const days = Math.abs((Date.parse(eventDate) - Date.parse(reportDate)) / 86_400_000)
      if (days <= 7) { score += 30; reasons.push('tanggal dalam 7 hari') }
      else if (days <= 30) { score += 20; reasons.push('tanggal dalam 30 hari') }
      else if (days <= 90) { score += 10; reasons.push('tanggal dalam 90 hari') }
    }
    const reportTokens = tokens(`${value(report.label_skenario)} ${value(report.objek)} ${value(report.kategori_objek)} ${value(report.kegiatan)} ${value(report.dugaan_momen)}`)
    const overlap = [...eventText].filter((token) => reportTokens.has(token)).length
    if (overlap) { const points = Math.min(20, overlap * 5); score += points; reasons.push(`${overlap} kata kunci sama`) }
    return { reportId: value(report.id), score, reasons }
  }).filter((candidate) => candidate.reportId && candidate.score >= 50).sort((a, b) => b.score - a.score).slice(0, 10)
}

function value(input: unknown) { return String(input ?? '').trim() }
function normalize(input: unknown) { return value(input).toLocaleLowerCase('id-ID').replace(/[^a-z0-9]+/g, ' ').trim() }
function iso(input: unknown) { const source = value(input); return /^\d{4}-\d{2}-\d{2}/.test(source) ? `${source.slice(0, 10)}T00:00:00Z` : null }
function tokens(input: string) { return new Set(normalize(input).split(' ').filter((token) => token.length >= 4 && !STOP_WORDS.has(token))) }
const STOP_WORDS = new Set(['yang','dengan','untuk','dari','pada','dalam','atau','telah','kepada','oleh','tidak','terjadi'])
