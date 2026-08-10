/**
 * Tahap 2 — silang SIKEP × KOMDANAS → temuan gap + estimasi rupiah potongan.
 *
 * Port dari phase2 run_full_analysis.py. Seluruh perhitungan berjalan di
 * perangkat pengguna; tidak ada data pegawai yang dikirim ke server.
 */
import type { HasilSikepBulan, HariSikep } from './parse-sikep'
import type { PegawaiKomdanas } from './parse-komdanas'
import type { InfoGrade } from './parse-rp'
import {
  HARI_DARI_INDEX, JENIS_GAP, MARK_HADIR, POTONGAN_REF, SIKEP_KE_REF,
  TARIF_TRANSPORTASI_HAKIM, isJabatanHakim, isKategoriLibur, namaBulan, tarifUangMakan,
  type JenisGap, type MarkKomdanas,
} from './konstanta'

// ── Masukan ───────────────────────────────────────────────────────────────

export type DataBulan = {
  bulan: number
  komdanas?: Record<string, PegawaiKomdanas>
  sikep?: HasilSikepBulan
  grade?: Record<string, InfoGrade>
  uangMakan?: Record<string, number>
}

export type MasukanAnalisis = {
  tahun: number
  namaSatker: string
  bulanan: DataBulan[]
  /** NIP → golongan mentah, mis. "IV/b" */
  golongan: Record<string, string>
}

// ── Keluaran ──────────────────────────────────────────────────────────────

export type Gap = {
  bulan: number
  namaBulan: string
  tanggal: string
  hari: string
  jenis: JenisGap
  kodeSikep: string
  kodePsw: string
  tidakPresensi: string
  markKomdanas: MarkKomdanas
  detailKomdanas: string
  potRemun: string
  potUangMakan: number
  nilaiGrade: number
  tarifUm: number
  rpTukin: number
  rpUm: number
}

export type PegawaiGap = { nip: string; nama: string; jabatan: string; gaps: Gap[] }

export type InfoPegawai = { nama: string; jabatan: string }

export type HasilAnalisis = {
  tahun: number
  namaSatker: string
  bulanTersedia: number[]
  pegawai: PegawaiGap[]
  infoPegawai: Record<string, InfoPegawai>
  hadirPerBulan: Record<string, Record<number, number>>
  umDibayarPerBulan: Record<number, Record<string, number>>
  gradePerBulan: Record<number, Record<string, InfoGrade>>
  golongan: Record<string, string>
  tarifUm: Record<string, number>
  total: {
    gap: number
    pegawaiBergap: number
    perJenis: Record<JenisGap, number>
    rpTukin: number
    rpUm: number
    rpTotal: number
  }
}

// ── Deteksi gap ───────────────────────────────────────────────────────────

function sikepAdaPelanggaran(rec: HariSikep): boolean {
  return (
    /^TL[1-4]/.test(rec.kode) ||
    /^PSW[1-4]/.test(rec.kodePsw) ||
    rec.tidakPresensi === 'THM' ||
    rec.tidakPresensi === 'THP' ||
    rec.kode === 'TMK'
  )
}

function sikepCutiDinas(rec: HariSikep): boolean {
  return rec.kode === 'CT' || rec.kode === 'CS' || rec.kode === 'DIS' || rec.kegiatan === 'Tidak Hadir'
}

function komdanasAdaPelanggaran(mark: MarkKomdanas): boolean {
  return mark === 'HADIR_TL' || mark === 'HADIR_PSW' || mark === 'HADIR_TLP'
    || mark === 'THM' || mark === 'THP'
}

function komdanasCutiDinas(mark: MarkKomdanas): boolean {
  return mark === 'CUTI' || mark === 'DLS' || mark === 'IZN'
}

