/**
 * Engine analisis rule-based, kategori A–H sesuai Bagian 5 dokumen kebutuhan.
 *
 * Setiap temuan wajib membawa nilai tercetak, nilai hasil hitung ulang, dan
 * halaman asal, supaya bisa ditelusuri balik ke PDF oleh verifikator.
 */
import {
  AMBANG_BAWAAN, JUDUL_KATEGORI, KATA_NAIK, KATA_NIHIL, KATA_TURUN, POLA_SURPLUS_DEFISIT, ada,
  samaDenganToleransi,
  type Ambang, type BarisLo, type BarisNeraca, type BarisNp,
  type DataLk, type Kategori, type Severity, type Temuan,
} from './konstanta'

const POLA_SURPLUS_DEFISIT_LO = new RegExp(`^${POLA_SURPLUS_DEFISIT}LO$`, 'i')
/** LPE: sebagian varian tidak mencetak akhiran "LO" pada baris ini. */
const POLA_SURPLUS_DEFISIT_LPE = new RegExp(`^${POLA_SURPLUS_DEFISIT}(LO)?$`, 'i')

type Rakit = {
  kategori: Kategori
  severity: Severity
  deskripsi: string
  pos: string
  nilaiTercetak?: number | null
  nilaiHitung?: number | null
  halaman?: number | null
  rekomendasi: string
}

function buat(t: Rakit): Temuan {
  const tercetak = t.nilaiTercetak ?? null
  const hitung = t.nilaiHitung ?? null
  return {
    kategori: t.kategori,
    severity: t.severity,
    deskripsi: t.deskripsi,
    pos: t.pos,
    nilaiTercetak: tercetak,
    nilaiHitung: hitung,
    selisih: ada(tercetak) && ada(hitung) ? tercetak - hitung : null,
    halaman: t.halaman ?? null,
    rekomendasi: t.rekomendasi,
  }
}

const cari = <T extends { uraian: string }>(baris: T[], pola: RegExp): T | undefined =>
  baris.find((r) => pola.test(r.uraian))

const rupiah = (n: number | null) =>
  ada(n) ? `Rp${n.toLocaleString('id-ID')}` : '(tidak terbaca)'

/** Jumlahkan sisi debet dikurangi kredit untuk akun berawalan `awalan`. */
function saldoAkun(np: BarisNp[], awalan: string, arah: 'debet' | 'kredit'): number {
  return np
    .filter((r) => r.kodeAkun.startsWith(awalan))
    .reduce((s, r) => {
      const d = r.debet ?? 0
      const k = r.kredit ?? 0
      return s + (arah === 'debet' ? d - k : k - d)
    }, 0)
}

