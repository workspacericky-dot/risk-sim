/** Role yang boleh mengakses modul CA (Capaian Audit): CA Bid. Kepegawaian & CA Audit Keuangan Perkara. */
export const ROLE_CA_DIIZINKAN = ['admin_sistem', 'kepala_apip', 'anggota_apip'] as const

export function bisaAksesCa(role: string | null | undefined): boolean {
  return ROLE_CA_DIIZINKAN.includes(role as typeof ROLE_CA_DIIZINKAN[number])
}
