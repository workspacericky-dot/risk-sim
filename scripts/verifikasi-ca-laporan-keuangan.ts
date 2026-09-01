/**
 * Uji modul CA Laporan Keuangan terhadap PDF laporan keuangan satker asli.
 *
 * Berkas sampel berisi data keuangan satker riil sehingga TIDAK di-commit
 * (lihat .gitignore). Script menerima path PDF sebagai argumen; bila tidak ada
 * berkas yang bisa dipakai, script keluar dengan pesan jelas — bukan gagal.
 *
 * Jalankan:  npx tsx scripts/verifikasi-ca-laporan-keuangan.ts ["path/ke.pdf"]
 * Keluar dengan kode 1 bila ada satu saja pemeriksaan yang gagal.
 */
import fs from 'node:fs'
import { parseAngka, nilaiDalamNarasi } from '../src/lib/ca-laporan-keuangan/angka'
import { prosesPdf } from '../src/lib/ca-laporan-keuangan/proses'
import { seksiByKode } from '../src/lib/ca-laporan-keuangan/parse-calk'
import type { DataLk, Temuan } from '../src/lib/ca-laporan-keuangan/konstanta'

const BAWAAN = 'CA_Audit Lapkeu/PA Jombang_LK 401272 Th 2025 Unaudited Lengkap.pdf'
/**
 * Fixture kedua: cetakan SEMESTER/interim satker yang sama. Sengaja berbeda
 * template dari BAWAAN — angka bergaya CaLK bahkan di halaman muka, LRA 6
 * kolom (bukan 8), Neraca/LO/LPE 2 kolom (bukan 4), tanpa Neraca Percobaan,
 * tanpa blok header "SATUAN KERJA :". Menguji modul benar-benar generik
 * lintas varian ekspor SAKTI, bukan hanya cocok untuk satu bentuk PDF.
 */
const BAWAAN_SEMESTER = 'CA_Audit Lapkeu/CaLK 401272 SEMESTER I 2025.pdf'

let gagal = 0
let lulus = 0

function cek(nama: string, aktual: unknown, harapan: unknown) {
  const a = JSON.stringify(aktual)
  const h = JSON.stringify(harapan)
  if (a === h) {
    lulus++
    console.log(`  ok   ${nama}`)
  } else {
    gagal++
    console.log(`  GAGAL ${nama}\n        harap : ${h}\n        aktual: ${a}`)
  }
}

function cekBenar(nama: string, kondisi: boolean, keterangan = '') {
  cek(nama + (keterangan ? ` (${keterangan})` : ''), kondisi, true)
}

// ── Uji murni parser angka (tanpa PDF) ───────────────────────────────────
function ujiAngka() {
  console.log('\n[1] Parser angka dwi-format')
  // Gaya muka: koma = ribuan, titik = desimal, kurung = negatif.
  cek('muka "396,599,500"', parseAngka('396,599,500', 'muka'), 396599500)
  cek('muka "(36,593,000)"', parseAngka('(36,593,000)', 'muka'), -36593000)
  cek('muka "112.52"', parseAngka('112.52', 'muka'), 112.52)
  cek('muka "0"', parseAngka('0', 'muka'), 0)
  cek('muka "()" → null', parseAngka('()', 'muka'), null)

  // Gaya CaLK: titik = ribuan, koma = desimal.
  cek('calk "Rp.396.599.500,00"', parseAngka('Rp.396.599.500,00', 'calk'), 396599500)
  cek('calk "155.100.000,00"', parseAngka('155.100.000,00', 'calk'), 155100000)
  cek('calk "112,52"', parseAngka('112,52', 'calk'), 112.52)
  cek('calk "0,00"', parseAngka('0,00', 'calk'), 0)

  // Format yang salah gaya harus ditolak, bukan disalahartikan.
  cek('calk "155.100.000,00" TIDAK dibaca gaya muka', parseAngka('155.100.000,00', 'muka'), null)

  const nilai = nilaiDalamNarasi('mengalami penurunan sebesar Rp.45.149.500,00 atau 12,85% dibandingkan')
  cek('nilai narasi rupiah', nilai.find((n) => n.jenis === 'rupiah')?.nilai, 45149500)
  cek('nilai narasi persen', nilai.find((n) => n.jenis === 'persen')?.nilai, 12.85)
}

