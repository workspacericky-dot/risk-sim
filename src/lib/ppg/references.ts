export const PPG_RISK_CLASSIFICATIONS = [
  { id: 7, label: 'Sektor Pelayanan Publik' },
  { id: 8, label: 'Sektor Pengadaan Barang dan/atau Jasa' },
  { id: 9, label: 'Sektor Pengelolaan Sumber Daya Manusia' },
  { id: 10, label: 'Sektor Perizinan' },
  { id: 11, label: 'Sektor Pemeriksaan/Audit' },
  { id: 12, label: 'Sektor Lainnya' },
] as const

export const PPG_RISK_CATEGORIES = [
  'Risiko Strategis',
  'Risiko Kebijakan',
  'Risiko Kecurangan',
  'Risiko Bencana',
  'Risiko Kepatuhan',
  'Risiko Operasional',
  'Risiko Kemitraan',
] as const

export const PPG_RISK_CATEGORY_CODES: Record<(typeof PPG_RISK_CATEGORIES)[number], number> = {
  'Risiko Strategis': 1,
  'Risiko Kebijakan': 2,
  'Risiko Kecurangan': 3,
  'Risiko Bencana': 4,
  'Risiko Kepatuhan': 5,
  'Risiko Operasional': 6,
  'Risiko Kemitraan': 7,
}

export const PPG_BUSINESS_PROCESSES = [
  { label: 'Manajemen Peradilan', subprocesses: [] },
  { label: 'Pelayanan Publik', subprocesses: [] },
  { label: 'Administrasi Umum', subprocesses: ['Pengadaan B/J P', 'SDM', 'Keuangan DIPA/Titipan pihak ketiga'] },
  { label: 'Administrasi Perkara', subprocesses: [] },
  { label: 'Administrasi Persidangan', subprocesses: [] },
  { label: 'Pengawasan (Internal dan Eksternal)', subprocesses: [] },
  { label: 'Penanganan Pengaduan', subprocesses: [] },
] as const

export function isValidPpgBusinessProcess(process: string, subprocess: string) {
  const selected = PPG_BUSINESS_PROCESSES.find((item) => item.label === process)
  if (!selected) return false
  return selected.subprocesses.length ? Boolean(subprocess.trim()) : subprocess === ''
}

export const PPG_CAUSE_FACTORS = [
  { id: 1, label: 'Pemahaman' },
  { id: 2, label: 'Penegakan Aturan' },
  { id: 3, label: 'Pemeriksaan' },
  { id: 4, label: 'Sistem' },
  { id: 5, label: 'Lain-lain' },
] as const

export const PPG_PROBABILITY_OPTIONS = [
  { value: 1, label: 'Level 1 - Hampir Tidak Terjadi' },
  { value: 2, label: 'Level 2 - Jarang Terjadi' },
  { value: 3, label: 'Level 3 - Kadang Terjadi' },
  { value: 4, label: 'Level 4 - Sering Terjadi' },
  { value: 5, label: 'Level 5 - Hampir Pasti Terjadi' },
] as const

export const PPG_IMPACT_OPTIONS = [
  { value: 1, label: 'Level 1 - Tidak Signifikan' },
  { value: 2, label: 'Level 2 - Minor' },
  { value: 3, label: 'Level 3 - Moderat' },
  { value: 4, label: 'Level 4 - Signifikan' },
  { value: 5, label: 'Level 5 - Sangat Signifikan' },
] as const

export const PPG_ASSESSMENT_PERIODS = [
  'Tahunan',
  'Semester I',
  'Semester II',
  'Triwulan I',
  'Triwulan II',
  'Triwulan III',
  'Triwulan IV',
  'Bulanan - Januari',
  'Bulanan - Februari',
  'Bulanan - Maret',
  'Bulanan - April',
  'Bulanan - Mei',
  'Bulanan - Juni',
  'Bulanan - Juli',
  'Bulanan - Agustus',
  'Bulanan - September',
  'Bulanan - Oktober',
  'Bulanan - November',
  'Bulanan - Desember',
] as const

export const PPG_IMPACT_AREAS = [
  'Kerugian Keuangan Negara dan Pihak Ketiga',
  'Penurunan Reputasi',
  'Kesehatan dan Keselamatan Kerja',
  'Realisasi Capaian Kinerja Sasaran Strategis',
  'Temuan Hasil Pemeriksaan BPK dan Hasil Pengawasan Badan Pengawasan',
  'Gangguan terhadap Layanan Tusi Organisasi',
] as const

export const PPG_IMPACT_LEVELS = [
  { value: 1, label: 'Level 1 - Sangat Rendah' },
  { value: 2, label: 'Level 2 - Rendah' },
  { value: 3, label: 'Level 3 - Sedang' },
  { value: 4, label: 'Level 4 - Tinggi' },
  { value: 5, label: 'Level 5 - Sangat Tinggi' },
] as const

export const PPG_IMPACT_KNOWLEDGE_ID = '47500000-0000-4000-8000-000000000001'
