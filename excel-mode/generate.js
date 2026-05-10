'use strict';
const ExcelJS = require('exceljs');
const path = require('path');

const OUT = path.join(__dirname, 'Risk-Sim-MA.xlsx');
const wb = new ExcelJS.Workbook();
wb.creator = 'Risk-Sim MA';
wb.created = new Date();

// ── helpers ──────────────────────────────────────────────────────────────────
const rgb = hex => ({ argb: 'FF' + hex.replace('#', '') });

function hdr(ws, row, col, val, bgHex = '1E3A5F', fgHex = 'FFFFFF', sz = 11) {
  const c = ws.getCell(row, col);
  c.value = val;
  c.font = { bold: true, color: rgb(fgHex), size: sz };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb(bgHex) };
  c.alignment = { vertical: 'middle', wrapText: true };
  c.border = {
    top: { style: 'thin', color: rgb('AAAAAA') },
    left: { style: 'thin', color: rgb('AAAAAA') },
    bottom: { style: 'thin', color: rgb('AAAAAA') },
    right: { style: 'thin', color: rgb('AAAAAA') },
  };
}

function lbl(ws, row, col, val) {
  const c = ws.getCell(row, col);
  c.value = val;
  c.font = { bold: true, size: 10, color: rgb('1E3A5F') };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EBF4FF') };
  c.alignment = { vertical: 'middle' };
}

function inp(ws, row, col, val = null) {
  const c = ws.getCell(row, col);
  if (val !== null) c.value = val;
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('FFFFFF') };
  c.border = {
    top: { style: 'thin', color: rgb('CCCCCC') },
    left: { style: 'thin', color: rgb('CCCCCC') },
    bottom: { style: 'thin', color: rgb('CCCCCC') },
    right: { style: 'thin', color: rgb('CCCCCC') },
  };
  c.alignment = { vertical: 'middle', wrapText: true };
}

function fml(ws, row, col, formula) {
  const c = ws.getCell(row, col);
  c.value = { formula };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EFF6FF') };
  c.font = { color: rgb('1D4ED8'), size: 10 };
  c.border = {
    top: { style: 'thin', color: rgb('BFDBFE') },
    left: { style: 'thin', color: rgb('BFDBFE') },
    bottom: { style: 'thin', color: rgb('BFDBFE') },
    right: { style: 'thin', color: rgb('BFDBFE') },
  };
  c.alignment = { vertical: 'middle', wrapText: true };
}

function sectionTitle(ws, row, col, val, span = 8) {
  const c = ws.getCell(row, col);
  c.value = val;
  c.font = { bold: true, size: 11, color: rgb('FFFFFF') };
  c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('2B6CB0') };
  c.alignment = { vertical: 'middle' };
  if (span > 1) ws.mergeCells(row, col, row, col + span - 1);
}

function dv_list(ws, rowStart, rowEnd, col, formula) {
  ws.dataValidations.add(`${colLetter(col)}${rowStart}:${colLetter(col)}${rowEnd}`, {
    type: 'list',
    allowBlank: true,
    formulae: [formula],
    showErrorMessage: true,
    errorTitle: 'Nilai tidak valid',
    error: 'Pilih dari daftar yang tersedia.',
  });
}

function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function freezeRow(ws, row) { ws.views = [{ state: 'frozen', ySplit: row }]; }
function freezeRowCol(ws, row, col) { ws.views = [{ state: 'frozen', xSplit: col, ySplit: row }]; }

// ── master data ───────────────────────────────────────────────────────────────
const UNIT_KERJA = [
  ['KMA',    'Ketua Mahkamah Agung'],
  ['SEKMA',  'Sekretariat Mahkamah Agung'],
  ['BAWAS',  'Badan Pengawasan'],
  ['DJU',    'Direktorat Jenderal Badan Peradilan Umum'],
  ['DJMIL',  'Direktorat Jenderal Badan Peradilan Militer'],
  ['DJTA',   'Direktorat Jenderal Badan Peradilan TUN'],
  ['DJAG',   'Direktorat Jenderal Badan Peradilan Agama'],
  ['BALITB', 'Badan Penelitian dan Pengembangan'],
  ['BADIKL', 'Badan Diklat Teknis Hukum dan Peradilan'],
  ['PT-JKT', 'Pengadilan Tinggi Jakarta'],
  ['PT-BDG', 'Pengadilan Tinggi Bandung'],
  ['PA-JKT', 'Pengadilan Agama Jakarta Pusat'],
];

const KATEGORI_RISIKO = [
  ['1', 'Strategis',   'STR'],
  ['2', 'Kebijakan',   'KBJ'],
  ['3', 'Kecurangan',  'KCR'],
  ['4', 'Bencana',     'BNC'],
  ['5', 'Kepatuhan',   'KPT'],
  ['6', 'Operasional', 'OPS'],
  ['7', 'Kemitraan',   'KMT'],
];

const KODE_5M = [
  ['MN', 'Manusia (Man)'],
  ['MY', 'Dana (Money)'],
  ['MD', 'Metode (Method)'],
  ['MR', 'Bahan (Material)'],
  ['MC', 'Mesin (Machine)'],
  ['EX', 'Eksternal'],
];

const PROSES_BISNIS = [
  ['MA-01.01','MA-01 Pengelolaan Proses Peradilan','Peningkatan Penyelesaian Perkara Tepat Waktu','Persentase perkara diselesaikan tepat waktu'],
  ['MA-01.02','MA-01 Pengelolaan Proses Peradilan','Peningkatan putusan pendekatan keadilan restoratif','Jumlah putusan restoratif'],
  ['MA-01.03','MA-01 Pengelolaan Proses Peradilan','Peningkatan perkara tidak mengajukan upaya hukum','Persentase perkara inkracht'],
  ['MA-01.04','MA-01 Pengelolaan Proses Peradilan','Peningkatan penyelesaian perkara pidana anak dengan diversi','Jumlah perkara diversi'],
  ['MA-02.01','MA-02 Efektivitas Penyelesaian Perkara','Pengiriman salinan putusan tepat waktu','Persentase pengiriman tepat waktu'],
  ['MA-02.02','MA-02 Efektivitas Penyelesaian Perkara','Penyelesaian perkara melalui mediasi','Jumlah perkara mediasi berhasil'],
  ['MA-03.01','MA-03 Akses Peradilan','Penyelesaian perkara prodeo','Jumlah perkara prodeo diselesaikan'],
  ['MA-03.02','MA-03 Akses Peradilan','Penyelesaian perkara di luar gedung','Jumlah sidang luar gedung'],
  ['MA-03.03','MA-03 Akses Peradilan','Perkara permohonan identitas hukum','Jumlah permohonan identitas'],
  ['MA-03.04','MA-03 Akses Peradilan','Layanan bantuan hukum (Posbankum)','Jumlah penerima bantuan hukum'],
  ['MA-04.01','MA-04 Kepatuhan Putusan','Putusan perkara perdata dieksekusi','Persentase putusan perdata dieksekusi'],
  ['MA-04.02','MA-04 Kepatuhan Putusan','Putusan perkara TUN dieksekusi','Persentase putusan TUN dieksekusi'],
  ['MA-05.01','MA-05 Pembinaan SDM','Pengadaan dan Rekrutmen Tenaga','Jumlah tenaga rekrut'],
  ['MA-05.02','MA-05 Pembinaan SDM','Pembinaan dan Pelatihan Tenaga Teknis','Jumlah peserta diklat teknis'],
  ['MA-05.03','MA-05 Pembinaan SDM','Pembinaan dan Pelatihan Tenaga Non Teknis','Jumlah peserta diklat non teknis'],
  ['MA-05.04','MA-05 Pembinaan SDM','Promosi dan Mutasi','Jumlah SK promosi/mutasi'],
  ['MA-06.01','MA-06 Pengembangan Kebijakan','Pengembangan Peraturan Perundang-Undangan','Jumlah peraturan diterbitkan'],
  ['MA-06.02','MA-06 Pengembangan Kebijakan','Pengembangan SK Ketua MA','Jumlah SKKMA diterbitkan'],
  ['MA-06.03','MA-06 Pengembangan Kebijakan','Pengembangan Keputusan Pejabat Eselon I','Jumlah SK Eselon I'],
  ['MA-07.01','MA-07 Pengawasan Kinerja','Pengembangan Sistem Pengawasan Berbasis TI','Persentase sistem pengawasan TI terimplementasi'],
  ['MA-07.02','MA-07 Pengawasan Kinerja','Implementasi Pengawasan Internal','Jumlah laporan pengawasan internal'],
  ['MA-07.03','MA-07 Pengawasan Kinerja','Implementasi Pengawasan Eksternal','Jumlah tindak lanjut pengawasan eksternal'],
  ['MA-08.01','MA-08 Administrasi','Rencana Program dan Penganggaran','Persentase realisasi anggaran'],
  ['MA-08.02','MA-08 Administrasi','Pengelolaan Organisasi dan Tata Laksana','Jumlah dokumen tata laksana'],
  ['MA-08.03','MA-08 Administrasi','Pengelolaan Sarana dan Prasarana','Persentase sapras terpelihara'],
  ['MA-08.04','MA-08 Administrasi','Layanan Kehumasan dan Informasi Publik','Indeks kepuasan informasi publik'],
  ['MA-09.01','MA-09 Teknologi Informasi','Perencanaan Pembangunan TI','Jumlah dokumen perencanaan TI'],
  ['MA-09.02','MA-09 Teknologi Informasi','Pembangunan dan Pengembangan TI','Jumlah sistem TI dikembangkan'],
  ['MA-09.03','MA-09 Teknologi Informasi','Pengelolaan dan Pemeliharaan TI','Persentase uptime sistem TI'],
  ['MA-10.01','MA-10 Koordinasi K/L','Rencana Program Sinergitas Antar Instansi','Jumlah MoU/PKS aktif'],
  ['MA-10.02','MA-10 Koordinasi K/L','Pertukaran Data Peningkatan Layanan Peradilan','Jumlah sistem data terintegrasi'],
];