// ── Uji terhadap PDF sampel ──────────────────────────────────────────────
const cari = <T extends { uraian: string }>(b: T[], p: RegExp) => b.find((x) => p.test(x.uraian))

const saldo = (data: DataLk, awalan: string, arah: 'debet' | 'kredit') =>
  data.npAkrual
    .filter((r) => r.kodeAkun.startsWith(awalan))
    .reduce((s, r) => s + (arah === 'debet' ? (r.debet ?? 0) - (r.kredit ?? 0) : (r.kredit ?? 0) - (r.debet ?? 0)), 0)

function ujiMetadata(data: DataLk) {
  console.log('\n[2] Metadata dokumen')
  const m = data.metadata
  cek('kode satker', m.kodeSatker, '401272')
  cek('nama satker', m.namaSatker, 'PENGADILAN AGAMA JOMBANG')
  cek('kementerian', m.kementerian, 'MAHKAMAH AGUNG')
  cek('tahun anggaran', m.tahun, 2025)
  cek('status laporan', m.status, 'UNAUDITED')
  cek('tanggal data', m.tglData, '19/02/26 1:54 AM')
  cek('tanggal cetak', m.tglCetak, '19/02/26 8:17 AM')
  cek('penanggung jawab', m.penanggungJawab, 'NAFIS MACHFIIYAH, S.Ag., M.H.')
  cek('NIP', m.nip, '197207291999032001')
}

function ujiEkstraksi(data: DataLk) {
  console.log('\n[3] Ekstraksi tabel laporan muka')
  cek('tidak ada bagian gagal parse', data.bagianTidakLengkap, [])

  // Nilai persen ini dicetak terpotong dua baris ("112.5" + "2") — uji bahwa
  // penggabungan pecahan kolom bekerja.
  const pnbp = cari(data.lra, /^II\. Pendapatan Penerimaan Negara Bukan Pajak$/)
  cek('LRA PNBP realisasi', pnbp?.realisasi, 396599500)
  cek('LRA PNBP anggaran', pnbp?.anggaran, 352482000)
  cek('LRA PNBP % (terpotong 2 baris)', pnbp?.persen, 112.52)

  const belanja = cari(data.lra, /^Jumlah Belanja Negara/)
  cek('LRA realisasi belanja', belanja?.realisasi, 144158300)

  // Baris ini labelnya terpisah dari angkanya di PDF — uji penggabungan baris.
  const kjp = cari(data.neraca, /^JUMLAH KEWAJIBAN JANGKA PENDEK$/)
  cek('Neraca JUMLAH KEWAJIBAN JANGKA PENDEK (TA lalu)', kjp?.nilaiLalu, 6726568)

  cek('Neraca JUMLAH ASET (TA lalu)', cari(data.neraca, /^JUMLAH ASET$/)?.nilaiLalu, 22093642)
  cek('LO Surplus/Defisit-LO', cari(data.lo, /^SURPLUS\/DEFISIT\s*-\s*LO$/)?.nilai, 229814726)
  cek('LO JUMLAH BEBAN', cari(data.lo, /^JUMLAH BEBAN$/)?.nilai, 149957374)
  cek('LPE EKUITAS AWAL', cari(data.lpe, /^EKUITAS AWAL$/)?.nilai, 15367074)
  cek('LPE EKUITAS AKHIR', cari(data.lpe, /^EKUITAS AKHIR$/)?.nilai, 0)

  cek('Neraca Percobaan Akrual — jumlah baris akun', data.npAkrual.length, 15)
  cek('Neraca Percobaan Kas — jumlah baris akun', data.npKas.length, 13)
  cek('total NP Akrual tercetak', data.totalNpAkrual, { debet: 563384274, kredit: 563384274 })
  cek('total NP Kas tercetak', data.totalNpKas, { debet: 542659800, kredit: 542659800 })
}

