/**
 * Uji sintetis fungsi murni E-Perjadin Bawas (M0): Segregation of Duties &
 * kalkulasi hak keuangan berbasis SBM.
 *
 * Jalankan:  npx tsx scripts/verifikasi-e-perjadin.ts
 * Keluar dengan kode 1 bila ada satu saja pemeriksaan yang gagal.
 */
import { cekKombinasiPeran } from '../src/lib/e-perjadin/sod'
import {
  hitungHakKeuangan, hitungJumlahHari, durasiLokasiMenit, dinasDalamKotaDiakuiBesar,
  type TarifSbm, type InputDanom,
} from '../src/lib/e-perjadin/sbm'
import {
  cekTumpangTindih, cekAntiBackdate, cekPagu, hitungSaldoPagu, alokasiKomitmen,
  rentangBeririsan, formatNomor,
} from '../src/lib/e-perjadin/penugasan'
import {
  hitungTitikWajib, titikBelumTerekam, haversineMeter, deteksiAnomaliPresensi,
  type InputAnomali,
} from '../src/lib/e-perjadin/presensi'
import { segmenTerkunci, laporanSiapFinal, SEGMEN } from '../src/lib/e-perjadin/laporan'
import { evaluasiBiaya, hitungRekapPeserta, syaratPengajuanEspj, realisasiPenugasan } from '../src/lib/e-perjadin/espj'
import { keCsv } from '../src/lib/e-perjadin/csv'
import { biayaPerPenugasan, cakupanSatker, type MentahPenugasan } from '../src/lib/e-perjadin/manajerial'
import { ringkasPerubahan, jumlahPerubahan, type SnapshotBaru } from '../src/lib/e-perjadin/revisi'
import {
  hitungMetrikMingguan, penugasanTdt, seninPekan, pekanTerakhir, type MentahMetrikPenugasan,
} from '../src/lib/e-perjadin/metrik'

let gagal = 0

function cek(nama: string, aktual: unknown, harapan: unknown) {
  const a = JSON.stringify(aktual)
  const h = JSON.stringify(harapan)
  if (a === h) {
    console.log(`  OK  ${nama}`)
  } else {
    gagal++
    console.log(`GAGAL ${nama}\n      aktual : ${a}\n      harapan: ${h}`)
  }
}

function cekLempar(nama: string, fn: () => unknown) {
  try {
    fn()
    gagal++
    console.log(`GAGAL ${nama}\n      harapan: melempar Error, tetapi tidak`)
  } catch {
    console.log(`  OK  ${nama}`)
  }
}

// ── Segregation of Duties (PRD F-6.1) ────────────────────────────────────
cek('SoD: ppk + bendahara ditolak', cekKombinasiPeran(['ppk', 'bendahara']).ok, false)
cek('SoD: ppk + staf_ppk ditolak', cekKombinasiPeran(['ppk', 'staf_ppk']).ok, false)
cek('SoD: pengelola_kegiatan + ppk ditolak', cekKombinasiPeran(['pengelola_kegiatan', 'ppk']).ok, false)
cek('SoD: pelaksana + staf_ppk + bendahara diizinkan', cekKombinasiPeran(['pelaksana', 'staf_ppk', 'bendahara']).ok, true)
cek('SoD: himpunan kosong diizinkan', cekKombinasiPeran([]).ok, true)
cek('SoD: peran asing ditolak', cekKombinasiPeran(['walikota']).ok, false)

// ── Jumlah hari inklusif (PRD F-1.2) ────────────────────────────────────
cek('hari: 2–5 Mar = 4 hari (inklusif)', hitungJumlahHari('2026-03-02', '2026-03-05'), 4)
cek('hari: sehari = 1', hitungJumlahHari('2026-03-02', '2026-03-02'), 1)
cek('hari: lintas akhir pekan tetap dihitung', hitungJumlahHari('2026-03-06', '2026-03-09'), 4)
cekLempar('hari: kembali sebelum berangkat melempar', () => hitungJumlahHari('2026-03-05', '2026-03-02'))