// ── A. Konsistensi antar-laporan ─────────────────────────────────────────
function analisisA(data: DataLk, ambang: Ambang): Temuan[] {
  const t: Temuan[] = []
  const { neraca, lo, lpe, npAkrual, npKas, lra } = data
  const tol = ambang.toleransiRupiah

  const cocokkan = (
    nama: string, kiri: number | null, kanan: number | null,
    pos: string, halaman: number | null, severity: Severity, rekomendasi: string,
  ) => {
    if (!ada(kiri) || !ada(kanan)) return
    if (samaDenganToleransi(kiri, kanan, tol)) return
    t.push(buat({
      kategori: 'A', severity, pos, halaman,
      deskripsi: `${nama} tidak sama: ${rupiah(kiri)} vs ${rupiah(kanan)}.`,
      nilaiTercetak: kiri, nilaiHitung: kanan, rekomendasi,
    }))
  }

  // A.1 Neraca harus balance, TA berjalan & TA lalu.
  const aset = cari(neraca, /^JUMLAH ASET$/i)
  const kewEkuitas = cari(neraca, /^JUMLAH KEWAJIBAN DAN EKUITAS$/i)
  cocokkan('Neraca TA berjalan (Aset vs Kewajiban+Ekuitas)', aset?.nilai ?? null, kewEkuitas?.nilai ?? null,
    'Neraca — JUMLAH ASET', aset?.halaman ?? null, 'Kritikal',
    'Telusuri pos yang menyebabkan neraca tidak seimbang di SAKTI sebelum laporan dikirim.')
  cocokkan('Neraca TA lalu (Aset vs Kewajiban+Ekuitas)', aset?.nilaiLalu ?? null, kewEkuitas?.nilaiLalu ?? null,
    'Neraca — JUMLAH ASET (TA lalu)', aset?.halaman ?? null, 'Kritikal',
    'Periksa saldo awal/komparatif tahun lalu pada Neraca.')

  // A.2 Ekuitas akhir LPE = Ekuitas di Neraca.
  const ekuitasNeraca = [...neraca].reverse().find((r) => /^JUMLAH EKUITAS$/i.test(r.uraian))
  const ekuitasAkhir = cari(lpe, /^EKUITAS AKHIR$/i)
  cocokkan('Ekuitas Akhir LPE vs Ekuitas Neraca', ekuitasAkhir?.nilai ?? null, ekuitasNeraca?.nilai ?? null,
    'LPE — EKUITAS AKHIR', ekuitasAkhir?.halaman ?? null, 'Kritikal',
    'Pastikan LPE dan Neraca dibangkitkan dari periode & posting yang sama.')

  // A.3 Ekuitas Awal TA berjalan = Ekuitas Akhir TA lalu (per Neraca, bukan
  // kolom TA-lalu LPE sendiri: pada laporan interim/semester, kolom
  // pembanding LPE adalah periode yang sama tahun lalu — mis. 30 Juni 2024 —
  // bukan akhir tahun 31 Desember 2024 seperti yang direpresentasikan Ekuitas
  // Awal. Neraca selalu memakai akhir tahun lalu sebagai basis pembanding,
  // sehingga konsisten pada kedua jenis laporan.
  const ekuitasAwal = cari(lpe, /^EKUITAS AWAL\b/i)
  cocokkan('Ekuitas Awal LPE vs Ekuitas Akhir TA lalu (Neraca)', ekuitasAwal?.nilai ?? null, ekuitasNeraca?.nilaiLalu ?? null,
    'LPE — EKUITAS AWAL', ekuitasAwal?.halaman ?? null, 'Tinggi',
    'Periksa kontinuitas saldo ekuitas antar periode.')

  // A.4 Surplus/Defisit-LO di LO = komponen yang dipakai LPE.
  const surplusLo = cari(lo, POLA_SURPLUS_DEFISIT_LO)
  const surplusLpe = cari(lpe, POLA_SURPLUS_DEFISIT_LPE)
  cocokkan('Surplus/Defisit-LO (LO vs LPE)', surplusLo?.nilai ?? null, surplusLpe?.nilai ?? null,
    'LO — SURPLUS/DEFISIT-LO', surplusLo?.halaman ?? null, 'Kritikal',
    'Surplus/Defisit-LO harus mengalir sama persis ke LPE.')

  // A.5 & A.6 Neraca Percobaan harus balance.
  for (const [nama, np] of [['Akrual', npAkrual], ['Kas', npKas]] as const) {
    if (np.length === 0) continue
    const debet = np.reduce((s, r) => s + (r.debet ?? 0), 0)
    const kredit = np.reduce((s, r) => s + (r.kredit ?? 0), 0)
    if (!samaDenganToleransi(debet, kredit, tol)) {
      t.push(buat({
        kategori: 'A', severity: 'Kritikal',
        pos: `Neraca Percobaan (Basis ${nama})`,
        halaman: np[0]?.halaman ?? null,
        deskripsi: `Total debet ${rupiah(debet)} tidak sama dengan total kredit ${rupiah(kredit)}.`,
        nilaiTercetak: debet, nilaiHitung: kredit,
        rekomendasi: 'Indikasi data korup atau baris terpotong saat cetak — cetak ulang dari SAKTI.',
      }))
    }
  }

  // A.7 Akun pendapatan 4xxxxx di NP Akrual = Pendapatan-LO.
  if (npAkrual.length > 0) {
    const pendapatanNp = saldoAkun(npAkrual, '4', 'kredit')
    const pendapatanLo = cari(lo, /^Jumlah Pendapatan$/i)
    cocokkan('Akun 4xxxxx (Neraca Percobaan) vs Jumlah Pendapatan-LO',
      pendapatanNp, pendapatanLo?.nilai ?? null,
      'Akun 4xxxxx', npAkrual[0]?.halaman ?? null, 'Tinggi',
      'Cocokkan mapping akun pendapatan ke Laporan Operasional.')

    // A.8 Pendapatan − Beban dari Neraca Percobaan = Surplus/Defisit-LO.
    const bebanNp = saldoAkun(npAkrual, '5', 'debet')
    cocokkan('Pendapatan − Beban (Neraca Percobaan) vs Surplus/Defisit-LO',
      pendapatanNp - bebanNp, surplusLo?.nilai ?? null,
      'Akun 4xxxxx − 5xxxxx', npAkrual[0]?.halaman ?? null, 'Tinggi',
      'Periksa akun beban yang belum termapping ke Laporan Operasional.')
  }

  // A.9 Realisasi belanja LRA = belanja bruto − pengembalian (Neraca Percobaan Kas).
  if (npKas.length > 0) {
    const belanjaNeto = saldoAkun(npKas, '5', 'debet')
    const belanjaLra = cari(lra, /^Jumlah Belanja( Negara)?\b/i)
    cocokkan('Belanja neto (Neraca Percobaan Kas) vs Realisasi Belanja LRA',
      belanjaNeto, belanjaLra?.realisasi ?? null,
      'LRA — Jumlah Belanja Negara', belanjaLra?.halaman ?? null, 'Tinggi',
      'Realisasi belanja LRA harus sama dengan belanja bruto dikurangi pengembalian belanja.')
  }

  // A.10 Pendapatan LRA (basis kas) vs Pendapatan-LO (basis akrual).
  const pendapatanLra = cari(lra, /^Jumlah Pendapatan( Negara dan Hibah)?\b/i)
  const pendapatanLoTotal = cari(lo, /^Jumlah Pendapatan$/i)
  if (ada(pendapatanLra?.realisasi) && ada(pendapatanLoTotal?.nilai)) {
    const selisih = pendapatanLra.realisasi - pendapatanLoTotal.nilai
    if (Math.abs(selisih) > ambang.selisihLraLo) {
      t.push(buat({
        kategori: 'A', severity: 'Sedang',
        pos: 'Pendapatan LRA vs Pendapatan-LO',
        halaman: pendapatanLra.halaman,
        deskripsi: `Pendapatan LRA ${rupiah(pendapatanLra.realisasi)} berbeda ${rupiah(Math.abs(selisih))} dari Pendapatan-LO ${rupiah(pendapatanLoTotal.nilai)}.`,
        nilaiTercetak: pendapatanLra.realisasi, nilaiHitung: pendapatanLoTotal.nilai,
        rekomendasi: 'Perbedaan basis kas vs akrual wajar, tetapi harus dijelaskan di CaLK.',
      }))
    }
  }

  return t
}

