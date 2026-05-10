/** Parent process group names keyed by MA-XX code */
export const PROSES_GROUP_NAMES: Record<string, string> = {
  'MA-01': 'Peningkatan Pengelolaan Proses Peradilan yang Pasti, Transparan, dan Akuntabel',
  'MA-02': 'Peningkatan Efektivitas dan Efisiensi Pengelolaan Penyelesaian Perkara',
  'MA-03': 'Peningkatan Akses Peradilan Bagi Masyarakat Miskin dan Terpinggirkan',
  'MA-04': 'Peningkatan Kepatuhan Terhadap Putusan Pengadilan',
  'MA-05': 'Peningkatan Pembinaan dan Profesionalitas Tenaga Teknis dan Non Teknis',
  'MA-06': 'Pengembangan dan Pembaruan Kebijakan Hukum dan Peradilan',
  'MA-07': 'Penguatan Pengawasan Kinerja Tenaga Teknis dan Non Teknis',
  'MA-08': 'Peningkatan Administrasi Peradilan dan Administrasi Umum',
  'MA-09': 'Pengembangan dan Penerapan Teknologi Informasi',
  'MA-10': 'Peningkatan Koordinasi Antara Kementerian/Lembaga Terkait',
}

/** "MA-05.03" → "MA-05" */
export function getParentKode(subKode: string): string {
  return subKode.split('.')[0]
}

/** "MA-05.03" → full parent group name */
export function getParentNama(subKode: string): string {
  return PROSES_GROUP_NAMES[getParentKode(subKode)] ?? ''
}