// ── DANOM: kalkulasi hak berbasis SBM nyata (plafon_danom.md) ──────────
const tarif: TarifSbm[] = [
  { tahun: 2026, provinsi: 'Kepulauan Riau', komponen: 'uang_harian', tingkat_biaya: '-', nilai: 370_000, satuan: 'OH' },
  { tahun: 2026, provinsi: 'Kepulauan Riau', komponen: 'penginapan', tingkat_biaya: '1', nilai: 800_000, satuan: 'OM' },
  { tahun: 2026, provinsi: 'Kepulauan Riau', komponen: 'penginapan', tingkat_biaya: '2', nilai: 792_000, satuan: 'OM' },
  { tahun: 2026, provinsi: 'Kepulauan Riau', komponen: 'tiket_pesawat', tingkat_biaya: '-', nilai: 3_091_000, satuan: 'PP' },
]
const PARAM = {
  tarifDalamKotaHarian: 210_000, tarifTransportLokalDalamKota: 170_000, toleransiOverbudgetTiket: 500_000,
  faktorPenginapan30: 0.3, tarifRepresentasiLuarKota: 150_000, faktorHarianTransportRiil: 0.6,
}
const danomDasar: InputDanom = {
  jenisDinas: 'Luar Kota', tanggalBerangkat: '2026-06-08', tanggalKembali: '2026-06-11',
  provinsi: 'Kepulauan Riau', tahun: 2026, kategori: '1', penginapanMode: 'hotel',
  homebaseJabodetabek: false, berhakRepresentasi: false, transportLokalRiil: false, pakaiKendaraanDinas: false,
  estimasiPesawat: 3_500_000, estimasiDpr: 670_000, param: PARAM,
}

// Suryadi (Kat.1): 4 hari — harian 4×370rb=1.48jt; penginapan 3×800rb=2.4jt;
// pesawat min(3.5jt, 3.091jt+0.5jt=3.591jt)=3.5jt; dpr 670rb; spj 2.15jt; kwitansi 8.05jt
const dSuryadi = hitungHakKeuangan(danomDasar, tarif)
cek('DANOM: harian 4×370rb', dSuryadi.harian, 1_480_000)
cek('DANOM: penginapan Kat.1 3×800rb', dSuryadi.penginapan, 2_400_000)
cek('DANOM: pesawat di bawah plafon+toleransi → penuh', dSuryadi.pesawat, 3_500_000)
cek('DANOM: spj = harian + dpr', dSuryadi.spj, 2_150_000)
cek('DANOM: kwitansi = penginapan + pesawat + spj', dSuryadi.kwitansi, 8_050_000)

// Ricky (Kat.2): penginapan 3×792rb=2.376jt
const dRicky = hitungHakKeuangan({ ...danomDasar, kategori: '2' }, tarif)
cek('DANOM: penginapan Kat.2 3×792rb', dRicky.penginapan, 2_376_000)

// Pesawat overbudget di atas toleransi → dipotong, sisa beban pribadi
const dMahal = hitungHakKeuangan({ ...danomDasar, estimasiPesawat: 4_000_000 }, tarif)
cek('DANOM: pesawat dipotong ke plafon+toleransi', dMahal.pesawat, 3_591_000)
cek('DANOM: sisa pesawat jadi beban pribadi', dMahal.pesawatBebanPribadi, 409_000)

// Dinas dalam kota ≤ ambang: tidak ada harian/penginapan/pesawat, hanya transport lokal
const dDalamKecil = hitungHakKeuangan({ ...danomDasar, jenisDinas: 'Dalam Kota <= Ambang' }, tarif)
cek('DANOM: dalam kota ≤ ambang — harian 0', dDalamKecil.harian, 0)
cek('DANOM: dalam kota ≤ ambang — dpr = 170rb × 4 hari', dDalamKecil.dpr, 680_000)
cek('DANOM: dalam kota ≤ ambang — kwitansi = dpr saja', dDalamKecil.kwitansi, 680_000)

// Dinas dalam kota > ambang: harian 210rb/hari
const dDalamBesar = hitungHakKeuangan({ ...danomDasar, jenisDinas: 'Dalam Kota > Ambang' }, tarif)
cek('DANOM: dalam kota > ambang — harian 210rb × 4', dDalamBesar.harian, 840_000)

// Penginapan 30% (bukan homebase Jabodetabek)
const d30 = hitungHakKeuangan({ ...danomDasar, penginapanMode: '30persen' }, tarif)
cek('DANOM: penginapan 30% = round(800rb×0.3)×3', d30.penginapan, 720_000)
// Homebase Jabodetabek → 30% tidak diberikan
const d30Jkt = hitungHakKeuangan({ ...danomDasar, penginapanMode: '30persen', homebaseJabodetabek: true }, tarif)
cek('DANOM: homebase Jabodetabek → penginapan 30% nihil', d30Jkt.penginapan, 0)

