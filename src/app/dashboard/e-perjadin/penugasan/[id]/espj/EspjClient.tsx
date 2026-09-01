'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Trash2, Plus, Printer, FileSpreadsheet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LABEL_KOMPONEN_BIAYA, type KomponenBiaya } from '@/lib/e-perjadin/espj'
import { kompresFoto } from '@/lib/e-perjadin/kompres-foto'
import {
  tambahBiaya, hapusBiaya, ubahAlasanBiaya, nilaiEntri, setujuiBiayaMelebihiSbm,
  setujuiDaftarPengeluaranRiil, ajukanEspj, teruskanEspj, kembalikanEspj, setujuiEspj,
  aturSelisihFinal, bayarPeserta, tutupEspj,
} from './actions'
import type { BiayaRow, RekapRow } from './page'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const KI = 'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm'
const BADGE_VERIF: Record<string, string> = {
  menunggu: 'bg-slate-100 text-slate-600', sesuai: 'bg-emerald-50 text-emerald-700',
  perbaiki: 'bg-amber-50 text-amber-700', tolak: 'bg-red-50 text-red-700',
}
const BADGE_ESPJ: Record<string, string> = {
  draf: 'bg-slate-100 text-slate-700', diajukan: 'bg-amber-50 text-amber-700',
  diverifikasi: 'bg-sky-50 text-sky-700', dikembalikan: 'bg-red-50 text-red-700',
  disetujui: 'bg-emerald-50 text-emerald-700', selesai: 'bg-emerald-100 text-emerald-800',
}

type Props = {
  penugasanId: string
  penugasanStatus: string
  espj: { id: string; status: string; siklus_revisi: number; catatan_pengembalian: string | null; daftar_pengeluaran_disetujui: boolean }
  nomorRekap: string | null
  sayaPesertaId: string | null
  bolehKetua: boolean
  isStafPpk: boolean
  isPpk: boolean
  isBendahara: boolean
  peserta: { id: string; nama: string }[]
  biaya: BiayaRow[]
  rekap: RekapRow[]
  temuan: { id: string; kode: string; keparahan: string; ringkasan: string }[]
}

