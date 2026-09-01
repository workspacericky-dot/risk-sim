/**
 * Ekstraksi teks PDF berbasis koordinat.
 *
 * Ekstraksi teks biasa (urutan aliran) mengacak tabel laporan SAKTI: label dan
 * angka satu baris bisa terlempar ke baris berbeda. Karena itu tiap potongan
 * teks diambil beserta koordinat tampilannya, lalu dikelompokkan ulang jadi
 * baris (klaster sumbu Y) dan kolom (posisi X).
 *
 * Dua hal yang wajib ditangani dan sudah terbukti ada di dokumen nyata:
 *   1. Halaman LRA dicetak landscape (rotate 90) — koordinat mentah harus
 *      dilewatkan matriks viewport dulu, kalau tidak baris/kolomnya tertukar.
 *   2. Nilai yang lebih lebar dari kolomnya dipecah ke baris atas/bawah
 *      ("112.5" + "2" → "112.52") — baris yatim digabung ke baris berlabel.
 *
 * Dipakai di browser (modul CA) dan di Node (script verifikasi).
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

export type ItemTeks = { x: number; y: number; lebar: number; teks: string }
export type HalamanTeks = { nomor: number; item: ItemTeks[] }

export type Sel = { x: number; lebar: number; teks: string }
export type Baris = { halaman: number; y: number; sel: Sel[] }

/** Terapkan matriks affine 6 elemen PDF: [a,b,c,d,e,f]. */
function terapkanMatriks(x: number, y: number, m: number[]): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]
}

let workerSiap = false

/**
 * Di browser worker di-resolve dari paket; di Node pdf.js otomatis memakai
 * fake worker pada thread yang sama.
 */
function siapkanWorker() {
  if (workerSiap || typeof window === 'undefined') return
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  workerSiap = true
}

/** Baca seluruh halaman PDF jadi daftar potongan teks berkoordinat tampilan. */
export async function bacaPdf(data: ArrayBuffer): Promise<HalamanTeks[]> {
  siapkanWorker()

  const tugas = pdfjs.getDocument({
    data: new Uint8Array(data),
    useSystemFonts: true,
  })
  const doc = await tugas.promise

  const halaman: HalamanTeks[] = []

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n)
    const viewport = page.getViewport({ scale: 1 })
    const konten = await page.getTextContent()

    const item: ItemTeks[] = []
    for (const it of konten.items) {
      if (!('str' in it) || it.str.trim() === '') continue
      const t = it.transform
      const [x, y] = terapkanMatriks(t[4], t[5], viewport.transform as number[])
      item.push({ x, y, lebar: it.width ?? 0, teks: it.str })
    }

    halaman.push({ nomor: n, item })
    page.cleanup()
  }

  await tugas.destroy()
  return halaman
}

/**
 * Kelompokkan potongan teks jadi baris. Toleransi 2,5pt cukup memisahkan baris
 * tabel (jarak ±10pt) tanpa memecah satu baris jadi dua karena beda baseline.
 */
export function keBaris(hal: HalamanTeks, toleransi = 2.5): Baris[] {
  const urut = [...hal.item].sort((a, b) => a.y - b.y || a.x - b.x)
  const baris: Baris[] = []

  for (const it of urut) {
    const akhir = baris[baris.length - 1]
    const sel: Sel = { x: it.x, lebar: it.lebar, teks: it.teks }
    if (akhir && Math.abs(it.y - akhir.y) <= toleransi) {
      akhir.sel.push(sel)
    } else {
      baris.push({ halaman: hal.nomor, y: it.y, sel: [sel] })
    }
  }

  for (const b of baris) b.sel.sort((a, c) => a.x - c.x)
  return baris
}

/**
 * Gabungkan sel jadi satu string, menyisipkan spasi hanya bila memang ada jarak
 * antar potongan. Penting untuk narasi CaLK: satu angka kerap dipecah jadi
 * beberapa potongan yang bersentuhan ("Rp" + ".396.599.500," + "00"), dan
 * menyambungnya dengan spasi akan merusak angka maupun kode catatan ("C.1"+".1.").
 */
export function gabungSel(sel: Sel[], jarakSpasi = 1.2): string {
  let hasil = ''
  let kanan: number | null = null

  for (const s of sel) {
    const teks = s.teks.trim()
    if (!teks) continue
    if (kanan !== null && s.x - kanan > jarakSpasi) hasil += ' '
    hasil += teks
    kanan = tepiKanan(s)
  }
  return hasil.replace(/\s+/g, ' ').trim()
}