cekLempar('DANOM: uang harian provinsi hilang → melempar', () =>
  hitungHakKeuangan(danomDasar, tarif.filter((t) => t.komponen !== 'uang_harian')))

// ── Revisi model (komponen_biaya_perjadin.md): representasi, 60%, kendaraan dinas ──
const dRepres = hitungHakKeuangan({ ...danomDasar, berhakRepresentasi: true }, tarif)
cek('DANOM: uang representasi 150rb × 4 hari', dRepres.representasi, 600_000)
cek('DANOM: representasi masuk spj (harian+rep+dpr)', dRepres.spj, 1_480_000 + 600_000 + 670_000)
cek('DANOM: representasi tidak untuk dalam kota',
  hitungHakKeuangan({ ...danomDasar, berhakRepresentasi: true, jenisDinas: 'Dalam Kota > Ambang' }, tarif).representasi, 0)
const dRiil = hitungHakKeuangan({ ...danomDasar, transportLokalRiil: true }, tarif)
cek('DANOM: transport lokal riil → harian 60% = round(370rb×4×0.6)', dRiil.harian, 888_000)
cek('DANOM: transport lokal riil → faktorHarian 0.6', dRiil.faktorHarian, 0.6)
const dKend = hitungHakKeuangan({ ...danomDasar, pakaiKendaraanDinas: true }, tarif)
cek('DANOM: kendaraan dinas → dpr 0', dKend.dpr, 0)

// ── Reproduksi contoh_penghitungan.md (Jakarta → Bandung tim 2 orang) ──
const tarifContoh: TarifSbm[] = [
  { tahun: 2026, provinsi: 'Jawa Barat', komponen: 'uang_harian', tingkat_biaya: '-', nilai: 430_000, satuan: 'OH' },
  { tahun: 2026, provinsi: 'Jawa Barat', komponen: 'penginapan', tingkat_biaya: '1', nilai: 800_000, satuan: 'OM' },
]
const p1 = hitungHakKeuangan({
  jenisDinas: 'Luar Kota', tanggalBerangkat: '2026-05-04', tanggalKembali: '2026-05-06',
  provinsi: 'Jawa Barat', tahun: 2026, kategori: '1', penginapanMode: 'hotel', homebaseJabodetabek: false,
  berhakRepresentasi: true, transportLokalRiil: false, pakaiKendaraanDinas: false,
  estimasiPesawat: 600_000, estimasiDpr: 340_000, param: PARAM,
}, tarifContoh)
cek('contoh P1: harian 430rb×3', p1.harian, 1_290_000)
cek('contoh P1: representasi 150rb×3', p1.representasi, 450_000)
cek('contoh P1: penginapan 800rb×2 malam', p1.penginapan, 1_600_000)
cek('contoh P1: transport antarkota at-cost (kereta)', p1.pesawat, 600_000)
cek('contoh P1: total (kwitansi) = 4.280.000', p1.kwitansi, 4_280_000)
const p2 = hitungHakKeuangan({
  jenisDinas: 'Dalam Kota > Ambang', tanggalBerangkat: '2026-05-04', tanggalKembali: '2026-05-05',
  provinsi: 'DKI Jakarta', tahun: 2026, kategori: '2', penginapanMode: 'tidak', homebaseJabodetabek: false,
  berhakRepresentasi: false, transportLokalRiil: false, pakaiKendaraanDinas: false,
  estimasiPesawat: 0, estimasiDpr: 0, param: PARAM,
}, tarifContoh)
cek('contoh P2: harian dalam kota 210rb×2', p2.harian, 420_000)
cek('contoh P2: transport lokal 170rb×2', p2.dpr, 340_000)
cek('contoh P2: representasi 0 (dalam kota)', p2.representasi, 0)
cek('contoh P2: total = 760.000', p2.kwitansi, 760_000)

// ── AF-4: durasi di lokasi (durasi_dinas.md) ─────────────────────────
cek('AF-4: In 08:00 Out 15:00 = 420 menit', durasiLokasiMenit('2026-06-08T08:00:00Z', '2026-06-08T15:00:00Z'), 420)
cek('AF-4: titik tak lengkap → null', durasiLokasiMenit('2026-06-08T08:00:00Z', null), null)
cek('AF-4: 420 mnt ≥ ambang 360 → diakui > 8 jam', dinasDalamKotaDiakuiBesar(420, 360), true)
cek('AF-4: 300 mnt < ambang → gugur', dinasDalamKotaDiakuiBesar(300, 360), false)
cek('AF-4: ambang tak boleh < 360 (di-clamp)', dinasDalamKotaDiakuiBesar(350, 300), false)
cek('AF-4: durasi null → gugur (konservatif)', dinasDalamKotaDiakuiBesar(null, 360), false)

