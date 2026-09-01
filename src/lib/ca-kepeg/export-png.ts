/**
 * Ekspor bagan Recharts jadi berkas PNG, dijalankan sepenuhnya di browser.
 *
 * Recharts menggambar area plot sebagai SVG, tetapi legendanya dirender
 * sebagai elemen HTML di luar SVG. Rasterisasi polos karena itu akan
 * kehilangan legenda — padahal identitas seri tidak boleh bergantung pada
 * warna saja. Legenda digambar ulang ke kanvas pada posisi yang sama dengan
 * di layar, termasuk saat membungkus ke baris berikutnya.
 */

const SKALA = 2
const SISI = 20
const FONT = 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'

export type OpsiPng = {
  judul: string
  subjudul?: string
  namaBerkas: string
}

type ItemLegenda = { warna: string; label: string; x: number; y: number; tinggi: number }

/** Ukuran SVG: atribut width/height lebih andal daripada hasil pengukuran tata letak. */
function ukuranSvg(el: SVGSVGElement): { lebar: number; tinggi: number } {
  const kotak = el.getBoundingClientRect()
  return {
    lebar: Math.round(el.width?.baseVal?.value || kotak.width),
    tinggi: Math.round(el.height?.baseVal?.value || kotak.height),
  }
}

/**
 * Pilih kanvas bagan yang sebenarnya.
 *
 * Recharts memakai kelas `recharts-surface` bukan hanya untuk area plot, tapi
 * juga untuk tiap ikon 14×14 di legenda. Mengambil hasil pertama dapat
 * menghasilkan PNG seukuran ikon, karena itu ikon legenda dibuang lebih dulu
 * lalu dipilih permukaan terluas.
 */
function cariPermukaan(wadah: HTMLElement): SVGSVGElement | null {
  const kandidat = Array.from(wadah.querySelectorAll<SVGSVGElement>('svg.recharts-surface'))
    .filter((el) => !el.closest('.recharts-legend-wrapper'))

  let terpilih: SVGSVGElement | null = null
  let luasTerbesar = 0
  for (const el of kandidat) {
    const { lebar, tinggi } = ukuranSvg(el)
    if (lebar * tinggi > luasTerbesar) {
      luasTerbesar = lebar * tinggi
      terpilih = el
    }
  }
  return terpilih
}

/** Baca warna, label, dan posisi tiap item legenda relatif terhadap SVG. */
function bacaLegenda(wadah: HTMLElement, kotakSvg: DOMRect): ItemLegenda[] {
  const pembungkus = wadah.querySelector('.recharts-legend-wrapper')
  if (!pembungkus) return []

  const item: ItemLegenda[] = []
  for (const li of pembungkus.querySelectorAll('.recharts-legend-item')) {
    const kotak = li.getBoundingClientRect()
    const bentuk = li.querySelector('path, rect, line')
    const teks = li.querySelector('.recharts-legend-item-text')?.textContent ?? ''
    if (!teks) continue

    item.push({
      warna: bentuk?.getAttribute('fill') || bentuk?.getAttribute('stroke') || '#94a3b8',
      label: teks,
      x: kotak.left - kotakSvg.left,
      y: kotak.top - kotakSvg.top,
      tinggi: kotak.height,
    })
  }
  return item
}

