/**
 * Ekspor hasil analisis jadi workbook 6 sheet, mengikuti struktur
 * gap_excel_<nama>_<tahun>.xlsx keluaran run_full_analysis.py.
 *
 * Dijalankan di browser (ExcelJS memakai build browser-nya sendiri).
 */
import ExcelJS from 'exceljs'
import {
  ISIAN_GAP, JENIS_GAP, LABEL_GAP, NAMA_BULAN, namaBulan,
  type JenisGap,
} from './konstanta'
import {
  akumulasiIndividu, akurasiUangMakan, kelompokPerBulan, matriksRingkasan,
  rekapPerBulan, tukinBulananCapped, type HasilAnalisis,
} from './analisis'

const BULAN = Array.from({ length: 12 }, (_, i) => i + 1)

const ISI_HEADER = 'FF2C3E50'
const ISI_HEADER_2 = 'FF34495E'
const ISI_SELANG = 'FFF5F5F5'
const ISI_PERINGATAN = 'FFFADBD8'
const ISI_POSITIF = 'FFD5F5E3'
const ISI_UBAH = 'FFFFF3CD'

const FONT_HEADER = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 }
const FONT_TEBAL = { bold: true, size: 9 }
const FONT_BIASA = { size: 9 }

const GARIS = { style: 'thin' as const, color: { argb: 'FFAAAAAA' } }
const BINGKAI = { top: GARIS, left: GARIS, bottom: GARIS, right: GARIS }

type Perataan = 'kiri' | 'tengah' | 'kanan'

const RATA: Record<Perataan, Partial<ExcelJS.Alignment>> = {
  kiri: { horizontal: 'left', vertical: 'middle', wrapText: true },
  tengah: { horizontal: 'center', vertical: 'middle', wrapText: true },
  kanan: { horizontal: 'right', vertical: 'middle', wrapText: true },
}

type OpsiSel = {
  font?: Partial<ExcelJS.Font>
  isian?: string
  rata?: Perataan
  format?: string
}

function sel(
  ws: ExcelJS.Worksheet,
  baris: number,
  kolom: number,
  nilai: ExcelJS.CellValue,
  opsi: OpsiSel = {},
) {
  const c = ws.getCell(baris, kolom)
  c.value = nilai ?? null
  c.font = opsi.font ?? FONT_BIASA
  if (opsi.isian) {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opsi.isian } }
  }
  c.alignment = RATA[opsi.rata ?? 'kiri']
  if (opsi.format) c.numFmt = opsi.format
  c.border = BINGKAI
  return c
}

function lebarKolom(ws: ExcelJS.Worksheet, lebar: number[]) {
  lebar.forEach((w, i) => { ws.getColumn(i + 1).width = w })
}

/** Baris keterangan kaki: satu sel digabung selebar tabel. */
function keterangan(ws: ExcelJS.Worksheet, baris: number, kolomTerakhir: number, teks: string, tinggi: number) {
  ws.mergeCells(baris, 1, baris, kolomTerakhir)
  const c = ws.getCell(baris, 1)
  c.value = teks
  c.font = { size: 8, italic: true, color: { argb: 'FF555555' } }
  c.alignment = { vertical: 'top', wrapText: true }
  ws.getRow(baris).height = tinggi
}

function singkatanBulan(m: number): string {
  return NAMA_BULAN[m - 1].slice(0, 3).toUpperCase()
}

function nilaiAtauKosong(n: number): number | null {
  return n === 0 ? null : n
}

// ── Sheet 1: RINGKASAN ────────────────────────────────────────────────────

