/**
 * Synthesis logic for Program Kerja Audit "Uraian" column.
 *
 * Combines `pengendalian_eksisting` + `pengendalian_utama` + `kecukupan_pengendalian`
 * + `penyebab` (akar masalah) into a meaningful audit program description.
 *
 * Only called for risks where kecukupan != 'Memadai'.
 */

export function synthesizeUraian(params: {
  kodeRisiko:            string | null
  pernyataanRisiko:      string
  pengendalianEksisting: string | null
  pengendalianUtama:     string | null
  kecukupan:             string | null
  penyebab?:             string[]
}): string {
  const { kodeRisiko, pernyataanRisiko, pengendalianEksisting, pengendalianUtama, kecukupan, penyebab } = params
  const kode  = kodeRisiko ? `[${kodeRisiko}] ` : ''
  const eks   = pengendalianEksisting?.trim()
  const utama = pengendalianUtama?.trim()

  // Build the object of audit focus
  const fokus = utama || eks || 'pengendalian risiko'

  // Build reference to existing control
  const refEks = eks ? ` Pengendalian eksisting: "${eks}".` : ''

  // Build penyebab clause
  const penyebabList = (penyebab ?? []).filter(Boolean)
  const refPenyebab = penyebabList.length > 0
    ? ` Akar masalah yang teridentifikasi: ${penyebabList.map(p => `"${p}"`).join('; ')}.`
    : ''

  switch (kecukupan) {
    case 'Tidak Memiliki Pengendalian':
      return (
        `${kode}Perancangan dan pengembangan pengendalian baru atas risiko: "${pernyataanRisiko}". ` +
        `Saat ini belum terdapat pengendalian yang teridentifikasi.${refPenyebab} ` +
        `Audit diarahkan untuk merancang mekanisme pengendalian ${fokus} yang efektif dan mengusulkan implementasinya kepada manajemen.`
      )

    case 'Tidak Memadai':
      return (
        `${kode}Evaluasi dan penguatan desain pengendalian "${fokus}" atas risiko: "${pernyataanRisiko}".` +
        `${refEks}${refPenyebab} ` +
        `Pengendalian yang ada belum memadai dalam mencegah terjadinya risiko. ` +
        `Audit mencakup pengujian desain, identifikasi kelemahan, dan rekomendasi perbaikan pengendalian.`
      )

    case 'Kurang Memadai':
      return (
        `${kode}Pengujian konsistensi pelaksanaan pengendalian "${fokus}" atas risiko: "${pernyataanRisiko}".` +
        `${refEks}${refPenyebab} ` +
        `Pengendalian telah memadai secara desain namun belum dilaksanakan secara konsisten. ` +
        `Audit mencakup pemeriksaan kepatuhan pelaksanaan, identifikasi penyebab inkonsistensi, dan rekomendasi peningkatan.`
      )

    case 'Cukup Memadai':
      return (
        `${kode}Pengujian efektivitas pengendalian "${fokus}" dalam mengurangi dampak risiko: "${pernyataanRisiko}".` +
        `${refEks}${refPenyebab} ` +
        `Pengendalian telah dilaksanakan secara konsisten namun risiko masih terjadi. ` +
        `Audit diarahkan untuk mengidentifikasi gap efektivitas dan merekomendasikan penguatan pengendalian agar risiko dapat dicegah sepenuhnya.`
      )

    default:
      return (
        `${kode}Audit atas pengendalian risiko: "${pernyataanRisiko}".` +
        `${refEks}${refPenyebab}` +
        (utama ? ` Pengendalian utama yang ditetapkan: "${utama}".` : '')
      )
  }
}