export function deteksiGap(mark: MarkKomdanas, rec: HariSikep): JenisGap | null {
  // Hari libur nasional/cuti bersama tidak dinilai.
  if (isKategoriLibur(rec.libur)) return null

  if (sikepAdaPelanggaran(rec) && mark === 'HADIR') return 'PL'
  if (komdanasCutiDinas(mark) && !sikepCutiDinas(rec)) return 'CK'
  if (mark === 'HADIR' && sikepCutiDinas(rec)) return 'WK'
  if (komdanasAdaPelanggaran(mark) && !sikepAdaPelanggaran(rec) && !sikepCutiDinas(rec)) {
    if (rec.kegiatan === 'Work From Office') return 'TK'
  }
  return null
}

// ── Perhitungan potongan ──────────────────────────────────────────────────

/** Padanan format `%g` Python: 1.0 → "1", 1.25 → "1.25". */
function formatG(n: number): string {
  return String(Number(n.toFixed(10)))
}

/** Ambil kode mentah dari detail KOMDANAS, mis. "datang=tl1" → "tl1". */
function kodeDariDetail(detail: string, mark: MarkKomdanas): string {
  if (detail) {
    const segmen = detail.split('=')
    const potongan = (segmen[segmen.length - 1] ?? '').trim().split(/\s+/)[0] ?? ''
    if (potongan) return potongan.toLowerCase()
  }
  return mark.toLowerCase()
}

export function extractPersen(potRemun: string): number {
  const m = /^([\d.]+)%/.exec(potRemun.trim())
  return m ? parseFloat(m[1]) : 0
}

type Komponen = [string, number, number]

export function hitungPotongan(
  jenis: JenisGap,
  kodeSikep: string,
  kodePsw: string,
  tidakPresensi: string,
  markKomdanas: MarkKomdanas,
  detailKomdanas: string,
): { potRemun: string; potUangMakan: number } {
  const komponen: Komponen[] = []

  const tambahDariSikep = (kode: string) => {
    const kunci = SIKEP_KE_REF[kode.trim()]
    if (!kunci) return
    const [r, u] = POTONGAN_REF[kunci] ?? [0, 0]
    if (r > 0 || u > 0) komponen.push([kode, r, u])
  }

  if (jenis === 'PL') {
    tambahDariSikep(kodeSikep)
    tambahDariSikep(tidakPresensi)
    if (kodePsw) tambahDariSikep(kodePsw)
  } else if (jenis === 'CK') {
    const kode = kodeDariDetail(detailKomdanas, markKomdanas)
    const [r] = POTONGAN_REF[kode] ?? [0, 0]
    komponen.push([kode, r, 0])
  } else if (jenis === 'TK') {
    const kode = kodeDariDetail(detailKomdanas, markKomdanas)
    const [r, u] = POTONGAN_REF[kode] ?? [0, 0]
    komponen.push([kode, r, u])
  } else if (jenis === 'WK') {
    const kunci = SIKEP_KE_REF[kodeSikep.trim()]
    if (kunci) {
      const [r, u] = POTONGAN_REF[kunci] ?? [0, 0]
      komponen.push([kodeSikep, r, u])
    }
  }

  if (komponen.length === 0) return { potRemun: '0%', potUangMakan: 0 }

  const totalRemun = komponen.reduce((s, c) => s + c[1], 0)
  const totalUm = Math.max(...komponen.map((c) => c[2]))

  const potRemun = komponen.length > 1
    ? `${formatG(totalRemun)}% [${komponen.filter((c) => c[1] > 0).map((c) => `${formatG(c[1])}%(${c[0]})`).join('+')}]`
    : `${formatG(totalRemun)}%`

  return { potRemun, potUangMakan: totalUm }
}

/** Potongan tukin sebulan, di-cap 100% dan dikurangi restitusi TK. */
export function tukinBulananCapped(gaps: Gap[]): number {
  if (gaps.length === 0) return 0
  const nilai = gaps[0].nilaiGrade
  if (!nilai) return 0

  let positif = 0
  let negatif = 0
  for (const g of gaps) {
    const pct = extractPersen(g.potRemun)
    if (g.jenis === 'TK') negatif += pct
    else positif += pct
  }

  return Math.trunc(((Math.min(100, positif) - negatif) / 100) * nilai * 0.5)
}