const SPIP_KLASIFIKASI = [
  'Lingkungan Pengendalian — Komitmen terhadap kompetensi',
  'Lingkungan Pengendalian — Kepemimpinan yang kondusif',
  'Lingkungan Pengendalian — Struktur organisasi',
  'Lingkungan Pengendalian — Pendelegasian wewenang dan tanggung jawab',
  'Lingkungan Pengendalian — Kebijakan pembinaan SDM',
  'Penilaian Risiko — Identifikasi risiko',
  'Penilaian Risiko — Analisis risiko',
  'Kegiatan Pengendalian — Review kinerja',
  'Kegiatan Pengendalian — Pengendalian atas pengelolaan sistem informasi',
  'Kegiatan Pengendalian — Pengendalian fisik atas aset',
  'Kegiatan Pengendalian — Penetapan dan reviu atas indikator kinerja',
  'Kegiatan Pengendalian — Pemisahan fungsi',
  'Kegiatan Pengendalian — Otorisasi atas transaksi',
  'Kegiatan Pengendalian — Pencatatan yang akurat dan tepat waktu',
  'Kegiatan Pengendalian — Pembatasan akses atas sumber daya',
  'Kegiatan Pengendalian — Akuntabilitas terhadap sumber daya',
  'Kegiatan Pengendalian — Dokumentasi atas sistem pengendalian intern',
  'Informasi dan Komunikasi — Informasi yang relevan',
  'Informasi dan Komunikasi — Komunikasi yang efektif',
  'Pemantauan — Pemantauan berkelanjutan',
  'Pemantauan — Evaluasi terpisah',
  'Pemantauan — Tindak lanjut rekomendasi',
];

const METODE_SPIP = ['Evaluasi', 'Audit', 'Reviu', 'Pemantauan'];
const SUMBER_RISIKO = ['Internal', 'Eksternal', 'Internal & Eksternal'];
const KECUKUPAN = ['Memadai', 'Cukup', 'Kurang', 'Tidak Memiliki'];
const EFEKTIVITAS = ['Efektif', 'Tidak Efektif'];
const YA_TIDAK = ['Ya', 'Tidak'];

const LEVEL_DESC = ['', 'Sangat Rendah', 'Rendah', 'Sedang', 'Tinggi', 'Sangat Tinggi'];

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 1: COVER
// ─────────────────────────────────────────────────────────────────────────────
function buildCover() {
  const ws = wb.addWorksheet('COVER', { tabColor: { argb: 'FF1E3A5F' } });
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 20;

  // Title block
  ws.mergeCells('B2:D2');
  const title = ws.getCell('B2');
  title.value = 'DOKUMEN MANAJEMEN RISIKO';
  title.font = { bold: true, size: 20, color: rgb('FFFFFF') };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('1E3A5F') };
  title.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 40;

  ws.mergeCells('B3:D3');
  const sub = ws.getCell('B3');
  sub.value = 'Mahkamah Agung Republik Indonesia — Risk-Sim';
  sub.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  sub.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('2B6CB0') };
  sub.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(3).height = 28;

  ws.mergeCells('B4:D4');
  const sub2 = ws.getCell('B4');
  sub2.value = 'Berbasis SPIP — PP No. 60 Tahun 2008';
  sub2.font = { italic: true, size: 11, color: rgb('2B6CB0') };
  sub2.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EBF4FF') };
  sub2.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 24;

  // Navigation table
  ws.getRow(6).height = 20;
  const navHeaders = [['Tab', 'Nama Sheet', 'Fungsi', 'Diisi Oleh']];
  navHeaders[0].forEach((h, i) => hdr(ws, 6, i + 2, h));

  const navData = [
    ['MASTER',             'Master Data & Referensi',            'Data unit kerja, kategori, proses bisnis MA',  'Admin Sistem'],
    ['KONTEKS',        'Penetapan Konteks',                  'Kerangka MR: unit kerja, tahun, sasaran, proses bisnis', 'Pengelola Risiko'],
    ['SELERA_RISIKO',  'Penetapan Selera Risiko',            'Threshold toleransi per 7 kategori risiko',    'Pemilik Risiko'],
    ['IDENTIFIKASI',   'Identifikasi Risiko (Lamp. 5)',       'Daftar risiko + kode otomatis',                'Pengelola Risiko'],
    ['PENYEBAB',       'Identifikasi Penyebab (Lamp. 9)',     '5-Whys per risiko + kode penyebab otomatis',   'Pengelola Risiko'],
    ['ANALISIS',       'Analisis Risiko',                    'Matriks 5×5, skor inheren & residual',         'Pengelola Risiko'],
    ['EVALUASI',       'Evaluasi Risiko',                    'Prioritas + heatmap 5×5 residual',             'Pemilik Risiko'],
    ['EVAL_PENG',      'Evaluasi Pengendalian Utama',        'Pengendalian kunci per risiko prioritas',      'APIP'],
    ['PROGRAM_AUDIT',  'Program Kerja Audit',                'PKA per risiko kecukupan kurang/tidak memadai','APIP'],
    ['RTP',            'Rencana Tindak Pengendalian (Lamp. 10)', 'Mitigasi per penyebab risiko prioritas',   'Pengelola Risiko'],
    ['MATURITAS',          'Maturitas Manajemen Risiko',         'Penilaian kapabilitas MR level 1–5',           'APIP / UMR'],
    ['LAPORAN',            'Laporan Eksekutif',                  'Dashboard ringkasan lintas modul',             'Unit MR MA'],
  ];

  navData.forEach((row, i) => {
    const r = 7 + i;
    ws.getRow(r).height = 22;
    const bgEven = i % 2 === 0 ? 'F8FAFF' : 'FFFFFF';
    row.forEach((v, j) => {
      const c = ws.getCell(r, j + 2);
      c.value = v;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb(bgEven) };
      c.font = { size: 10 };
      c.border = {
        top: { style: 'thin', color: rgb('E2E8F0') },
        left: { style: 'thin', color: rgb('E2E8F0') },
        bottom: { style: 'thin', color: rgb('E2E8F0') },
        right: { style: 'thin', color: rgb('E2E8F0') },
      };
      c.alignment = { vertical: 'middle', wrapText: true };
    });
  });

  // Instructions
  const r = 7 + navData.length + 2;
  ws.mergeCells(r, 2, r, 4);
  const note = ws.getCell(r, 2);
  note.value = '⚠  Catatan Penggunaan: Workbook ini dirancang untuk SATU konteks (satu unit kerja × satu tahun). Isi sheet secara berurutan dari [1] KONTEKS hingga [9] RTP. Sheet EVALUASI, [7], [8], dan [9] otomatis menarik data — tidak perlu diisi manual selain kolom input berwarna putih.';
  note.font = { italic: true, size: 10, color: rgb('744210') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('FFFBEB') };
  note.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(r).height = 50;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 2: MASTER
