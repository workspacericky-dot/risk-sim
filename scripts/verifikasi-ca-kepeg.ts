/**
 * Uji paritas modul CA Bid. Kepegawaian terhadap run_full_analysis.py.
 *
 * Angka acuan berasal dari script Python atas sampel Agustus 2025 (PA Bantul).
 * Jalankan setiap kali logika parsing/perhitungan disentuh:
 *
 *   npx tsx scripts/verifikasi-ca-kepeg.ts CA_Audit_Kepeg
 *
 * Keluar dengan kode 1 bila ada satu saja angka yang menyimpang.
 *
 * Folder sampel memuat data kepegawaian riil, karena itu dikecualikan dari git
 * (lihat .gitignore) dan hanya tersedia di mesin lokal.
 */
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'

import {
  uraiKalenderMarkdown, ratakanEntri, bangunPetaKalender, ringkasKalender,
} from '../src/lib/ca-kepeg/kalender'
import { parseSikep, ringkasSikep } from '../src/lib/ca-kepeg/parse-sikep'
import { parseKomdanas, klasifikasiHari } from '../src/lib/ca-kepeg/parse-komdanas'
import { parseGrade, parseUangMakan, parseGolongan } from '../src/lib/ca-kepeg/parse-rp'
import { jalankanAnalisis } from '../src/lib/ca-kepeg/analisis'
import { bacaMatriks, teksSel } from '../src/lib/ca-kepeg/baca-excel'
import {
  JAM_KERJA_DEFAULT, POTONGAN_REF,
  KODE_HADIR, KODE_TL, KODE_PSW, KODE_CUTI, KODE_DLS, KODE_IZIN, KODE_BELUM,
  KODE_THM, KODE_THP,
} from '../src/lib/ca-kepeg/konstanta'
import { bangunWorkbook, namaBerkasEkspor } from '../src/lib/ca-kepeg/export-excel'

const DIR = process.argv[2] ?? 'CA_Audit_Kepeg'
const TAHUN = 2025
const BULAN = 8

if (!fs.existsSync(path.join(DIR, 'ref_kalender.md'))) {
  console.error(
    `Folder sampel tidak ditemukan: ${DIR}\n`
    + 'Folder ini memuat data kepegawaian riil sehingga sengaja tidak masuk git.\n'
    + 'Sediakan salinan lokalnya, lalu jalankan:\n'
    + '  npx tsx scripts/verifikasi-ca-kepeg.ts <folder-sampel>',
  )
  process.exit(2)
}

function buf(nama: string): ArrayBuffer {
  const b = fs.readFileSync(path.join(DIR, nama))
  return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer
}

let gagal = 0

/** Stabilkan urutan kunci objek supaya perbandingan hanya menilai isinya. */
function normalkan(v: unknown): string {
  if (v && typeof v === 'object' && !Array.isArray(v)) {
    const rec = v as Record<string, unknown>
    return JSON.stringify(Object.keys(rec).sort().map((k) => [k, rec[k]]))
  }
  return JSON.stringify(v)
}

function cek(label: string, aktual: unknown, acuan: unknown) {
  const ok = normalkan(aktual) === normalkan(acuan)
  if (!ok) {
    gagal++
    console.log(`  BEDA  ${label}\n        hasil = ${JSON.stringify(aktual)}\n        acuan = ${JSON.stringify(acuan)}`)
  } else {
    console.log(`  ok    ${label} = ${JSON.stringify(aktual)}`)
  }
}

// ── Kalender ──────────────────────────────────────────────────────────────
console.log('\nKALENDER')
const terurai = uraiKalenderMarkdown(fs.readFileSync(path.join(DIR, 'ref_kalender.md'), 'utf8'))
const entri = ratakanEntri(terurai.entri)
const kalender = bangunPetaKalender(entri)
const rk = ringkasKalender(entri)
cek('Baris kalender ditolak', terurai.ditolak.length, 0)
cek('Libur Nasional + Cuti Bersama', rk.libur, 52)
cek('Ramadhan', rk.ramadhan, 56)
cek('Total entri', rk.total, 108)

