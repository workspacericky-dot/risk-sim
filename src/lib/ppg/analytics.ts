export type PpgAnalyticsReport = Record<string, unknown>

export type PpgAnalysisPeriod = {
  year: number
  quarter: number | null
  start: string
  end: string
  baselineStart: string
  baselineEnd: string
  label: string
  programLabel: string
}

export type PpgGroupMetric = {
  label: string
  reports: number
  items: number
  share: number
  moneyItems: number
  moneyShare: number
  value: number
  rejectedReports: number
  rejectionRate: number
  exposureScore: number
}

export type PpgRecommendation = {
  actionCode: string
  title: string
  priority: 'tinggi' | 'sedang' | 'normal'
  rationale: string
  timing: string
  target: string
  signalKey: string
  riskCategories: string[]
}

export type PpgAnalyticsResult = {
  period: PpgAnalysisPeriod
  coverage: { minYear: number; maxYear: number; yearsAvailable: number[]; baselineYears: number[] }
  summary: {
    uniqueReports: number
    itemCount: number
    totalValue: number
    moneyItems: number
    rejectedReports: number
    rejectionRate: number
    missingDate: number
    missingValue: number
    missingContext: number
    averageReportLagDays: number | null
    lateReportRate: number
    priorComparableReports: number
    comparableChange: number | null
  }
  roles: PpgGroupMetric[]
  objects: PpgGroupMetric[]
  scenarios: PpgGroupMetric[]
  giverTypes: PpgGroupMetric[]
  moments: PpgGroupMetric[]
  yearly: { year: number; reports: number; items: number; value: number }[]
  monthly: { month: number; label: string; reports: number; value: number; seasonalIndex: number }[]
  associations: { label: string; reports: number; lift: number }[]
  recommendations: PpgRecommendation[]
  rows: PreparedReport[]
}

