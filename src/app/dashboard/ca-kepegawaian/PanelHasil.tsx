'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, Download, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  akumulasiIndividu, akurasiUangMakan, kelompokPerBulan, matriksRingkasan,
  rekapPerBulan, tukinBulananCapped, type HasilAnalisis,
} from '@/lib/ca-kepeg/analisis'
import {
  ISIAN_GAP, JENIS_GAP, LABEL_GAP, URAIAN_GAP, WARNA_GAP,
  namaBulan, type JenisGap,
} from '@/lib/ca-kepeg/konstanta'
import { ringkasSikep, pelanggaranPerPegawai, type HasilSikepBulan } from '@/lib/ca-kepeg/parse-sikep'
import { bangunWorkbook, namaBerkasEkspor } from '@/lib/ca-kepeg/export-excel'
import { BaganGapPegawai, BaganPerBulan, BaganRupiah, BaganSikep } from './Bagan'

const TAB = ['Matriks', 'Detail Gap', 'Per Bulan', 'Akumulasi & Uang Makan', 'SIKEP per Bulan'] as const
type NamaTab = typeof TAB[number]

function rupiah(n: number): string {
  const nilai = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n))
  return `${n < 0 ? '−' : ''}Rp ${nilai}`
}

/** Warna latar sel Excel (ARGB) → hex CSS. */
function keHex(argb: string): string {
  return `#${argb.slice(2)}`
}

export default function PanelHasil({
  hasil, sikepBulanan, kodeAsing,
}: {
  hasil: HasilAnalisis
  sikepBulanan: HasilSikepBulan[]
  kodeAsing: Record<string, number>
}) {
  const [tab, setTab] = useState<NamaTab>('Matriks')
  const [mengunduh, setMengunduh] = useState(false)

  async function unduh() {
    setMengunduh(true)
    try {
      const blob = await bangunWorkbook(hasil)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = namaBerkasEkspor(hasil)
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setMengunduh(false)
    }
  }

  const asing = Object.entries(kodeAsing).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-6">
      {asing.length > 0 && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 space-y-2">
          <div className="flex gap-2 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900">
                {asing.length} kode KOMDANAS tidak dikenali — hasil di bawah bisa memuat temuan palsu
              </p>
              <p className="text-xs text-amber-800">
                Kode di luar daftar 04_referensi_absensi.xlsx terbaca sebagai hadir bersih,
                sehingga dapat memunculkan gap yang sebenarnya tidak ada. Periksa dulu
                arti kode berikut sebelum memakai temuan ini.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 pl-7">
            {asing.map(([kode, jumlah]) => (
              <span key={kode} className="text-xs rounded border border-amber-300 bg-white px-2 py-1">
                <code className="font-semibold">{kode}</code> — {jumlah}×
              </span>
            ))}
          </div>
        </div>
      )}

      <RingkasanAngka hasil={hasil} onUnduh={unduh} mengunduh={mengunduh} />

      <div className="flex gap-1 border-b border-slate-200 overflow-x-auto">
        {TAB.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-colors ${
              tab === t
                ? 'border-slate-800 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Matriks' && <TabMatriks hasil={hasil} />}
      {tab === 'Detail Gap' && <TabDetail hasil={hasil} />}
      {tab === 'Per Bulan' && <TabPerBulan hasil={hasil} />}
      {tab === 'Akumulasi & Uang Makan' && <TabAkumulasi hasil={hasil} />}
      {tab === 'SIKEP per Bulan' && <TabSikep sikepBulanan={sikepBulanan} />}
    </div>
  )
}

// ── Angka utama ───────────────────────────────────────────────────────────