// ── B. Kelengkapan penjelasan CaLK ───────────────────────────────────────
/** Normalkan judul untuk pencocokan longgar antara pos laporan dan judul CaLK. */
function kunciJudul(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function analisisB(data: DataLk, ambang: Ambang): Temuan[] {
  const t: Temuan[] = []
  const { neraca, calk } = data
  const tabel = { terdaftar: data.tabelTerdaftar, muncul: data.tabelMuncul }

  const judulCalk = calk.map((s) => ({ seksi: s, kunci: kunciJudul(s.judul) }))

  // B.1 Pos Neraca bernilai ≠ 0 harus punya penjelasan di CaLK.
  for (const pos of neraca) {
    if (pos.adalahJumlah) continue
    if (!pos.nilai && !pos.nilaiLalu) continue

    const kunci = kunciJudul(pos.uraian)
    const cocok = judulCalk.find((j) => j.kunci === kunci || j.kunci.includes(kunci) || kunci.includes(j.kunci))
    if (cocok) {
      // B.2 Nilai pos harus disebut dalam narasi penjelasnya.
      const disebut = cocok.seksi.nilai.some(
        (n) => n.jenis === 'rupiah' && ada(pos.nilai) && samaDenganToleransi(n.nilai, pos.nilai, ambang.toleransiRupiah),
      )
      if (!disebut && pos.nilai) {
        t.push(buat({
          kategori: 'B', severity: 'Sedang',
          pos: `Neraca — ${pos.uraian}`, halaman: cocok.seksi.halaman,
          deskripsi: `Nilai ${rupiah(pos.nilai)} tidak disebut dalam narasi CaLK ${cocok.seksi.kode} "${cocok.seksi.judul}".`,
          nilaiTercetak: pos.nilai, nilaiHitung: null,
          rekomendasi: 'Sebutkan nilai pos secara eksplisit di narasi CaLK agar dapat ditelusuri.',
        }))
      }
      continue
    }

    t.push(buat({
      kategori: 'B', severity: 'Tinggi',
      pos: `Neraca — ${pos.uraian}`, halaman: pos.halaman,
      deskripsi: `Pos bernilai ${rupiah(pos.nilai)} (TA lalu ${rupiah(pos.nilaiLalu)}) tidak ditemukan penjelasannya di CaLK.`,
      nilaiTercetak: pos.nilai, nilaiHitung: null,
      rekomendasi: 'Tambahkan sub-bab CaLK untuk pos ini sesuai ketentuan penyajian.',
    }))
  }

  // B.3 Daftar Tabel vs tabel yang benar-benar muncul.
  for (const [nomor, judul] of tabel.terdaftar) {
    if (tabel.muncul.has(nomor)) continue
    t.push(buat({
      kategori: 'B', severity: 'Sedang',
      pos: `Tabel ${nomor}`, halaman: null,
      deskripsi: `Tabel ${nomor} "${judul}" tercantum di Daftar Tabel tetapi tidak ditemukan di badan dokumen.`,
      rekomendasi: 'Pastikan tabel tercetak atau hapus dari Daftar Tabel.',
    }))
  }
  for (const [nomor, halaman] of tabel.muncul) {
    if (tabel.terdaftar.has(nomor)) continue
    t.push(buat({
      kategori: 'B', severity: 'Info',
      pos: `Tabel ${nomor}`, halaman,
      deskripsi: `Tabel ${nomor} muncul di badan dokumen tetapi tidak terdaftar di Daftar Tabel.`,
      rekomendasi: 'Lengkapi Daftar Tabel.',
    }))
  }

  // B.4 Narasi menyatakan nihil padahal pos bernilai.
  for (const seksi of calk) {
    const nihil = KATA_NIHIL.some((k) => seksi.narasi.toLowerCase().includes(k))
    if (!nihil) continue
    const pos = neraca.find((p) => kunciJudul(p.uraian) === kunciJudul(seksi.judul))
    if (pos && pos.nilai) {
      t.push(buat({
        kategori: 'B', severity: 'Tinggi',
        pos: `CaLK ${seksi.kode} — ${seksi.judul}`, halaman: seksi.halaman,
        deskripsi: `Narasi menyatakan nihil/tidak terdapat, tetapi pos di Neraca bernilai ${rupiah(pos.nilai)}.`,
        nilaiTercetak: pos.nilai, nilaiHitung: 0,
        rekomendasi: 'Selaraskan narasi CaLK dengan nilai yang tersaji.',
      }))
    }
  }

  return t
}

// ── C. Validasi kalkulasi internal ───────────────────────────────────────
function analisisC(data: DataLk, ambang: Ambang): Temuan[] {
  const t: Temuan[] = []
  const { lra, neraca, lo, lpe, npAkrual, npKas } = data

  // C.1 Kolom kenaikan & % pada Neraca/LO/LPE.
  const empatKolom: [string, (BarisNeraca | BarisLo)[]][] = [
    ['Neraca', neraca], ['Laporan Operasional', lo], ['Laporan Perubahan Ekuitas', lpe],
  ]

  for (const [nama, baris] of empatKolom) {
    for (const r of baris) {
      if (ada(r.nilai) && ada(r.nilaiLalu) && ada(r.kenaikan)) {
        const hitung = r.nilai - r.nilaiLalu
        if (!samaDenganToleransi(r.kenaikan, hitung, ambang.toleransiRupiah)) {
          t.push(buat({
            kategori: 'C', severity: 'Tinggi',
            pos: `${nama} — ${r.uraian}`, halaman: r.halaman,
            deskripsi: `Kolom kenaikan/penurunan tercetak ${rupiah(r.kenaikan)}, hasil hitung ulang ${rupiah(hitung)}.`,
            nilaiTercetak: r.kenaikan, nilaiHitung: hitung,
            rekomendasi: 'Periksa perhitungan kolom selisih pada cetakan laporan.',
          }))
        }
      }
      if (ada(r.persen) && ada(r.kenaikan) && ada(r.nilaiLalu) && r.nilaiLalu !== 0) {
        // Penyebut memakai nilai bertanda, bukan nilai mutlak: untuk pos
        // bersaldo negatif (mis. Transaksi Antar Entitas) SAKTI menghitung
        // relatif terhadap basis negatifnya, sehingga persennya positif.
        const hitung = (r.kenaikan / r.nilaiLalu) * 100
        if (!samaDenganToleransi(r.persen, hitung, ambang.toleransiPersen)) {
          t.push(buat({
            kategori: 'C', severity: 'Sedang',
            pos: `${nama} — ${r.uraian}`, halaman: r.halaman,
            deskripsi: `Kolom % tercetak ${r.persen}%, hasil hitung ulang ${hitung.toFixed(3)}%.`,
            nilaiTercetak: r.persen, nilaiHitung: Number(hitung.toFixed(3)),
            rekomendasi: 'Periksa pembulatan atau rumus persentase pada cetakan.',
          }))
        }
      }
    }
  }

  // C.2 LRA: selisih realisasi terhadap anggaran dan % realisasi.
  for (const r of lra) {
    if (ada(r.anggaran) && ada(r.realisasi) && ada(r.selisih)) {
      const hitung = r.realisasi - r.anggaran
      if (!samaDenganToleransi(r.selisih, hitung, ambang.toleransiRupiah)) {
        t.push(buat({
          kategori: 'C', severity: 'Tinggi',
          pos: `LRA — ${r.uraian}`, halaman: r.halaman,
          deskripsi: `Kolom realisasi di atas/(bawah) anggaran tercetak ${rupiah(r.selisih)}, hitung ulang ${rupiah(hitung)}.`,
          nilaiTercetak: r.selisih, nilaiHitung: hitung,
          rekomendasi: 'Periksa perhitungan selisih anggaran pada cetakan LRA.',
        }))
      }
    }
    if (ada(r.persen) && ada(r.anggaran) && ada(r.realisasi) && r.anggaran !== 0) {
      const hitung = (r.realisasi / r.anggaran) * 100
      if (!samaDenganToleransi(r.persen, hitung, ambang.toleransiPersen)) {
        t.push(buat({
          kategori: 'C', severity: 'Sedang',
          pos: `LRA — ${r.uraian}`, halaman: r.halaman,
          deskripsi: `% realisasi tercetak ${r.persen}%, hasil hitung ulang ${hitung.toFixed(2)}%.`,
          nilaiTercetak: r.persen, nilaiHitung: Number(hitung.toFixed(2)),
          rekomendasi: 'Periksa rumus persentase realisasi pada cetakan LRA.',
        }))
      }
    }
  }

  // C.3 Total Neraca Percobaan dihitung ulang dari barisnya.
  for (const [nama, np, total] of [
    ['Akrual', npAkrual, data.totalNpAkrual], ['Kas', npKas, data.totalNpKas],
  ] as const) {
    if (np.length === 0 || !total) continue
    for (const sisi of ['debet', 'kredit'] as const) {
      const hitung = np.reduce((s, r) => s + (r[sisi] ?? 0), 0)
      const tercetak = total[sisi]
      if (!ada(tercetak) || samaDenganToleransi(tercetak, hitung, ambang.toleransiRupiah)) continue
      t.push(buat({
        kategori: 'C', severity: 'Kritikal',
        pos: `Neraca Percobaan ${nama} — JUMLAH ${sisi}`, halaman: np[0]?.halaman ?? null,
        deskripsi: `Total ${sisi} tercetak ${rupiah(tercetak)}, penjumlahan ulang baris menghasilkan ${rupiah(hitung)}.`,
        nilaiTercetak: tercetak, nilaiHitung: hitung,
        rekomendasi: 'Selisih menandakan baris akun hilang/terpotong saat cetak — cetak ulang dari SAKTI.',
      }))
    }
  }

  return t
}

// ── D. Konsistensi narasi vs angka ───────────────────────────────────────
/** Pecah narasi jadi kalimat. Titik pemisah ribuan tidak diikuti spasi+kapital. */
function keKalimat(narasi: string): string[] {
  return narasi.split(/(?<=\.)\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean)
}

function arahPertama(kalimat: string): { arah: 'naik' | 'turun'; kata: string } | null {
  const teks = kalimat.toLowerCase()
  let terbaik: { arah: 'naik' | 'turun'; kata: string; posisi: number } | null = null

  for (const [arah, daftar] of [['naik', KATA_NAIK], ['turun', KATA_TURUN]] as const) {
    for (const kata of daftar) {
      const posisi = teks.indexOf(kata)
      if (posisi < 0) continue
      if (!terbaik || posisi < terbaik.posisi) terbaik = { arah, kata, posisi }
    }
  }
  return terbaik ? { arah: terbaik.arah, kata: terbaik.kata } : null
}

type Delta = { sumber: string; uraian: string; kenaikan: number; halaman: number }

/** Cari pos di laporan yang perubahan YoY-nya sebesar `nilai`. */
function cariDelta(data: DataLk, nilai: number, toleransi: number): Delta | null {
  const sumber: [string, (BarisNeraca | BarisLo)[]][] = [
    ['Laporan Operasional', data.lo], ['Neraca', data.neraca], ['Laporan Perubahan Ekuitas', data.lpe],
  ]
  for (const [nama, baris] of sumber) {
    for (const r of baris) {
      if (!ada(r.kenaikan) || r.kenaikan === 0) continue
      if (samaDenganToleransi(Math.abs(r.kenaikan), nilai, toleransi)) {
        return { sumber: nama, uraian: r.uraian, kenaikan: r.kenaikan, halaman: r.halaman }
      }
    }
  }
  return null
}

function analisisD(data: DataLk, ambang: Ambang): Temuan[] {
  const t: Temuan[] = []

  for (const seksi of data.calk) {
    const kalimat = keKalimat(seksi.narasi)

    for (let i = 0; i < kalimat.length; i++) {
      const k = kalimat[i]
      const arah = arahPertama(k)
      if (!arah) continue

      const nilaiRupiah = [...k.matchAll(/Rp\.?\s?(\d{1,3}(?:\.\d{3})*(?:,\d+)?)/gi)]
        .map((m) => Number(m[1].replace(/\./g, '').replace(',', '.')))
        .filter((n) => Number.isFinite(n) && n > 0)
      if (nilaiRupiah.length === 0) continue

      for (const nilai of nilaiRupiah) {
        const delta = cariDelta(data, nilai, ambang.toleransiRupiah)
        if (!delta) continue

        const arahAktual = delta.kenaikan > 0 ? 'naik' : 'turun'
        if (arahAktual === arah.arah) continue

        t.push(buat({
          kategori: 'D', severity: 'Tinggi',
          pos: `CaLK ${seksi.kode} — ${seksi.judul}`, halaman: seksi.halaman,
          deskripsi:
            `Narasi menyatakan "${arah.kata}" sebesar ${rupiah(nilai)}, padahal ${delta.sumber} ` +
            `pos "${delta.uraian}" justru menunjukkan ${arahAktual === 'naik' ? 'kenaikan' : 'penurunan'} ` +
            `${rupiah(Math.abs(delta.kenaikan))} (${rupiah(delta.kenaikan)}).`,
          nilaiTercetak: arah.arah === 'naik' ? nilai : -nilai,
          nilaiHitung: delta.kenaikan,
          rekomendasi: 'Perbaiki arah perubahan pada narasi CaLK agar sesuai angka yang tersaji.',
        }))

        // Kalimat sebab berikutnya yang berlawanan arah menguatkan temuan.
        const sebab = kalimat[i + 1]
        if (sebab && /disebabkan|karena|akibat/i.test(sebab)) {
          const arahSebab = arahPertama(sebab)
          if (arahSebab && arahSebab.arah !== arah.arah) {
            t.push(buat({
              kategori: 'D', severity: 'Sedang',
              pos: `CaLK ${seksi.kode} — ${seksi.judul}`, halaman: seksi.halaman,
              deskripsi:
                `Narasi kontradiktif secara internal: klaim "${arah.kata}" tetapi alasannya ` +
                `menyebut "${arahSebab.kata}".`,
              rekomendasi: 'Selaraskan kalimat klaim dan kalimat penyebab.',
            }))
          }
        }
      }
    }
  }

  return t
}

// ── F. Anomali / red flag ────────────────────────────────────────────────
function analisisF(data: DataLk, ambang: Ambang): Temuan[] {
  const t: Temuan[] = []
  const { lra, neraca, lo, metadata } = data

  // F.1 Realisasi di atas pagu. Baris total dilewati dan pasangan angka yang
  // identik hanya dilaporkan sekali, agar satu pelampauan tidak muncul
  // berulang di baris rincian, kelompok, dan jumlahnya.
  const sudahDilapor = new Set<string>()
  for (const r of lra) {
    if (r.adalahJumlah) continue
    if (!ada(r.anggaran) || !ada(r.realisasi) || r.anggaran === 0) continue
    const persen = (r.realisasi / r.anggaran) * 100
    if (persen <= 100) continue

    const kunci = `${r.anggaran}|${r.realisasi}`
    if (sudahDilapor.has(kunci)) continue
    sudahDilapor.add(kunci)

    const pendapatan = /pendapatan/i.test(r.uraian)
    t.push(buat({
      kategori: 'F',
      severity: pendapatan ? 'Info' : 'Tinggi',
      pos: `LRA — ${r.uraian}`, halaman: r.halaman,
      deskripsi: `Realisasi ${persen.toFixed(2)}% dari pagu (${rupiah(r.realisasi)} atas pagu ${rupiah(r.anggaran)}).`,
      nilaiTercetak: r.realisasi, nilaiHitung: r.anggaran,
      rekomendasi: pendapatan
        ? 'Realisasi pendapatan di atas target umumnya wajar; pastikan estimasi telah direvisi bila perlu.'
        : 'Belanja melebihi pagu — telusuri dasar pelampauan dan revisi DIPA terkait.',
    }))
  }

  // F.2 Perubahan YoY ekstrem. Hanya pos rincian: baris total ikut bergerak
  // mengikuti komponennya, jadi melaporkannya lagi hanya menggandakan temuan.
  for (const [nama, baris] of [['Laporan Operasional', lo], ['Neraca', neraca]] as const) {
    for (const r of baris) {
      if (r.adalahJumlah) continue
      if (!ada(r.nilai) || !ada(r.nilaiLalu) || r.nilaiLalu === 0) continue
      const persen = ((r.nilai - r.nilaiLalu) / r.nilaiLalu) * 100
      if (Math.abs(persen) <= ambang.lonjakanYoY) continue
      t.push(buat({
        kategori: 'F', severity: 'Sedang',
        pos: `${nama} — ${r.uraian}`, halaman: r.halaman,
        deskripsi: `Perubahan YoY ${persen.toFixed(2)}% (dari ${rupiah(r.nilaiLalu)} menjadi ${rupiah(r.nilai)}), melampaui ambang ${ambang.lonjakanYoY}%.`,
        nilaiTercetak: r.nilai, nilaiHitung: r.nilaiLalu,
        rekomendasi: 'Pastikan perubahan signifikan sudah dijelaskan memadai di CaLK.',
      }))
    }
  }

  // F.3 Tanggal cetak lebih awal dari tanggal data.
  const urai = (s: string | null) => {
    const m = s?.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+(\d{1,2}):(\d{2})\s*([AP]M))?/i)
    if (!m) return null
    const tahun = Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])
    let jam = Number(m[4] ?? 0)
    if (m[6]?.toUpperCase() === 'PM' && jam < 12) jam += 12
    if (m[6]?.toUpperCase() === 'AM' && jam === 12) jam = 0
    return new Date(tahun, Number(m[2]) - 1, Number(m[1]), jam, Number(m[5] ?? 0))
  }
  const tData = urai(metadata.tglData)
  const tCetak = urai(metadata.tglCetak)
  if (tData && tCetak && tCetak < tData) {
    t.push(buat({
      kategori: 'F', severity: 'Sedang',
      pos: 'Metadata dokumen', halaman: null,
      deskripsi: `Tanggal cetak (${metadata.tglCetak}) lebih awal dari tanggal data (${metadata.tglData}).`,
      rekomendasi: 'Periksa waktu penarikan data dan pencetakan laporan.',
    }))
  }

  // F.4 Seluruh pos Neraca nol sementara TA lalu tidak nol.
  const aset = cari(neraca, /^JUMLAH ASET$/i)
  if (aset && aset.nilai === 0 && ada(aset.nilaiLalu) && aset.nilaiLalu !== 0) {
    t.push(buat({
      kategori: 'F', severity: 'Info',
      pos: 'Neraca — JUMLAH ASET', halaman: aset.halaman,
      deskripsi: `Seluruh aset bersaldo nol pada TA berjalan, sedangkan TA lalu ${rupiah(aset.nilaiLalu)}.`,
      nilaiTercetak: 0, nilaiHitung: aset.nilaiLalu,
      rekomendasi: 'Pastikan konsisten dengan penjelasan Transaksi Antar Entitas, bukan indikasi data hilang.',
    }))
  }

  // F.5 Persediaan di Neraca vs akun 117xxx di Neraca Percobaan.
  const persediaan = cari(neraca, /^Persediaan$/i)
  if (persediaan && data.npAkrual.length > 0) {
    const akun = saldoAkun(data.npAkrual, '117', 'debet')
    if (ada(persediaan.nilai) && !samaDenganToleransi(persediaan.nilai, akun, ambang.toleransiRupiah)) {
      t.push(buat({
        kategori: 'F', severity: 'Sedang',
        pos: 'Neraca — Persediaan', halaman: persediaan.halaman,
        deskripsi: `Persediaan di Neraca ${rupiah(persediaan.nilai)} tidak sama dengan akun 117xxx di Neraca Percobaan ${rupiah(akun)}.`,
        nilaiTercetak: persediaan.nilai, nilaiHitung: akun,
        rekomendasi: 'Cocokkan saldo persediaan dengan buku besar akrual.',
      }))
    }
  }

  return t
}