// ── Tahap 1 ───────────────────────────────────────────────────────────────
console.log('\nTAHAP 1 — SIKEP')
const sikep = parseSikep(
  buf('agustus_2025_pengadilan_agama_bantul.xls'),
  'agustus_2025_pengadilan_agama_bantul.xls',
  BULAN, kalender, JAM_KERJA_DEFAULT,
)
const rs = ringkasSikep(sikep)
cek('Blok pegawai', rs.jumlahPegawai, 53)
cek('Baris data', rs.jumlahBarisData, 1643)
cek('Kode', rs.kode, { CT: 24, TL1: 15, DIS: 8, CS: 2, TL2: 1 })
cek('Kode PSW', rs.kodePsw, { PSW1: 8, PSW4: 6, PSW2: 2 })
cek('Tidak presensi', rs.tidakPresensi, { THP: 24, THM: 2 })

// ── Sumber pendukung ──────────────────────────────────────────────────────
console.log('\nSUMBER PENDUKUNG')
const hasilKomdanas = parseKomdanas(buf('01_daftar_hadir_0400_401225_PA Bantul_Agustus_2025.xlsx'))
const komdanas = hasilKomdanas.pegawai
const grade = parseGrade(buf('03_jabatan_dan_SK_0400_401225_PA Bantul_Agustus_2025.xlsx'))
const uangMakan = parseUangMakan(buf('00_uang_makan_0400_401225_PA Bantul_Agustus_2025.xlsx'))
const golongan = parseGolongan(buf('daftar_pegawai.xlsx'))
cek('KOMDANAS daftar hadir — pegawai', Object.keys(komdanas).length, 56)
cek('Kode KOMDANAS tidak dikenal', hasilKomdanas.kodeAsing, {})
cek('03_jabatan — pegawai', Object.keys(grade).length, 56)
cek('00_uang_makan — pegawai', Object.keys(uangMakan).length, 47)
cek('daftar_pegawai — golongan', Object.keys(golongan).length, 54)

// ── Tahap 2 ───────────────────────────────────────────────────────────────
console.log('\nTAHAP 2 — GAP')
const hasil = jalankanAnalisis({
  tahun: TAHUN,
  namaSatker: 'PA Bantul',
  golongan,
  bulanan: [{ bulan: BULAN, komdanas, sikep, grade, uangMakan }],
})
cek('Total gap', hasil.total.gap, 26)
cek('Pegawai dengan gap', hasil.total.pegawaiBergap, 18)
cek('PL', hasil.total.perJenis.PL, 25)
cek('CK', hasil.total.perJenis.CK, 1)
cek('WK', hasil.total.perJenis.WK, 0)
cek('TK', hasil.total.perJenis.TK, 0)
cek('Rp Pot. Tukin (capped)', hasil.total.rpTukin, 873_347)
cek('Rp Pot. Uang Makan', hasil.total.rpUm, 0)
cek('Grand total', hasil.total.rpTotal, 873_347)

// ── Rincian per baris ─────────────────────────────────────────────────────
console.log('\nDETAIL_GAP — 26 baris')
type BarisAcuan = {
  tanggal: string; nip: string; jenis: string
  kodeSikep: string; kodePsw: string; tidakPresensi: string
  mark: string; detail: string; potRemun: string
  potUm: number; rpTukin: number; rpUm: number
}
const acuan: BarisAcuan[] = JSON.parse(
  fs.readFileSync(path.join(DIR, 'golden_detail.json'), 'utf8'),
)

const semua = hasil.pegawai.flatMap((p) => p.gaps.map((g) => ({ nip: p.nip, ...g })))
cek('Jumlah baris detail', semua.length, acuan.length)

let cocokBaris = 0
for (const a of acuan) {
  const g = semua.find((x) => x.tanggal === a.tanggal && x.nip === a.nip)
  if (!g) {
    gagal++
    console.log(`  BEDA  baris hilang: ${a.tanggal} ${a.nip}`)
    continue
  }
  const kiri = [g.jenis, g.kodeSikep, g.kodePsw, g.tidakPresensi, g.markKomdanas,
    g.detailKomdanas, g.potRemun, g.potUangMakan, g.rpTukin, g.rpUm]
  const kanan = [a.jenis, a.kodeSikep, a.kodePsw, a.tidakPresensi, a.mark,
    a.detail, a.potRemun, a.potUm, a.rpTukin, a.rpUm]
  if (JSON.stringify(kiri) !== JSON.stringify(kanan)) {
    gagal++
    console.log(`  BEDA  ${a.tanggal} ${a.nip}\n        hasil = ${JSON.stringify(kiri)}\n        acuan = ${JSON.stringify(kanan)}`)
  } else {
    cocokBaris++
  }
}
console.log(`  ok    ${cocokBaris}/${acuan.length} baris detail identik`)