function tulisRingkasan(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  ws.getRow(1).height = 20
  ws.getRow(2).height = 20

  const dasar = ['No', 'Nama', 'NIP', 'Jabatan']
  dasar.forEach((h, i) => {
    ws.mergeCells(1, i + 1, 2, i + 1)
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })

  let kolom = 5
  for (const m of BULAN) {
    ws.mergeCells(1, kolom, 1, kolom + 3)
    sel(ws, 1, kolom, singkatanBulan(m), { font: FONT_HEADER, isian: ISI_HEADER_2, rata: 'tengah' })
    JENIS_GAP.forEach((j, i) => {
      sel(ws, 2, kolom + i, j, { font: FONT_HEADER, isian: ISI_HEADER_2, rata: 'tengah' })
    })
    kolom += 4
  }

  ws.mergeCells(1, kolom, 2, kolom)
  sel(ws, 1, kolom, 'TOTAL', { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })

  const matriks = matriksRingkasan(hasil)
  matriks.forEach((p, i) => {
    const r = i + 3
    const selang = r % 2 === 0 ? ISI_SELANG : undefined

    sel(ws, r, 1, i + 1, { isian: selang, rata: 'tengah' })
    sel(ws, r, 2, p.nama, { isian: selang })
    sel(ws, r, 3, p.nip, { isian: selang, rata: 'tengah' })
    sel(ws, r, 4, p.jabatan, { isian: selang })

    let k = 5
    for (const m of BULAN) {
      JENIS_GAP.forEach((j, gi) => {
        const v = p.sel[m][j]
        sel(ws, r, k + gi, nilaiAtauKosong(v), {
          isian: v > 0 ? ISIAN_GAP[j] : selang,
          rata: 'tengah',
        })
      })
      k += 4
    }

    sel(ws, r, k, p.total, {
      font: FONT_TEBAL,
      isian: p.total >= 10 ? 'FFE8DAEF' : selang,
      rata: 'tengah',
    })
  })

  lebarKolom(ws, [5, 36, 21, 30, ...Array(49).fill(5)])
  ws.views = [{ state: 'frozen', xSplit: 4, ySplit: 2 }]

  keterangan(ws, matriks.length + 4, kolom,
    '*PL=Pelanggar_Hadir  CK=Cuti_Komdanas_WFO_SIKEP  '
    + 'WK=WFO_Komdanas_Cuti_SIKEP  TK=TL_Komdanas_Hadir_SIKEP', 16)
}

// ── Sheet 2: DETAIL_GAP ───────────────────────────────────────────────────