// ── G. Kepatuhan SAP/PMK (uji ringan) ────────────────────────────────────
function analisisG(data: DataLk): Temuan[] {
  const t: Temuan[] = []
  const { lo, npAkrual } = data

  // Tanpa transaksi aset tetap, ambang kapitalisasi tidak dapat diuji.
  const adaAsetTetap = npAkrual.some((r) => /^13/.test(r.kodeAkun))
  if (!adaAsetTetap) {
    t.push(buat({
      kategori: 'G', severity: 'Info',
      pos: 'Aset Tetap', halaman: null,
      deskripsi: 'Tidak terdapat akun aset tetap (13xxxx) pada Neraca Percobaan, sehingga ambang kapitalisasi dan uji penyusutan tidak dapat diuji dari dokumen ini.',
      rekomendasi: 'Uji ambang kapitalisasi memerlukan tabel mutasi aset tetap — lakukan pengujian manual bila diperlukan.',
    }))
  }

  // Beban penyusutan di LO harus punya pasangan akun penyusutan.
  const penyusutan = cari(lo, /^Beban Penyusutan dan Amortisasi$/i)
  if (penyusutan && ada(penyusutan.nilai) && penyusutan.nilai !== 0) {
    const akun = saldoAkun(npAkrual, '59', 'debet')
    if (akun === 0) {
      t.push(buat({
        kategori: 'G', severity: 'Sedang',
        pos: 'LO — Beban Penyusutan dan Amortisasi', halaman: penyusutan.halaman,
        deskripsi: `Beban penyusutan ${rupiah(penyusutan.nilai)} tersaji di LO tetapi tidak ada akun penyusutan pada Neraca Percobaan.`,
        nilaiTercetak: penyusutan.nilai, nilaiHitung: 0,
        rekomendasi: 'Periksa jurnal penyusutan pada periode berjalan.',
      }))
    }
  }

  return t
}