function RingkasanAngka({
  hasil, onUnduh, mengunduh,
}: {
  hasil: HasilAnalisis
  onUnduh: () => void
  mengunduh: boolean
}) {
  const kartu = [
    { label: 'Total Gap', nilai: String(hasil.total.gap), catatan: `${hasil.total.pegawaiBergap} pegawai terdampak` },
    { label: 'Potongan Tunj. Kinerja', nilai: rupiah(hasil.total.rpTukin), catatan: 'sudah di-cap 100%/bulan' },
    { label: 'Potongan Uang Makan', nilai: rupiah(hasil.total.rpUm), catatan: 'tarif per golongan' },
    { label: 'Grand Total', nilai: rupiah(hasil.total.rpTotal), catatan: 'estimasi seluruh temuan' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {JENIS_GAP.map((j) => (
            <span
              key={j}
              className="inline-flex items-center gap-1.5 text-xs text-slate-600 rounded-full border border-slate-200 bg-white px-2.5 py-1"
              title={URAIAN_GAP[j]}
            >
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: WARNA_GAP[j] }} />
              <span className="font-semibold text-slate-800">{j}</span>
              {hasil.total.perJenis[j]}
            </span>
          ))}
        </div>
        <Button onClick={onUnduh} disabled={mengunduh}>
          <Download className="w-4 h-4 mr-2" />
          {mengunduh ? 'Menyiapkan…' : 'Unduh Excel (6 sheet)'}
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kartu.map((k) => (
          <div key={k.label} className="rounded-xl border border-slate-200 bg-white p-4">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">{k.label}</p>
            <p className="text-xl font-bold text-slate-900 mt-1 tabular-nums">{k.nilai}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{k.catatan}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Tab: matriks ──────────────────────────────────────────────────────────

function TabMatriks({ hasil }: { hasil: HasilAnalisis }) {
  const [terbuka, setTerbuka] = useState<string | null>(null)
  const matriks = useMemo(() => matriksRingkasan(hasil), [hasil])
  const bulan = hasil.bulanTersedia

  const dataBagan = useMemo(
    () => hasil.pegawai
      .map((p) => {
        const hitung = Object.fromEntries(JENIS_GAP.map((j) => [j, 0])) as Record<JenisGap, number>
        for (const g of p.gaps) hitung[g.jenis]++
        return { nama: p.nama, ...hitung, total: p.gaps.length }
      })
      .sort((a, b) => b.total - a.total),
    [hasil],
  )

  if (matriks.length === 0) {
    return <p className="text-sm text-slate-500 py-12 text-center">Tidak ditemukan gap pada periode ini.</p>
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-800 text-white">
              <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold sticky left-0 bg-slate-800 z-10">Nama</th>
              <th rowSpan={2} className="text-left px-3 py-2 text-xs font-semibold">Jabatan</th>
              {bulan.map((m) => (
                <th key={m} colSpan={4} className="px-2 py-1.5 text-[11px] font-semibold border-l border-slate-600">
                  {namaBulan(m).slice(0, 3).toUpperCase()}
                </th>
              ))}
              <th rowSpan={2} className="px-3 py-2 text-xs font-semibold border-l border-slate-600">Total</th>
            </tr>
            <tr className="bg-slate-700 text-white">
              {bulan.flatMap((m) =>
                JENIS_GAP.map((j, i) => (
                  <th
                    key={`${m}-${j}`}
                    className={`px-1.5 py-1 text-[10px] font-semibold ${i === 0 ? 'border-l border-slate-600' : ''}`}
                    title={LABEL_GAP[j]}
                  >
                    {j}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody>
            {matriks.map((p, i) => (
              <Baris
                key={p.nip}
                p={p}
                bulan={bulan}
                selang={i % 2 === 1}
                terbuka={terbuka === p.nip}
                onKlik={() => setTerbuka(terbuka === p.nip ? null : p.nip)}
                hasil={hasil}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Kejadian Gap per Pegawai</h3>
        <p className="text-xs text-slate-500 mb-3">
          Angka persis tiap sel tersedia pada tabel matriks di atas.
        </p>
        <BaganGapPegawai data={dataBagan} />
      </div>
    </div>
  )
}

function Baris({
  p, bulan, selang, terbuka, onKlik, hasil,
}: {
  p: ReturnType<typeof matriksRingkasan>[number]
  bulan: number[]
  selang: boolean
  terbuka: boolean
  onKlik: () => void
  hasil: HasilAnalisis
}) {
  const pegawai = hasil.pegawai.find((x) => x.nip === p.nip)
  const kolom = 3 + bulan.length * 4

  return (
    <>
      <tr
        onClick={onKlik}
        className={`cursor-pointer border-t border-slate-100 ${terbuka ? 'bg-slate-100' : selang ? 'bg-slate-50/60' : 'bg-white'} hover:bg-slate-100`}
      >
        <td className={`px-3 py-1.5 text-xs font-medium text-slate-800 sticky left-0 ${terbuka ? 'bg-slate-100' : selang ? 'bg-slate-50' : 'bg-white'}`}>
          {p.nama}
        </td>
        <td className="px-3 py-1.5 text-xs text-slate-500">{p.jabatan}</td>
        {bulan.flatMap((m) =>
          JENIS_GAP.map((j, i) => {
            const v = p.sel[m][j]
            return (
              <td
                key={`${m}-${j}`}
                className={`px-1.5 py-1.5 text-center text-xs tabular-nums ${i === 0 ? 'border-l border-slate-200' : ''}`}
                style={v > 0 ? { background: keHex(ISIAN_GAP[j]), fontWeight: 600 } : undefined}
              >
                {v > 0 ? v : ''}
              </td>
            )
          }),
        )}
        <td className="px-3 py-1.5 text-center text-xs font-bold tabular-nums border-l border-slate-200">
          {p.total}
        </td>
      </tr>
      {terbuka && pegawai && (
        <tr>
          <td colSpan={kolom} className="bg-slate-50 px-4 py-3 border-t border-slate-200">
            <p className="text-xs font-semibold text-slate-700 mb-2">
              Rincian {pegawai.nama} — NIP {pegawai.nip}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {pegawai.gaps.map((g, i) => (
                <span
                  key={i}
                  className="text-[11px] rounded border border-slate-200 px-2 py-1 bg-white"
                  title={`${LABEL_GAP[g.jenis]} · KOMDANAS ${g.markKomdanas} (${g.detailKomdanas})`}
                >
                  <span className="w-2 h-2 rounded-sm inline-block mr-1.5" style={{ background: WARNA_GAP[g.jenis] }} />
                  {g.tanggal} · {g.jenis} · {g.kodeSikep || g.tidakPresensi || g.kodePsw || '—'} · {g.potRemun}
                </span>
              ))}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Tab: detail ───────────────────────────────────────────────────────────

function TabDetail({ hasil }: { hasil: HasilAnalisis }) {
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<JenisGap | 'semua'>('semua')

  const baris = useMemo(() => {
    const semua = hasil.pegawai.flatMap((p) =>
      p.gaps.map((g) => ({ nip: p.nip, nama: p.nama, jabatan: p.jabatan, ...g })),
    )
    const kunci = cari.trim().toLowerCase()
    return semua.filter((r) =>
      (saring === 'semua' || r.jenis === saring)
      && (kunci === '' || r.nama.toLowerCase().includes(kunci) || r.nip.includes(kunci)),
    )
  }, [hasil, cari, saring])

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap items-center">
        <div className="relative flex-1 min-w-56">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama atau NIP…"
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setSaring('semua')}
            className={`text-xs px-3 py-1.5 rounded-lg border ${saring === 'semua' ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            Semua ({hasil.total.gap})
          </button>
          {JENIS_GAP.map((j) => (
            <button
              key={j}
              onClick={() => setSaring(j)}
              title={URAIAN_GAP[j]}
              className={`text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${saring === j ? 'bg-slate-800 text-white border-slate-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="w-2 h-2 rounded-sm" style={{ background: WARNA_GAP[j] }} />
              {j} ({hasil.total.perJenis[j]})
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-800 text-white">
            <tr>
              {['Tanggal', 'Hari', 'Nama', 'Jabatan', 'Gap', 'Kode SIKEP', 'Mark KOMDANAS',
                '% Pot. Remun', 'Hari Pot. UM', 'Rp Tukin', 'Rp Uang Makan'].map((h) => (
                <th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((r, i) => (
              <tr key={`${r.nip}-${r.tanggal}-${i}`} className="border-t border-slate-100" style={{ background: keHex(ISIAN_GAP[r.jenis]) }}>
                <td className="px-3 py-1.5 font-mono whitespace-nowrap">{r.tanggal}</td>
                <td className="px-3 py-1.5">{r.hari}</td>
                <td className="px-3 py-1.5 font-medium text-slate-800">{r.nama}</td>
                <td className="px-3 py-1.5 text-slate-600">{r.jabatan}</td>
                <td className="px-3 py-1.5 font-semibold" title={LABEL_GAP[r.jenis]}>{r.jenis}</td>
                <td className="px-3 py-1.5">{[r.kodeSikep, r.kodePsw, r.tidakPresensi].filter(Boolean).join(' · ') || '—'}</td>
                <td className="px-3 py-1.5" title={r.detailKomdanas}>{r.markKomdanas}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{r.potRemun}</td>
                <td className="px-3 py-1.5 text-center">{r.potUangMakan || ''}</td>
                <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{r.rpTukin ? rupiah(r.rpTukin) : ''}</td>
                <td className="px-3 py-1.5 text-right tabular-nums whitespace-nowrap">{r.rpUm ? rupiah(r.rpUm) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {baris.length === 0 && (
          <p className="text-sm text-slate-500 py-8 text-center">Tidak ada baris yang cocok.</p>
        )}
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">
        Rp Tukin per baris <strong>belum di-cap</strong>; nilai kumulatif yang sudah di-cap
        100% per bulan ada di tab Akumulasi. TK bernilai negatif karena berupa
        restitusi — potongan yang seharusnya dikembalikan kepada pegawai.
      </p>
    </div>
  )
}

// ── Tab: per bulan ────────────────────────────────────────────────────────

function TabPerBulan({ hasil }: { hasil: HasilAnalisis }) {
  const rekap = useMemo(() => rekapPerBulan(hasil), [hasil])
  const terpakai = rekap.filter((b) => hasil.bulanTersedia.includes(b.bulan))

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-3">Sebaran Gap Sepanjang Tahun</h3>
        <BaganPerBulan data={rekap} />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-semibold">Bulan</th>
              {JENIS_GAP.map((j) => (
                <th key={j} className="px-3 py-2 text-xs font-semibold" title={LABEL_GAP[j]}>{j}</th>
              ))}
              <th className="px-3 py-2 text-xs font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {terpakai.map((b, i) => (
              <tr key={b.bulan} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                <td className="px-3 py-1.5 text-xs font-medium">{b.namaBulan}</td>
                {JENIS_GAP.map((j) => (
                  <td
                    key={j}
                    className="px-3 py-1.5 text-center text-xs tabular-nums"
                    style={b[j] > 0 ? { background: keHex(ISIAN_GAP[j]), fontWeight: 600 } : undefined}
                  >
                    {b[j] || ''}
                  </td>
                ))}
                <td className="px-3 py-1.5 text-center text-xs font-bold tabular-nums">{b.total || ''}</td>
              </tr>
            ))}
            <tr className="bg-slate-800 text-white">
              <td className="px-3 py-2 text-xs font-bold">TOTAL</td>
              {JENIS_GAP.map((j) => (
                <td key={j} className="px-3 py-2 text-center text-xs font-bold tabular-nums">
                  {hasil.total.perJenis[j] || ''}
                </td>
              ))}
              <td className="px-3 py-2 text-center text-xs font-bold tabular-nums">{hasil.total.gap}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Tab: akumulasi & uang makan ───────────────────────────────────────────

function TabAkumulasi({ hasil }: { hasil: HasilAnalisis }) {
  const akum = useMemo(() => akumulasiIndividu(hasil), [hasil])
  const akurasi = useMemo(() => akurasiUangMakan(hasil), [hasil])

  const dataRupiah = useMemo(
    () => hasil.pegawai
      .map((p) => {
        const tukin = Object.values(kelompokPerBulan(p.gaps))
          .reduce((s, gaps) => s + tukinBulananCapped(gaps), 0)
        const uangMakan = p.gaps.reduce((s, g) => s + g.rpUm, 0)
        return { nama: p.nama, tukin, uangMakan, total: tukin + uangMakan }
      })
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total),
    [hasil],
  )

  const menyimpang = akurasi.filter((b) => b.selisihHari !== 0)

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">Estimasi Rupiah Potongan per Pegawai</h3>
        <p className="text-xs text-slate-500 mb-3">Tunjangan kinerja sudah di-cap 100% per bulan per pegawai.</p>
        <BaganRupiah data={dataRupiah} />
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-800 mb-2">Akumulasi per Individu</h3>
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 text-white">
              <tr>
                {['Nama', 'Gol.', 'Grade', 'Nilai Grade', 'Gap', 'Rp Tukin (capped)',
                  'Rp Uang Makan', 'Grand Total', 'Hari Hadir', 'Hari UM', 'Selisih'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {akum.map((b, i) => (
                <tr key={b.nip} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{b.nama}</td>
                  <td className="px-3 py-1.5">{b.golongan || '-'}</td>
                  <td className="px-3 py-1.5">{b.grade || '9990 (Hakim)'}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.nilaiGrade ? rupiah(b.nilaiGrade) : ''}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{b.jumlahGap}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.rpTukin ? rupiah(b.rpTukin) : ''}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.rpUm ? rupiah(b.rpUm) : ''}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums font-semibold">{b.grandTotal ? rupiah(b.grandTotal) : ''}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{b.hariHadir || ''}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{b.hariUmDibayar || ''}</td>
                  <td
                    className="px-3 py-1.5 text-center tabular-nums font-semibold"
                    style={b.selisihHari !== 0
                      ? { background: b.selisihHari < 0 ? '#FADBD8' : '#D5F5E3' }
                      : undefined}
                  >
                    {b.selisihHari || ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <h3 className="text-sm font-semibold text-slate-800">Akurasi Uang Makan</h3>
          <Badge variant="secondary">{menyimpang.length} baris menyimpang dari {akurasi.length}</Badge>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white overflow-x-auto max-h-[28rem] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-800 text-white sticky top-0">
              <tr>
                {['Nama', 'Gol.', 'Bulan', 'Hari Hadir', 'Hari UM Dibayar', 'Selisih',
                  'Tarif/Hari', 'Selisih Rp', 'Keterangan'].map((h) => (
                  <th key={h} className="text-left font-semibold px-3 py-2 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {akurasi.map((b, i) => (
                <tr key={`${b.nip}-${b.bulan}`} className={`border-t border-slate-100 ${i % 2 === 1 ? 'bg-slate-50/60' : ''}`}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{b.nama}</td>
                  <td className="px-3 py-1.5">{b.golongan}</td>
                  <td className="px-3 py-1.5">{b.namaBulan}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{b.hariHadir || ''}</td>
                  <td className="px-3 py-1.5 text-center tabular-nums">{b.hariUmDibayar || ''}</td>
                  <td
                    className="px-3 py-1.5 text-center tabular-nums font-semibold"
                    style={b.selisihHari !== 0
                      ? { background: b.selisihHari < 0 ? '#FADBD8' : '#D5F5E3' }
                      : undefined}
                  >
                    {b.selisihHari || ''}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.tarif ? rupiah(b.tarif) : ''}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{b.selisihRp ? rupiah(b.selisihRp) : ''}</td>
                  <td className="px-3 py-1.5 text-slate-600">{b.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          Hijau = hari hadir melebihi hari uang makan dibayar (potensi kurang bayar).
          Merah = uang makan dibayar melebihi hari hadir (potensi lebih bayar).
        </p>
      </div>
    </div>
  )
}

// ── Tab: SIKEP per bulan ──────────────────────────────────────────────────

function TabSikep({ sikepBulanan }: { sikepBulanan: HasilSikepBulan[] }) {
  const [bulan, setBulan] = useState(sikepBulanan[0]?.bulan ?? 1)
  const terpilih = sikepBulanan.find((s) => s.bulan === bulan)

  if (sikepBulanan.length === 0) {
    return <p className="text-sm text-slate-500 py-12 text-center">Tidak ada berkas SIKEP yang diproses.</p>
  }

  const ringkasan = terpilih ? ringkasSikep(terpilih) : null
  const pelanggaran = terpilih ? pelanggaranPerPegawai(terpilih) : []

  return (
    <div className="space-y-4">
      <div className="flex gap-1.5 flex-wrap">
        {sikepBulanan.map((s) => (
          <button
            key={s.bulan}
            onClick={() => setBulan(s.bulan)}
            className={`text-xs px-3 py-1.5 rounded-lg border ${
              bulan === s.bulan
                ? 'bg-slate-800 text-white border-slate-800'
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {namaBulan(s.bulan)}
          </button>
        ))}
      </div>

      {ringkasan && (
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{ringkasan.jumlahPegawai} pegawai</Badge>
          <Badge variant="secondary">{ringkasan.jumlahBarisData} baris data</Badge>
          {Object.entries({ ...ringkasan.kode, ...ringkasan.kodePsw, ...ringkasan.tidakPresensi })
            .sort((a, b) => b[1] - a[1])
            .map(([k, v]) => (
              <Badge key={k} variant="outline">{k}: {v} hari</Badge>
            ))}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h3 className="text-sm font-semibold text-slate-800 mb-1">
          Pelanggaran Disiplin Presensi — {namaBulan(bulan)}
        </h3>
        <p className="text-xs text-slate-500 mb-3">
          Bersumber murni dari SIKEP, sebelum disilangkan dengan KOMDANAS.
        </p>
        <BaganSikep data={pelanggaran} />
      </div>
    </div>
  )
}