/** Gabungkan seluruh sel sebuah baris jadi satu string. */
export function teksBaris(b: Baris): string {
  return gabungSel(b.sel)
}

/** Tepi kanan sebuah sel. Angka dicetak rata kanan, jadi ini kunci kolomnya. */
export function tepiKanan(s: Sel): number {
  return s.x + s.lebar
}

/**
 * Gabungkan baris "yatim" — baris yang seluruhnya angka, tanpa satu pun huruf —
 * ke baris berlabel terdekat secara vertikal.
 *
 * Menangani dua pola cetak SAKTI:
 *   • nilai yang lebih lebar dari kolomnya dipecah dua baris ("112.5" + "2");
 *   • baris total yang labelnya sedikit bergeser dari angkanya, mis.
 *     "JUMLAH KEWAJIBAN JANGKA PENDEK" di Neraca.
 *
 * Syarat "tanpa huruf" penting: blok tanda tangan berada di margin kanan dan
 * harus tetap berdiri sendiri agar nama & NIP penanggung jawab terbaca.
 */
export function gabungBarisYatim(baris: Baris[]): Baris[] {
  const berlabel = (b: Baris) => b.sel.some((s) => /[A-Za-z]/.test(s.teks))

  const hasil: Baris[] = []
  const yatim: { b: Baris; indeks: number }[] = []

  for (const b of baris) {
    if (berlabel(b)) hasil.push({ ...b, sel: [...b.sel] })
    else yatim.push({ b, indeks: hasil.length - 1 })
  }

  for (const { b, indeks } of yatim) {
    // Cari baris berlabel terdekat secara vertikal (bisa di atas atau di bawah).
    const kandidat = [hasil[indeks], hasil[indeks + 1]].filter(Boolean)
    if (kandidat.length === 0) continue
    const target = kandidat.reduce((a, c) => (Math.abs(c.y - b.y) < Math.abs(a.y - b.y) ? c : a))
    for (const s of b.sel) target.sel.push({ ...s, teks: s.teks })
  }

  // Urutkan ulang: sel dari baris yatim disisipkan menurut X, dan bila X-nya
  // sama persis, menurut urutan vertikal aslinya (atas lebih dulu).
  for (const b of hasil) b.sel.sort((a, c) => a.x - c.x)
  return hasil
}

/**
 * Tentukan posisi kolom angka sebuah tabel dari tepi kanan sel-sel numeriknya.
 *
 * Angka dicetak rata kanan sehingga tepi kirinya berpindah-pindah mengikuti
 * panjang angka ("0" vs "352,482,000"), tetapi tepi kanannya tetap. Kolom
 * diambil dari tepi kanan yang berulang di banyak baris, sehingga tabel dengan
 * jumlah/urutan kolom berbeda antar satker tetap terbaca tanpa hardcode.
 */
export function anchorKolom(
  baris: Baris[],
  numerik: (teks: string) => boolean,
  minKemunculan = 3,
  toleransi = 3,
): number[] {
  const klaster: { kanan: number; jumlah: number }[] = []

  for (const b of baris) {
    for (const s of b.sel) {
      if (!numerik(s.teks)) continue
      const kanan = tepiKanan(s)
      const cocok = klaster.find((k) => Math.abs(k.kanan - kanan) <= toleransi)
      if (cocok) cocok.jumlah++
      else klaster.push({ kanan, jumlah: 1 })
    }
  }

  return klaster
    .filter((k) => k.jumlah >= minKemunculan)
    .map((k) => k.kanan)
    .sort((a, b) => a - b)
}

/**
 * Ambil nilai tiap kolom untuk satu baris. Sel yang berbagi tepi kanan yang
 * sama digabung menurut urutan X — inilah yang menyatukan nilai terpotong
 * lebar kolom, mis. "112.5" + "2" → "112.52".
 */
export function nilaiKolom(
  b: Baris,
  anchor: number[],
  urai: (teks: string) => number | null,
  toleransi = 3,
): (number | null)[] {
  return anchor.map((a) => {
    const potongan = b.sel
      .filter((s) => Math.abs(tepiKanan(s) - a) <= toleransi)
      .map((s) => s.teks.trim())
    if (potongan.length === 0) return null
    return urai(potongan.join(''))
  })
}

/**
 * Teks label sebuah baris: seluruh sel di kiri kolom angka pertama.
 * `batas` biasanya anchor kolom pertama dikurangi lebar angka terpanjang.
 */
export function labelBaris(b: Baris, batas: number): string {
  return b.sel
    .filter((s) => s.x < batas)
    .map((s) => s.teks.trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}