function tulisDetail(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  const judul = [
    'No', 'Bulan', 'Tanggal', 'Hari', 'NIP', 'Nama', 'Jabatan',
    'Jenis Gap', 'Label Gap',
    'Kode SIKEP', 'Kode PSW', 'Tidak Presensi',
    'Mark KOMDANAS', 'Detail KOMDANAS',
    '% Pot. Remun', 'Hari Pot.\nUang Makan',
    'Rp Pot.\nTukin', 'Rp Pot.\nUang Makan',
  ]
  ws.getRow(1).height = 32
  judul.forEach((h, i) => {
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })
  lebarKolom(ws, [5, 11, 13, 9, 21, 34, 30, 8, 30, 11, 10, 16, 16, 30, 18, 10, 16, 16])

  const tengah = new Set([1, 2, 3, 4, 5, 8, 10, 11, 12, 13, 15, 16])
  const kanan = new Set([17, 18])

  let r = 2
  for (const p of hasil.pegawai) {
    for (const g of p.gaps) {
      const isian = ISIAN_GAP[g.jenis]
      const nilai: ExcelJS.CellValue[] = [
        r - 1, g.namaBulan, g.tanggal, g.hari,
        p.nip, p.nama, p.jabatan,
        g.jenis, LABEL_GAP[g.jenis],
        g.kodeSikep || null, g.kodePsw || null, g.tidakPresensi || null,
        g.markKomdanas, g.detailKomdanas,
        g.potRemun,
        nilaiAtauKosong(g.potUangMakan),
        nilaiAtauKosong(g.rpTukin), nilaiAtauKosong(g.rpUm),
      ]
      nilai.forEach((v, i) => {
        const kolom = i + 1
        sel(ws, r, kolom, v, {
          isian,
          rata: kanan.has(kolom) ? 'kanan' : tengah.has(kolom) ? 'tengah' : 'kiri',
          format: kanan.has(kolom) ? '#,##0' : undefined,
        })
      })
      r++
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  keterangan(ws, r + 1, 18,
    'KETERANGAN:  [% Pot. Remun] PL = akumulasi kode SIKEP; CK/TK = dari kode KOMDANAS; WK = dari kode SIKEP.  '
    + '[Rp Pot. Tukin] = (% Pot. Remun ÷ 100) × Nilai Grade × 0,5 per entri, BELUM di-cap. '
    + 'Hakim/Ketua/Wakil Ketua = 0. TK (restitusi) = nilai negatif.  '
    + '[Rp Pot. Uang Makan] = Hari Pot. UM × Tarif UM harian. '
    + 'Hakim: Tarif = UM + Rp56.000 transportasi (SK 853/SEK/2025). '
    + 'Non-Hakim: Gol IV=Rp41.000 / Gol III=Rp37.000 / Gol I-II=Rp35.000 (PMK 39/2024). '
    + 'Nilai kumulatif sudah di-cap, lihat sheet AKUMULASI_INDIVIDU.', 48)
}

// ── Sheet 3: RINGKASAN_BULAN ──────────────────────────────────────────────

function tulisRekapBulan(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  const judul = ['Bulan', ...JENIS_GAP.map((j) => `${j}\n${LABEL_GAP[j]}`), 'TOTAL']
  ws.getRow(1).height = 40
  judul.forEach((h, i) => {
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })
  lebarKolom(ws, [14, 22, 28, 28, 28, 12])

  const rekap = rekapPerBulan(hasil)
  const total = Object.fromEntries(JENIS_GAP.map((j) => [j, 0])) as Record<JenisGap, number>

  rekap.forEach((b, i) => {
    const r = i + 2
    const selang = b.bulan % 2 === 0 ? ISI_SELANG : undefined
    sel(ws, r, 1, b.namaBulan, { isian: selang, rata: 'tengah' })
    JENIS_GAP.forEach((j, gi) => {
      // Bulan tanpa gap tetap ditulis 0 (bukan sel kosong), sama seperti Python.
      sel(ws, r, gi + 2, b[j], {
        isian: b[j] > 0 ? ISIAN_GAP[j] : selang,
        rata: 'tengah',
      })
      total[j] += b[j]
    })
    sel(ws, r, 6, nilaiAtauKosong(b.total), { isian: selang, rata: 'tengah' })
  })

  sel(ws, 14, 1, 'TOTAL', { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'tengah' })
  JENIS_GAP.forEach((j, i) => {
    sel(ws, 14, i + 2, nilaiAtauKosong(total[j]), { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'tengah' })
  })
  sel(ws, 14, 6, nilaiAtauKosong(JENIS_GAP.reduce((s, j) => s + total[j], 0)),
    { font: FONT_TEBAL, isian: ISI_HEADER, rata: 'tengah' })

  // Angka pada baris TOTAL berlatar gelap — pakai teks putih agar terbaca.
  for (let c = 1; c <= 6; c++) ws.getCell(14, c).font = { ...FONT_TEBAL, color: { argb: 'FFFFFFFF' } }
}

// ── Sheet 4: AKUMULASI_INDIVIDU ───────────────────────────────────────────

function tulisAkumulasi(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  const judul = [
    'No', 'NIP', 'Nama', 'Golongan', 'Grade Terkini', 'Nilai Grade',
    'Jml Gap', 'Rp Pot. Tukin\n(cap 100%/bln)', 'Rp Pot.\nUang Makan',
    'Grand Total\nPotongan', 'Hari Hadir\nKOMDANAS', 'Hari UM\nDibayar',
    'Selisih\nHadir', 'Selisih Rp\nUang Makan',
  ]
  ws.getRow(1).height = 36
  judul.forEach((h, i) => {
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })
  lebarKolom(ws, [5, 21, 36, 12, 16, 16, 9, 22, 18, 20, 14, 14, 12, 18])

  const baris = akumulasiIndividu(hasil)
  const tengah = new Set([1, 7, 11, 12, 13])
  const kiri = new Set([2, 3, 4, 5])
  const angka = new Set([6, 8, 9, 10, 14])

  baris.forEach((b, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isianSelisih = b.selisihHari < 0 ? ISI_PERINGATAN : b.selisihHari > 0 ? ISI_POSITIF : undefined

    const nilai: ExcelJS.CellValue[] = [
      i + 1, b.nip, b.nama, b.golongan || '-',
      b.grade || '9990 (Hakim)',
      nilaiAtauKosong(b.nilaiGrade),
      b.jumlahGap,
      b.rpTukin > 0 ? b.rpTukin : null,
      b.rpUm > 0 ? b.rpUm : null,
      b.grandTotal > 0 ? b.grandTotal : null,
      nilaiAtauKosong(b.hariHadir), nilaiAtauKosong(b.hariUmDibayar),
      nilaiAtauKosong(b.selisihHari), nilaiAtauKosong(b.selisihRpUm),
    ]

    nilai.forEach((v, idx) => {
      const kolom = idx + 1
      sel(ws, r, kolom, v, {
        isian: (kolom === 13 || kolom === 14 ? isianSelisih : undefined) ?? selang,
        rata: tengah.has(kolom) ? 'tengah' : kiri.has(kolom) ? 'kiri' : 'kanan',
        format: angka.has(kolom) ? '#,##0' : undefined,
      })
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  keterangan(ws, baris.length + 3, 14,
    'KETERANGAN:  [Rp Pot. Tukin] = per bulan: (min(100%, Σ% deduction) − Σ% restitusi TK) / 100 × Nilai Grade × 0,5. '
    + 'Hakim/Ketua/Wakil Ketua = 0.  [Rp Pot. Uang Makan] = Σ (Hari Pot. UM × Tarif Efektif/Hari). '
    + 'Hakim: Tarif Efektif = UM + Rp56.000 transportasi (SK 853/SEK/2025). TK = nilai negatif (restitusi).  '
    + '[Grand Total] = Rp Pot. Tukin + Rp Pot. UM.  '
    + '[Hari Hadir KOMDANAS] = hari dengan mark HADIR/HADIR_TL/PSW/TLP/THM/THP.  '
    + '[Hari UM Dibayar] = baris per NIP per bulan pada file 00_uang_makan_*.  '
    + '[Selisih Hadir] = Hari Hadir − Hari UM Dibayar. [Selisih Rp UM] = Selisih × Tarif.', 60)
}

// ── Sheet 5: AKURASI_UM ───────────────────────────────────────────────────

function tulisAkurasiUm(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  const judul = [
    'No', 'NIP', 'Nama', 'Golongan', 'Bulan',
    'Hari Hadir\nKOMDANAS', 'Hari UM\nDibayar', 'Selisih\nHadir',
    'Tarif UM\n(Rp/Hari)', 'Selisih Rp\nUang Makan', 'Keterangan',
  ]
  ws.getRow(1).height = 36
  judul.forEach((h, i) => {
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })
  lebarKolom(ws, [5, 21, 36, 12, 13, 14, 14, 12, 14, 18, 40])

  const baris = akurasiUangMakan(hasil)
  const tengah = new Set([1, 5, 6, 7, 8, 9])

  baris.forEach((b, i) => {
    const r = i + 2
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const isianSelisih = b.selisihHari < 0 ? ISI_PERINGATAN : b.selisihHari > 0 ? ISI_POSITIF : undefined

    const nilai: ExcelJS.CellValue[] = [
      i + 1, b.nip, b.nama, b.golongan, b.namaBulan,
      nilaiAtauKosong(b.hariHadir), nilaiAtauKosong(b.hariUmDibayar),
      nilaiAtauKosong(b.selisihHari),
      b.tarif > 0 ? b.tarif : null,
      nilaiAtauKosong(b.selisihRp),
      b.keterangan || null,
    ]

    nilai.forEach((v, idx) => {
      const kolom = idx + 1
      sel(ws, r, kolom, v, {
        isian: (kolom === 8 || kolom === 10 ? isianSelisih : undefined) ?? selang,
        rata: tengah.has(kolom) ? 'tengah' : kolom === 10 ? 'kanan' : 'kiri',
        format: kolom === 9 || kolom === 10 ? '#,##0' : undefined,
      })
    })
  })

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  keterangan(ws, baris.length + 3, 11,
    'KETERANGAN:  [Hari Hadir KOMDANAS] = mark HADIR/HADIR_TL/PSW/TLP/THM/THP pada file 01_daftar_hadir_*.  '
    + '[Hari UM Dibayar] = baris per NIP per bulan pada file 00_uang_makan_*.  '
    + '[Selisih Hadir] = Hari Hadir − Hari UM Dibayar '
    + '(hijau = hadir > UM dibayar / potensi kurang bayar; merah = UM dibayar > hadir / potensi lebih bayar).  '
    + '[Selisih Rp UM] = Selisih Hadir × Tarif UM/Hari.', 54)
}

// ── Sheet 6: REFERENSI ────────────────────────────────────────────────────

function tulisReferensi(ws: ExcelJS.Worksheet, hasil: HasilAnalisis) {
  const dasar = ['No', 'NIP', 'Nama', 'Jabatan', 'Golongan', 'Tarif UM/Hari (Rp)']
  ws.getRow(1).height = 18
  ws.getRow(2).height = 30

  dasar.forEach((h, i) => {
    ws.mergeCells(1, i + 1, 2, i + 1)
    sel(ws, 1, i + 1, h, { font: FONT_HEADER, isian: ISI_HEADER, rata: 'tengah' })
  })

  let kolom = dasar.length + 1
  for (const m of BULAN) {
    ws.mergeCells(1, kolom, 1, kolom + 1)
    sel(ws, 1, kolom, singkatanBulan(m), { font: FONT_HEADER, isian: ISI_HEADER_2, rata: 'tengah' })
    sel(ws, 2, kolom, 'Kelas Jabatan', { font: FONT_HEADER, isian: ISI_HEADER_2, rata: 'tengah' })
    sel(ws, 2, kolom + 1, 'Nilai Grade (Rp)', { font: FONT_HEADER, isian: ISI_HEADER_2, rata: 'tengah' })
    kolom += 2
  }

  lebarKolom(ws, [5, 21, 34, 28, 12, 16, ...BULAN.flatMap(() => [12, 16])])

  const semuaNip = new Set<string>()
  for (const perBulan of Object.values(hasil.gradePerBulan)) {
    for (const nip of Object.keys(perBulan)) semuaNip.add(nip)
  }
  for (const nip of Object.keys(hasil.golongan)) semuaNip.add(nip)

  const namaDari = (nip: string) => hasil.infoPegawai[nip]?.nama ?? nip
  const urut = [...semuaNip].sort((a, b) => {
    const A = namaDari(a).toUpperCase()
    const B = namaDari(b).toUpperCase()
    return A < B ? -1 : A > B ? 1 : 0
  })

  urut.forEach((nip, i) => {
    const r = i + 3
    const selang = r % 2 === 0 ? ISI_SELANG : undefined
    const info = hasil.infoPegawai[nip]

    sel(ws, r, 1, i + 1, { isian: selang, rata: 'tengah' })
    sel(ws, r, 2, nip, { isian: selang, rata: 'tengah' })
    sel(ws, r, 3, info?.nama ?? nip, { isian: selang })
    sel(ws, r, 4, info?.jabatan ?? '', { isian: selang })
    sel(ws, r, 5, hasil.golongan[nip] ?? '-', { isian: selang, rata: 'tengah' })
    sel(ws, r, 6, nilaiAtauKosong(hasil.tarifUm[nip] ?? 0),
      { isian: selang, rata: 'kanan', format: '#,##0' })

    let k = 7
    let gradeSebelum: string | null = null
    for (const m of BULAN) {
      const g = hasil.gradePerBulan[m]?.[nip]
      const grade = g?.grade || null
      const nilai = g?.nilai ? g.nilai : null
      const berubah = Boolean(grade && gradeSebelum !== null && grade !== gradeSebelum)
      const isian = berubah ? ISI_UBAH : selang

      sel(ws, r, k, grade, { isian, rata: 'tengah' })
      sel(ws, r, k + 1, nilai, { isian, rata: 'kanan', format: '#,##0' })
      if (grade) gradeSebelum = grade
      k += 2
    }
  })

  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }]
  keterangan(ws, urut.length + 4, dasar.length + 24,
    'KETERANGAN:  [Kelas Jabatan & Nilai Grade] dari file 03_jabatan_dan_SK_* per bulan. '
    + 'Nilai 0 = tarif tidak tersedia (Hakim atau CPNS baru tanpa SK grade). '
    + 'Sel kuning = perubahan kelas jabatan.  '
    + '[Tarif UM/Hari] PMK 39/2024: Gol IV=Rp41.000 / Gol III=Rp37.000 / Gol I-II=Rp35.000.', 48)
}

// ── Perakit ───────────────────────────────────────────────────────────────

export async function bangunWorkbook(hasil: HasilAnalisis): Promise<Blob> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Risk-Sim — CA Bid. Kepegawaian'
  wb.created = new Date()

  tulisRingkasan(wb.addWorksheet('RINGKASAN'), hasil)
  tulisDetail(wb.addWorksheet('DETAIL_GAP'), hasil)
  tulisRekapBulan(wb.addWorksheet('RINGKASAN_BULAN'), hasil)
  tulisAkumulasi(wb.addWorksheet('AKUMULASI_INDIVIDU'), hasil)
  tulisAkurasiUm(wb.addWorksheet('AKURASI_UM'), hasil)
  tulisReferensi(wb.addWorksheet('REFERENSI'), hasil)

  const buffer = await wb.xlsx.writeBuffer()
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

export function namaBerkasEkspor(hasil: HasilAnalisis): string {
  const slug = hasil.namaSatker.trim().replace(/\s+/g, '_') || 'Satker'
  return `gap_excel_${slug}_${hasil.tahun}.xlsx`
}

/** Ringkasan angka untuk ditampilkan sebelum/ sesudah ekspor. */
export function ringkasanAngka(hasil: HasilAnalisis) {
  const perBulan = hasil.pegawai.flatMap((p) =>
    Object.entries(kelompokPerBulan(p.gaps)).map(([m, gaps]) => ({
      bulan: Number(m),
      tukin: tukinBulananCapped(gaps),
    })),
  )
  return {
    totalTukin: perBulan.reduce((s, x) => s + x.tukin, 0),
    bulanTerpakai: [...new Set(perBulan.map((x) => x.bulan))].sort((a, b) => a - b).map(namaBulan),
  }
}