function ujiKonsistensi(data: DataLk) {
  console.log('\n[4] Konsistensi antar-laporan (kategori A)')
  const aset = cari(data.neraca, /^JUMLAH ASET$/)
  const kewEkuitas = cari(data.neraca, /^JUMLAH KEWAJIBAN DAN EKUITAS$/)
  cek('Neraca balance TA berjalan', aset?.nilai, kewEkuitas?.nilai)
  cek('Neraca balance TA lalu', aset?.nilaiLalu, kewEkuitas?.nilaiLalu)

  const debetA = data.npAkrual.reduce((s, r) => s + (r.debet ?? 0), 0)
  const kreditA = data.npAkrual.reduce((s, r) => s + (r.kredit ?? 0), 0)
  cek('NP Akrual debet = kredit', debetA, kreditA)
  cek('NP Akrual sesuai total tercetak', debetA, data.totalNpAkrual.debet)

  const debetK = data.npKas.reduce((s, r) => s + (r.debet ?? 0), 0)
  const kreditK = data.npKas.reduce((s, r) => s + (r.kredit ?? 0), 0)
  cek('NP Kas debet = kredit', debetK, kreditK)
  cek('NP Kas sesuai total tercetak', debetK, data.totalNpKas.debet)

  cek('Akun 4xxxxx = Pendapatan-LO', saldo(data, '4', 'kredit'), 396599500)
  cek('Akun 4xxxxx − 5xxxxx = Surplus/Defisit-LO',
    saldo(data, '4', 'kredit') - saldo(data, '5', 'debet'), 229814726)

  const belanjaNeto = data.npKas
    .filter((r) => r.kodeAkun.startsWith('5'))
    .reduce((s, r) => s + (r.debet ?? 0) - (r.kredit ?? 0), 0)
  cek('Belanja bruto − pengembalian = realisasi LRA', belanjaNeto, 144158300)

  const ekuitasNeraca = [...data.neraca].reverse().find((r) => /^JUMLAH EKUITAS$/.test(r.uraian))
  cek('Ekuitas Akhir LPE = Ekuitas Neraca',
    cari(data.lpe, /^EKUITAS AKHIR$/)?.nilai, ekuitasNeraca?.nilai)
  cek('Ekuitas Awal LPE = Ekuitas Akhir TA lalu',
    cari(data.lpe, /^EKUITAS AWAL$/)?.nilai, cari(data.lpe, /^EKUITAS AKHIR$/)?.nilaiLalu)
  cek('Surplus/Defisit-LO di LO = di LPE',
    cari(data.lo, /^SURPLUS\/DEFISIT\s*-\s*LO$/)?.nilai,
    cari(data.lpe, /^SURPLUS\/DEFISIT\s*-?\s*LO$/)?.nilai)
}

function ujiCalk(data: DataLk) {
  console.log('\n[5] Catatan atas Laporan Keuangan')
  cekBenar('jumlah seksi CaLK memadai', data.calk.length >= 40, `${data.calk.length} seksi`)

  const b1 = seksiByKode(data.calk, 'B.1')
  cekBenar('seksi B.1 ditemukan', b1 !== undefined)
  cekBenar('narasi B.1 memuat kata "penurunan"', b1?.narasi.includes('penurunan') === true)
  cekBenar('narasi B.1 memuat Rp.45.149.500,00',
    b1?.nilai.some((n) => n.jenis === 'rupiah' && n.nilai === 45149500) === true)

  const terdaftarHilang = [...data.tabelTerdaftar.keys()].filter((n) => !data.tabelMuncul.has(n))
  const munculTakTerdaftar = [...data.tabelMuncul.keys()].filter((n) => !data.tabelTerdaftar.has(n))
  cek('semua tabel terdaftar muncul di badan dokumen', terdaftarHilang, [])
  cek('tidak ada tabel tak terdaftar', munculTakTerdaftar, [])
}

