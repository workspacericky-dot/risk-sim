'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Trash2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { BarisPivot, NomorPerkaraMentah } from '@/lib/ca-keuangan-perkara/parse-jur'
import {
  barisAlokasiKosong, barisVariansAtkKosong, hitungAlokasi, hitungVariansAtk,
  type BarisAlokasi, type BarisVariansAtk, type HasilAlokasi, type HasilEfisiensi, type HasilVariansAtk,
  type StatusAlokasi, type StatusVarians,
} from '@/lib/ca-keuangan-perkara/efisiensi'

function rupiah(n: number): string {
  const nilai = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 }).format(Math.abs(n))
  return `${n < 0 ? '−' : ''}Rp ${nilai}`
}

function angkaId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
}

/** Hitung tahun terbanyak muncul pada daftar, dipakai sebagai default baris baru. */
function tahunDominan(daftarTahun: (number | null)[]): number | null {
  const jumlah = new Map<number, number>()
  for (const t of daftarTahun) {
    if (t === null) continue
    jumlah.set(t, (jumlah.get(t) ?? 0) + 1)
  }
  if (jumlah.size === 0) return null
  return [...jumlah.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

function petaJumlahPerTahun(daftar: { nomorPerkara: string; tahun: number | null }[]): Map<number, number> {
  const peta = new Map<number, Set<string>>()
  for (const p of daftar) {
    if (p.tahun === null) continue
    if (!peta.has(p.tahun)) peta.set(p.tahun, new Set())
    peta.get(p.tahun)!.add(p.nomorPerkara)
  }
  return new Map([...peta].map(([t, s]) => [t, s.size]))
}

const WARNA_ALOKASI: Record<StatusAlokasi, string> = {
  'Overallocated (Tarif Terlalu Mahal)': 'bg-red-50 text-red-700 border-red-200',
  'Underallocated (Tarif Terlalu Rendah)': 'bg-amber-50 text-amber-700 border-amber-200',
  'Seimbang': 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

const WARNA_VARIANS: Record<StatusVarians, string> = {
  'Unfavorable (Tidak Efisien)': 'bg-red-50 text-red-700 border-red-200',
  'Favorable (Efisien)': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Sesuai Standar': 'bg-slate-50 text-slate-700 border-slate-200',
}

// ── Input kecil bergaya seragam ──────────────────────────────────────────

function InputAngka({ value, onChange, className = '' }: { value: number; onChange: (v: number) => void; className?: string }) {
  return (
    <input
      type="number"
      value={value === 0 ? '' : value}
      onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
      placeholder="0"
      className={`w-full rounded border border-slate-200 px-1.5 py-1 text-xs text-right tabular-nums ${className}`}
    />
  )
}

function InputTahun({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
      placeholder="Tahun"
      className="w-20 rounded border border-slate-200 px-1.5 py-1 text-xs text-center"
    />
  )
}

/** Angka referensi dari data terunggah, dengan tombol untuk memakainya. */
function Referensi({ jumlah, onPakai }: { jumlah: number | undefined; onPakai: (v: number) => void }) {
  if (jumlah === undefined) return null
  return (
    <button
      type="button"
      onClick={() => onPakai(jumlah)}
      className="mt-0.5 flex items-center gap-1 text-[10px] text-sky-700 hover:underline"
      title="Isi kolom di sebelah kiri dengan angka ini"
    >
      <Info className="w-2.5 h-2.5" /> Data: {jumlah} — pakai angka ini
    </button>
  )
}

// ── Bagian 1: Alokasi Overhead ───────────────────────────────────────────

function SeksiAlokasi({
  baris, setBaris, jumlahDiterimaPerTahun,
}: {
  baris: BarisAlokasi[]
  setBaris: React.Dispatch<React.SetStateAction<BarisAlokasi[]>>
  jumlahDiterimaPerTahun: Map<number, number>
}) {
  function ubah(id: string, patch: Partial<BarisAlokasi>) {
    setBaris((lama) => lama.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }
  function tambah() {
    setBaris((lama) => [...lama, barisAlokasiKosong(angkaId(), tahunDominan(lama.map((b) => b.tahun)))])
  }
  function hapus(id: string) {
    setBaris((lama) => lama.filter((b) => b.id !== id))
  }

  const hasil: HasilAlokasi[] = baris.map(hitungAlokasi)

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">1 · Alokasi Biaya Proses (Over/Underallocated Overhead)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Tarif per perkara × jumlah perkara diterima, dibanding pengeluaran riil dari Buku Kas Umum Biaya Proses.
            Surplus besar → tarif terlalu mahal; defisit → tarif terlalu rendah.
          </p>
        </div>
        <button
          onClick={tambah}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Periode
        </button>
      </div>

      {hasil.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
          Belum ada periode — klik &quot;Tambah Periode&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-center font-semibold px-2 py-2 w-20">Tahun</th>
                <th className="text-left font-semibold px-2 py-2 w-32">Tarif / Perkara</th>
                <th className="text-left font-semibold px-2 py-2 w-40">Jumlah Perkara Diterima</th>
                <th className="text-right font-semibold px-2 py-2 w-36">Total Alokasi</th>
                <th className="text-left font-semibold px-2 py-2 w-36">Pengeluaran Riil</th>
                <th className="text-right font-semibold px-2 py-2 w-32">Selisih</th>
                <th className="text-left font-semibold px-2 py-2 w-52">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {hasil.map((h) => (
                <tr key={h.id} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-2"><InputTahun value={h.tahun} onChange={(v) => ubah(h.id, { tahun: v })} /></td>
                  <td className="px-2 py-2"><InputAngka value={h.tarifPerPerkara} onChange={(v) => ubah(h.id, { tarifPerPerkara: v })} /></td>
                  <td className="px-2 py-2">
                    <InputAngka value={h.jumlahPerkaraDiterima} onChange={(v) => ubah(h.id, { jumlahPerkaraDiterima: v })} />
                    <Referensi
                      jumlah={h.tahun !== null ? jumlahDiterimaPerTahun.get(h.tahun) : undefined}
                      onPakai={(v) => ubah(h.id, { jumlahPerkaraDiterima: v })}
                    />
                  </td>
                  <td className="px-2 py-2 text-right text-xs text-slate-700 tabular-nums pt-2.5">{rupiah(h.totalAlokasi)}</td>
                  <td className="px-2 py-2"><InputAngka value={h.pengeluaranRiil} onChange={(v) => ubah(h.id, { pengeluaranRiil: v })} /></td>
                  <td className={`px-2 py-2 text-right text-xs font-semibold tabular-nums pt-2.5 ${h.selisih > 0 ? 'text-red-700' : h.selisih < 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                    {rupiah(h.selisih)}
                  </td>
                  <td className="px-2 py-2 pt-2.5">
                    <Badge variant="outline" className={`text-[11px] ${WARNA_ALOKASI[h.status]}`}>{h.status}</Badge>
                  </td>
                  <td className="px-2 py-2 pt-2.5">
                    <button onClick={() => hapus(h.id)} className="text-slate-400 hover:text-red-600" title="Hapus baris">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Bagian 2: Varians Efisiensi ATK ──────────────────────────────────────

function SeksiVariansAtk({
  baris, setBaris, jumlahDiputusPerTahun,
}: {
  baris: BarisVariansAtk[]
  setBaris: React.Dispatch<React.SetStateAction<BarisVariansAtk[]>>
  jumlahDiputusPerTahun: Map<number, number>
}) {
  function ubah(id: string, patch: Partial<BarisVariansAtk>) {
    setBaris((lama) => lama.map((b) => (b.id === id ? { ...b, ...patch } : b)))
  }
  function tambah() {
    setBaris((lama) => [...lama, barisVariansAtkKosong(angkaId(), tahunDominan(lama.map((b) => b.tahun)))])
  }
  function hapus(id: string) {
    setBaris((lama) => lama.filter((b) => b.id !== id))
  }

  const hasil: HasilVariansAtk[] = baris.map(hitungVariansAtk)

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h4 className="text-sm font-semibold text-slate-800">2 · Varians Efisiensi Pemakaian ATK (Stock Opname)</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Pemborosan fisik, bukan besaran tarif — kuantitas ATK terpakai riil (dari stock opname) dibanding
            standar pemakaian per perkara yang diputus.
          </p>
        </div>
        <button
          onClick={tambah}
          className="inline-flex items-center gap-1.5 shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Item
        </button>
      </div>

      {hasil.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded-lg">
          Belum ada item — klik &quot;Tambah Item&quot;.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="text-center font-semibold px-2 py-2 w-20">Tahun</th>
                <th className="text-left font-semibold px-2 py-2 w-28">Nama Item</th>
                <th className="text-left font-semibold px-2 py-2 w-28">Standar / Perkara</th>
                <th className="text-left font-semibold px-2 py-2 w-40">Jumlah Perkara Diputus</th>
                <th className="text-left font-semibold px-2 py-2 w-24">Saldo Awal</th>
                <th className="text-left font-semibold px-2 py-2 w-24">Pembelian</th>
                <th className="text-left font-semibold px-2 py-2 w-28">Saldo Akhir (Opname)</th>
                <th className="text-left font-semibold px-2 py-2 w-32">Harga Standar / Unit</th>
                <th className="text-right font-semibold px-2 py-2 w-36">Varians Efisiensi</th>
                <th className="text-left font-semibold px-2 py-2 w-44">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {hasil.map((h) => (
                <tr key={h.id} className="border-t border-slate-100 align-top">
                  <td className="px-2 py-2"><InputTahun value={h.tahun} onChange={(v) => ubah(h.id, { tahun: v })} /></td>
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={h.namaItem}
                      onChange={(e) => ubah(h.id, { namaItem: e.target.value })}
                      className="w-full rounded border border-slate-200 px-1.5 py-1 text-xs"
                    />
                  </td>
                  <td className="px-2 py-2"><InputAngka value={h.standarPerPerkara} onChange={(v) => ubah(h.id, { standarPerPerkara: v })} /></td>
                  <td className="px-2 py-2">
                    <InputAngka value={h.jumlahPerkaraDiputus} onChange={(v) => ubah(h.id, { jumlahPerkaraDiputus: v })} />
                    <Referensi
                      jumlah={h.tahun !== null ? jumlahDiputusPerTahun.get(h.tahun) : undefined}
                      onPakai={(v) => ubah(h.id, { jumlahPerkaraDiputus: v })}
                    />
                  </td>
                  <td className="px-2 py-2"><InputAngka value={h.saldoAwal} onChange={(v) => ubah(h.id, { saldoAwal: v })} /></td>
                  <td className="px-2 py-2"><InputAngka value={h.pembelian} onChange={(v) => ubah(h.id, { pembelian: v })} /></td>
                  <td className="px-2 py-2"><InputAngka value={h.saldoAkhirOpname} onChange={(v) => ubah(h.id, { saldoAkhirOpname: v })} /></td>
                  <td className="px-2 py-2"><InputAngka value={h.hargaStandar} onChange={(v) => ubah(h.id, { hargaStandar: v })} /></td>
                  <td className={`px-2 py-2 text-right text-xs font-semibold tabular-nums pt-2.5 ${h.variansEfisiensi > 0 ? 'text-red-700' : h.variansEfisiensi < 0 ? 'text-emerald-700' : 'text-slate-600'}`}>
                    {rupiah(h.variansEfisiensi)}
                  </td>
                  <td className="px-2 py-2 pt-2.5">
                    <Badge variant="outline" className={`text-[11px] ${WARNA_VARIANS[h.status]}`}>{h.status}</Badge>
                  </td>
                  <td className="px-2 py-2 pt-2.5">
                    <button onClick={() => hapus(h.id)} className="text-slate-400 hover:text-red-600" title="Hapus baris">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Perakit tab ───────────────────────────────────────────────────────────

type Props = {
  semuaNomorPerkara: NomorPerkaraMentah[]
  pivotBerakhir: BarisPivot[]
  onHasilBerubah: (data: HasilEfisiensi) => void
}

export default function TabEfisiensiBiaya({ semuaNomorPerkara, pivotBerakhir, onHasilBerubah }: Props) {
  const tahunAwal = useMemo(
    () => tahunDominan([...semuaNomorPerkara.map((p) => p.tahun), ...pivotBerakhir.map((p) => p.tahun)]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const [alokasi, setAlokasi] = useState<BarisAlokasi[]>(() => [barisAlokasiKosong(angkaId(), tahunAwal)])
  const [variansAtk, setVariansAtk] = useState<BarisVariansAtk[]>(() => [barisVariansAtkKosong(angkaId(), tahunAwal)])

  const jumlahDiterimaPerTahun = useMemo(() => petaJumlahPerTahun(semuaNomorPerkara), [semuaNomorPerkara])
  const jumlahDiputusPerTahun = useMemo(() => petaJumlahPerTahun(pivotBerakhir), [pivotBerakhir])

  useEffect(() => {
    onHasilBerubah({ alokasi: alokasi.map(hitungAlokasi), variansAtk: variansAtk.map(hitungVariansAtk) })
  }, [alokasi, variansAtk, onHasilBerubah])

  return (
    <div className="space-y-8">
      <div className="flex gap-2 items-start rounded-lg border border-slate-200 bg-slate-50 p-3">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-600">
          Angka tarif, pengeluaran riil, dan stock opname ATK tidak ada di berkas jur_* yang diunggah — isi manual
          dari Buku Kas Umum Biaya Proses/SIPP. Petunjuk &quot;Data: N — pakai angka ini&quot; di bawah kolom jumlah
          perkara hanya referensi dari berkas yang sudah diunggah (bisa berbeda dari catatan resmi satker), bukan
          angka final.
        </p>
      </div>

      <SeksiAlokasi baris={alokasi} setBaris={setAlokasi} jumlahDiterimaPerTahun={jumlahDiterimaPerTahun} />
      <SeksiVariansAtk baris={variansAtk} setBaris={setVariansAtk} jumlahDiputusPerTahun={jumlahDiputusPerTahun} />
    </div>
  )
}