export default function EspjClient(p: Props) {
  const router = useRouter()
  const [galat, setGalat] = useState<string | null>(null)
  const [pending, mulai] = useTransition()
  const editBiaya = ['draf', 'dikembalikan'].includes(p.espj.status)
  const adaTanpaBukti = p.biaya.some((b) => b.tanpa_bukti)
  const blocking = p.temuan.filter((t) => t.keparahan === 'blocking')

  function jalan(fn: () => Promise<{ error: string } | { success: true } | Record<string, unknown>>) {
    setGalat(null)
    mulai(async () => {
      const r = await fn()
      if (r && 'error' in r && typeof r.error === 'string') setGalat(r.error)
      else router.refresh()
    })
  }

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE_ESPJ[p.espj.status] ?? ''}`}>
          E-SPJ: {p.espj.status}
        </span>
        {p.espj.siklus_revisi > 0 && <span className="text-xs text-slate-500">{p.espj.siklus_revisi}× siklus revisi</span>}
        {p.nomorRekap && (
          <div className="ml-auto flex gap-2">
            <a href={`/dashboard/e-perjadin/penugasan/${p.penugasanId}/espj/cetak`} target="_blank"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
              <Printer className="w-3.5 h-3.5" /> Cetak Rekap SPJ
            </a>
            <a href={`/dashboard/e-perjadin/penugasan/${p.penugasanId}/espj/rekap.xlsx`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Excel
            </a>
            <a href={`/dashboard/e-perjadin/penugasan/${p.penugasanId}/espj/arsip.zip`}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold">
              <FileText className="w-3.5 h-3.5" /> Arsip bukti (ZIP)
            </a>
          </div>
        )}
      </div>

      {p.espj.status === 'dikembalikan' && p.espj.catatan_pengembalian && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>Dikembalikan:</strong> {p.espj.catatan_pengembalian}
        </div>
      )}

      {p.temuan.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-1.5">
          <div className="text-sm font-semibold text-amber-800 flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" /> Temuan anti-fraud terbuka</div>
          {p.temuan.map((t) => (
            <div key={t.id} className="text-xs text-slate-700"><b>{t.kode}</b> ({t.keparahan}) — {t.ringkasan}</div>
          ))}
        </div>
      )}

      {/* Biaya riil */}
      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b bg-slate-50/50 px-4 py-3 text-sm font-semibold">Biaya Riil & Bukti</div>
        <div className="p-4 space-y-4">
          {p.peserta.map((pes) => {
            const rows = p.biaya.filter((b) => b.peserta_id === pes.id)
            return (
              <div key={pes.id}>
                <div className="text-xs font-semibold text-slate-500 mb-1">{pes.nama}</div>
                {rows.length === 0 ? <div className="text-xs text-slate-400 mb-2">Belum ada entri.</div> : (
                  <div className="space-y-1.5">
                    {rows.map((b) => (
                      <BiayaItem key={b.id} b={b} penugasanId={p.penugasanId}
                        milikSaya={b.peserta_id === p.sayaPesertaId} editBiaya={editBiaya}
                        isStafPpk={p.isStafPpk && p.espj.status === 'diajukan'} isPpk={p.isPpk}
                        onDone={() => router.refresh()} />
                    ))}
                  </div>
                )}
                {p.sayaPesertaId === pes.id && editBiaya && (
                  <TambahBiayaForm penugasanId={p.penugasanId} onDone={() => router.refresh()} />
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* Daftar Pengeluaran Riil */}
      {adaTanpaBukti && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center gap-3 text-sm">
          <FileText className="w-4 h-4 text-slate-400" />
          <span>{p.biaya.filter((b) => b.tanpa_bukti).length} entri tanpa bukti — <b>Daftar Pengeluaran Riil</b>.</span>
          <a href={`/dashboard/e-perjadin/penugasan/${p.penugasanId}/espj/daftar-pengeluaran-riil`} target="_blank"
            className="text-slate-600 underline font-semibold text-xs">Lihat / cetak</a>
          {p.isPpk && !p.espj.daftar_pengeluaran_disetujui && (
            <Button size="sm" variant="outline" disabled={pending}
              onClick={() => jalan(() => setujuiDaftarPengeluaranRiil(p.penugasanId))}>Setujui Daftar</Button>
          )}
          {p.espj.daftar_pengeluaran_disetujui && <span className="text-xs text-emerald-600">disetujui PPK</span>}
        </div>
      )}

      {/* Rekap */}
      <section className="rounded-xl border border-slate-200 bg-white overflow-x-auto">
        <div className="border-b bg-slate-50/50 px-4 py-3 text-sm font-semibold">Rekap Kurang / Lebih Bayar</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-4 py-2 text-left">Peserta</th>
              <th className="px-4 py-2 text-right">Hak SBM</th>
              <th className="px-4 py-2 text-right">Biaya Riil Diakui</th>
              <th className="px-4 py-2 text-right">Uang Muka</th>
              <th className="px-4 py-2 text-right">Kurang / (Lebih) Bayar</th>
              <th className="px-4 py-2 text-left">Penyelesaian</th>
            </tr>
          </thead>
          <tbody>
            {p.rekap.map((r) => {
              const nilai = r.selisih_final ?? r.selisih
              return (
                <tr key={r.pesertaId} className="border-t">
                  <td className="px-4 py-2">{r.nama}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{rupiah(r.hak_sbm)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{rupiah(r.biaya_riil)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{rupiah(r.uang_muka)}</td>
                  <td className={`px-4 py-2 text-right font-mono text-xs font-semibold ${nilai < 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                    {nilai < 0 ? `(${rupiah(-nilai)})` : rupiah(nilai)}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {r.espjPesertaId && p.espj.status === 'disetujui' ? (
                      r.status_bayar === 'lunas' ? <span className="text-emerald-600">lunas</span>
                        : <SettlementCell rekap={r} isPpk={p.isPpk} isBendahara={p.isBendahara} onDone={() => router.refresh()} />
                    ) : r.espjPesertaId ? <span className="text-slate-400">{r.status_bayar}</span> : <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>

      {galat && <p className="text-sm text-red-600 whitespace-pre-wrap">{galat}</p>}

      {/* Aksi */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-wrap gap-2">
        {editBiaya && p.bolehKetua && (
          <Button disabled={pending} onClick={() => jalan(() => ajukanEspj(p.penugasanId))}>Ajukan E-SPJ</Button>
        )}
        {p.espj.status === 'diajukan' && p.isStafPpk && (
          <>
            <Button disabled={pending} onClick={() => jalan(() => teruskanEspj(p.penugasanId))}>Teruskan ke PPK</Button>
            <KembalikanBtn penugasanId={p.penugasanId} onDone={() => router.refresh()} />
          </>
        )}
        {p.espj.status === 'diverifikasi' && p.isPpk && (
          <>
            <Button disabled={pending || blocking.length > 0} onClick={() => jalan(() => setujuiEspj(p.penugasanId))}>
              Setujui E-SPJ
            </Button>
            {blocking.length > 0 && <span className="text-xs text-red-500 self-center">Ada temuan blocking terbuka.</span>}
            <KembalikanBtn penugasanId={p.penugasanId} onDone={() => router.refresh()} />
          </>
        )}
        {p.espj.status === 'disetujui' && p.isBendahara && (
          <Button disabled={pending} onClick={() => jalan(() => tutupEspj(p.penugasanId))}>Tutup Penyelesaian</Button>
        )}
        {p.espj.status === 'selesai' && <span className="text-sm text-emerald-700">Penyelesaian selesai — penugasan ditutup.</span>}
        {['draf', 'dikembalikan'].includes(p.espj.status) && !p.bolehKetua && (
          <span className="text-sm text-slate-500">Menunggu Ketua Tim mengajukan E-SPJ.</span>
        )}
      </div>
    </div>
  )
}

function BiayaItem({
  b, penugasanId, milikSaya, editBiaya, isStafPpk, isPpk, onDone,
}: {
  b: BiayaRow; penugasanId: string; milikSaya: boolean; editBiaya: boolean; isStafPpk: boolean; isPpk: boolean; onDone: () => void
}) {
  const [alasan, setAlasan] = useState(b.alasan_pelaksana ?? '')
  const [catatan, setCatatan] = useState(b.catatan_verifikasi ?? '')
  const [busy, setBusy] = useState(false)

  return (
    <div className="rounded-lg border border-slate-200 p-2.5 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{LABEL_KOMPONEN_BIAYA[b.komponen as KomponenBiaya]}</span>
        <span className="text-slate-500 text-xs">{b.uraian}</span>
        {b.tanpa_bukti && <span className="text-[10px] rounded bg-slate-100 px-1.5 py-0.5">tanpa bukti</span>}
        <span className={`ml-auto text-[11px] rounded px-1.5 py-0.5 ${BADGE_VERIF[b.status_verifikasi]}`}>{b.status_verifikasi}</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-600 font-mono">
        <span>diajukan {rupiah(b.jumlah_diajukan)}</span>
        <span>diakui {rupiah(b.jumlah_diakui)}</span>
        {b.melebihi_sbm && <span className="text-amber-700">melebihi SBM (batas {rupiah(b.batas_sbm ?? 0)})</span>}
        {b.disetujui_ppk && <span className="text-emerald-700">pengakuan di atas SBM disetujui</span>}
      </div>
      {b.catatan_verifikasi && <div className="mt-1 text-xs text-slate-500">Catatan verifikator: {b.catatan_verifikasi}</div>}

      {milikSaya && editBiaya && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {b.melebihi_sbm && !b.disetujui_ppk && (
            <>
              <input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan klaim di atas SBM"
                className="h-7 rounded border border-slate-200 px-2 text-xs flex-1 min-w-[180px]" />
              <button className="text-xs font-semibold text-slate-600" disabled={busy}
                onClick={async () => { setBusy(true); await ubahAlasanBiaya(penugasanId, b.id, alasan); setBusy(false); onDone() }}>simpan alasan</button>
            </>
          )}
          <button className="text-xs text-red-500 inline-flex items-center gap-1" disabled={busy}
            onClick={async () => { if (!confirm('Hapus entri?')) return; setBusy(true); await hapusBiaya(penugasanId, b.id); setBusy(false); onDone() }}>
            <Trash2 className="w-3 h-3" /> hapus
          </button>
        </div>
      )}

      {isPpk && b.melebihi_sbm && b.alasan_pelaksana && !b.disetujui_ppk && (
        <div className="mt-2 text-xs">
          <span className="text-slate-500">Alasan pelaksana: {b.alasan_pelaksana}</span>
          <button className="ml-2 font-semibold text-emerald-700" disabled={busy}
            onClick={async () => { setBusy(true); await setujuiBiayaMelebihiSbm(penugasanId, b.id); setBusy(false); onDone() }}>
            setujui pengakuan penuh
          </button>
        </div>
      )}

      {isStafPpk && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="catatan (opsional)"
            className="h-7 rounded border border-slate-200 px-2 text-xs flex-1 min-w-[160px]" />
          {(['sesuai', 'perbaiki', 'tolak'] as const).map((s) => (
            <button key={s} disabled={busy}
              onClick={async () => {
                setBusy(true)
                const fd = new FormData(); fd.set('status', s); fd.set('catatan', catatan)
                await nilaiEntri(penugasanId, b.id, fd); setBusy(false); onDone()
              }}
              className={`text-xs font-semibold rounded px-2 py-1 ${BADGE_VERIF[s]}`}>{s}</button>
          ))}
        </div>
      )}
    </div>
  )
}