// ── Analisis utama ────────────────────────────────────────────────────────

/** Urutan sesuai Python: perbandingan kode karakter atas nama huruf besar. */
function urutNama(a: string, b: string): number {
  const A = a.toUpperCase()
  const B = b.toUpperCase()
  return A < B ? -1 : A > B ? 1 : 0
}

export function jalankanAnalisis(masukan: MasukanAnalisis): HasilAnalisis {
  const { tahun, namaSatker, golongan } = masukan

  const perNip = new Map<string, PegawaiGap>()
  const infoPegawai: Record<string, InfoPegawai> = {}
  const hadirPerBulan: Record<string, Record<number, number>> = {}
  const umDibayarPerBulan: Record<number, Record<string, number>> = {}
  const gradePerBulan: Record<number, Record<string, InfoGrade>> = {}
  const bulanTersedia: number[] = []

  const tarifUm: Record<string, number> = {}
  for (const [nip, gol] of Object.entries(golongan)) tarifUm[nip] = tarifUangMakan(gol)

  const bulanUrut = [...masukan.bulanan].sort((a, b) => a.bulan - b.bulan)

  for (const data of bulanUrut) {
    const { bulan } = data
    if (data.grade) gradePerBulan[bulan] = data.grade
    if (data.uangMakan) umDibayarPerBulan[bulan] = data.uangMakan
    if (!data.komdanas) continue

    bulanTersedia.push(bulan)

    // Identitas & hitungan hari hadir diambil dari KOMDANAS lebih dulu.
    for (const emp of Object.values(data.komdanas)) {
      if (emp.nama) infoPegawai[emp.nip] = { nama: emp.nama, jabatan: emp.jabatan }
      for (const { mark } of Object.values(emp.hari)) {
        if ((MARK_HADIR as readonly string[]).includes(mark)) {
          hadirPerBulan[emp.nip] ??= {}
          hadirPerBulan[emp.nip][bulan] = (hadirPerBulan[emp.nip][bulan] ?? 0) + 1
        }
      }
    }

    if (!data.sikep) continue

    // Identitas SIKEP menimpa KOMDANAS (jabatan sudah disederhanakan di sana).
    const sikepPerNip = new Map(data.sikep.pegawai.map((p) => [p.nip, p]))
    for (const p of data.sikep.pegawai) {
      if (p.nama) infoPegawai[p.nip] = { nama: p.nama, jabatan: p.jabatan }
    }

    const gradeBulan = data.grade ?? {}

    for (const emp of Object.values(data.komdanas)) {
      const sikepEmp = sikepPerNip.get(emp.nip)
      if (!sikepEmp) continue

      for (const [hariStr, { mark, detail }] of Object.entries(emp.hari)) {
        const hariNum = Number(hariStr)
        const tanggal = `${String(hariNum).padStart(2, '0')}-${String(bulan).padStart(2, '0')}-${tahun}`
        const rec = sikepEmp.hari[tanggal]
        if (!rec) continue

        const jenis = deteksiGap(mark, rec)
        if (!jenis) continue

        let pegawai = perNip.get(emp.nip)
        if (!pegawai) {
          const info = infoPegawai[emp.nip] ?? { nama: emp.nip, jabatan: '' }
          pegawai = { nip: emp.nip, nama: info.nama, jabatan: info.jabatan, gaps: [] }
          perNip.set(emp.nip, pegawai)
        }

        const { potRemun, potUangMakan } = hitungPotongan(
          jenis, rec.kode, rec.kodePsw, rec.tidakPresensi, mark, detail,
        )
        const info = gradeBulan[emp.nip] ?? { grade: '', nilai: 0 }
        const tarif = tarifUm[emp.nip] ?? 0
        const persen = extractPersen(potRemun)
        const hakim = isJabatanHakim(pegawai.jabatan)

        let rpTukin = info.nilai > 0 && !hakim
          ? Math.trunc((persen / 100) * info.nilai * 0.5)
          : 0
        let rpUm = potUangMakan * (hakim ? tarif + TARIF_TRANSPORTASI_HAKIM : tarif)

        // TK = restitusi: potongan yang seharusnya dikembalikan ke pegawai.
        if (jenis === 'TK') {
          rpTukin = -rpTukin
          rpUm = -rpUm
        }

        const tanggalDate = new Date(Date.UTC(tahun, bulan - 1, hariNum))
        const hari = HARI_DARI_INDEX[(tanggalDate.getUTCDay() + 6) % 7] ?? ''

        pegawai.gaps.push({
          bulan, namaBulan: namaBulan(bulan), tanggal, hari, jenis,
          kodeSikep: rec.kode, kodePsw: rec.kodePsw, tidakPresensi: rec.tidakPresensi,
          markKomdanas: mark, detailKomdanas: detail,
          potRemun, potUangMakan,
          nilaiGrade: info.nilai, tarifUm: tarif,
          rpTukin, rpUm,
        })
      }
    }
  }

  const pegawai = [...perNip.values()].sort((a, b) => urutNama(a.nama, b.nama))
  for (const p of pegawai) {
    p.gaps.sort((a, b) =>
      a.bulan - b.bulan || Number(a.tanggal.slice(0, 2)) - Number(b.tanggal.slice(0, 2)))
  }

  const perJenis = Object.fromEntries(JENIS_GAP.map((j) => [j, 0])) as Record<JenisGap, number>
  let rpTukin = 0
  let rpUm = 0
  let gap = 0

  for (const p of pegawai) {
    gap += p.gaps.length
    for (const g of p.gaps) {
      perJenis[g.jenis]++
      rpUm += g.rpUm
    }
    for (const gaps of Object.values(kelompokPerBulan(p.gaps))) {
      rpTukin += tukinBulananCapped(gaps)
    }
  }

  return {
    tahun, namaSatker, bulanTersedia, pegawai, infoPegawai,
    hadirPerBulan, umDibayarPerBulan, gradePerBulan, golongan, tarifUm,
    total: {
      gap,
      pegawaiBergap: pegawai.length,
      perJenis,
      rpTukin,
      rpUm,
      rpTotal: rpTukin + rpUm,
    },
  }
}