// ── AF-1: tumpang tindih (PRD F-1.5) ───────────────────────────────────
cek('irisan: 2–5 vs 4–7 beririsan',
  rentangBeririsan({ berangkat: '2026-03-02', kembali: '2026-03-05' }, { berangkat: '2026-03-04', kembali: '2026-03-07' }), true)
cek('irisan: 2–5 vs 6–8 tidak beririsan',
  rentangBeririsan({ berangkat: '2026-03-02', kembali: '2026-03-05' }, { berangkat: '2026-03-06', kembali: '2026-03-08' }), false)
cek('irisan: bersinggungan di ujung (5 vs 5) dihitung beririsan',
  rentangBeririsan({ berangkat: '2026-03-02', kembali: '2026-03-05' }, { berangkat: '2026-03-05', kembali: '2026-03-09' }), true)
cek('AF-1: tanpa kandidat lolos',
  cekTumpangTindih({ berangkat: '2026-03-02', kembali: '2026-03-05' }, []).ok, true)
cek('AF-1: kandidat beririsan diblok',
  cekTumpangTindih({ berangkat: '2026-03-02', kembali: '2026-03-05' }, [
    { namaPeserta: 'Hendra', nomorPenugasan: '12/ST/BAWAS/2026', berangkat: '2026-03-04', kembali: '2026-03-06' },
  ]).ok, false)
cek('AF-1: kandidat tak beririsan lolos',
  cekTumpangTindih({ berangkat: '2026-03-02', kembali: '2026-03-05' }, [
    { namaPeserta: 'Hendra', nomorPenugasan: '12/ST/BAWAS/2026', berangkat: '2026-03-10', kembali: '2026-03-12' },
  ]).ok, true)

// ── AF-2: anti-backdate & H+30 (PRD F-1.4) ─────────────────────────────
cek('AF-2: Non-Rampung berangkat masa depan lolos',
  cekAntiBackdate('Non-Rampung', { berangkat: '2026-06-10', kembali: '2026-06-14' }, '2026-06-01').ok, true)
cek('AF-2: Non-Rampung berangkat sudah lewat diblok',
  cekAntiBackdate('Non-Rampung', { berangkat: '2026-05-20', kembali: '2026-05-24' }, '2026-06-01').ok, false)
cek('AF-2: Non-Rampung berangkat hari ini lolos',
  cekAntiBackdate('Non-Rampung', { berangkat: '2026-06-01', kembali: '2026-06-03' }, '2026-06-01').ok, true)
cek('AF-2: Rampung dalam H+30 lolos',
  cekAntiBackdate('Rampung', { berangkat: '2026-05-01', kembali: '2026-05-05' }, '2026-06-01').ok, true)
cek('AF-2: Rampung lewat H+30 diblok',
  cekAntiBackdate('Rampung', { berangkat: '2026-04-01', kembali: '2026-04-05' }, '2026-06-01').ok, false)

// ── AF-6: komitmen vs pagu (PRD F-1.3) ─────────────────────────────────
cek('AF-6: estimasi <= tersedia lolos', cekPagu(4_550_000, 5_000_000).ok, true)
cek('AF-6: estimasi == tersedia lolos', cekPagu(5_000_000, 5_000_000).ok, true)
cek('AF-6: estimasi > tersedia diblok', cekPagu(5_500_000, 5_000_000).ok, false)

// ── Saldo pagu ────────────────────────────────────────────────────────
cek('saldo: pesan 3jt lalu lepas 1jt → terpesan 2jt',
  hitungSaldoPagu(10_000_000, [{ jenis: 'pesan', jumlah: 3_000_000 }, { jenis: 'lepas', jumlah: 1_000_000 }]),
  { pagu: 10_000_000, terpesan: 2_000_000, terealisasi: 0, tersedia: 8_000_000 })

// ── Alokasi komitmen berurutan ────────────────────────────────────────
cek('alokasi: 4jt ke [3jt, 5jt] → [3jt, 1jt]',
  alokasiKomitmen(4_000_000, [{ paguId: 'a', tersedia: 3_000_000 }, { paguId: 'b', tersedia: 5_000_000 }]),
  [{ paguId: 'a', jumlah: 3_000_000 }, { paguId: 'b', jumlah: 1_000_000 }])
