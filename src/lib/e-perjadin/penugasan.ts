/**
 * E-Perjadin Bawas — logika murni perencanaan & komitmen (M1).
 * Anti-Fraud Engine: AF-1 (tumpang tindih), AF-2 (anti-backdate / H+30), AF-6 (pagu).
 */

export type HasilCek = { ok: true } | { ok: false; error: string }
export type RentangTanggal = { berangkat: string; kembali: string } // 'YYYY-MM-DD'

const HARI_MS = 24 * 60 * 60 * 1000

function parseTgl(iso: string): number {
  const t = Date.parse(`${iso}T00:00:00Z`)
  if (Number.isNaN(t)) throw new Error(`Tanggal tidak sah: ${iso}`)
  return t
}

export function tambahHari(iso: string, n: number): string {
  return new Date(parseTgl(iso) + n * HARI_MS).toISOString().slice(0, 10)
}

const rupiah = (n: number) => 'Rp ' + Math.round(n).toLocaleString('id-ID')

// ── AF-1: Penugasan beririsan (NIP × tanggal) ───────────────────────────
export function rentangBeririsan(a: RentangTanggal, b: RentangTanggal): boolean {
  return parseTgl(a.berangkat) <= parseTgl(b.kembali) && parseTgl(b.berangkat) <= parseTgl(a.kembali)
}

export type KonflikKandidat = {
  namaPeserta: string
  nomorPenugasan: string | null
  berangkat: string
  kembali: string
}

/**
 * `kandidat` = penugasan lain berstatus Berjalan/Selesai yang memuat salah satu
 * peserta kita (sudah difilter di sisi pemanggil). Blok keras bila ada irisan.
 */
export function cekTumpangTindih(rentang: RentangTanggal, kandidat: readonly KonflikKandidat[]): HasilCek {
  const bentrok = kandidat.filter((k) => rentangBeririsan(rentang, k))
  if (bentrok.length === 0) return { ok: true }
  const rincian = bentrok
    .map((k) => `${k.namaPeserta}: bentrok dengan ST ${k.nomorPenugasan ?? '(tanpa nomor)'} (${k.berangkat} s.d. ${k.kembali})`)
    .join('; ')
  return { ok: false, error: `Penugasan beririsan terdeteksi — ${rincian}.` }
}

// ── AF-2: Anti-backdate (Non-Rampung) & batas H+30 (Rampung) ────────────
export function cekAntiBackdate(
  alur: 'Non-Rampung' | 'Rampung',
  rentang: RentangTanggal,
  hariIni: string = new Date().toISOString().slice(0, 10),
): HasilCek {
  if (alur === 'Non-Rampung') {
    if (parseTgl(rentang.berangkat) < parseTgl(hariIni)) {
      return { ok: false, error: `Alur Non-Rampung tidak dapat dibuat setelah tanggal berangkat (${rentang.berangkat}) terlewati.` }
    }
    return { ok: true }
  }
  // Rampung: perekaman dibatasi H+30 sejak tanggal berakhir kegiatan.
  const batas = tambahHari(rentang.kembali, 30)
  if (parseTgl(hariIni) > parseTgl(batas)) {
    const lewat = Math.round((parseTgl(hariIni) - parseTgl(batas)) / HARI_MS)
    return { ok: false, error: `Alur Rampung dibatasi H+30 sejak kegiatan berakhir (${rentang.kembali}); sudah lewat ${lewat} hari.` }
  }
  return { ok: true }
}

// ── AF-6: Komitmen melampaui pagu tersedia ──────────────────────────────
export function cekPagu(estimasiTotal: number, paguTersedia: number): HasilCek {
  if (estimasiTotal > paguTersedia) {
    return {
      ok: false,
      error: `Estimasi biaya ${rupiah(estimasiTotal)} melampaui pagu tersedia ${rupiah(paguTersedia)} (selisih ${rupiah(estimasiTotal - paguTersedia)}).`,
    }
  }
  return { ok: true }
}

// ── Saldo pagu: pagu − terpesan − terealisasi = tersedia (F-1.3) ────────
export type BarisKomitmen = { jenis: 'pesan' | 'lepas'; jumlah: number }
export type SaldoPagu = { pagu: number; terpesan: number; terealisasi: number; tersedia: number }

export function hitungSaldoPagu(pagu: number, komitmen: readonly BarisKomitmen[]): SaldoPagu {
  const terpesan = Math.max(
    0,
    komitmen.reduce((s, k) => s + (k.jenis === 'pesan' ? k.jumlah : -k.jumlah), 0),
  )
  const terealisasi = 0 // diisi dari E-SPJ mulai M4
  return { pagu, terpesan, terealisasi, tersedia: pagu - terpesan - terealisasi }
}

// ── Alokasi komitmen ke beberapa mata anggaran (isi berurutan) ──────────
export type PaguTersedia = { paguId: string; tersedia: number }
export type AlokasiKomitmen = { paguId: string; jumlah: number }

export function alokasiKomitmen(total: number, daftar: readonly PaguTersedia[]): AlokasiKomitmen[] {
  let sisa = Math.round(total)
  const hasil: AlokasiKomitmen[] = []
  for (const p of daftar) {
    if (sisa <= 0) break
    const ambil = Math.min(sisa, Math.max(0, Math.round(p.tersedia)))
    if (ambil > 0) {
      hasil.push({ paguId: p.paguId, jumlah: ambil })
      sisa -= ambil
    }
  }
  if (sisa > 0) throw new Error(`Pagu tersedia tidak cukup untuk mengalokasikan sisa ${rupiah(sisa)}.`)
  return hasil
}

// ── Penomoran dokumen (F-1.4, F-4.3) ──────────────────────────────────
// ponytail: format ringkas; sesuaikan tata naskah dinas bila stakeholder minta.
export function formatNomor(jenis: string, seq: number, tahun: number): string {
  return `${seq}/${jenis}/BAWAS/${tahun}`
}