function ujiTemuan(temuan: Temuan[]) {
  console.log('\n[6] Temuan yang wajib terdeteksi')

  // Kasus utama Bagian 5.D: narasi menyatakan "penurunan" padahal naik.
  const d = temuan.find((t) => t.kategori === 'D' && /penurunan/.test(t.deskripsi) && /kenaikan/.test(t.deskripsi))
  cekBenar('kategori D — arah narasi bertentangan dengan angka', d !== undefined)
  cek('  severity temuan D', d?.severity, 'Tinggi')
  cek('  nilai hitung ulang temuan D', d?.nilaiHitung, 45149500)
  cek('  halaman rujukan temuan D', d?.halaman, 37)

  const kontradiksi = temuan.find((t) => t.kategori === 'D' && /kontradiktif/.test(t.deskripsi))
  cekBenar('kategori D — narasi kontradiktif secara internal', kontradiksi !== undefined)

  // Bagian 5.F: realisasi pendapatan di atas pagu.
  const f = temuan.find((t) => t.kategori === 'F' && /112\.52% dari pagu/.test(t.deskripsi))
  cekBenar('kategori F — realisasi pendapatan 112,52% di atas pagu', f !== undefined)
  cek('  severity realisasi pendapatan >100% adalah Info', f?.severity, 'Info')

  // Tidak boleh ada temuan palsu pada kategori yang seluruh ujinya cocok.
  const a = temuan.filter((t) => t.kategori === 'A')
  cek('kategori A tidak menghasilkan temuan palsu', a.map((t) => t.deskripsi), [])
  const c = temuan.filter((t) => t.kategori === 'C')
  cek('kategori C tidak menghasilkan temuan palsu', c.map((t) => t.deskripsi), [])
}

/**
 * Uji fixture semester — memastikan modul benar-benar generik lintas
 * template, bukan hanya cocok untuk bentuk PDF pertama (Bagian 8 DoD:
 * "tetap berjalan ketika diuji dengan PDF laporan keuangan satker lain
 * yang formatnya sedikit berbeda").
 */