// ── Cakupan kode referensi ────────────────────────────────────────────────
// Setiap kode di 04_referensi_absensi.xlsx harus punya klasifikasi kehadiran
// dan tarif potongan. Kode tanpa klasifikasi terbaca sebagai hadir bersih dan
// memunculkan temuan PL palsu.
console.log('\nCAKUPAN KODE 04_referensi_absensi.xlsx')
const berkasRef = path.join(DIR, '04_referensi_absensi.xlsx')
if (!fs.existsSync(berkasRef)) {
  console.log('  (dilewati — berkas referensi tidak ada di folder sampel)')
} else {
  const barisRef = bacaMatriks(buf('04_referensi_absensi.xlsx'), false)
  const kodeRef = new Set<string>()
  const tarifRef = new Map<string, [number, number]>()
  for (const r of barisRef) {
    if (typeof r[0] !== 'number') continue
    const kode = teksSel(r[1]).toLowerCase()
    if (!kode) continue
    kodeRef.add(kode)
    if (!tarifRef.has(kode)) {
      tarifRef.set(kode, [
        parseFloat(teksSel(r[4]).replace('%', '')) || 0,
        parseInt(teksSel(r[5]), 10) || 0,
      ])
    }
  }

  const terklasifikasi = new Set([
    ...KODE_HADIR, ...KODE_TL, ...KODE_PSW, ...KODE_CUTI,
    ...KODE_DLS, ...KODE_IZIN, ...KODE_BELUM, ...KODE_THM, ...KODE_THP,
  ])
  const tanpaKlasifikasi = [...kodeRef].filter((k) => !terklasifikasi.has(k))
  const tanpaTarif = [...kodeRef].filter((k) => !POTONGAN_REF[k])
  const tarifMeleset = [...kodeRef].filter((k) => {
    const a = POTONGAN_REF[k]
    const b = tarifRef.get(k)!
    return a && (a[0] !== b[0] || a[1] !== b[1])
  })

  cek('Jumlah kode unik', kodeRef.size, 37)
  cek('Kode tanpa klasifikasi kehadiran', tanpaKlasifikasi, [])
  cek('Kode tanpa tarif potongan', tanpaTarif, [])
  cek('Tarif menyimpang dari berkas referensi', tarifMeleset, [])
}

// thm/thp yang ditulis eksplisit tidak boleh terbaca sebagai hadir bersih.
console.log('\nKODE thm/thp EKSPLISIT')
cek('datang=thm', klasifikasiHari('thm', 'v').mark, 'THM')
cek('pulang=thp', klasifikasiHari('v', 'thp').mark, 'THP')
cek('thm menang atas psw', klasifikasiHari('thm', 'psw1').mark, 'THM')
cek('sel kosong tetap turunan', klasifikasiHari('', 'v').mark, 'THM')

// ── Ekspor Excel ──────────────────────────────────────────────────────────
async function periksaEkspor() {
  console.log('\nEKSPOR EXCEL')
  const blob = await bangunWorkbook(hasil)
  const isi = Buffer.from(await blob.arrayBuffer())
  const berkasKeluaran = path.join(DIR, namaBerkasEkspor(hasil))
  fs.writeFileSync(berkasKeluaran, isi)

  const wbCek = new ExcelJS.Workbook()
  // ExcelJS mendeklarasikan tipe Buffer sendiri yang tidak identik dengan Buffer Node.
  await wbCek.xlsx.load(isi as unknown as ExcelJS.Buffer)
  cek('Nama sheet', wbCek.worksheets.map((w) => w.name),
    ['RINGKASAN', 'DETAIL_GAP', 'RINGKASAN_BULAN', 'AKUMULASI_INDIVIDU', 'AKURASI_UM', 'REFERENSI'])
  cek('DETAIL_GAP — baris data', wbCek.getWorksheet('DETAIL_GAP')!.rowCount - 3, 26)
  cek('RINGKASAN — baris pegawai', wbCek.getWorksheet('RINGKASAN')!.rowCount - 4, 18)
  cek('RINGKASAN_BULAN — baris', wbCek.getWorksheet('RINGKASAN_BULAN')!.rowCount, 14)
  console.log(`  ok    tersimpan: ${berkasKeluaran} (${(isi.length / 1024).toFixed(0)} KB)`)
}

periksaEkspor().then(() => {
  console.log(gagal === 0
    ? '\nSEMUA ANGKA COCOK DENGAN run_full_analysis.py\n'
    : `\n${gagal} PERBEDAAN DITEMUKAN\n`)
  process.exit(gagal === 0 ? 0 : 1)
})