cekLempar('alokasi: total melebihi seluruh pagu melempar',
  () => alokasiKomitmen(9_000_000, [{ paguId: 'a', tersedia: 3_000_000 }]))

// ── Penomoran ─────────────────────────────────────────────────────────
cek('nomor: ST', formatNomor('ST', 7, 2026), '7/ST/BAWAS/2026')
cek('nomor: SPD', formatNomor('SPD', 12, 2026), '12/SPD/BAWAS/2026')

// ── Model "212" (PRD F-2.1) ───────────────────────────────────────────
cek('212: sehari → Start/In/Out/End',
  hitungTitikWajib('2026-03-02', '2026-03-02').map((t) => t.jenis),
  ['Start', 'In', 'Out', 'End'])
cek('212: 2 hari → tanpa titik kegiatan',
  hitungTitikWajib('2026-03-02', '2026-03-03').map((t) => t.jenis),
  ['Start', 'In', 'Out', 'End'])
cek('212: 4 hari → 2 titik kegiatan di tengah',
  hitungTitikWajib('2026-03-02', '2026-03-05').map((t) => `${t.tanggal}:${t.jenis}`),
  ['2026-03-02:Start', '2026-03-02:In', '2026-03-03:Kegiatan', '2026-03-04:Kegiatan', '2026-03-05:Out', '2026-03-05:End'])
cek('212: sisa titik setelah Start+In hari-1 terekam',
  titikBelumTerekam(
    hitungTitikWajib('2026-03-02', '2026-03-04'),
    [{ tanggal: '2026-03-02', jenis: 'Start' }, { tanggal: '2026-03-02', jenis: 'In' }],
  ).map((t) => `${t.tanggal}:${t.jenis}`),
  ['2026-03-03:Kegiatan', '2026-03-04:Out', '2026-03-04:End'])
cek('212: titik Tambahan memenuhi kewajiban Kegiatan harian',
  titikBelumTerekam(
    hitungTitikWajib('2026-03-02', '2026-03-04'),
    [{ tanggal: '2026-03-03', jenis: 'Tambahan' }],
  ).some((t) => t.jenis === 'Kegiatan'),
  false)

// ── Haversine ─────────────────────────────────────────────────────────
cek('haversine: titik sama = 0 m', Math.round(haversineMeter(-6.1754, 106.8478, -6.1754, 106.8478)), 0)
cek('haversine: ~1 km', Math.round(haversineMeter(-6.1754, 106.8478, -6.1844, 106.8478) / 100) * 100, 1000)

// ── AF-7 ──────────────────────────────────────────────────────────────
const dasarAnomali: InputAnomali = {
  jenis: 'In', waktuServerMs: Date.parse('2026-03-02T08:00:00Z'), waktuPerangkatMs: Date.parse('2026-03-02T08:00:30Z'),
  lintang: -6.1754, bujur: 106.8478, sumber: 'pwa', dalamGeofence: true, titikSebelumnya: null,
  pesertaLainDiPerangkatHariIni: 0, pesertaIniSudahDiPerangkat: false, fallbackSebelumnya: 0,
  adaKoordinatIdentikLain: false, ambangSelisihMenit: 5, ambangKecepatanKmh: 900,
  ambangFallbackBerulang: 2, batasPesertaPerangkat: 4,
}
cek('AF-7: kondisi normal → tidak ada temuan', deteksiAnomaliPresensi(dasarAnomali).length, 0)
cek('AF-7a: selisih waktu 20 menit → temuan',
  deteksiAnomaliPresensi({ ...dasarAnomali, waktuPerangkatMs: Date.parse('2026-03-02T08:20:00Z') }).length, 1)
cek('AF-7b: 300 km dalam 1 menit → kecepatan mustahil',
  deteksiAnomaliPresensi({
    ...dasarAnomali,
    titikSebelumnya: { lintang: -6.1754, bujur: 106.8478, waktuServerMs: Date.parse('2026-03-02T07:59:00Z') },
    lintang: -3.5, bujur: 106.8478,
  }).some((t) => t.ringkasan.includes('AF-7b')), true)
cek('AF-7c: perangkat ke-5 peserta → temuan',
  deteksiAnomaliPresensi({ ...dasarAnomali, pesertaLainDiPerangkatHariIni: 4, pesertaIniSudahDiPerangkat: false })
    .some((t) => t.ringkasan.includes('AF-7c')), true)