/** SVG yang dilepas dari DOM tidak mewarisi CSS halaman — font harus disematkan. */
function svgKeDataUrl(svg: SVGSVGElement, lebar: number, tinggi: number): string {
  const klon = svg.cloneNode(true) as SVGSVGElement
  klon.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  klon.setAttribute('width', String(lebar))
  klon.setAttribute('height', String(tinggi))

  const gaya = document.createElementNS('http://www.w3.org/2000/svg', 'style')
  gaya.textContent = `text { font-family: ${FONT}; }`
  klon.insertBefore(gaya, klon.firstChild)

  const teks = new XMLSerializer().serializeToString(klon)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(teks)}`
}

function muatGambar(src: string): Promise<HTMLImageElement> {
  return new Promise((selesai, gagal) => {
    const img = new Image()
    img.onload = () => selesai(img)
    img.onerror = () => gagal(new Error('Bagan gagal dirasterisasi.'))
    img.src = src
  })
}

export async function baganKePng(wadah: HTMLElement, opsi: OpsiPng): Promise<Blob> {
  const svg = cariPermukaan(wadah)
  if (!svg) throw new Error('Bagan belum siap diekspor.')

  const { lebar, tinggi: tinggiSvg } = ukuranSvg(svg)
  // Ambang ini menjaga dari salah pilih elemen: bagan sekecil ini mustahil,
  // dan lebih baik gagal terang-terangan daripada menghasilkan PNG seukuran ikon.
  if (lebar < 120 || tinggiSvg < 120) {
    throw new Error(`Bagan belum siap diekspor (terukur ${lebar}×${tinggiSvg} px).`)
  }

  const kotakSvg = svg.getBoundingClientRect()
  const legenda = bacaLegenda(wadah, kotakSvg)
  const gambar = await muatGambar(svgKeDataUrl(svg, lebar, tinggiSvg))

  const tinggiJudul = opsi.subjudul ? 56 : 38
  const tinggiTotal = tinggiJudul + tinggiSvg + SISI

  const kanvas = document.createElement('canvas')
  const ctx = kanvas.getContext('2d')
  if (!ctx) throw new Error('Kanvas tidak tersedia di peramban ini.')

  // Ukur judul lebih dulu: bagan sempit tidak boleh memotong judulnya sendiri.
  ctx.font = `bold 15px ${FONT}`
  const lebarJudul = ctx.measureText(opsi.judul).width
  ctx.font = `12px ${FONT}`
  const lebarSubjudul = opsi.subjudul ? ctx.measureText(opsi.subjudul).width : 0
  const lebarTotal = Math.ceil(
    Math.max(lebar, lebarJudul, lebarSubjudul) + SISI * 2,
  )

  // Mengubah ukuran kanvas mereset seluruh state konteks — atur skala setelahnya.
  kanvas.width = lebarTotal * SKALA
  kanvas.height = tinggiTotal * SKALA
  ctx.scale(SKALA, SKALA)

  // Latar putih: kanvas transparan akan tampak hitam di banyak penampil gambar.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, lebarTotal, tinggiTotal)

  ctx.textBaseline = 'alphabetic'
  ctx.fillStyle = '#0f172a'
  ctx.font = `bold 15px ${FONT}`
  ctx.fillText(opsi.judul, SISI, SISI + 8)

  if (opsi.subjudul) {
    ctx.fillStyle = '#64748b'
    ctx.font = `12px ${FONT}`
    ctx.fillText(opsi.subjudul, SISI, SISI + 28)
  }

  ctx.drawImage(gambar, SISI, tinggiJudul, lebar, tinggiSvg)

  // Legenda digambar ulang ke dalam pita kosong yang sudah disediakan Recharts.
  ctx.font = `11px ${FONT}`
  ctx.textBaseline = 'middle'
  for (const item of legenda) {
    const x = SISI + item.x
    const y = tinggiJudul + item.y + item.tinggi / 2

    ctx.fillStyle = item.warna
    ctx.fillRect(x, y - 5, 10, 10)

    ctx.fillStyle = '#475569'
    ctx.fillText(item.label, x + 15, y)
  }

  return new Promise((selesai, gagal) => {
    kanvas.toBlob(
      (blob) => (blob ? selesai(blob) : gagal(new Error('PNG gagal dibuat.'))),
      'image/png',
    )
  })
}

export function namaBerkasPng(dasar: string, namaSatker: string, tahun: number): string {
  const slug = namaSatker.trim().replace(/\s+/g, '_') || 'Satker'
  return `${dasar}_${slug}_${tahun}.png`
}

export async function unduhBaganPng(wadah: HTMLElement, opsi: OpsiPng): Promise<void> {
  const blob = await baganKePng(wadah, opsi)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = opsi.namaBerkas
  a.click()
  URL.revokeObjectURL(url)
}