export function kelompokPerBulan(gaps: Gap[]): Record<number, Gap[]> {
  const peta: Record<number, Gap[]> = {}
  for (const g of gaps) (peta[g.bulan] ??= []).push(g)
  return peta
}

// ── Agregasi turunan ──────────────────────────────────────────────────────

export type BarisAkumulasi = {
  nip: string
  nama: string
  golongan: string
  grade: string
  nilaiGrade: number
  jumlahGap: number
  rpTukin: number
  rpUm: number
  grandTotal: number
  hariHadir: number
  hariUmDibayar: number
  selisihHari: number
  selisihRpUm: number
}

/** Kelas jabatan terkini = bulan terakhir yang punya nilai grade. */
function gradeTerkini(nip: string, gradePerBulan: Record<number, Record<string, InfoGrade>>): InfoGrade {
  for (let m = 12; m >= 1; m--) {
    const info = gradePerBulan[m]?.[nip]
    if (info && info.nilai > 0) return info
  }
  for (let m = 12; m >= 1; m--) {
    const info = gradePerBulan[m]?.[nip]
    if (info) return info
  }
  return { grade: '', nilai: 0 }
}

export function akumulasiIndividu(hasil: HasilAnalisis): BarisAkumulasi[] {
  return hasil.pegawai.map((p) => {
    const { grade, nilai } = gradeTerkini(p.nip, hasil.gradePerBulan)
    const tarif = hasil.tarifUm[p.nip] ?? 0

    const rpTukin = Object.values(kelompokPerBulan(p.gaps))
      .reduce((s, gaps) => s + tukinBulananCapped(gaps), 0)
    const rpUm = p.gaps.reduce((s, g) => s + g.rpUm, 0)

    const hariHadir = Object.values(hasil.hadirPerBulan[p.nip] ?? {}).reduce((s, n) => s + n, 0)
    const hariUmDibayar = Object.values(hasil.umDibayarPerBulan)
      .reduce((s, perNip) => s + (perNip[p.nip] ?? 0), 0)
    const selisihHari = hariHadir - hariUmDibayar

    return {
      nip: p.nip, nama: p.nama,
      golongan: hasil.golongan[p.nip] ?? '',
      grade, nilaiGrade: nilai,
      jumlahGap: p.gaps.length,
      rpTukin, rpUm, grandTotal: rpTukin + rpUm,
      hariHadir, hariUmDibayar, selisihHari,
      selisihRpUm: selisihHari * tarif,
    }
  })
}