// ─────────────────────────────────────────────────────────────────────────────
function buildMaster() {
  const ws = wb.addWorksheet('MASTER', { tabColor: { argb: 'FF374151' } });
  ws.views = [{ showGridLines: false }];

  // ── Unit Kerja (A1) ──────────────────────────────
  hdr(ws, 1, 1, 'Kode Unit', '374151', 'FFFFFF');
  hdr(ws, 1, 2, 'Nama Unit Kerja', '374151', 'FFFFFF');
  ws.getColumn(1).width = 12;
  ws.getColumn(2).width = 40;
  UNIT_KERJA.forEach(([kode, nama], i) => {
    inp(ws, 2 + i, 1, kode);
    inp(ws, 2 + i, 2, nama);
  });

  // ── Kategori Risiko (D1) ─────────────────────────
  hdr(ws, 1, 4, 'No', '374151', 'FFFFFF');
  hdr(ws, 1, 5, 'Kategori Risiko', '374151', 'FFFFFF');
  hdr(ws, 1, 6, 'Kode', '374151', 'FFFFFF');
  ws.getColumn(4).width = 6;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 8;
  KATEGORI_RISIKO.forEach(([no, nama, kode], i) => {
    inp(ws, 2 + i, 4, no);
    inp(ws, 2 + i, 5, nama);
    inp(ws, 2 + i, 6, kode);
  });

  // ── 5M+EX (H1) ───────────────────────────────────
  hdr(ws, 1, 8, 'Kode 5M', '374151', 'FFFFFF');
  hdr(ws, 1, 9, 'Kategori Penyebab', '374151', 'FFFFFF');
  ws.getColumn(8).width = 10;
  ws.getColumn(9).width = 24;
  KODE_5M.forEach(([kode, nama], i) => {
    inp(ws, 2 + i, 8, kode);
    inp(ws, 2 + i, 9, nama);
  });

  // ── Proses Bisnis (K1) ───────────────────────────
  hdr(ws, 1, 11, 'Kode Proses', '374151', 'FFFFFF');
  hdr(ws, 1, 12, 'Kelompok Proses', '374151', 'FFFFFF');
  hdr(ws, 1, 13, 'Sub Proses', '374151', 'FFFFFF');
  hdr(ws, 1, 14, 'Indikator Default', '374151', 'FFFFFF');
  ws.getColumn(11).width = 12;
  ws.getColumn(12).width = 36;
  ws.getColumn(13).width = 46;
  ws.getColumn(14).width = 40;
  PROSES_BISNIS.forEach(([kode, grup, sub, ind], i) => {
    inp(ws, 2 + i, 11, kode);
    inp(ws, 2 + i, 12, grup);
    inp(ws, 2 + i, 13, sub);
    inp(ws, 2 + i, 14, ind);
  });

  // ── Klasifikasi SPIP (P1) ────────────────────────
  hdr(ws, 1, 16, 'No', '374151', 'FFFFFF');
  hdr(ws, 1, 17, 'Klasifikasi SPIP', '374151', 'FFFFFF');
  ws.getColumn(16).width = 6;
  ws.getColumn(17).width = 56;
  SPIP_KLASIFIKASI.forEach((v, i) => {
    inp(ws, 2 + i, 16, i + 1);
    inp(ws, 2 + i, 17, v);
  });

  // ── Level Risiko Reference (S1) ──────────────────
  hdr(ws, 1, 19, 'Besaran', '374151', 'FFFFFF');
  hdr(ws, 1, 20, 'Level', '374151', 'FFFFFF');
  hdr(ws, 1, 21, 'Label', '374151', 'FFFFFF');
  ws.getColumn(19).width = 10;
  ws.getColumn(20).width = 8;
  ws.getColumn(21).width = 16;
  const levelRef = [['1–5','1','Sangat Rendah'],['6–10','2','Rendah'],['11–15','3','Sedang'],['16–19','4','Tinggi'],['20–25','5','Sangat Tinggi']];
  levelRef.forEach(([b, l, lab], i) => {
    inp(ws, 2 + i, 19, b);
    inp(ws, 2 + i, 20, Number(l));
    inp(ws, 2 + i, 21, lab);
  });

  freezeRow(ws, 1);

  // Named ranges for use in data validation across sheets
  // We define them as string constants used in DV formulas below
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 3: [1] KONTEKS (form layout)
// ─────────────────────────────────────────────────────────────────────────────
function buildKonteks() {
  const ws = wb.addWorksheet("KONTEKS", { tabColor: { argb: 'FF2B6CB0' } });
  ws.views = [{ showGridLines: false }];
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 40;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;

  // Title
  ws.mergeCells('B1:E1');
  const t = ws.getCell('B1');
  t.value = '[1] PENETAPAN KONTEKS';
  t.font = { bold: true, size: 14, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('2B6CB0') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  let r = 3;
  sectionTitle(ws, r, 2, 'A. IDENTITAS KONTEKS', 4); r++;
  ws.getRow(r).height = 20;

  const fields = [
    ['Unit Kerja', 'unit_kerja', 'dropdown'],
    ['Kode Unit', 'kode_unit', 'formula'],
    ['Tahun Penerapan', 'tahun', 'input'],
    ['Periode Mulai', 'periode_mulai', 'input'],
    ['Periode Selesai', 'periode_selesai', 'input'],
  ];

  fields.forEach(([label, key, type]) => {
    lbl(ws, r, 2, label);
    ws.mergeCells(r, 3, r, 5);
    if (type === 'formula') {
      fml(ws, r, 3, `IFERROR(XLOOKUP(C${r - (fields.findIndex(f=>f[0]==='Unit Kerja'))+1},MASTER!A:A,MASTER!A:A),"— isi Unit Kerja dahulu —")`);
    } else if (type === 'dropdown') {
      inp(ws, r, 3);
      dv_list(ws, r, r, 3, 'MASTER!$B$2:$B$' + (1 + UNIT_KERJA.length));
    } else {
      inp(ws, r, 3);
    }
    ws.getRow(r).height = 22;
    r++;
  });

  // Fix kode_unit formula (row 5 = Unit Kerja row)
  const ukRow = 4; // row where Unit Kerja is
  const kuRow = 5; // row where Kode Unit is
  ws.getCell(kuRow, 3).value = { formula: `IFERROR(XLOOKUP(C${ukRow},MASTER!$B:$B,MASTER!$A:$A),"")` };

  r++;
  sectionTitle(ws, r, 2, 'B. PEJABAT PENANGGUNG JAWAB', 4); r++;

  const pejabatFields = [
    'Nama Pemilik Risiko', 'Jabatan Pemilik Risiko',
    'Nama Pengelola Risiko', 'Jabatan Pengelola Risiko',
  ];
  pejabatFields.forEach(label => {
    lbl(ws, r, 2, label);
    ws.mergeCells(r, 3, r, 5);
    inp(ws, r, 3);
    ws.getRow(r).height = 22;
    r++;
  });

  r++;
  sectionTitle(ws, r, 2, 'C. SASARAN STRATEGIS (maks. 5)', 4); r++;
  hdr(ws, r, 2, 'No', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 3, 'Uraian Sasaran Strategis', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 4, 'Indikator Kinerja', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 5, 'Target', '4A5568', 'FFFFFF', 10);
  r++;
  for (let i = 1; i <= 5; i++) {
    lbl(ws, r, 2, String(i));
    inp(ws, r, 3);
    inp(ws, r, 4);
    inp(ws, r, 5);
    ws.getRow(r).height = 22;
    r++;
  }

  r++;
  sectionTitle(ws, r, 2, 'D. PROSES BISNIS UTAMA (maks. 5)', 4); r++;
  hdr(ws, r, 2, 'No', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 3, 'Kode Proses (pilih)', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 4, 'Sub Proses (otomatis)', '4A5568', 'FFFFFF', 10);
  hdr(ws, r, 5, 'Indikator Proses (otomatis)', '4A5568', 'FFFFFF', 10);
  r++;
  const pbStartRow = r;
  for (let i = 1; i <= 5; i++) {
    lbl(ws, r, 2, String(i));
    inp(ws, r, 3);
    dv_list(ws, r, r, 3, 'MASTER!$K$2:$K$' + (1 + PROSES_BISNIS.length));
    fml(ws, r, 4, `IFERROR(XLOOKUP(C${r},MASTER!$K:$K,MASTER!$M:$M),"")`);
    fml(ws, r, 5, `IFERROR(XLOOKUP(C${r},MASTER!$K:$K,MASTER!$N:$N),"")`);
    ws.getRow(r).height = 24;
    r++;
  }

  r++;
  sectionTitle(ws, r, 2, 'E. PEMANGKU KEPENTINGAN', 4); r++;
  ws.mergeCells(r, 2, r + 2, 5);
  inp(ws, r, 2);
  ws.getCell(r, 2).alignment = { wrapText: true, vertical: 'top' };
  ws.getRow(r).height = 60;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 4: [2] SELERA_RISIKO
// ─────────────────────────────────────────────────────────────────────────────
function buildSeleraRisiko() {
  const ws = wb.addWorksheet("SELERA_RISIKO", { tabColor: { argb: 'FF276749' } });
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 8;
  ws.getColumn(3).width = 22;
  ws.getColumn(4).width = 18;
  ws.getColumn(5).width = 52;

  ws.mergeCells('B1:E1');
  const t = ws.getCell('B1');
  t.value = '[2] PENETAPAN SELERA RISIKO';
  t.font = { bold: true, size: 14, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('276749') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 32;

  ws.mergeCells('B2:E2');
  const note = ws.getCell('B2');
  note.value = 'Isi threshold 1–5 untuk setiap kategori. Risiko dengan level residual DI ATAS threshold = PRIORITAS.';
  note.font = { italic: true, size: 10, color: rgb('276749') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('F0FFF4') };
  note.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 20;

  // Header
  hdr(ws, 4, 2, 'No', '276749');
  hdr(ws, 4, 3, 'Kategori Risiko', '276749');
  hdr(ws, 4, 4, 'Threshold (1–5)', '276749');
  hdr(ws, 4, 5, 'Makna Threshold', '276749');
  ws.getRow(4).height = 22;

  const makna = [
    '1 = Nol toleransi — sekecil apapun harus dimitigasi',
    '2 = Toleransi sangat rendah — risiko rendah pun perlu perhatian',
    '3 = Toleransi sedang — risiko di atas sedang harus dimitigasi',
    '4 = Toleransi tinggi — hanya risiko sangat tinggi yang diprioritaskan',
    '5 = Risiko apapun dapat diterima (tidak disarankan)',
  ];

  KATEGORI_RISIKO.forEach(([no, nama], i) => {
    const r = 5 + i;
    ws.getRow(r).height = 22;
    inp(ws, r, 2, Number(no));
    ws.getCell(r, 2).alignment = { horizontal: 'center', vertical: 'middle' };
    inp(ws, r, 3, nama);
    // threshold input cell
    const tc = ws.getCell(r, 4);
    tc.value = 3;
    tc.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('ECFDF5') };
    tc.font = { bold: true, size: 12, color: rgb('276749') };
    tc.alignment = { horizontal: 'center', vertical: 'middle' };
    tc.border = { top:{style:'medium',color:rgb('276749')}, left:{style:'medium',color:rgb('276749')}, bottom:{style:'medium',color:rgb('276749')}, right:{style:'medium',color:rgb('276749')} };
    dv_list(ws, r, r, 4, '"1,2,3,4,5"');
    // makna formula
    fml(ws, r, 5, `IFERROR(INDEX({"${makna.join('","')}"},D${r}),"")`);
  });

  // Conditional formatting on threshold column
  ws.addConditionalFormatting({
    ref: 'D5:D11',
    rules: [
      { type: 'cellIs', operator: 'equal', formulae: ['1'], priority: 1, style: { fill: { type:'pattern', pattern:'solid', bgColor:{argb:'FFC53030'} }, font:{color:{argb:'FFFFFFFF'}} } },
      { type: 'cellIs', operator: 'equal', formulae: ['2'], priority: 2, style: { fill: { type:'pattern', pattern:'solid', bgColor:{argb:'FFED8936'} }, font:{color:{argb:'FFFFFFFF'}} } },
      { type: 'cellIs', operator: 'equal', formulae: ['3'], priority: 3, style: { fill: { type:'pattern', pattern:'solid', bgColor:{argb:'FFECC94B'} } } },
      { type: 'cellIs', operator: 'equal', formulae: ['4'], priority: 4, style: { fill: { type:'pattern', pattern:'solid', bgColor:{argb:'FF68D391'} } } },
      { type: 'cellIs', operator: 'equal', formulae: ['5'], priority: 5, style: { fill: { type:'pattern', pattern:'solid', bgColor:{argb:'FF48BB78'} } } },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 5: [3] IDENTIFIKASI
// ─────────────────────────────────────────────────────────────────────────────
function buildIdentifikasi() {
  const ws = wb.addWorksheet("IDENTIFIKASI", { tabColor: { argb: 'FF744210' } });

  ws.mergeCells('A1:P1');
  const t = ws.getCell('A1');
  t.value = '[3] IDENTIFIKASI RISIKO — Format Lampiran 5';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('744210') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const cols = [
    { key: 'risiko_id',         header: 'ID',                      width: 6,  type: 'formula' },
    { key: 'kode_risiko',       header: 'Kode Risiko',             width: 18, type: 'formula' },
    { key: 'proses_bisnis',     header: 'Kode Proses Bisnis',      width: 14, type: 'input' },
    { key: 'sub_proses',        header: 'Sub Proses',              width: 36, type: 'formula' },
    { key: 'indikator_konteks', header: 'Indikator Konteks',       width: 30, type: 'formula' },
    { key: 'sasaran',           header: 'Sasaran Strategis',       width: 36, type: 'input' },
    { key: 'pernyataan',        header: 'Pernyataan Risiko',       width: 44, type: 'input' },
    { key: 'kategori',          header: 'Kategori Risiko',         width: 16, type: 'input' },
    { key: 'dampak',            header: 'Dampak Potensial',        width: 36, type: 'input' },
    { key: 'metode_spip',       header: 'Metode SPIP',             width: 16, type: 'input' },
    { key: 'sumber',            header: 'Sumber Risiko',           width: 20, type: 'input' },
    { key: 'nama_pemilik',      header: 'Nama Pemilik Risiko',     width: 28, type: 'input' },
    { key: 'jbt_pemilik',       header: 'Jabatan Pemilik Risiko',  width: 28, type: 'input' },
    { key: 'nama_pengelola',    header: 'Nama Pengelola Risiko',   width: 28, type: 'input' },
    { key: 'jbt_pengelola',     header: 'Jabatan Pengelola Risiko',width: 28, type: 'input' },
    { key: 'keterangan',        header: 'Keterangan',              width: 24, type: 'input' },
  ];

  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 2, i + 1, col.header, '744210');
  });
  ws.getRow(2).height = 36;
  freezeRowCol(ws, 2, 2);

  // Data rows with formulas
  for (let r = 3; r <= 52; r++) {
    ws.getRow(r).height = 20;
    // A: risiko_id
    fml(ws, r, 1, `IF(G${r}<>"",ROW()-2,"")`);
    // B: kode_risiko — [kode_unit].[kode_kat].[urut_3digit]
    fml(ws, r, 2,
      `IF(G${r}="","",IFERROR(XLOOKUP(KONTEKS!C5,KONTEKS!C5,KONTEKS!C5,"?"),"?")&"."&`+
      `IFERROR(XLOOKUP(H${r},MASTER!$E:$E,MASTER!$F:$F),"?")&"."&`+
      `TEXT(COUNTIFS($H$3:H${r},H${r},$G$3:G${r},"<>"),"000")`
    );
    // C: proses_bisnis — input
    inp(ws, r, 3);
    dv_list(ws, r, r, 3, 'MASTER!$K$2:$K$' + (1 + PROSES_BISNIS.length));
    // D: sub_proses
    fml(ws, r, 4, `IFERROR(XLOOKUP(C${r},MASTER!$K:$K,MASTER!$M:$M),"")`);
    // E: indikator_konteks
    fml(ws, r, 5, `IFERROR(XLOOKUP(C${r},MASTER!$K:$K,MASTER!$N:$N),"")`);
    // F: sasaran — input
    inp(ws, r, 6);
    // G: pernyataan — input
    inp(ws, r, 7);
    // H: kategori — dropdown
    inp(ws, r, 8);
    dv_list(ws, r, r, 8, 'MASTER!$E$2:$E$' + (1 + KATEGORI_RISIKO.length));
    // I-K: input
    inp(ws, r, 9);
    inp(ws, r, 10);
    dv_list(ws, r, r, 10, '"' + METODE_SPIP.join(',') + '"');
    inp(ws, r, 11);
    dv_list(ws, r, r, 11, '"' + SUMBER_RISIKO.join(',') + '"');
    // L-O: pejabat — input
    for (let c = 12; c <= 15; c++) inp(ws, r, c);
    // P: keterangan
    inp(ws, r, 16);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 6: [4] PENYEBAB
// ─────────────────────────────────────────────────────────────────────────────
function buildPenyebab() {
  const ws = wb.addWorksheet("PENYEBAB", { tabColor: { argb: 'FF553C9A' } });

  ws.mergeCells('A1:M1');
  const t = ws.getCell('A1');
  t.value = '[4] IDENTIFIKASI PENYEBAB RISIKO (5-WHYS) — Format Lampiran 9';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('553C9A') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const cols = [
    { header: 'Penyebab ID',         width: 12, type: 'formula' },
    { header: 'Kode Risiko (pilih ID dari [3])', width: 20, type: 'input' },
    { header: 'Pernyataan Risiko',   width: 36, type: 'formula' },
    { header: 'Kat. Penyebab (5M+EX)', width: 18, type: 'input' },
    { header: 'Kode Penyebab',       width: 22, type: 'formula' },
    { header: 'Why 1',               width: 36, type: 'input' },
    { header: 'Why 2',               width: 36, type: 'input' },
    { header: 'Why 3',               width: 36, type: 'input' },
    { header: 'Why 4',               width: 36, type: 'input' },
    { header: 'Why 5',               width: 36, type: 'input' },
    { header: 'Akar Penyebab',       width: 40, type: 'input' },
    { header: 'Kegiatan Pengendalian Eksisting', width: 44, type: 'input' },
    { header: 'Keterangan',          width: 24, type: 'input' },
  ];

  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 2, i + 1, col.header, '553C9A');
  });
  ws.getRow(2).height = 36;
  freezeRowCol(ws, 2, 2);

  // Note row
  ws.mergeCells('A3:M3');
  const note = ws.getCell('A3');
  note.value = 'Kolom B: isi Kode Risiko (salin dari kolom B sheet [3] IDENTIFIKASI). Kolom D: pilih kategori 5M+EX dari dropdown. Kolom E: terisi otomatis.';
  note.font = { italic: true, size: 9, color: rgb('553C9A') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('FAF5FF') };
  note.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(3).height = 18;

  for (let r = 4; r <= 153; r++) {
    ws.getRow(r).height = 20;
    // A: penyebab_id
    fml(ws, r, 1, `IF(B${r}<>"",ROW()-3,"")`);
    // B: kode_risiko — input (user copies from IDENTIFIKASI col B)
    inp(ws, r, 2);
    // C: pernyataan — lookup from IDENTIFIKASI by kode_risiko
    fml(ws, r, 3, `IFERROR(XLOOKUP(B${r},IDENTIFIKASI!$B:$B,IDENTIFIKASI!$G:$G),"")`);
    // D: kategori 5M — dropdown
    inp(ws, r, 4);
    dv_list(ws, r, r, 4, 'MASTER!$H$2:$H$' + (1 + KODE_5M.length));
    // E: kode_penyebab
    fml(ws, r, 5,
      `IF(B${r}="","",B${r}&"."&IF(D${r}<>"",D${r},"XX")&"."&TEXT(COUNTIFS($B$4:B${r},B${r},$D$4:D${r},D${r}),"00"))`
    );
    // F-J: why 1-5
    for (let c = 6; c <= 10; c++) inp(ws, r, c);
    // K: akar penyebab
    inp(ws, r, 11);
    // L: kegiatan pengendalian
    inp(ws, r, 12);
    // M: keterangan
    inp(ws, r, 13);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 7: [5] ANALISIS
// ─────────────────────────────────────────────────────────────────────────────
function buildAnalisis() {
  const ws = wb.addWorksheet("ANALISIS", { tabColor: { argb: 'FFC05621' } });

  ws.mergeCells('A1:T1');
  const t = ws.getCell('A1');
  t.value = '[5] ANALISIS RISIKO — Matriks 5×5 Kemungkinan × Dampak';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('C05621') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  const cols = [
    { header: 'Kode Risiko\n(dari [3])',        width: 18 },
    { header: 'Pernyataan Risiko',               width: 36 },
    { header: 'Kategori',                        width: 16 },
    { header: 'Kemungkinan\nInheren (1–5)',       width: 14 },
    { header: 'Dampak\nInheren (1–5)',            width: 14 },
    { header: 'Besaran\nInheren',                width: 10 },
    { header: 'Level\nInheren',                  width: 10 },
    { header: 'Label\nInheren',                  width: 14 },
    { header: 'Ada\nPengendalian?',              width: 14 },
    { header: 'Pengendalian Eksisting',          width: 40 },
    { header: 'Efektivitas\nPengendalian',       width: 14 },
    { header: 'Kecukupan\nPengendalian',         width: 16 },
    { header: 'Kemungkinan\nResidual (1–5)',      width: 14 },
    { header: 'Dampak\nResidual (1–5)',           width: 14 },
    { header: 'Besaran\nResidual',               width: 12 },
    { header: 'Level\nResidual',                 width: 10 },
    { header: 'Label\nResidual',                 width: 14 },
    { header: 'Threshold\n(dari [2])',           width: 14 },
    { header: 'Di Atas\nSelera?',                width: 12 },
    { header: 'Keterangan',                      width: 24 },
  ];

  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 2, i + 1, col.header, 'C05621');
  });
  ws.getRow(2).height = 44;
  freezeRowCol(ws, 2, 2);

  const LEVEL_FML = (besaranCell) =>
    `IFS(${besaranCell}>=20,5,${besaranCell}>=16,4,${besaranCell}>=11,3,${besaranCell}>=6,2,${besaranCell}>0,1,TRUE,"")`;
  const LABEL_FML = (levelCell) =>
    `IFERROR(INDEX({"","Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"},${levelCell}+1),"")`;

  for (let r = 3; r <= 52; r++) {
    ws.getRow(r).height = 20;
    // A: kode_risiko — input (user types/pastes from IDENTIFIKASI)
    inp(ws, r, 1);
    // B: pernyataan — lookup
    fml(ws, r, 2, `IFERROR(XLOOKUP(A${r},IDENTIFIKASI!$B:$B,IDENTIFIKASI!$G:$G),"")`);
    // C: kategori — lookup
    fml(ws, r, 3, `IFERROR(XLOOKUP(A${r},IDENTIFIKASI!$B:$B,IDENTIFIKASI!$H:$H),"")`);
    // D: kemungkinan inheren
    inp(ws, r, 4);
    dv_list(ws, r, r, 4, '"1,2,3,4,5"');
    // E: dampak inheren
    inp(ws, r, 5);
    dv_list(ws, r, r, 5, '"1,2,3,4,5"');
    // F: besaran inheren
    fml(ws, r, 6, `IF(AND(D${r}<>"",E${r}<>""),D${r}*E${r},"")`);
    // G: level inheren
    fml(ws, r, 7, `IF(F${r}="","",${LEVEL_FML(`F${r}`)})`);
    // H: label inheren
    fml(ws, r, 8, LABEL_FML(`G${r}`));
    // I: ada pengendalian
    inp(ws, r, 9);
    dv_list(ws, r, r, 9, '"Ya,Tidak"');
    // J: pengendalian eksisting
    inp(ws, r, 10);
    // K: efektivitas
    inp(ws, r, 11);
    dv_list(ws, r, r, 11, '"Efektif,Tidak Efektif"');
    // L: kecukupan
    inp(ws, r, 12);
    dv_list(ws, r, r, 12, '"Memadai,Cukup,Kurang,Tidak Memiliki"');
    // M: residual kemungkinan
    inp(ws, r, 13);
    dv_list(ws, r, r, 13, '"1,2,3,4,5"');
    // N: residual dampak
    inp(ws, r, 14);
    dv_list(ws, r, r, 14, '"1,2,3,4,5"');
    // O: besaran residual — if no residual, use inheren
    fml(ws, r, 15, `IF(A${r}="","",IF(AND(M${r}<>"",N${r}<>""),M${r}*N${r},IF(AND(D${r}<>"",E${r}<>""),D${r}*E${r},"")))`);
    // P: level residual
    fml(ws, r, 16, `IF(O${r}="","",${LEVEL_FML(`O${r}`)})`);
    // Q: label residual
    fml(ws, r, 17, LABEL_FML(`P${r}`));
    // R: threshold — lookup dari SELERA_RISIKO by kategori
    fml(ws, r, 18,
      `IFERROR(XLOOKUP(C${r},SELERA_RISIKO!$C$5:$C$11,SELERA_RISIKO!$D$5:$D$11),"")`
    );
    // S: di_atas_selera
    fml(ws, r, 19, `IF(AND(P${r}<>"",R${r}<>""),IF(P${r}>R${r},"YA ⚠","tidak"),"")`);
    // T: keterangan
    inp(ws, r, 20);
  }

  // Conditional formatting: Di Atas Selera column (S = col 19)
  ws.addConditionalFormatting({
    ref: 'S3:S52',
    rules: [
      { type: 'containsText', operator: 'containsText', text: 'YA', priority: 1,
        style: { fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFEB2B2'}}, font:{bold:true,color:{argb:'FFC53030'}} } },
    ],
  });

  // Conditional formatting: Level residual
  ws.addConditionalFormatting({
    ref: 'P3:P52',
    rules: [
      { type: 'cellIs', operator: 'equal', formulae: ['5'], priority: 1, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFC53030'}},font:{color:{argb:'FFFFFFFF'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['4'], priority: 2, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFC8181'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['3'], priority: 3, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFBD38D'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['2'], priority: 4, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFAF089'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['1'], priority: 5, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FF9AE6B4'}}} },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 8: [6] EVALUASI
// ─────────────────────────────────────────────────────────────────────────────
function buildEvaluasi() {
  const ws = wb.addWorksheet("EVALUASI", { tabColor: { argb: 'FF702459' } });
  ws.views = [{ showGridLines: false }];

  ws.mergeCells('A1:J1');
  const t = ws.getCell('A1');
  t.value = '[6] EVALUASI RISIKO — Daftar Prioritas & Heatmap 5×5';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('702459') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  // ── Part A: Tabel Prioritas ──────────────────────
  sectionTitle(ws, 2, 1, 'A. RISIKO PRIORITAS (Di Atas Selera Risiko)', 10, '702459');
  ws.getRow(2).height = 22;

  const evalCols = [
    'Kode Risiko', 'Pernyataan Risiko', 'Kategori', 'Proses Bisnis',
    'Skor Inheren', 'Level Inheren', 'Skor Residual', 'Level Residual',
    'Threshold', 'Status'
  ];
  evalCols.forEach((h, i) => {
    hdr(ws, 3, i + 1, h, '702459');
    ws.getColumn(i + 1).width = [18, 44, 16, 20, 12, 14, 12, 14, 10, 12][i];
  });
  ws.getRow(3).height = 22;
  freezeRow(ws, 3);

  // FILTER formula pulling priority risks from ANALISIS
  for (let r = 4; r <= 53; r++) {
    ws.getRow(r).height = 20;
    // Use IFERROR + INDEX approach since we can't do dynamic FILTER in named cells easily
    // Instead, provide instructions and use FILTER function in first cell
    if (r === 4) {
      const note = ws.getCell(r, 1);
      note.value = '← Gunakan formula berikut di sel ini (Excel 365):';
      note.font = { italic: true, size: 9, color: rgb('702459') };
    }
  }

  // Instruction for FILTER formula
  ws.mergeCells('A5:J5');
  const filterNote = ws.getCell('A5');
  filterNote.value =
    `Formula FILTER untuk kolom A4 (salin ke A4, lalu expand): ` +
    `=IFERROR(FILTER(ANALISIS!A3:T52,ANALISIS!S3:S52="YA ⚠"),"Belum ada risiko prioritas")`;
  filterNote.font = { bold: true, size: 9, color: rgb('276749') };
  filterNote.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('F0FFF4') };
  filterNote.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(5).height = 36;

  // Actual FILTER formula in A4 returning all 20 columns
  ws.getCell('A4').value = {
    formula: `IFERROR(FILTER(ANALISIS!A3:T52,ANALISIS!S3:S52="YA ⚠"),"Belum ada risiko prioritas — pastikan sheet [5] ANALISIS sudah diisi dan threshold [2] sudah ditetapkan")`
  };
  ws.getCell('A4').font = { color: rgb('1D4ED8'), size: 10 };
  ws.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EFF6FF') };

  // ── Part B: Heatmap 5×5 ─────────────────────────
  const hmStartRow = 8;
  const hmStartCol = 1;

  sectionTitle(ws, hmStartRow, hmStartCol, 'B. HEATMAP 5×5 — RISIKO RESIDUAL', 8, '702459');
  ws.getRow(hmStartRow).height = 22;

  // Y-axis labels (kemungkinan, top=5)
  hdr(ws, hmStartRow + 1, hmStartCol + 1, 'K\\D →', '4A5568', 'FFFFFF', 9);
  for (let d = 1; d <= 5; d++) {
    const c = ws.getCell(hmStartRow + 1, hmStartCol + 1 + d);
    c.value = `Dampak ${d}`;
    c.font = { bold: true, size: 9, color: rgb('FFFFFF') };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('4A5568') };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getColumn(hmStartCol + 1 + d).width = 14;
  }
  // Tambah kolom label kiri
  ws.getColumn(hmStartCol).width = 4;
  ws.getColumn(hmStartCol + 1).width = 12;

  // Heatmap cell colors based on score K*D
  const heatColor = (k, d) => {
    const score = k * d;
    if (score >= 20) return 'C53030'; // ST
    if (score >= 16) return 'E53E3E'; // T
    if (score >= 11) return 'ED8936'; // S
    if (score >= 6)  return 'ECC94B'; // R
    return '48BB78'; // SR
  };
  const heatFg = (k, d) => {
    const score = k * d;
    return score >= 6 ? '1A202C' : '1A202C';
  };

  for (let k = 5; k >= 1; k--) {
    const row = hmStartRow + 1 + (5 - k + 1);
    ws.getRow(row).height = 32;
    // Row label
    const lc = ws.getCell(row, hmStartCol + 1);
    lc.value = `K=${k}`;
    lc.font = { bold: true, size: 9, color: rgb('FFFFFF') };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('4A5568') };
    lc.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let d = 1; d <= 5; d++) {
      const c = ws.getCell(row, hmStartCol + 1 + d);
      const score = k * d;
      const bgColor = heatColor(k, d);

      // COUNTIFS formula counting risks at this K,D coordinate
      c.value = {
        formula: `IFERROR(TEXTJOIN(", ",TRUE,IF((ANALISIS!M3:M52=IF(ANALISIS!M3:M52<>"","","x"))*1=0,IF(AND(ANALISIS!M3:M52=${k},ANALISIS!N3:N52=${d}),ANALISIS!A3:A52,""),""))&IF(COUNTIFS(ANALISIS!M3:M52,${k},ANALISIS!N3:N52,${d})>0,"","—"),"—")`
      };
      // Simpler formula
      c.value = {
        formula: `IFERROR(TEXTJOIN(", ",TRUE,IF((ANALISIS!M3:M52=${k})*(ANALISIS!N3:N52=${d}),ANALISIS!A3:A52,""))&IF(COUNTIFS(ANALISIS!M3:M52,${k},ANALISIS!N3:N52,${d})=0,"—",""),"—")`
      };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb(bgColor) };
      c.font = { size: 8, bold: true, color: rgb(score >= 16 ? 'FFFFFF' : '1A202C') };
      c.alignment = { wrapText: true, horizontal: 'center', vertical: 'middle' };
      c.border = { top:{style:'thin',color:rgb('FFFFFF')}, left:{style:'thin',color:rgb('FFFFFF')}, bottom:{style:'thin',color:rgb('FFFFFF')}, right:{style:'thin',color:rgb('FFFFFF')} };
    }
  }

  // Legend
  const lgRow = hmStartRow + 8;
  ws.mergeCells(lgRow, hmStartCol, lgRow, hmStartCol + 7);
  const lg = ws.getCell(lgRow, hmStartCol);
  lg.value = '🔴 Sangat Tinggi (≥20)   🟠 Tinggi (16–19)   🟡 Sedang (11–15)   🟨 Rendah (6–10)   🟢 Sangat Rendah (1–5)';
  lg.font = { size: 9, italic: true };
  lg.alignment = { horizontal: 'center', vertical: 'middle' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 9: [7] EVAL_PENG
// ─────────────────────────────────────────────────────────────────────────────
function buildEvalPengendalian() {
  const ws = wb.addWorksheet("EVAL_PENG", { tabColor: { argb: 'FF2C7A7B' } });

  ws.mergeCells('A1:F1');
  const t = ws.getCell('A1');
  t.value = '[7] EVALUASI PENGENDALIAN UTAMA — Risiko Prioritas';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('2C7A7B') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:F2');
  const note = ws.getCell('A2');
  note.value = 'Isi kolom B (Kode Risiko) dengan kode dari risiko PRIORITAS (kolom S = "YA ⚠" di sheet [5] ANALISIS). Kolom lain terisi otomatis.';
  note.font = { italic: true, size: 10, color: rgb('2C7A7B') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('E6FFFA') };
  note.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(2).height = 30;

  const cols = [
    { header: 'No',                           width: 6  },
    { header: 'Kode Risiko (prioritas)',       width: 20 },
    { header: 'Pernyataan Risiko',             width: 44 },
    { header: 'Pengendalian Eksisting\n(dari [5] ANALISIS)', width: 44 },
    { header: 'Pengendalian Utama\n(isi manual)', width: 44 },
    { header: 'Catatan APIP',                 width: 30 },
  ];
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 3, i + 1, col.header, '2C7A7B');
  });
  ws.getRow(3).height = 36;
  freezeRow(ws, 3);

  for (let r = 4; r <= 53; r++) {
    ws.getRow(r).height = 24;
    fml(ws, r, 1, `IF(B${r}<>"",ROW()-3,"")`);
    inp(ws, r, 2); // kode risiko
    fml(ws, r, 3, `IFERROR(XLOOKUP(B${r},ANALISIS!$A:$A,ANALISIS!$B:$B),"")`);
    fml(ws, r, 4, `IFERROR(XLOOKUP(B${r},ANALISIS!$A:$A,ANALISIS!$J:$J),"")`);
    inp(ws, r, 5); // pengendalian utama
    inp(ws, r, 6); // catatan
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 10: [8] PROGRAM_AUDIT
// ─────────────────────────────────────────────────────────────────────────────
function buildProgramAudit() {
  const ws = wb.addWorksheet("PROGRAM_AUDIT", { tabColor: { argb: 'FF1A365D' } });

  ws.mergeCells('A1:H1');
  const t = ws.getCell('A1');
  t.value = '[8] PROGRAM KERJA AUDIT — Kecukupan Pengendalian ≠ Memadai';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('1A365D') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:H2');
  const note = ws.getCell('A2');
  note.value = 'Isi kolom A (Kode Risiko) untuk risiko dengan kecukupan pengendalian: Cukup / Kurang / Tidak Memiliki. Kolom Uraian dapat diedit setelah terisi otomatis.';
  note.font = { italic: true, size: 10, color: rgb('1A365D') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EBF4FF') };
  note.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(2).height = 30;

  const cols = [
    { header: 'Kode Risiko',              width: 18 },
    { header: 'Pernyataan Risiko',         width: 40 },
    { header: 'Kecukupan Pengendalian',    width: 20 },
    { header: 'Uraian Program Kerja Audit\n(otomatis, dapat diedit)', width: 60 },
    { header: 'No. KKA',                  width: 20 },
    { header: 'Waktu Pelaksanaan',         width: 24 },
    { header: 'Dilaksanakan Oleh',         width: 30 },
    { header: 'Catatan',                  width: 24 },
  ];
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 3, i + 1, col.header, '1A365D');
  });
  ws.getRow(3).height = 44;
  freezeRow(ws, 3);

  for (let r = 4; r <= 53; r++) {
    ws.getRow(r).height = 56;
    inp(ws, r, 1); // kode risiko input
    fml(ws, r, 2, `IFERROR(XLOOKUP(A${r},ANALISIS!$A:$A,ANALISIS!$B:$B),"")`);
    fml(ws, r, 3, `IFERROR(XLOOKUP(A${r},ANALISIS!$A:$A,ANALISIS!$L:$L),"")`);
    // Uraian auto-draft (can be overwritten)
    const uraianCell = ws.getCell(r, 4);
    uraianCell.value = {
      formula:
        `IF(A${r}="","",` +
        `"Pengujian atas kecukupan pengendalian terhadap risiko "&A${r}&": "&` +
        `IFERROR(XLOOKUP(A${r},ANALISIS!$A:$A,ANALISIS!$B:$B),"")&` +
        `". Pengendalian eksisting: "&IFERROR(XLOOKUP(A${r},ANALISIS!$A:$A,ANALISIS!$J:$J),"(tidak ada)")&` +
        `". Pengendalian utama: "&IFERROR(XLOOKUP(A${r},EVAL_PENG!$B:$B,EVAL_PENG!$E:$E),"(belum ditetapkan)")&` +
        `". Penyebab terkait: "&IFERROR(TEXTJOIN(", ",TRUE,IF(PENYEBAB!$B$4:$B$153=A${r},PENYEBAB!$E$4:$E$153,"")),"(belum diisi)")&".")`
    };
    uraianCell.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('FFFBEB') };
    uraianCell.font = { size: 9, color: rgb('744210') };
    uraianCell.alignment = { wrapText: true, vertical: 'top' };
    uraianCell.border = { top:{style:'thin',color:rgb('FBD38D')}, left:{style:'thin',color:rgb('FBD38D')}, bottom:{style:'thin',color:rgb('FBD38D')}, right:{style:'thin',color:rgb('FBD38D')} };

    // Input cells
    inp(ws, r, 5); // no KKA
    inp(ws, r, 6); // waktu
    inp(ws, r, 7); // dilaksanakan oleh
    inp(ws, r, 8); // catatan
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 11: [9] RTP
// ─────────────────────────────────────────────────────────────────────────────
function buildRTP() {
  const ws = wb.addWorksheet("RTP", { tabColor: { argb: 'FF22543D' } });

  ws.mergeCells('A1:O1');
  const t = ws.getCell('A1');
  t.value = '[9] RENCANA TINDAK PENGENDALIAN — Format Lampiran 10';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('22543D') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.mergeCells('A2:O2');
  const note = ws.getCell('A2');
  note.value = 'Isi kolom A (Kode Penyebab) dari penyebab risiko PRIORITAS. Salin dari kolom E sheet [4] PENYEBAB, hanya untuk penyebab dari risiko yang di_atas_selera = YA.';
  note.font = { italic: true, size: 10, color: rgb('22543D') };
  note.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('F0FFF4') };
  note.alignment = { wrapText: true, vertical: 'middle' };
  ws.getRow(2).height = 30;

  const cols = [
    { header: 'Kode Penyebab\n(dari [4])',    width: 26 },
    { header: 'Kode Risiko',                  width: 18 },
    { header: 'Pernyataan Risiko',             width: 36 },
    { header: 'Akar Penyebab',                width: 36 },
    { header: 'Kegiatan\nPengendalian\nEksisting', width: 30 },
    { header: 'Klasifikasi SPIP',             width: 40 },
    { header: 'Penanggung Jawab',             width: 28 },
    { header: 'Indikator Keluaran',           width: 36 },
    { header: 'Target Waktu',                 width: 16 },
    { header: 'Kemungkinan\nRencana (1–5)',    width: 16 },
    { header: 'Dampak\nRencana (1–5)',         width: 16 },
    { header: 'Besaran\nRTP',                 width: 12 },
    { header: 'Level RTP',                   width: 12 },
    { header: 'Label RTP',                   width: 16 },
    { header: 'Catatan',                      width: 24 },
  ];
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
    hdr(ws, 3, i + 1, col.header, '22543D');
  });
  ws.getRow(3).height = 44;
  freezeRowCol(ws, 3, 2);

  const LEVEL_FML = (cell) =>
    `IFS(${cell}>=20,5,${cell}>=16,4,${cell}>=11,3,${cell}>=6,2,${cell}>0,1,TRUE,"")`;
  const LABEL_FML = (cell) =>
    `IFERROR(INDEX({"","Sangat Rendah","Rendah","Sedang","Tinggi","Sangat Tinggi"},${cell}+1),"")`;

  for (let r = 4; r <= 153; r++) {
    ws.getRow(r).height = 24;
    inp(ws, r, 1); // kode penyebab
    // B: kode risiko from penyebab
    fml(ws, r, 2, `IFERROR(XLOOKUP(A${r},PENYEBAB!$E:$E,PENYEBAB!$B:$B),"")`);
    // C: pernyataan
    fml(ws, r, 3, `IFERROR(XLOOKUP(A${r},PENYEBAB!$E:$E,PENYEBAB!$C:$C),"")`);
    // D: akar penyebab
    fml(ws, r, 4, `IFERROR(XLOOKUP(A${r},PENYEBAB!$E:$E,PENYEBAB!$K:$K),"")`);
    // E: kegiatan pengendalian eksisting
    fml(ws, r, 5, `IFERROR(XLOOKUP(A${r},PENYEBAB!$E:$E,PENYEBAB!$L:$L),"")`);
    // F: klasifikasi SPIP — dropdown
    inp(ws, r, 6);
    dv_list(ws, r, r, 6, 'MASTER!$Q$2:$Q$' + (1 + SPIP_KLASIFIKASI.length));
    // G: penanggung jawab
    inp(ws, r, 7);
    // H: indikator keluaran
    inp(ws, r, 8);
    // I: target waktu
    inp(ws, r, 9);
    // J: frekuensi rencana
    inp(ws, r, 10);
    dv_list(ws, r, r, 10, '"1,2,3,4,5"');
    // K: dampak rencana
    inp(ws, r, 11);
    dv_list(ws, r, r, 11, '"1,2,3,4,5"');
    // L: besaran RTP
    fml(ws, r, 12, `IF(AND(J${r}<>"",K${r}<>""),J${r}*K${r},"")`);
    // M: level RTP
    fml(ws, r, 13, `IF(L${r}="","",${LEVEL_FML(`L${r}`)})`);
    // N: label RTP
    fml(ws, r, 14, LABEL_FML(`M${r}`));
    // O: catatan
    inp(ws, r, 15);
  }

  // Conditional formatting level RTP
  ws.addConditionalFormatting({
    ref: 'M4:M153',
    rules: [
      { type: 'cellIs', operator: 'equal', formulae: ['5'], priority: 1, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFC53030'}},font:{color:{argb:'FFFFFFFF'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['4'], priority: 2, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFC8181'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['3'], priority: 3, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFBD38D'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['2'], priority: 4, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFAF089'}}} },
      { type: 'cellIs', operator: 'equal', formulae: ['1'], priority: 5, style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FF9AE6B4'}}} },
    ],
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 12: MATURITAS
// ─────────────────────────────────────────────────────────────────────────────
function buildMaturitas() {
  const ws = wb.addWorksheet('MATURITAS', { tabColor: { argb: 'FF744210' } });
  ws.views = [{ showGridLines: false }];

  ws.mergeCells('A1:H1');
  const t = ws.getCell('A1');
  t.value = 'PENILAIAN MATURITAS MANAJEMEN RISIKO — Skala 1–5';
  t.font = { bold: true, size: 13, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('744210') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 28;

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 34;
  ws.getColumn(3).width = 32;
  ws.getColumn(4).width = 32;
  ws.getColumn(5).width = 32;
  ws.getColumn(6).width = 32;
  ws.getColumn(7).width = 32;
  ws.getColumn(8).width = 16;

  // Headers
  hdr(ws, 3, 2, 'Dimensi Penilaian', '744210');
  for (let l = 1; l <= 5; l++) {
    hdr(ws, 3, 2 + l, `Level ${l} — ${['Rintisan','Berkembang','Terdefinisi','Terkelola','Optimum'][l-1]}`, '744210');
  }
  hdr(ws, 3, 8, 'Level Dipilih', '744210');
  ws.getRow(3).height = 24;

  const dimensi = [
    {
      nama: 'Lingkungan Pengendalian',
      desc: [
        'Belum ada kebijakan MR tertulis; pimpinan belum menunjukkan komitmen',
        'Kebijakan MR dalam proses; beberapa pimpinan mulai mendukung',
        'Kebijakan MR formal; komitmen pimpinan terdokumentasi',
        'Kebijakan MR diimplementasikan penuh; review berkala dilakukan',
        'Budaya risiko melekat; MR terintegrasi dalam semua keputusan strategis',
      ]
    },
    {
      nama: 'Penilaian Risiko',
      desc: [
        'Risiko diidentifikasi secara ad-hoc; tidak ada metodologi',
        'Metodologi penilaian risiko mulai diterapkan; belum konsisten',
        'Metodologi baku (5×5 SPIP) diterapkan di semua satker',
        'Penilaian risiko dikaitkan dengan KPI; analisis kuantitatif sebagian',
        'Penilaian risiko terintegrasi penuh; prediktif berbasis data historis',
      ]
    },
    {
      nama: 'Kegiatan Pengendalian',
      desc: [
        'Pengendalian tidak terdokumentasi; efektivitas tidak diukur',
        'Beberapa pengendalian terdokumentasi; uji efektivitas sporadis',
        'Pengendalian utama terdokumentasi & diuji secara berkala',
        'Pengendalian terintegrasi dengan proses bisnis; monitoring otomatis',
        'Pengendalian adaptif; diperbarui real-time berdasarkan data risiko',
      ]
    },
    {
      nama: 'Informasi & Komunikasi',
      desc: [
        'Informasi risiko tidak dikomunikasikan; pelaporan tidak ada',
        'Laporan risiko dibuat tapi distribusinya tidak terstruktur',
        'Laporan risiko reguler ke pimpinan; format standar APIP',
        'Dashboard risiko real-time; integrasi dengan sistem manajemen',
        'Komunikasi risiko dua arah; sistem peringatan dini terimplementasi',
      ]
    },
    {
      nama: 'Pemantauan',
      desc: [
        'Tidak ada pemantauan; RTP tidak ditindaklanjuti',
        'Pemantauan sporadis; beberapa RTP ditindaklanjuti',
        'Pemantauan berkala terstruktur; semua RTP dimonitor',
        'Pemantauan terintegrasi dengan sistem; laporan progres otomatis',
        'Pemantauan berkelanjutan; pembelajaran dari risiko menjadi kebijakan',
      ]
    },
  ];

  dimensi.forEach((dim, di) => {
    const r = 4 + di;
    ws.getRow(r).height = 48;
    lbl(ws, r, 2, dim.nama);
    dim.desc.forEach((desc, li) => {
      const c = ws.getCell(r, 3 + li);
      c.value = desc;
      c.font = { size: 9 };
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb(di % 2 === 0 ? 'F7FAFC' : 'EBF4FF') };
      c.alignment = { wrapText: true, vertical: 'top' };
      c.border = { top:{style:'thin',color:rgb('CBD5E0')}, left:{style:'thin',color:rgb('CBD5E0')}, bottom:{style:'thin',color:rgb('CBD5E0')}, right:{style:'thin',color:rgb('CBD5E0')} };
    });
    // Level dipilih — dropdown
    const lc = ws.getCell(r, 8);
    lc.value = 1;
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('FEFCBF') };
    lc.font = { bold: true, size: 14, color: rgb('744210') };
    lc.alignment = { horizontal: 'center', vertical: 'middle' };
    lc.border = { top:{style:'medium',color:rgb('744210')}, left:{style:'medium',color:rgb('744210')}, bottom:{style:'medium',color:rgb('744210')}, right:{style:'medium',color:rgb('744210')} };
    dv_list(ws, r, r, 8, '"1,2,3,4,5"');
  });

  // Summary
  ws.getRow(10).height = 10;
  sectionTitle(ws, 11, 2, 'HASIL PENILAIAN', 7, '744210');
  ws.getRow(11).height = 22;

  lbl(ws, 12, 2, 'Rerata Skor');
  ws.mergeCells('C12:G12');
  fml(ws, 12, 3, 'AVERAGE(H4:H8)');
  ws.getCell('C12').font = { bold: true, size: 16, color: rgb('744210') };
  ws.getCell('C12').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(12).height = 28;

  lbl(ws, 13, 2, 'Label Maturitas');
  ws.mergeCells('C13:G13');
  fml(ws, 13, 3,
    'IFS(C12>=4.5,"Level 5 — OPTIMUM",C12>=3.5,"Level 4 — TERKELOLA",C12>=2.5,"Level 3 — TERDEFINISI",C12>=1.5,"Level 2 — BERKEMBANG",C12>=1,"Level 1 — RINTISAN",TRUE,"Belum dinilai")'
  );
  ws.getCell('C13').font = { bold: true, size: 13 };
  ws.getCell('C13').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(13).height = 28;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHEET 13: LAPORAN
// ─────────────────────────────────────────────────────────────────────────────
function buildLaporan() {
  const ws = wb.addWorksheet('LAPORAN', { tabColor: { argb: 'FF1A365D' } });
  ws.views = [{ showGridLines: false }];

  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 20;
  ws.getColumn(6).width = 20;

  ws.mergeCells('B1:F1');
  const t = ws.getCell('B1');
  t.value = 'LAPORAN EKSEKUTIF — MANAJEMEN RISIKO';
  t.font = { bold: true, size: 16, color: rgb('FFFFFF') };
  t.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('1A365D') };
  t.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 36;

  // Unit & Tahun from KONTEKS
  ws.mergeCells('B2:F2');
  fml(ws, 2, 2, `"Unit Kerja: "&KONTEKS!C4&"  |  Tahun: "&KONTEKS!C6`);
  ws.getCell('B2').font = { bold: true, size: 12, color: rgb('2B6CB0') };
  ws.getCell('B2').fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('EBF4FF') };
  ws.getCell('B2').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(2).height = 24;

  // ── KPI Cards ────────────────────────────────────
  sectionTitle(ws, 4, 2, 'INDIKATOR UTAMA', 5, '1A365D');
  ws.getRow(4).height = 22;

  const kpis = [
    ['Total Risiko Terdaftar',  `COUNTA(IDENTIFIKASI!G3:G52)`,         '2B6CB0'],
    ['Risiko Prioritas',        `COUNTIF(ANALISIS!S3:S52,"YA ⚠")`,     'C53030'],
    ['Risiko Ber-RTP',          `COUNTA(RTP!A4:A153)`,                 '276749'],
    ['Rerata Skor Residual',    `IFERROR(AVERAGE(ANALISIS!O3:O52),"—")`, 'C05621'],
    ['Level Maturitas MR',      `IFERROR(MATURITAS!C13,"Belum dinilai")`,    '744210'],
  ];

  kpis.forEach(([label, formula, color], i) => {
    const col = 2 + i;
    ws.getColumn(col).width = 22;
    const lc = ws.getCell(5, col);
    lc.value = label;
    lc.font = { bold: true, size: 9, color: rgb(color) };
    lc.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('F7FAFC') };
    lc.alignment = { horizontal: 'center', vertical: 'bottom', wrapText: true };
    lc.border = { top:{style:'medium',color:rgb(color)}, left:{style:'thin',color:rgb('CBD5E0')}, bottom:{style:'thin',color:rgb('CBD5E0')}, right:{style:'thin',color:rgb('CBD5E0')} };
    ws.getRow(5).height = 36;

    const vc = ws.getCell(6, col);
    vc.value = { formula };
    vc.font = { bold: true, size: 22, color: rgb(color) };
    vc.fill = { type: 'pattern', pattern: 'solid', fgColor: rgb('F7FAFC') };
    vc.alignment = { horizontal: 'center', vertical: 'middle' };
    vc.border = { top:{style:'thin',color:rgb('CBD5E0')}, left:{style:'thin',color:rgb('CBD5E0')}, bottom:{style:'medium',color:rgb(color)}, right:{style:'thin',color:rgb('CBD5E0')} };
    ws.getRow(6).height = 44;
  });

  // ── Distribusi per Kategori ───────────────────────
  sectionTitle(ws, 8, 2, 'DISTRIBUSI RISIKO PER KATEGORI', 5, '553C9A');
  ws.getRow(8).height = 22;
  hdr(ws, 9, 2, 'Kategori Risiko', '553C9A');
  hdr(ws, 9, 3, 'Total Risiko', '553C9A');
  hdr(ws, 9, 4, 'Prioritas', '553C9A');
  hdr(ws, 9, 5, 'Ber-RTP', '553C9A');
  hdr(ws, 9, 6, 'Rerata Skor Residual', '553C9A');
  ws.getRow(9).height = 22;

  KATEGORI_RISIKO.forEach(([no, nama, kode], i) => {
    const r = 10 + i;
    ws.getRow(r).height = 20;
    lbl(ws, r, 2, nama);
    fml(ws, r, 3, `COUNTIF(IDENTIFIKASI!H3:H52,"${nama}")`);
    fml(ws, r, 4,
      `COUNTIFS(ANALISIS!C3:C52,"${nama}",ANALISIS!S3:S52,"YA ⚠")`
    );
    fml(ws, r, 5,
      `IFERROR(COUNTIFS(RTP!A4:A153,"<>"),0)`
    );
    fml(ws, r, 6,
      `IFERROR(AVERAGEIF(ANALISIS!C3:C52,"${nama}",ANALISIS!O3:O52),"—")`
    );
  });

  // ── Top 5 Risiko Tertinggi ────────────────────────
  const topRow = 10 + KATEGORI_RISIKO.length + 2;
  sectionTitle(ws, topRow, 2, 'TOP 5 RISIKO RESIDUAL TERTINGGI', 5, 'C05621');
  ws.getRow(topRow).height = 22;
  hdr(ws, topRow + 1, 2, 'Kode Risiko', 'C05621');
  hdr(ws, topRow + 1, 3, 'Pernyataan Risiko', 'C05621');
  hdr(ws, topRow + 1, 4, 'Kategori', 'C05621');
  hdr(ws, topRow + 1, 5, 'Skor Residual', 'C05621');
  hdr(ws, topRow + 1, 6, 'Level', 'C05621');
  ws.getRow(topRow + 1).height = 22;

  // LARGE formula for top 5
  for (let i = 1; i <= 5; i++) {
    const r = topRow + 1 + i;
    ws.getRow(r).height = 22;
    fml(ws, r, 2, `IFERROR(INDEX(ANALISIS!A:A,MATCH(LARGE(ANALISIS!O$3:O$52,${i}),ANALISIS!O$3:O$52,0)+2),"—")`);
    fml(ws, r, 3, `IFERROR(INDEX(ANALISIS!B:B,MATCH(LARGE(ANALISIS!O$3:O$52,${i}),ANALISIS!O$3:O$52,0)+2),"—")`);
    fml(ws, r, 4, `IFERROR(INDEX(ANALISIS!C:C,MATCH(LARGE(ANALISIS!O$3:O$52,${i}),ANALISIS!O$3:O$52,0)+2),"—")`);
    fml(ws, r, 5, `IFERROR(LARGE(ANALISIS!O$3:O$52,${i}),"—")`);
    fml(ws, r, 6, `IFERROR(INDEX(ANALISIS!Q:Q,MATCH(LARGE(ANALISIS!O$3:O$52,${i}),ANALISIS!O$3:O$52,0)+2),"—")`);
  }

  // Timestamp
  const tsRow = topRow + 8;
  ws.mergeCells(tsRow, 2, tsRow, 6);
  const ts = ws.getCell(tsRow, 2);
  ts.value = { formula: `"Laporan di-generate: "&TEXT(NOW(),"DD MMMM YYYY HH:MM")` };
  ts.font = { italic: true, size: 9, color: rgb('718096') };
  ts.alignment = { horizontal: 'right' };
}

// ─────────────────────────────────────────────────────────────────────────────
// BUILD & SAVE
// ─────────────────────────────────────────────────────────────────────────────
buildCover();
buildMaster();
buildKonteks();
buildSeleraRisiko();
buildIdentifikasi();
buildPenyebab();
buildAnalisis();
buildEvaluasi();
buildEvalPengendalian();
buildProgramAudit();
buildRTP();
buildMaturitas();
buildLaporan();

wb.xlsx.writeFile(OUT).then(() => {
  console.log('✅  File berhasil dibuat: ' + OUT);
}).catch(err => {
  console.error('❌  Error:', err.message);
  process.exit(1);
});