type PreparedReport = {
  key: string
  date: string | null
  reportDate: string | null
  year: number | null
  month: number | null
  role: string
  object: string
  scenario: string
  giverType: string
  moment: string
  unit: string
  value: number
  hasValue: boolean
  rejected: boolean
  isMoney: boolean
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

export function analyzePpgReports(source: PpgAnalyticsReport[], requestedYear?: number, requestedQuarter?: number | null): PpgAnalyticsResult {
  const prepared = source.map(prepareReport)
  const dated = prepared.filter((row): row is PreparedReport & { date: string; year: number; month: number } => Boolean(row.date && row.year && row.month))
  const yearsAvailable = [...new Set(dated.map((row) => row.year))].sort((a, b) => a - b)
  const maxYear = yearsAvailable.at(-1) ?? new Date().getFullYear()
  const minYear = yearsAvailable[0] ?? maxYear
  const year = requestedYear && yearsAvailable.includes(requestedYear) ? requestedYear : maxYear
  const quarter = requestedQuarter && requestedQuarter >= 1 && requestedQuarter <= 4 ? requestedQuarter : null
  const period = buildPeriod(year, quarter)
  const baselineStartYear = Math.max(minYear, year - 4)
  period.baselineStart = `${baselineStartYear}-01-01`
  const baselineYears = yearsAvailable.filter((item) => item >= baselineStartYear && item <= year)
  const rows = prepared.filter((row) => inPeriod(row.date, period.start, period.end))
  const baselineRows = prepared.filter((row) => inPeriod(row.date, period.baselineStart, period.baselineEnd))
  const reportKeys = uniqueKeys(rows)
  const itemCount = rows.length
  const totalValue = sum(rows.map((row) => row.value))
  const rejectedReports = uniqueKeys(rows.filter((row) => row.rejected)).size
  const lags = rows.map(reportLagDays).filter((value): value is number => value !== null && value >= 0)
  const comparable = comparableRows(prepared, period)
  const priorComparableReports = uniqueKeys(comparable).size
  const comparableChange = priorComparableReports ? (reportKeys.size - priorComparableReports) / priorComparableReports : null
  const roles = groupMetrics(rows, (row) => row.role)
  const objects = groupMetrics(rows, (row) => row.object)
  const scenarios = groupMetrics(rows, (row) => row.scenario)
  const giverTypes = groupMetrics(rows, (row) => row.giverType)
  const moments = groupMetrics(rows, (row) => row.moment)
  const yearly = baselineYears.map((item) => {
    const selected = baselineRows.filter((row) => row.year === item)
    return { year: item, reports: uniqueKeys(selected).size, items: selected.length, value: sum(selected.map((row) => row.value)) }
  })
  const monthly = monthlySeasonality(baselineRows)
  const missingContext = rows.filter((row) => row.scenario === 'Tidak teridentifikasi' || row.moment === 'Tidak teridentifikasi').length
  const summary = {
    uniqueReports: reportKeys.size,
    itemCount,
    totalValue,
    moneyItems: rows.filter((row) => row.isMoney).length,
    rejectedReports,
    rejectionRate: reportKeys.size ? rejectedReports / reportKeys.size : 0,
    missingDate: source.length - dated.length,
    missingValue: rows.filter((row) => !row.hasValue).length,
    missingContext,
    averageReportLagDays: lags.length ? sum(lags) / lags.length : null,
    lateReportRate: lags.length ? lags.filter((days) => days > 30).length / lags.length : 0,
    priorComparableReports,
    comparableChange,
  }

  return {
    period,
    coverage: { minYear, maxYear, yearsAvailable, baselineYears },
    summary,
    roles,
    objects,
    scenarios,
    giverTypes,
    moments,
    yearly,
    monthly,
    associations: associationMetrics(rows),
    recommendations: buildRecommendations(summary, roles, objects, scenarios, giverTypes, monthly, period),
    rows,
  }
}

function buildPeriod(year: number, quarter: number | null): PpgAnalysisPeriod {
  if (quarter) {
    const firstMonth = (quarter - 1) * 3 + 1
    const lastMonth = firstMonth + 2
    const endDay = new Date(Date.UTC(year, lastMonth, 0)).getUTCDate()
    const nextQuarter = quarter === 4 ? 1 : quarter + 1
    const programYear = quarter === 4 ? year + 1 : year
    return {
      year,
      quarter,
      start: `${year}-${String(firstMonth).padStart(2, '0')}-01`,
      end: `${year}-${String(lastMonth).padStart(2, '0')}-${endDay}`,
      baselineStart: `${year - 4}-01-01`,
      baselineEnd: `${year}-12-31`,
      label: `Triwulan ${roman(quarter)} ${year}`,
      programLabel: `Triwulan ${roman(nextQuarter)} ${programYear}`,
    }
  }
  return {
    year,
    quarter: null,
    start: `${year}-01-01`,
    end: `${year}-12-31`,
    baselineStart: `${year - 4}-01-01`,
    baselineEnd: `${year}-12-31`,
    label: `Tahun ${year}`,
    programLabel: `Tahun ${year + 1}`,
  }
}

function comparableRows(rows: PreparedReport[], period: PpgAnalysisPeriod) {
  const previousYear = period.year - 1
  if (period.quarter) {
    const firstMonth = (period.quarter - 1) * 3 + 1
    const lastMonth = firstMonth + 2
    return rows.filter((row) => row.year === previousYear && row.month && row.month >= firstMonth && row.month <= lastMonth)
  }
  const currentMonths = rows.filter((row) => row.year === period.year && row.month).map((row) => row.month as number)
  const throughMonth = currentMonths.length ? Math.max(...currentMonths) : 12
  return rows.filter((row) => row.year === previousYear && row.month && row.month <= throughMonth)
}

function prepareReport(row: PpgAnalyticsReport, index: number): PreparedReport {
  const date = isoDate(row.tanggal_penerimaan)
  const reportDate = isoDate(row.tanggal_pelaporan)
  const role = classifyRole(text(row.jabatan_penerima))
  const object = classifyObject(text(row.kategori_objek), text(row.objek))
  const scenario = classifyScenario(text(row.label_skenario), object, text(row.objek), text(row.kegiatan))
  const giverType = normalizedLabel(row.tipe_pemberi)
  const moment = classifyMoment(text(row.dugaan_momen), text(row.kegiatan), scenario)
  const rawValue = row.nilai_penetapan
  const value = Number(rawValue)
  return {
    key: text(row.nomor_laporan) || `baris:${text(row.import_batch_id)}:${text(row.source_row) || index}`,
    date,
    reportDate,
    year: date ? Number(date.slice(0, 4)) : null,
    month: date ? Number(date.slice(5, 7)) : null,
    role,
    object,
    scenario,
    giverType,
    moment,
    unit: normalizedLabel(row.unit_nama),
    value: Number.isFinite(value) && value >= 0 ? value : 0,
    hasValue: rawValue !== null && rawValue !== undefined && String(rawValue).trim() !== '',
    rejected: /tolak/i.test(text(row.jenis_penerimaan)),
    isMoney: object === 'Uang & Setara Uang',
  }
}

function groupMetrics(rows: PreparedReport[], labelFor: (row: PreparedReport) => string) {
  const groups = new Map<string, PreparedReport[]>()
  rows.forEach((row) => {
    const label = labelFor(row) || 'Tidak teridentifikasi'
    groups.set(label, [...(groups.get(label) ?? []), row])
  })
  const totalReports = uniqueKeys(rows).size
  const metrics = [...groups].map(([label, items]) => {
    const reports = uniqueKeys(items).size
    const rejected = uniqueKeys(items.filter((row) => row.rejected)).size
    const moneyItems = items.filter((row) => row.isMoney).length
    return {
      label,
      reports,
      items: items.length,
      share: totalReports ? reports / totalReports : 0,
      moneyItems,
      moneyShare: items.length ? moneyItems / items.length : 0,
      value: sum(items.map((row) => row.value)),
      rejectedReports: rejected,
      rejectionRate: reports ? rejected / reports : 0,
      exposureScore: 0,
    }
  })
  const reportRanks = percentileRanks(metrics.map((item) => item.reports))
  const valueRanks = percentileRanks(metrics.map((item) => Math.log1p(item.value)))
  const moneyRanks = percentileRanks(metrics.map((item) => item.moneyShare))
  metrics.forEach((item, index) => { item.exposureScore = round(100 * (0.5 * reportRanks[index] + 0.3 * valueRanks[index] + 0.2 * moneyRanks[index]), 1) })
  return metrics.sort((a, b) => b.exposureScore - a.exposureScore || b.reports - a.reports)
}

function monthlySeasonality(rows: PreparedReport[]) {
  const totalReports = uniqueKeys(rows).size
  const expected = totalReports / 12
  return MONTHS.map((label, index) => {
    const selected = rows.filter((row) => row.month === index + 1)
    const reports = uniqueKeys(selected).size
    return { month: index + 1, label, reports, value: sum(selected.map((row) => row.value)), seasonalIndex: expected ? reports / expected : 0 }
  })
}

function associationMetrics(rows: PreparedReport[]) {
  const total = uniqueKeys(rows).size
  if (!total) return []
  const roleCounts = countReports(rows, (row) => row.role)
  const objectCounts = countReports(rows, (row) => row.object)
  const pairs = new Map<string, PreparedReport[]>()
  rows.forEach((row) => {
    const label = `${row.role} × ${row.object}`
    pairs.set(label, [...(pairs.get(label) ?? []), row])
  })
  return [...pairs].map(([label, selected]) => {
    const [role, object] = label.split(' × ')
    const reports = uniqueKeys(selected).size
    const expectedShare = ((roleCounts.get(role) ?? 0) / total) * ((objectCounts.get(object) ?? 0) / total)
    return { label, reports, lift: expectedShare ? (reports / total) / expectedShare : 0 }
  }).filter((item) => item.reports >= 3).sort((a, b) => b.lift - a.lift || b.reports - a.reports).slice(0, 10)
}

function buildRecommendations(
  summary: PpgAnalyticsResult['summary'],
  roles: PpgGroupMetric[],
  objects: PpgGroupMetric[],
  scenarios: PpgGroupMetric[],
  giverTypes: PpgGroupMetric[],
  monthly: PpgAnalyticsResult['monthly'],
  period: PpgAnalysisPeriod,
) {
  const result: PpgRecommendation[] = []
  const topMonth = [...monthly].sort((a, b) => b.seasonalIndex - a.seasonalIndex)[0]
  const holiday = scenarios.find((item) => /hari raya|parsel|bingkisan/i.test(item.label))
  if ((holiday?.share ?? 0) >= 0.05 || (topMonth?.seasonalIndex ?? 0) >= 1.5) {
    result.push({ actionCode: 'PPG-HR-01', title: 'Pengendalian gratifikasi menjelang periode rawan', priority: 'tinggi', rationale: `${holiday?.reports ?? 0} laporan terkait bingkisan/hari raya; puncak historis ${topMonth?.label ?? 'belum teridentifikasi'} dengan indeks musim ${round(topMonth?.seasonalIndex ?? 0, 2)}.`, timing: `Mulai 4–6 minggu sebelum ${topMonth?.label ?? period.programLabel}`, target: roles[0]?.label ?? 'Seluruh pegawai', signalKey: 'musim_rawan', riskCategories: ['Risiko Kecurangan', 'Risiko Kepatuhan'] })
  }
  const money = objects.find((item) => item.label === 'Uang & Setara Uang')
  if ((money?.items ?? 0) >= 3) {
    result.push({ actionCode: 'PPG-UANG-01', title: 'Penguatan protokol penolakan uang dan setara uang', priority: (money?.moneyShare ?? 0) > 0.2 ? 'tinggi' : 'sedang', rationale: `${money?.items ?? 0} item uang/setara uang dengan nilai ${formatRupiah(money?.value ?? 0)}.`, timing: period.programLabel, target: roles.find((item) => item.moneyItems > 0)?.label ?? 'Pegawai pada fungsi layanan', signalKey: 'objek_uang', riskCategories: ['Risiko Kecurangan', 'Risiko Kepatuhan'] })
  }
  const external = giverTypes.filter((item) => /bank|vendor|perusahaan|advokat|pemerintah|instansi/i.test(item.label)).reduce((total, item) => total + item.reports, 0)
  if (external >= 3) {
    result.push({ actionCode: 'PPG-EKSTERNAL-01', title: 'Deklarasi integritas dan komunikasi kepada pihak eksternal', priority: 'sedang', rationale: `${external} laporan melibatkan relasi eksternal yang dapat diklasifikasikan.`, timing: `Awal ${period.programLabel} dan sebelum kegiatan eksternal`, target: 'Satker dengan interaksi vendor, bank, pemerintah, atau profesi hukum', signalKey: 'relasi_eksternal', riskCategories: ['Risiko Kecurangan', 'Risiko Kemitraan'] })
  }
  if (summary.lateReportRate >= 0.05) {
    result.push({ actionCode: 'PPG-LAPOR-01', title: 'Klinik pelaporan dan pengingat batas waktu', priority: summary.lateReportRate >= 0.2 ? 'tinggi' : 'sedang', rationale: `${round(summary.lateReportRate * 100, 1)}% laporan bertanggal lengkap melewati 30 hari kalender.`, timing: `Awal ${period.programLabel}, dipantau bulanan`, target: 'UPG Satker dan pelapor', signalKey: 'keterlambatan_pelaporan', riskCategories: ['Risiko Kepatuhan', 'Risiko Operasional'] })
  }
  const missingRate = summary.itemCount ? summary.missingContext / summary.itemCount : 0
  if (missingRate >= 0.05) {
    result.push({ actionCode: 'PPG-DATA-01', title: 'Peningkatan kualitas data laporan gratifikasi', priority: missingRate >= 0.2 ? 'tinggi' : 'sedang', rationale: `${round(missingRate * 100, 1)}% item tidak memiliki konteks skenario atau momen yang memadai.`, timing: `Sebelum pembukaan pelaporan ${period.programLabel}`, target: 'Operator UPG Satker', signalKey: 'kualitas_data', riskCategories: ['Risiko Operasional'] })
  }
  if ((roles[0]?.share ?? 0) >= 0.25) {
    result.push({ actionCode: 'PPG-PIMPINAN-01', title: 'Briefing integritas berbasis jabatan prioritas', priority: 'tinggi', rationale: `${roles[0].label} mencakup ${round(roles[0].share * 100, 1)}% laporan unik pada periode analisis.`, timing: `Awal ${period.programLabel} dan sebelum periode rawan`, target: roles[0].label, signalKey: 'jabatan_prioritas', riskCategories: ['Risiko Kecurangan', 'Risiko Kepatuhan'] })
  }
  return result
}

function classifyRole(value: string) {
  const source = value.toLowerCase()
  if (!source) return 'Tidak teridentifikasi'
  if (/wakil.*ketua/.test(source)) return 'Wakil Ketua Pengadilan'
  if (/ketua|kpn|kpa|kpt/.test(source)) return 'Ketua Pengadilan'
  if (/hakim/.test(source)) return 'Hakim'
  if (/panitera/.test(source)) return 'Panitera'
  if (/juru\s*sita|jurusita/.test(source)) return 'Jurusita'
  if (/sekretaris/.test(source)) return 'Sekretaris'
  if (/kasub|kepala sub|kabag|kepala bagian/.test(source)) return 'Pejabat Struktural (Kasubbag/Kabag)'
  if (/direktur|kepala badan|pimpinan/.test(source)) return 'Pimpinan Satker/Direktorat'
  if (/staf|pegawai|pppk|pelaksana/.test(source)) return 'Staf/Pegawai Pelaksana'
  return 'Jabatan Lainnya'
}

function classifyObject(category: string, description: string) {
  const original = category.trim()
  const source = `${category} ${description}`.toLowerCase()
  const canonical = ['Makanan & Minuman', 'Peralatan Rumah Tangga / Pecah Belah', 'Uang & Setara Uang', 'Pakaian & Kain', 'Suvenir & Merchandise', 'Buku & Publikasi', 'Parsel/Bingkisan (tidak dirinci)', 'Karangan Bunga / Ucapan', 'Elektronik & Gadget', 'Fasilitas & Jasa', 'Barang Lain / Tidak Terinci']
  if (canonical.includes(original)) return original
  if (/uang|tunai|transfer|voucher|saldo|gopay|ovo|honorarium/.test(source)) return 'Uang & Setara Uang'
  if (/makan|minum|kue|buah|sembako|nasi|kopi|teh|kurma/.test(source)) return 'Makanan & Minuman'
  if (/pecah belah|gelas|piring|peralatan rumah|keramik/.test(source)) return 'Peralatan Rumah Tangga / Pecah Belah'
  if (/pakaian|kain|sarung|batik|baju/.test(source)) return 'Pakaian & Kain'
  if (/suvenir|souvenir|merchandise|plakat/.test(source)) return 'Suvenir & Merchandise'
  if (/buku|majalah|publikasi/.test(source)) return 'Buku & Publikasi'
  if (/parsel|bingkisan/.test(source)) return 'Parsel/Bingkisan (tidak dirinci)'
  if (/karangan bunga|bunga papan|ucapan/.test(source)) return 'Karangan Bunga / Ucapan'
  if (/elektronik|gadget|telepon|handphone|laptop/.test(source)) return 'Elektronik & Gadget'
  if (/fasilitas|jasa|diskon|akomodasi|tiket/.test(source)) return 'Fasilitas & Jasa'
  return source.trim() ? 'Barang Lain / Tidak Terinci' : 'Tidak teridentifikasi'
}

function classifyScenario(explicit: string, object: string, description: string, activity: string) {
  if (explicit && explicit !== '(tidak diisi)') return explicit
  const source = `${description} ${activity}`.toLowerCase()
  if (/lebaran|idul\s*fitri|hari raya|ramadan|ramadhan|natal|imlek|nyepi/.test(source)) return 'Bingkisan Hari Raya / Keagamaan'
  if (/sembako/.test(source)) return 'Paket Sembako'
  if (/rapat|jamuan|konsumsi/.test(source)) return 'Jamuan / Konsumsi Rapat & Kegiatan'
  if (/oleh-oleh|buah tangan/.test(source)) return 'Oleh-oleh / Buah Tangan Perjalanan'
  if (object === 'Uang & Setara Uang') return 'Pemberian Uang Langsung'
  if (object === 'Suvenir & Merchandise') return 'Suvenir / Merchandise Kegiatan & Kunjungan'
  if (object === 'Parsel/Bingkisan (tidak dirinci)') return 'Parsel/Bingkisan Umum (non-hari raya)'
  return source.trim() ? 'Pemberian Umum / Tanpa Konteks' : 'Tidak teridentifikasi'
}

function classifyMoment(explicit: string, activity: string, scenario: string) {
  if (explicit && explicit !== '(tidak diisi)') return explicit
  if (activity && activity !== '(tidak diisi)' && activity.toLowerCase() !== 'lainnya') return activity
  if (/hari raya/.test(scenario.toLowerCase())) return 'Momen Hari Raya'
  return scenario === 'Tidak teridentifikasi' ? 'Tidak teridentifikasi' : 'Relasi/kegiatan belum dirinci'
}

function countReports(rows: PreparedReport[], label: (row: PreparedReport) => string) {
  const groups = new Map<string, Set<string>>()
  rows.forEach((row) => {
    const key = label(row)
    if (!groups.has(key)) groups.set(key, new Set())
    groups.get(key)!.add(row.key)
  })
  return new Map([...groups].map(([key, values]) => [key, values.size]))
}

function percentileRanks(values: number[]) {
  if (values.length <= 1) return values.map(() => 1)
  const sorted = [...values].sort((a, b) => a - b)
  return values.map((value) => sorted.lastIndexOf(value) / (sorted.length - 1))
}

function uniqueKeys(rows: PreparedReport[]) { return new Set(rows.map((row) => row.key)) }
function sum(values: number[]) { return values.reduce((total, value) => total + value, 0) }
function round(value: number, digits = 0) { const factor = 10 ** digits; return Math.round(value * factor) / factor }
function text(value: unknown) { return String(value ?? '').trim() }
function normalizedLabel(value: unknown) { const result = text(value); return result && result !== '(tidak diisi)' ? result : 'Tidak teridentifikasi' }
function inPeriod(value: string | null, start: string, end: string) { return Boolean(value && value >= start && value <= end) }
function roman(value: number) { return ['I', 'II', 'III', 'IV'][value - 1] ?? String(value) }
function formatRupiah(value: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value) }

function reportLagDays(row: PreparedReport) {
  if (!row.date || !row.reportDate) return null
  const start = Date.parse(`${row.date}T00:00:00Z`)
  const end = Date.parse(`${row.reportDate}T00:00:00Z`)
  return Number.isFinite(start) && Number.isFinite(end) ? Math.round((end - start) / 86_400_000) : null
}

function isoDate(value: unknown) {
  const source = text(value)
  if (!source) return null
  const match = source.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (match) return `${match[1]}-${match[2]}-${match[3]}`
  const date = new Date(source)
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10)
}