cek('AF-7c: peserta ini sudah terhitung → tidak dobel',
  deteksiAnomaliPresensi({ ...dasarAnomali, pesertaLainDiPerangkatHariIni: 4, pesertaIniSudahDiPerangkat: true })
    .some((t) => t.ringkasan.includes('AF-7c')), false)
cek('AF-7d: fallback ke-3 → temuan',
  deteksiAnomaliPresensi({ ...dasarAnomali, sumber: 'fallback', fallbackSebelumnya: 2 })
    .some((t) => t.ringkasan.includes('AF-7d')), true)
cek('AF-7e: koordinat identik → temuan',
  deteksiAnomaliPresensi({ ...dasarAnomali, adaKoordinatIdentikLain: true }).some((t) => t.ringkasan.includes('AF-7e')), true)
cek('AF-7f: di luar geofence → temuan',
  deteksiAnomaliPresensi({ ...dasarAnomali, dalamGeofence: false }).some((t) => t.ringkasan.includes('AF-7f')), true)

// ── Laporan tersegmentasi (PRD F-4.1, F-4.2) ──────────────────────────
const T0 = Date.parse('2026-03-10T10:00:00Z')
cek('lock: disunting orang lain 1 menit lalu → terkunci',
  segmenTerkunci('u-lain', '2026-03-10T09:59:00Z', 'u-saya', T0).terkunci, true)
cek('lock: disunting orang lain 10 menit lalu → tidak terkunci',
  segmenTerkunci('u-lain', '2026-03-10T09:50:00Z', 'u-saya', T0).terkunci, false)
cek('lock: disunting oleh saya sendiri → tidak terkunci',
  segmenTerkunci('u-saya', '2026-03-10T09:59:00Z', 'u-saya', T0).terkunci, false)
cek('lock: belum pernah disunting → tidak terkunci',
  segmenTerkunci(null, null, 'u-saya', T0).terkunci, false)

const segmenLengkap = SEGMEN.map((s) => ({ kunci: s.kunci, isi: 'terisi' }))
cek('final: keenam segmen terisi → siap', laporanSiapFinal(segmenLengkap).siap, true)
cek('final: satu segmen kosong → tidak siap + sebut yang kurang',
  laporanSiapFinal(segmenLengkap.map((s) => s.kunci === 'saran' ? { ...s, isi: '  ' } : s)),
  { siap: false, kurang: ['Saran'] })

// ── AF-5: klaim vs SBM (PRD F-3.2) ────────────────────────────────────
cek('AF-5: di bawah batas → diakui penuh',
  evaluasiBiaya(700_000, 800_000, false), { melebihi_sbm: false, jumlah_diakui: 700_000, batas_sbm: 800_000 })
cek('AF-5: di atas batas tanpa persetujuan → dipotong ke batas',
  evaluasiBiaya(1_200_000, 800_000, false), { melebihi_sbm: true, jumlah_diakui: 800_000, batas_sbm: 800_000 })
cek('AF-5: di atas batas + disetujui PPK → diakui penuh (tetap ditandai)',
  evaluasiBiaya(1_200_000, 800_000, true), { melebihi_sbm: true, jumlah_diakui: 1_200_000, batas_sbm: 800_000 })
cek('AF-5: komponen tanpa batas (tiket) → diakui penuh',
  evaluasiBiaya(2_500_000, null, false), { melebihi_sbm: false, jumlah_diakui: 2_500_000, batas_sbm: null })

// ── Rekap kurang/lebih bayar (PRD F-5.1) ──────────────────────────────
cek('rekap: uang muka 50% → kurang bayar separuh hak',
  hitungRekapPeserta({ hakSbm: 4_000_000, biayaRiilDiakui: 3_500_000, tambahanDiakuiDiAtasSbm: 0, uangMukaPersen: 50 }),
  { hak_sbm: 4_000_000, biaya_riil: 3_500_000, uang_muka: 2_000_000, selisih: 2_000_000 })
cek('rekap: uang muka 100% → nol selisih',
  hitungRekapPeserta({ hakSbm: 4_000_000, biayaRiilDiakui: 4_000_000, tambahanDiakuiDiAtasSbm: 0, uangMukaPersen: 100 }).selisih, 0)
cek('rekap: uang muka 100% + tambahan di atas SBM disetujui → kurang bayar tambahan',
  hitungRekapPeserta({ hakSbm: 4_000_000, biayaRiilDiakui: 4_400_000, tambahanDiakuiDiAtasSbm: 400_000, uangMukaPersen: 100 }).selisih, 400_000)

