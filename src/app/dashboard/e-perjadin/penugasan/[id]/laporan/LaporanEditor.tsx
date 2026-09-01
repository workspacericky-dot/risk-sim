'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Clock, History, Lock, Printer, FileText, CircleCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SEGMEN, JUDUL_SEGMEN, segmenTerkunci } from '@/lib/e-perjadin/laporan'
import {
  simpanSegmen, tugaskanSegmen, finalkanLaporan, batalFinal, tandaiDiteruskan, ambilRiwayat, pulihkanVersi,
} from './actions'
import type { SegmenRow } from './page'

const jam = (iso: string) => new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
const lsKey = (segId: string) => `perjadin_lap_seg_${segId}`

/** Draf lokal (localStorage) lebih baru dari versi server → pakai itu (F-4.1). */
function bacaDrafAwal(seg: SegmenRow): { isi: string; dari: boolean } {
  try {
    const raw = localStorage.getItem(lsKey(seg.id))
    if (raw) {
      const { isi, ts } = JSON.parse(raw) as { isi: string; ts: number }
      if (isi !== seg.isi && ts > Date.parse(seg.updated_at)) return { isi, dari: true }
    }
  } catch { /* abaikan */ }
  return { isi: seg.isi, dari: false }
}

export default function LaporanEditor({
  penugasanId, laporanStatus, diteruskanPada, nomorDokumen, sayaUserId, bolehSunting, bolehKetua, anggota, segmen,
}: {
  penugasanId: string
  laporanStatus: string
  diteruskanPada: string | null
  nomorDokumen: string | null
  sayaUserId: string
  bolehSunting: boolean
  bolehKetua: boolean
  anggota: { userId: string; nama: string }[]
  segmen: SegmenRow[]
}) {
  const router = useRouter()
  const final = laporanStatus === 'final'
  const urut = SEGMEN.map((s) => segmen.find((x) => x.kunci === s.kunci)).filter(Boolean) as SegmenRow[]
  const [aktifKunci, setAktifKunci] = useState(urut[0]?.kunci ?? '')
  const aktif = urut.find((s) => s.kunci === aktifKunci) ?? urut[0]
  const namaAnggota = (uid: string | null) => anggota.find((a) => a.userId === uid)?.nama

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-5">
      <div className="space-y-1">
        {urut.map((s) => {
          const terisi = s.isi.trim().length > 0
          return (
            <button key={s.id} onClick={() => setAktifKunci(s.kunci)}
              className={`w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                s.kunci === aktifKunci ? 'border-slate-800 bg-slate-50' : 'border-slate-200 hover:border-slate-300'
              }`}>
              <div className="flex items-center gap-1.5 font-medium">
                {terisi ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Clock className="w-3.5 h-3.5 text-slate-300" />}
                {JUDUL_SEGMEN[s.kunci]}
              </div>
              {s.ditugaskan_ke && <div className="text-[11px] text-slate-400 mt-0.5">→ {namaAnggota(s.ditugaskan_ke) ?? 'anggota'}</div>}
            </button>
          )
        })}

        {bolehKetua && !final && <FinalPanel penugasanId={penugasanId} onDone={() => router.refresh()} />}
      </div>

      <div className="space-y-3">
        {final ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold">
              <CircleCheck className="w-4 h-4" /> Laporan final{nomorDokumen ? ` — ${nomorDokumen}` : ''}
            </div>
            <div className="flex flex-wrap gap-2">
              <a href={`/dashboard/e-perjadin/penugasan/${penugasanId}/laporan/cetak`} target="_blank"
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold">
                <Printer className="w-3.5 h-3.5" /> Cetak / PDF
              </a>
              <a href={`/dashboard/e-perjadin/penugasan/${penugasanId}/laporan/docx`}
                className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold">
                <FileText className="w-3.5 h-3.5" /> Unduh DOCX
              </a>
              {bolehKetua && (diteruskanPada
                ? <span className="text-xs self-center">Ditandai diteruskan {new Date(diteruskanPada).toLocaleDateString('id-ID')}</span>
                : <TeruskanBtn penugasanId={penugasanId} onDone={() => router.refresh()} />)}
              {bolehKetua && (
                <button className="text-xs font-semibold text-slate-500 hover:text-slate-800 self-center"
                  onClick={async () => {
                    if (!confirm('Buka kembali laporan untuk disunting? Hanya bisa selama E-SPJ belum diajukan.')) return
                    const r = await batalFinal(penugasanId)
                    if ('error' in r) alert(r.error); else router.refresh()
                  }}>Buka kembali</button>
              )}
            </div>
          </div>
        ) : bolehKetua && aktif && (
          <div className="flex items-center justify-end">
            <select value={aktif.ditugaskan_ke ?? ''}
              onChange={async (e) => { await tugaskanSegmen(penugasanId, aktif.id, e.target.value); router.refresh() }}
              className="h-7 rounded border border-slate-200 text-xs px-1">
              <option value="">tugaskan segmen ke…</option>
              {anggota.map((a) => <option key={a.userId} value={a.userId}>{a.nama}</option>)}
            </select>
          </div>
        )}

        {aktif && (
          <SegmenPane
            key={aktif.id}
            penugasanId={penugasanId}
            seg={aktif}
            sayaUserId={sayaUserId}
            readOnly={final || !bolehSunting}
          />
        )}
      </div>
    </div>
  )
}