function ujiSemester(data: DataLk, temuan: Temuan[]) {
  console.log('\n[7] Fixture kedua — cetakan semester (template berbeda)')

  cek('metadata: kode satker (via cadangan, tanpa header SATUAN KERJA)', data.metadata.kodeSatker, '401272')
  cek('metadata: nama satker (via cadangan)', data.metadata.namaSatker, 'PENGADILAN AGAMA JOMBANG')
  cek('metadata: tahun (tidak tertukar dgn tahun pembanding "31 Desember 2024")', data.metadata.tahun, 2025)
  cek('metadata: penanggung jawab (via cadangan)', data.metadata.penanggungJawab, 'NAFIS MACHFIIYAH')
  cek('metadata: NIP (via cadangan)', data.metadata.nip, '197207291999032001')

  cekBenar('LRA terbaca meski 6 kolom (bukan 8) & gaya angka CaLK', data.lra.length > 0, `${data.lra.length} baris`)
  cekBenar('Neraca terbaca meski 2 kolom (bukan 4)', data.neraca.length > 0, `${data.neraca.length} baris`)
  cekBenar('LO terbaca meski 2 kolom', data.lo.length > 0, `${data.lo.length} baris`)
  cekBenar('LPE terbaca meski 2 kolom', data.lpe.length > 0, `${data.lpe.length} baris`)
  cek('Neraca Percobaan memang tidak ada pada varian ini — dilaporkan, bukan gagal diam-diam',
    data.bagianTidakLengkap.some((b) => /Neraca Percobaan Akrual/.test(b)), true)

  const aset = data.neraca.find((r) => r.uraian === 'JUMLAH ASET')
  const kewEkuitas = data.neraca.find((r) => r.uraian === 'JUMLAH KEWAJIBAN DAN EKUITAS')
  cek('Neraca balance (silang-cek independen dari engine analisis)', aset?.nilai, kewEkuitas?.nilai)
  cek('Neraca JUMLAH ASET', aset?.nilai, 204983000)

  const jumlahPendapatanLra = data.lra.find((r) => r.uraian === 'Jumlah Pendapatan')
  cek('LRA "Jumlah Pendapatan" (bukan "Jumlah Pendapatan Negara dan Hibah")', jumlahPendapatanLra?.realisasi, 183363000)
  cek('LRA selisih Rp dihitung sendiri (kolom tsb tidak dicetak di varian ini)',
    jumlahPendapatanLra?.selisih, jumlahPendapatanLra && jumlahPendapatanLra.realisasi !== null && jumlahPendapatanLra.anggaran !== null
      ? jumlahPendapatanLra.realisasi - jumlahPendapatanLra.anggaran : null)

  // Temuan nyata: narasi CaLK C.4.1 menyatakan NIHIL/Rp0 padahal Neraca
  // menyajikan saldo Rp184.615.600 — defek dokumen sungguhan, bukan artefak
  // parser (sudah diverifikasi manual terhadap teks PDF asli).
  const nihil = temuan.find((t) => t.pos.includes('C.4.1') && /nihil/i.test(t.deskripsi))
  cekBenar('kategori B — narasi "NIHIL" bertentangan dengan saldo Neraca ≠ 0', nihil !== undefined)
  cek('  nilai Neraca pada temuan nihil', nihil?.nilaiTercetak, 184615600)

  // Defek dokumen sungguhan kedua: Tabel 13 ada di badan dokumen tapi baris
  // entrinya di Daftar Tabel kosong (hanya titik-titik penuntun tanpa judul).
  const tabel13 = temuan.find((t) => t.pos === 'Tabel 13' && /tidak terdaftar/.test(t.deskripsi))
  cekBenar('kategori B — Tabel 13 muncul tapi tidak terdaftar di Daftar Tabel', tabel13 !== undefined)

  cek('kategori A tidak menghasilkan temuan palsu pada template ini',
    temuan.filter((t) => t.kategori === 'A').map((t) => t.deskripsi), [])
  cek('kategori C tidak menghasilkan temuan palsu pada template ini',
    temuan.filter((t) => t.kategori === 'C').map((t) => t.deskripsi), [])
}

async function jalankanFixture(path: string, ujiTambahan: (data: DataLk, temuan: Temuan[]) => void) {
  if (!fs.existsSync(path)) {
    console.log(`\n[dilewati] Berkas PDF sampel tidak ditemukan: ${path}`)
    return
  }

  console.log(`\nBerkas: ${path}`)
  const buf = fs.readFileSync(path)
  const pdf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer
  const hasil = await prosesPdf(pdf)

  console.log(`Halaman: ${hasil.jumlahHalaman} | Temuan: ${hasil.temuan.length} | Rasio: ${hasil.rasio.length}`)
  ujiTambahan(hasil.data, hasil.temuan)
}

async function main() {
  console.log('=== Verifikasi modul CA Laporan Keuangan ===')
  ujiAngka()

  const pathEksplisit = process.argv[2]
  if (pathEksplisit) {
    // Path eksplisit: jalankan uji generik (fixture pertama) terhadap berkas itu.
    await jalankanFixture(pathEksplisit, (data, temuan) => {
      ujiMetadata(data)
      ujiEkstraksi(data)
      ujiKonsistensi(data)
      ujiCalk(data)
      ujiTemuan(temuan)
    })
  } else {
    await jalankanFixture(BAWAAN, (data, temuan) => {
      ujiMetadata(data)
      ujiEkstraksi(data)
      ujiKonsistensi(data)
      ujiCalk(data)
      ujiTemuan(temuan)
    })
    await jalankanFixture(BAWAAN_SEMESTER, ujiSemester)
  }

  console.log(`\nHasil: ${lulus} lulus, ${gagal} gagal.`)
  process.exit(gagal > 0 ? 1 : 0)
}

main().catch((e) => {
  console.error('Gagal menjalankan verifikasi:', e)
  process.exit(1)
})