// ── H. Metadata & format ─────────────────────────────────────────────────
function analisisH(data: DataLk): Temuan[] {
  const t: Temuan[] = []
  const m = data.metadata

  const wajib: [string, unknown][] = [
    ['Nama satker', m.namaSatker], ['Kode satker', m.kodeSatker],
    ['Tahun anggaran', m.tahun], ['Status laporan', m.status],
    ['Tanggal data', m.tglData], ['Tanggal cetak', m.tglCetak],
    ['Penanggung jawab', m.penanggungJawab], ['NIP penanggung jawab', m.nip],
  ]
  for (const [nama, nilai] of wajib) {
    if (nilai !== null && nilai !== undefined) continue
    t.push(buat({
      kategori: 'H', severity: 'Sedang',
      pos: `Metadata — ${nama}`, halaman: null,
      deskripsi: `${nama} tidak terbaca dari dokumen.`,
      rekomendasi: 'Pastikan header/footer laporan tercetak lengkap.',
    }))
  }

  for (const [nama, nilai] of Object.entries(data.metaPerHalaman)) {
    if (nilai.length <= 1) continue
    t.push(buat({
      kategori: 'H', severity: 'Tinggi',
      pos: `Metadata — ${nama}`, halaman: null,
      deskripsi: `${nama} tidak konsisten antar halaman: ${nilai.join(' / ')}.`,
      rekomendasi: 'Seluruh halaman satu laporan harus memuat identitas dan status yang sama.',
    }))
  }

  return t
}