function SegmenPane({
  penugasanId, seg, sayaUserId, readOnly,
}: {
  penugasanId: string
  seg: SegmenRow
  sayaUserId: string
  readOnly: boolean
}) {
  const router = useRouter()

  const [teks, setTeks] = useState(() => bacaDrafAwal(seg).isi)
  const [drafLokal, setDrafLokal] = useState(() => bacaDrafAwal(seg).dari)
  const [tersimpan, setTersimpan] = useState(seg.updated_at)
  const [status, setStatus] = useState<'idle' | 'menyimpan' | 'gagal'>('idle')
  const [peringatan, setPeringatan] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [riwayat, setRiwayat] = useState<{ id: string; versi: number; isi: string; disimpan_pada: string }[] | null>(null)

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const teksRef = useRef(teks)
  const statusRef = useRef(status)
  useEffect(() => { teksRef.current = teks; statusRef.current = status })
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current) }, [])

  async function simpan(isi: string) {
    setStatus('menyimpan'); setGalat(null)
    const r = await simpanSegmen(penugasanId, seg.id, isi)
    if ('error' in r) {
      setStatus('gagal'); setGalat(r.error)
      try { localStorage.setItem(lsKey(seg.id), JSON.stringify({ isi, ts: Date.now() })) } catch { /* penuh */ }
      return
    }
    setStatus('idle'); setTersimpan(r.tersimpanPada); setPeringatan(r.peringatan ?? null); setDrafLokal(false)
    try { localStorage.removeItem(lsKey(seg.id)) } catch { /* abaikan */ }
    router.refresh()
  }

  function ubah(v: string) {
    setTeks(v); setStatus('menyimpan')
    try { localStorage.setItem(lsKey(seg.id), JSON.stringify({ isi: v, ts: Date.now() })) } catch { /* penuh */ }
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => void simpan(v), 5000) // debounce ≤ 5 dtk (F-4.1)
  }
  function simpanSekarang() {
    if (timer.current) clearTimeout(timer.current)
    void simpan(teks)
  }

  // Kirim ulang saat koneksi pulih (F-4.1).
  useEffect(() => {
    const onOnline = () => { if (statusRef.current === 'gagal') void simpan(teksRef.current) }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const lock = segmenTerkunci(seg.disunting_oleh, seg.disunting_pada, sayaUserId)

  return (
    <>
      {!readOnly && (
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {status === 'menyimpan' && <span>menyimpan…</span>}
          {status === 'idle' && <span>tersimpan {jam(tersimpan)}</span>}
          {status === 'gagal' && <span className="text-red-600">gagal menyimpan — disimpan lokal, dicoba lagi saat daring</span>}
        </div>
      )}

      {drafLokal && (
        <p className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          Draf lokal yang belum tersimpan ke server dipulihkan.
          <button className="font-semibold underline" onClick={() => {
            try { localStorage.removeItem(lsKey(seg.id)) } catch { /* abaikan */ }
            setTeks(seg.isi); setDrafLokal(false)
          }}>Buang, muat versi server</button>
        </p>
      )}
      {lock.terkunci && !readOnly && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md p-2">
          <Lock className="w-3.5 h-3.5" /> Segmen ini sedang disunting anggota lain. Simpan Anda akan menimpanya.
        </p>
      )}
      {peringatan && <p className="text-xs text-amber-700">{peringatan}</p>}
      {galat && <p className="text-xs text-red-600">{galat}</p>}

      <textarea
        value={teks}
        onChange={(e) => ubah(e.target.value)}
        onBlur={simpanSekarang}
        disabled={readOnly}
        rows={18}
        placeholder={`Tulis bagian "${JUDUL_SEGMEN[seg.kunci]}"…`}
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm leading-relaxed disabled:bg-slate-50 disabled:text-slate-500"
      />

      {!readOnly && (
        <button
          onClick={async () => {
            if (riwayat) { setRiwayat(null); return }
            const r = await ambilRiwayat(penugasanId, seg.id)
            if (!('error' in r)) setRiwayat(r.versi)
          }}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800">
          <History className="w-3.5 h-3.5" /> Riwayat versi
        </button>
      )}

      {riwayat && (
        <div className="rounded-lg border border-slate-200 divide-y text-xs">
          {riwayat.length === 0 && <div className="p-2 text-slate-400">Belum ada versi tersimpan.</div>}
          {riwayat.map((v) => (
            <div key={v.id} className="flex items-start gap-2 p-2">
              <div className="text-slate-400 w-24 shrink-0">v{v.versi} · {jam(v.disimpan_pada)}</div>
              <div className="flex-1 text-slate-600 line-clamp-2">{v.isi || <em>kosong</em>}</div>
              <button
                onClick={async () => {
                  if (!confirm(`Pulihkan versi ${v.versi}? Isi saat ini disimpan sebagai versi baru.`)) return
                  const r = await pulihkanVersi(penugasanId, seg.id, v.id)
                  if ('error' in r) setGalat(r.error)
                  else { setRiwayat(null); router.refresh() }
                }}
                className="text-slate-500 hover:text-slate-900 font-semibold shrink-0">pulihkan</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function FinalPanel({ penugasanId, onDone }: { penugasanId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  return (
    <div className="pt-3 mt-3 border-t space-y-2">
      <Button className="w-full" disabled={pending}
        onClick={async () => {
          if (!confirm('Nyatakan laporan final? Setelah final, segmen tidak dapat diubah.')) return
          setErr(null); setPending(true)
          const r = await finalkanLaporan(penugasanId)
          setPending(false)
          if ('error' in r) setErr(r.error); else onDone()
        }}>
        {pending ? 'Memproses…' : 'Nyatakan Final'}
      </Button>
      {err && <p className="text-xs text-red-600">{err}</p>}
      <p className="text-[11px] text-slate-400">Hanya Ketua Tim. Menerbitkan dokumen Laporan ber-QR.</p>
    </div>
  )
}

function TeruskanBtn({ penugasanId, onDone }: { penugasanId: string; onDone: () => void }) {
  const [pending, setPending] = useState(false)
  return (
    <button disabled={pending}
      onClick={async () => { setPending(true); await tandaiDiteruskan(penugasanId); setPending(false); onDone() }}
      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold">
      Tandai sudah diteruskan
    </button>
  )
}