// ── Syarat pengajuan E-SPJ: AF-3, AF-8, AF-9 (PRD F-5.1) ──────────────
cek('E-SPJ: semua syarat terpenuhi → boleh',
  syaratPengajuanEspj({ statusPenugasan: 'Berjalan', adaNomorSt: true, laporanFinal: true, titikWajibBelum: 0, presensiBelumDiputus: 0 }).boleh, true)
cek('AF-3: tanpa nomor ST → blokir',
  syaratPengajuanEspj({ statusPenugasan: 'Berjalan', adaNomorSt: false, laporanFinal: true, titikWajibBelum: 0, presensiBelumDiputus: 0 })
    .blokir.some((b) => b.kode === 'AF-3'), true)
cek('AF-8: titik wajib belum lengkap → blokir',
  syaratPengajuanEspj({ statusPenugasan: 'Berjalan', adaNomorSt: true, laporanFinal: true, titikWajibBelum: 2, presensiBelumDiputus: 0 })
    .blokir.some((b) => b.kode === 'AF-8'), true)
cek('AF-8: anomali presensi belum diputus → blokir',
  syaratPengajuanEspj({ statusPenugasan: 'Berjalan', adaNomorSt: true, laporanFinal: true, titikWajibBelum: 0, presensiBelumDiputus: 1 })
    .blokir.some((b) => b.kode === 'AF-8'), true)
cek('AF-9: laporan belum final → blokir',
  syaratPengajuanEspj({ statusPenugasan: 'Berjalan', adaNomorSt: true, laporanFinal: false, titikWajibBelum: 0, presensiBelumDiputus: 0 })
    .blokir.some((b) => b.kode === 'AF-9'), true)

// ── M5: realisasi penugasan & CSV paket audit (F-6.3, O4) ─────────────
cek('realisasi: Σ(selisih + uang muka) dua peserta',
  realisasiPenugasan([
    { selisih: 2_000_000, selisih_final: null, uang_muka: 2_000_000 },
    { selisih: -500_000, selisih_final: null, uang_muka: 4_000_000 },
  ]), 7_500_000)
cek('realisasi: selisih_final menang atas selisih',
  realisasiPenugasan([{ selisih: 2_000_000, selisih_final: 1_500_000, uang_muka: 2_000_000 }]), 3_500_000)

cek('csv: kutip sel berisi koma & tanda kutip',
  keCsv(['a', 'b'], [['x,y', 'te"st'], [1, null]]),
  'a,b\r\n"x,y","te""st"\r\n1,')

// ── O4: laporan manajerial (KR4.2) ────────────────────────────────────
const mp = (o: Partial<MentahPenugasan>): MentahPenugasan => ({
  id: 'x', nomor: null, maksud: '', status: 'Selesai', provinsi: 'Bali', satker: 'PN Denpasar',
  unitId: 'u1', tanggalBerangkat: '2026-03-02', tanggalKembali: '2026-03-05', adaPka: false,
  jumlahPeserta: 1, estimasiTotal: 4_000_000, espjLines: [], ...o,
})
cek('biaya per penugasan: pakai realisasi bila ada E-SPJ',
  biayaPerPenugasan([mp({ espjLines: [{ selisih: 2_000_000, selisih_final: null, uang_muka: 2_000_000 }] })])[0].costPerPenugasan,
  4_000_000)
cek('biaya per penugasan: fallback ke estimasi bila belum E-SPJ',
  biayaPerPenugasan([mp({ estimasiTotal: 3_500_000, espjLines: [] })])[0].costPerPenugasan, 3_500_000)
cek('cakupan satker: gabung kunjungan & hitung yang tertaut PKA',
  cakupanSatker([
    mp({ unitId: 'u1', adaPka: true, estimasiTotal: 4_000_000 }),
    mp({ unitId: 'u1', adaPka: false, estimasiTotal: 2_000_000 }),
    mp({ unitId: 'u2', satker: 'PN Ubud', adaPka: true, estimasiTotal: 1_000_000 }),
  ]),
  [
    { unitId: 'u1', satker: 'PN Denpasar', provinsi: 'Bali', kunjungan: 2, penugasanTertautPka: 1, totalEstimasi: 6_000_000, totalRealisasi: 0 },
    { unitId: 'u2', satker: 'PN Ubud', provinsi: 'Bali', kunjungan: 1, penugasanTertautPka: 1, totalEstimasi: 1_000_000, totalRealisasi: 0 },
  ])