// ── Orkestrasi ───────────────────────────────────────────────────────────
const BOBOT: Record<Severity, number> = { Kritikal: 0, Tinggi: 1, Sedang: 2, Info: 3 }

export function jalankanAnalisis(data: DataLk, ambang: Ambang = AMBANG_BAWAAN): Temuan[] {
  const temuan = [
    ...analisisA(data, ambang),
    ...analisisB(data, ambang),
    ...analisisC(data, ambang),
    ...analisisD(data, ambang),
    ...analisisF(data, ambang),
    ...analisisG(data),
    ...analisisH(data),
  ]

  // Bagian yang gagal diparse dilaporkan sebagai temuan, bukan disembunyikan.
  for (const bagian of data.bagianTidakLengkap) {
    temuan.push(buat({
      kategori: 'H', severity: 'Tinggi',
      pos: 'Data Tidak Lengkap', halaman: null,
      deskripsi: bagian,
      rekomendasi: 'Periksa tata letak PDF; analisis pada bagian ini tidak dapat dijalankan.',
    }))
  }

  return temuan.sort((a, b) => BOBOT[a.severity] - BOBOT[b.severity] || a.kategori.localeCompare(b.kategori))
}

export function ringkasSeverity(temuan: Temuan[]): Record<Severity, number> {
  const hasil: Record<Severity, number> = { Kritikal: 0, Tinggi: 0, Sedang: 0, Info: 0 }
  for (const t of temuan) hasil[t.severity]++
  return hasil
}

export function ringkasKategori(temuan: Temuan[]): { kategori: Kategori; judul: string; jumlah: number }[] {
  return (Object.keys(JUDUL_KATEGORI) as Kategori[]).map((k) => ({
    kategori: k,
    judul: JUDUL_KATEGORI[k],
    jumlah: temuan.filter((t) => t.kategori === k).length,
  }))
}