export type BarisAkurasiUm = {
  nip: string
  nama: string
  golongan: string
  bulan: number
  namaBulan: string
  hariHadir: number
  hariUmDibayar: number
  selisihHari: number
  tarif: number
  selisihRp: number
  keterangan: string
}

export function akurasiUangMakan(hasil: HasilAnalisis): BarisAkurasiUm[] {
  const semuaNip = new Set<string>(Object.keys(hasil.hadirPerBulan))
  for (const perNip of Object.values(hasil.umDibayarPerBulan)) {
    for (const nip of Object.keys(perNip)) semuaNip.add(nip)
  }

  const namaDari = (nip: string) =>
    hasil.pegawai.find((p) => p.nip === nip)?.nama ?? hasil.infoPegawai[nip]?.nama ?? nip

  const baris: BarisAkurasiUm[] = []

  for (const nip of [...semuaNip].sort((a, b) => urutNama(namaDari(a), namaDari(b)))) {
    const tarif = hasil.tarifUm[nip] ?? 0

    for (let m = 1; m <= 12; m++) {
      const hariHadir = hasil.hadirPerBulan[nip]?.[m] ?? 0
      const hariUmDibayar = hasil.umDibayarPerBulan[m]?.[nip] ?? 0
      if (hariHadir === 0 && hariUmDibayar === 0) continue

      const selisihHari = hariHadir - hariUmDibayar
      const keterangan = selisihHari < 0
        ? `UM dibayar ${-selisihHari} hari melebihi hadir KOMDANAS`
        : selisihHari > 0
          ? `Hadir ${selisihHari} hari tidak dicatat di UM`
          : ''

      baris.push({
        nip, nama: namaDari(nip), golongan: hasil.golongan[nip] ?? '-',
        bulan: m, namaBulan: namaBulan(m),
        hariHadir, hariUmDibayar, selisihHari, tarif,
        selisihRp: selisihHari * tarif, keterangan,
      })
    }
  }

  return baris
}

export type BarisRekapBulan = { bulan: number; namaBulan: string } & Record<JenisGap, number> & { total: number }

export function rekapPerBulan(hasil: HasilAnalisis): BarisRekapBulan[] {
  return Array.from({ length: 12 }, (_, i) => {
    const bulan = i + 1
    const hitung = Object.fromEntries(JENIS_GAP.map((j) => [j, 0])) as Record<JenisGap, number>
    for (const p of hasil.pegawai) {
      for (const g of p.gaps) if (g.bulan === bulan) hitung[g.jenis]++
    }
    const total = JENIS_GAP.reduce((s, j) => s + hitung[j], 0)
    return { bulan, namaBulan: namaBulan(bulan), ...hitung, total }
  })
}

/** Matriks pegawai × bulan × jenis gap untuk tampilan dan sheet RINGKASAN. */
export function matriksRingkasan(hasil: HasilAnalisis) {
  return hasil.pegawai.map((p) => {
    const sel: Record<number, Record<JenisGap, number>> = {}
    for (let m = 1; m <= 12; m++) {
      sel[m] = Object.fromEntries(JENIS_GAP.map((j) => [j, 0])) as Record<JenisGap, number>
    }
    for (const g of p.gaps) sel[g.bulan][g.jenis]++
    return { nip: p.nip, nama: p.nama, jabatan: p.jabatan, sel, total: p.gaps.length }
  })
}