// ── Revisi bernomor (F-1.4) ──────────────────────────────────────────
const revKosong: SnapshotBaru = { header: {}, peserta: [] }
cek('revisi: kosong → 0 perubahan', jumlahPerubahan(revKosong), 0)
cek('revisi: kosong → jenis []', ringkasPerubahan(revKosong).jenis, [])
const revTanggal: SnapshotBaru = { header: { tanggal_kembali: '2026-09-12' }, peserta: [] }
cek('revisi: ubah tanggal → jenis [tanggal], dampak DANOM',
  ringkasPerubahan(revTanggal), { jenis: ['tanggal'], adaDampakDanom: true })
const revTim: SnapshotBaru = { header: {}, peserta: [{ aksi: 'tarik', peserta_id: 'p1', nama: 'A', alasan: 'sakit' }] }
cek('revisi: tarik peserta → jenis [tim], dampak DANOM',
  ringkasPerubahan(revTim), { jenis: ['tim'], adaDampakDanom: true })
cek('revisi: tanggal + tim → 3 perubahan',
  jumlahPerubahan({ header: { tanggal_berangkat: 'x', tanggal_kembali: 'y' }, peserta: [{ aksi: 'tarik', peserta_id: 'p', nama: 'A', alasan: 'z' }] }), 3)

// ── TDT & metrik mingguan (§3, §6) ───────────────────────────────────
cek('seninPekan: Selasa → Senin pekan itu', seninPekan('2026-09-01'), '2026-08-31')
cek('seninPekan: Senin → hari itu juga', seninPekan('2026-08-31'), '2026-08-31')
cek('seninPekan: Minggu → Senin pekan itu', seninPekan('2026-09-06'), '2026-08-31')
cek('pekanTerakhir: 3 Senin berurutan, terlama dulu',
  pekanTerakhir('2026-09-01', 3), ['2026-08-17', '2026-08-24', '2026-08-31'])

const mmp = (o: Partial<MentahMetrikPenugasan>): MentahMetrikPenugasan => ({
  id: 'x', tanggalKembali: '2026-08-10', jenisAlur: 'Non-Rampung', adaNomorSt: true,
  titikWajibBelum: 0, presensiBelumDiputus: 0, presensiDiputusManual: 0, laporanFinal: true,
  espjDisetujuiPada: '2026-08-15', siklusRevisi: 0, ...o,
})
cek('TDT: semua syarat terpenuhi → true', penugasanTdt(mmp({})), true)
cek('TDT: E-SPJ tepat 14 hari → true', penugasanTdt(mmp({ espjDisetujuiPada: '2026-08-24' })), true)
cek('TDT: E-SPJ 15 hari → false', penugasanTdt(mmp({ espjDisetujuiPada: '2026-08-25' })), false)
cek('TDT: pernah diputus PPK → false', penugasanTdt(mmp({ presensiDiputusManual: 1 })), false)
cek('TDT: tanpa nomor ST → false', penugasanTdt(mmp({ adaNomorSt: false })), false)
cek('TDT: laporan belum final → false', penugasanTdt(mmp({ laporanFinal: false })), false)
cek('TDT: E-SPJ belum disetujui → false', penugasanTdt(mmp({ espjDisetujuiPada: null })), false)

cek('hitungMetrikMingguan: agregat pekan contoh',
  hitungMetrikMingguan({
    penugasan: [
      mmp({ id: 'a' }),
      mmp({ id: 'b', titikWajibBelum: 1, siklusRevisi: 2 }),
      mmp({ id: 'c', jenisAlur: 'Rampung', espjDisetujuiPada: null }),
    ],
    antiMetrik: { fallback: 3, atasSbm: 1, rampung: 1, totalPenugasanMinggu: 4 },
    heart: { presensiPercobaanPertama: 8, totalPresensiPwa: 10, durasiRekamDetik: [30, 40, 50] },
  }),
  {
    tdt_pembilang: 1, tdt_penyebut: 2,
    kr: { kr1_1_zero_off_system: 1, kr1_3_presensi_otomatis: 0.5, kr2_1_median_hari_espj: 5, kr2_2_maks_satu_revisi: 0.5 },
    anti_metrik: { presensi_fallback: 3, klaim_atas_sbm_disetujui: 1, rasio_rampung: 0.25 },
    heart: { presensi_berhasil_pertama: 0.8, median_durasi_rekam_detik: 40 },
  })

console.log(gagal === 0 ? '\nSemua pemeriksaan lolos.' : `\n${gagal} pemeriksaan GAGAL.`)
process.exit(gagal === 0 ? 0 : 1)