function TambahBiayaForm({ penugasanId, onDone }: { penugasanId: string; onDone: () => void }) {
  const [buka, setBuka] = useState(false)
  const [tanpaBukti, setTanpaBukti] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (!buka) return (
    <button onClick={() => setBuka(true)} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-slate-600">
      <Plus className="w-3.5 h-3.5" /> Tambah biaya
    </button>
  )

  return (
    <form className="mt-2 rounded-lg border border-slate-300 p-3 space-y-2"
      action={async (fd) => {
        setBusy(true); setMsg(null)
        if (!tanpaBukti && file) fd.set('bukti', file)
        fd.set('tanpa_bukti', String(tanpaBukti))
        const r = await tambahBiaya(penugasanId, fd)
        setBusy(false)
        if ('error' in r) { setMsg(r.error); return }
        if (r.melebihiSbm) setMsg('Tersimpan — melebihi SBM, jumlah diakui dipotong ke batas.')
        if (r.buktiGanda) setMsg('Peringatan: bukti dengan hash identik sudah dipakai (verifikasi ditahan).')
        setBuka(false); setFile(null); setTanpaBukti(false); onDone()
      }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select name="komponen" required defaultValue="transport" className={KI}>
          {(Object.keys(LABEL_KOMPONEN_BIAYA) as KomponenBiaya[]).map((k) => (
            <option key={k} value={k}>{LABEL_KOMPONEN_BIAYA[k]}</option>
          ))}
        </select>
        <input name="tanggal" type="date" className={KI} />
      </div>
      <input name="uraian" required placeholder="Uraian (mis. Tiket pesawat CGK–UPG)" className={KI} />
      <input name="jumlah_diajukan" type="number" min={0} required placeholder="Jumlah (Rp)" className={KI} />
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input type="checkbox" checked={tanpaBukti} onChange={(e) => setTanpaBukti(e.target.checked)} />
        Bukti tidak diperoleh (masuk Daftar Pengeluaran Riil)
      </label>
      {!tanpaBukti && (
        <input type="file" accept="image/*,application/pdf" className="text-xs"
          onChange={async (e) => {
            const f = e.target.files?.[0]
            if (!f) return
            setFile(f.type === 'application/pdf' ? f : new File([await kompresFoto(f)], 'bukti.jpg', { type: 'image/jpeg' }))
          }} />
      )}
      {msg && <p className="text-xs text-amber-700">{msg}</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan'}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
      </div>
    </form>
  )
}

function KembalikanBtn({ penugasanId, onDone }: { penugasanId: string; onDone: () => void }) {
  const [buka, setBuka] = useState(false)
  const [catatan, setCatatan] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  if (!buka) return <Button variant="outline" onClick={() => setBuka(true)}>Kembalikan</Button>
  return (
    <div className="flex flex-col gap-1 w-full max-w-md">
      <textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} rows={2}
        placeholder="Catatan pengembalian — seluruh temuan sekaligus (dikembalikan utuh sekali)"
        className="w-full rounded-md border border-input px-3 py-2 text-sm" />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={busy || !catatan.trim()}
          onClick={async () => {
            setBusy(true); setErr(null)
            const fd = new FormData(); fd.set('catatan', catatan)
            const r = await kembalikanEspj(penugasanId, fd)
            setBusy(false)
            if ('error' in r) setErr(r.error); else onDone()
          }}>Konfirmasi</Button>
        <Button size="sm" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
      </div>
    </div>
  )
}

function SettlementCell({
  rekap, isPpk, isBendahara, onDone,
}: {
  rekap: RekapRow; isPpk: boolean; isBendahara: boolean; onDone: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [override, setOverride] = useState(String(rekap.selisih_final ?? rekap.selisih))
  if (!rekap.espjPesertaId) return null

  return (
    <div className="space-y-1">
      {isPpk && (
        <div className="flex items-center gap-1">
          <input value={override} onChange={(e) => setOverride(e.target.value)} type="number"
            className="h-6 w-28 rounded border border-slate-200 px-1 text-xs font-mono" />
          <button className="text-[11px] font-semibold text-slate-600" disabled={busy}
            onClick={async () => { setBusy(true); await aturSelisihFinal(rekap.espjPesertaId!, Number(override)); setBusy(false); onDone() }}>
            set selisih
          </button>
        </div>
      )}
      {isBendahara && (
        <form className="flex flex-wrap items-center gap-1"
          action={async (fd) => { setBusy(true); await bayarPeserta(rekap.espjPesertaId!, fd); setBusy(false); onDone() }}>
          <input name="tanggal_bayar" type="date" required className="h-6 rounded border border-slate-200 px-1 text-xs" />
          <input name="catatan_bayar" placeholder="catatan" className="h-6 w-24 rounded border border-slate-200 px-1 text-xs" />
          <input name="bukti" type="file" accept="image/*,application/pdf" className="text-[10px] w-28" />
          <button className="text-[11px] font-semibold text-emerald-700" disabled={busy}>catat lunas</button>
        </form>
      )}
    </div>
  )
}
