'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { KATEGORI_PELAKSANA, LABEL_KATEGORI, PENGINAPAN_MODE, LABEL_PENGINAPAN_MODE } from '@/lib/e-perjadin/konstanta'
import type { SnapshotBaru, PerubahanPeserta } from '@/lib/e-perjadin/revisi'
import { simpanRevisi, ajukanRevisi, batalkanRevisi } from './actions'

const KI = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm'

type PesertaAktif = { id: string; nama: string; peran_tim: string }
type Pegawai = { nip: string; nama: string; jabatan: string | null; kategori: string; userId: string | null }

export default function RevisiForm({
  penugasanId, awalBerangkat, awalKembali, pesertaAktif, pegawai, ruteOpsi, luarKota, snapshot,
}: {
  penugasanId: string
  awalBerangkat: string
  awalKembali: string
  pesertaAktif: PesertaAktif[]
  pegawai: Pegawai[]
  ruteOpsi: string[]
  luarKota: boolean
  snapshot: SnapshotBaru
}) {
  const router = useRouter()
  const [berangkat, setBerangkat] = useState(snapshot.header.tanggal_berangkat ?? awalBerangkat)
  const [kembali, setKembali] = useState(snapshot.header.tanggal_kembali ?? awalKembali)
  const tarikAwal = new Map(snapshot.peserta.filter((p): p is Extract<PerubahanPeserta, { aksi: 'tarik' }> => p.aksi === 'tarik').map((p) => [p.peserta_id, p.alasan]))
  const [tarik, setTarik] = useState<Map<string, string>>(tarikAwal)
  const [tambah, setTambah] = useState<Extract<PerubahanPeserta, { aksi: 'tambah' }>[]>(
    snapshot.peserta.filter((p): p is Extract<PerubahanPeserta, { aksi: 'tambah' }> => p.aksi === 'tambah'))
  const [pesan, setPesan] = useState<string | null>(null)
  const [pending, mulai] = useTransition()

  function bangunSnapshot(): SnapshotBaru {
    const header: SnapshotBaru['header'] = {}
    if (berangkat !== awalBerangkat) header.tanggal_berangkat = berangkat
    if (kembali !== awalKembali) header.tanggal_kembali = kembali
    const peserta: PerubahanPeserta[] = [
      ...[...tarik.entries()].map(([peserta_id, alasan]) => {
        const p = pesertaAktif.find((x) => x.id === peserta_id)
        return { aksi: 'tarik' as const, peserta_id, nama: p?.nama ?? '', alasan }
      }),
      ...tambah,
    ]
    return { header, peserta }
  }

  function simpan() {
    setPesan(null)
    mulai(async () => {
      const r = await simpanRevisi(penugasanId, bangunSnapshot())
      if ('error' in r) setPesan(r.error); else { setPesan('Tersimpan.'); router.refresh() }
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold">Tanggal</div>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs text-slate-500">Berangkat
            <Input type="date" value={berangkat} onChange={(e) => setBerangkat(e.target.value)} />
          </label>
          <label className="text-xs text-slate-500">Kembali
            <Input type="date" value={kembali} onChange={(e) => setKembali(e.target.value)} />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="text-sm font-semibold">Tim saat ini — tarik anggota bila perlu</div>
        {pesertaAktif.map((p) => {
          const ditarik = tarik.has(p.id)
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2 text-sm border-b last:border-0 pb-2 last:pb-0">
              <span className={ditarik ? 'line-through text-slate-400' : ''}>{p.nama} · {p.peran_tim}</span>
              {ditarik ? (
                <>
                  <input placeholder="alasan penarikan" value={tarik.get(p.id) ?? ''}
                    onChange={(e) => setTarik(new Map(tarik).set(p.id, e.target.value))}
                    className="h-7 flex-1 min-w-[160px] rounded border border-slate-200 px-2 text-xs" />
                  <button className="text-xs font-semibold text-slate-500" onClick={() => { const m = new Map(tarik); m.delete(p.id); setTarik(m) }}>batal</button>
                </>
              ) : (
                <button className="text-xs font-semibold text-red-500" onClick={() => setTarik(new Map(tarik).set(p.id, ''))}>tarik</button>
              )}
            </div>
          )
        })}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
        <div className="text-sm font-semibold">Tambah anggota ({tambah.length})</div>
        {tambah.map((t, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span>{t.nama} · {t.peran_tim} · Kat.{t.kategori}</span>
            <button className="text-xs text-red-500" onClick={() => setTambah(tambah.filter((_, j) => j !== i))}>hapus</button>
          </div>
        ))}
        <TambahBaris pegawai={pegawai} ruteOpsi={ruteOpsi} luarKota={luarKota}
          onTambah={(p) => setTambah([...tambah, p])} />
      </section>

      {pesan && <p className="text-sm text-slate-600">{pesan}</p>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={simpan} disabled={pending} variant="outline">Simpan draf revisi</Button>
        <Button disabled={pending} onClick={() => mulai(async () => {
          const s = await simpanRevisi(penugasanId, bangunSnapshot())
          if ('error' in s) { setPesan(s.error); return }
          const r = await ajukanRevisi(penugasanId)
          if ('error' in r) setPesan(r.error); else router.refresh()
        })}>Ajukan Revisi ke Pemberi Tugas</Button>
        <Button variant="ghost" disabled={pending} onClick={() => {
          if (!confirm('Batalkan revisi ini?')) return
          mulai(async () => { await batalkanRevisi(penugasanId); router.refresh() })
        }}>Batalkan Revisi</Button>
      </div>
    </div>
  )
}

function TambahBaris({
  pegawai, ruteOpsi, luarKota, onTambah,
}: {
  pegawai: Pegawai[]
  ruteOpsi: string[]
  luarKota: boolean
  onTambah: (p: Extract<PerubahanPeserta, { aksi: 'tambah' }>) => void
}) {
  const [nipSel, setNipSel] = useState('')
  const [peran, setPeran] = useState('Anggota Tim')
  const [kategori, setKategori] = useState('1')
  const [mode, setMode] = useState('hotel')
  const [rute, setRute] = useState('-')
  const [pesawat, setPesawat] = useState('0')
  const [dpr, setDpr] = useState('')
  const [homebase, setHomebase] = useState(false)
  const [repres, setRepres] = useState(false)
  const [transRiil, setTransRiil] = useState(false)
  const [kendaraanDinas, setKendaraanDinas] = useState(false)
  const sel = pegawai.find((p) => p.nip === nipSel)

  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg border border-dashed border-slate-300 p-3">
      <select value={nipSel} onChange={(e) => { setNipSel(e.target.value); const s = pegawai.find((p) => p.nip === e.target.value); if (s) setKategori(s.kategori) }} className={`${KI} col-span-2`}>
        <option value="">— pilih pegawai —</option>
        {pegawai.map((p) => <option key={p.nip} value={p.nip}>{p.nama}{p.jabatan ? ` — ${p.jabatan}` : ''}{p.userId ? '' : ' · tanpa akun'}</option>)}
      </select>
      <select value={peran} onChange={(e) => setPeran(e.target.value)} className={KI}>
        {['Pengendali Mutu', 'Pengendali Teknis', 'Ketua Tim', 'Anggota Tim'].map((r) => <option key={r}>{r}</option>)}
      </select>
      <select value={kategori} onChange={(e) => setKategori(e.target.value)} className={KI}>
        {KATEGORI_PELAKSANA.map((k) => <option key={k} value={k}>{LABEL_KATEGORI[k]}</option>)}
      </select>
      <select value={mode} onChange={(e) => setMode(e.target.value)} className={KI}>
        {PENGINAPAN_MODE.map((m) => <option key={m} value={m}>{LABEL_PENGINAPAN_MODE[m]}</option>)}
      </select>
      {luarKota && (
        <select value={rute} onChange={(e) => setRute(e.target.value)} className={KI}>
          {ruteOpsi.map((r) => <option key={r} value={r}>{r === '-' ? 'Rute utama' : r}</option>)}
        </select>
      )}
      {luarKota && <Input type="number" min={0} value={pesawat} onChange={(e) => setPesawat(e.target.value)} placeholder="estimasi pesawat" />}
      {luarKota && <Input type="number" min={0} value={dpr} onChange={(e) => setDpr(e.target.value)} placeholder="estimasi DPR" />}
      <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={homebase} onChange={(e) => setHomebase(e.target.checked)} /> Homebase Jabodetabek
      </label>
      <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={repres} onChange={(e) => setRepres(e.target.checked)} /> Berhak uang representasi luar kota
      </label>
      <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={transRiil} onChange={(e) => setTransRiil(e.target.checked)} /> Transport lokal riil / &gt;1 obrik (harian 60%)
      </label>
      <label className="col-span-2 flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={kendaraanDinas} onChange={(e) => setKendaraanDinas(e.target.checked)} /> Pakai kendaraan dinas (tanpa transport lokal)
      </label>
      <Button type="button" size="sm" className="col-span-2" disabled={!sel}
        onClick={() => {
          if (!sel) return
          onTambah({
            aksi: 'tambah', nama: sel.nama, nip: sel.nip, jabatan: sel.jabatan, peran_tim: peran,
            kategori, penginapan_mode: mode, homebase_jabodetabek: homebase,
            berhak_representasi: repres, transport_lokal_riil: transRiil, pakai_kendaraan_dinas: kendaraanDinas,
            estimasi_pesawat: Number(pesawat) || 0, estimasi_dpr: Number(dpr) || 0, rute_pesawat: rute,
          })
          setNipSel('')
        }}>Tambahkan ke daftar</Button>
    </div>
  )
}
