'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  MapPin, Camera, WifiOff, CheckCircle2, AlertTriangle, Clock, Plus, ShieldQuestion,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LABEL_TITIK, titikBelumTerekam, type TitikJenis } from '@/lib/e-perjadin/presensi'
import { kompresFoto } from '@/lib/e-perjadin/kompres-foto'
import { antre, jumlahAntrean, daftarAntrean, hapusAntrean } from '@/lib/e-perjadin/antrean-luring'
import { rekamPresensi, putuskanPresensi } from './actions'
import type { TitikTerekam } from './page'

const KELAS_INPUT = 'flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm'

function deviceId(): string {
  try {
    let v = localStorage.getItem('perjadin_device_id')
    if (!v) { v = crypto.randomUUID(); localStorage.setItem('perjadin_device_id', v) }
    return v
  } catch { return 'tak-diketahui' }
}

const BADGE: Record<string, string> = {
  lolos: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  anomali: 'bg-amber-50 text-amber-700 border-amber-200',
  pernyataan_pending: 'bg-sky-50 text-sky-700 border-sky-200',
  ditolak: 'bg-red-50 text-red-700 border-red-200',
}

export default function PresensiClient({
  penugasanId, berjalan, pesertaId, pesertaNama, pengawas, bisaPutus, maksud, tujuan, titikWajib, terekam,
}: {
  penugasanId: string
  berjalan: boolean
  pesertaId: string | null
  pesertaNama: string | null
  pengawas: boolean
  bisaPutus: boolean
  maksud: string
  tujuan: string
  titikWajib: { tanggal: string; jenis: TitikJenis }[]
  terekam: TitikTerekam[]
}) {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [antreanN, setAntreanN] = useState(0)
  const [panel, setPanel] = useState<string | null>(null)
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null)
  const [posErr, setPosErr] = useState<string | null>(null)
  const [foto, setFoto] = useState<File | null>(null)
  const [fotoPreview, setFotoPreview] = useState<string | null>(null)
  const [keterangan, setKeterangan] = useState('')
  const [modeBerbagi, setModeBerbagi] = useState(false)
  const [pemilik, setPemilik] = useState('')
  const [pakaiFallback, setPakaiFallback] = useState(false)
  const [alasanFallback, setAlasanFallback] = useState('')
  const [pernyataan, setPernyataan] = useState<File | null>(null)
  const [tempatSah, setTempatSah] = useState(false)
  const [tempatSahJenis, setTempatSahJenis] = useState('fws')
  const [tempatSahKet, setTempatSahKet] = useState('')
  const [pending, setPending] = useState(false)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const sinkronBusy = useRef(false)
  const panelDibukaRef = useRef<number>(0)
  const percobaanRef = useRef<Record<string, number>>({})

  const belum = titikBelumTerekam(
    titikWajib,
    terekam.filter((t) => !pengawas || t.peserta_nama === pesertaNama).map((t) => ({ tanggal: t.tanggal, jenis: t.jenis })),
  )
  const berikut = belum[0] ?? null

  const sinkron = useCallback(async () => {
    if (sinkronBusy.current || !navigator.onLine) return
    sinkronBusy.current = true
    try {
      for (const item of await daftarAntrean()) {
        const fd = new FormData()
        for (const [k, v] of Object.entries(item.fields)) fd.set(k, v)
        if (item.foto) fd.set('foto', new File([item.foto], 'foto.jpg', { type: 'image/jpeg' }))
        if (item.pernyataan) fd.set('pernyataan', new File([item.pernyataan], 'pernyataan', { type: item.pernyataan.type }))
        try {
          const r = await rekamPresensi(item.penugasanId, fd)
          if ('success' in r && item.id != null) await hapusAntrean(item.id)
        } catch { /* tetap di antrean */ }
      }
      setAntreanN(await jumlahAntrean())
      router.refresh()
    } finally {
      sinkronBusy.current = false
    }
  }, [router])

  useEffect(() => {
    setOnline(navigator.onLine)
    jumlahAntrean().then(setAntreanN)
    void sinkron()
    const on = () => { setOnline(true); void sinkron() }
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [sinkron])

  function bukaPanel(jenis: string) {
    setPanel(jenis); setPos(null); setPosErr(null); setFoto(null); setFotoPreview(null)
    setKeterangan(''); setModeBerbagi(false); setPemilik(''); setPakaiFallback(false)
    setAlasanFallback(''); setPernyataan(null); setPesan(null)
    setTempatSah(false); setTempatSahJenis('fws'); setTempatSahKet('')
    panelDibukaRef.current = Date.now()
  }

  function ambilLokasi() {
    setPosErr(null)
    if (!navigator.geolocation) { setPosErr('Perangkat tidak mendukung geolokasi.'); return }
    navigator.geolocation.getCurrentPosition(
      (p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      (e) => setPosErr(`Lokasi gagal terbaca: ${e.message}`),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    )
  }

  async function pilihFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const blob = await kompresFoto(f)
    const file = new File([blob], 'foto.jpg', { type: 'image/jpeg' })
    setFoto(file)
    setFotoPreview(URL.createObjectURL(file))
  }

  async function kirim(jenis: string) {
    setPesan(null)
    const tanggal = berikut?.tanggal ?? new Date().toISOString().slice(0, 10)
    const tglTitik = jenis === 'Tambahan' ? new Date().toISOString().slice(0, 10) : tanggal

    if (!foto) { setPesan({ ok: false, teks: 'Foto wajib dilampirkan.' }); return }
    if ((jenis === 'Kegiatan' || jenis === 'Tambahan') && !keterangan.trim()) {
      setPesan({ ok: false, teks: 'Keterangan kegiatan wajib diisi.' }); return
    }
    if (pakaiFallback && (!alasanFallback.trim() || !pernyataan)) {
      setPesan({ ok: false, teks: 'Jalur pernyataan wajib menyertakan alasan dan berkas Surat Pernyataan.' }); return
    }
    if (!pakaiFallback && !pos) { setPesan({ ok: false, teks: 'Ambil lokasi GPS lebih dulu.' }); return }
    const ts = tempatSah && (jenis === 'Start' || jenis === 'End')
    if (ts && !tempatSahKet.trim()) { setPesan({ ok: false, teks: 'Isi keterangan Tempat Sah.' }); return }

    const kunciTitik = `${tglTitik}:${jenis}`
    percobaanRef.current[kunciTitik] = (percobaanRef.current[kunciTitik] ?? 0) + 1

    const fields: Record<string, string> = {
      jenis, tanggal: tglTitik, sumber: pakaiFallback ? 'fallback' : 'pwa',
      waktu_perangkat: new Date().toISOString(), device_id: deviceId(),
      mode_berbagi: String(modeBerbagi), pemilik_perangkat: pemilik, keterangan,
      idempotency_key: crypto.randomUUID(), // 1 kunci per percobaan → replay antrean tak menggandakan
      percobaan_ke: String(percobaanRef.current[kunciTitik]),
      durasi_rekam_detik: String(Math.round((Date.now() - (panelDibukaRef.current || Date.now())) / 1000)),
    }
    if (pos) { fields.lintang = String(pos.lat); fields.bujur = String(pos.lon); fields.akurasi_m = String(pos.acc) }
    if (pakaiFallback) fields.alasan_fallback = alasanFallback
    if (ts) { fields.dari_tempat_sah = 'true'; fields.tempat_sah_jenis = tempatSahJenis; fields.tempat_sah_keterangan = tempatSahKet }

    setPending(true)
    try {
      if (!navigator.onLine) throw new Error('luring')
      const fd = new FormData()
      for (const [k, v] of Object.entries(fields)) fd.set(k, v)
      fd.set('foto', foto)
      if (pernyataan) fd.set('pernyataan', pernyataan)
      const r = await rekamPresensi(penugasanId, fd)
      if ('error' in r) { setPesan({ ok: false, teks: r.error }); setPending(false); return }
      setPesan({ ok: true, teks: r.anomali.length ? `Terekam dengan ${r.anomali.length} catatan anomali (menunggu keputusan PPK).` : 'Titik presensi terekam.' })
      setPanel(null)
      router.refresh()
    } catch {
      await antre({ penugasanId, fields, foto, pernyataan, dibuatPada: Date.now() })
      setAntreanN(await jumlahAntrean())
      setPesan({ ok: true, teks: 'Tidak ada sinyal — titik disimpan di perangkat dan akan terkirim otomatis saat daring.' })
      setPanel(null)
    }
    setPending(false)
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight">Presensi Lapangan</h2>
        <p className="text-sm text-muted-foreground">{maksud} — {tujuan}</p>
      </div>

      {(!online || antreanN > 0) && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <WifiOff className="w-4 h-4 shrink-0" />
          {!online ? 'Mode luring — ' : ''}{antreanN > 0 ? `${antreanN} titik menunggu sinkronisasi.` : 'Tidak ada sinyal.'}
          {online && antreanN > 0 && (
            <button onClick={() => void sinkron()} className="ml-auto font-semibold underline">Sinkron sekarang</button>
          )}
        </div>
      )}

      {pesertaNama && (
        <div className="rounded-xl border-2 border-slate-800 bg-slate-50 px-4 py-3">
          <div className="text-xs uppercase tracking-wide text-slate-400">Login sebagai</div>
          <div className="text-lg font-bold text-slate-900">{pesertaNama}</div>
          <div className="text-xs text-slate-500">Pastikan ini akun Anda sebelum merekam (mode berbagi perangkat).</div>
        </div>
      )}

      {/* Garis waktu titik wajib */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
        <div className="text-sm font-semibold text-slate-700">Titik wajib (pola 212)</div>
        {titikWajib.map((t, i) => {
          const done = !belum.some((b) => b.tanggal === t.tanggal && b.jenis === t.jenis)
          const next = berikut && berikut.tanggal === t.tanggal && berikut.jenis === t.jenis && !done
          return (
            <div key={i} className={`flex items-center gap-2 text-sm rounded-lg px-2 py-1.5 ${next ? 'bg-slate-100' : ''}`}>
              {done ? <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" /> : <Clock className="w-4 h-4 text-slate-300 shrink-0" />}
              <span className={done ? 'text-slate-400 line-through' : 'text-slate-700'}>
                {t.tanggal} · {t.jenis} <span className="text-xs text-slate-400">— {LABEL_TITIK[t.jenis]}</span>
              </span>
              {next && <span className="ml-auto text-xs font-semibold text-slate-600">berikutnya</span>}
            </div>
          )
        })}
      </div>

      {pesertaId && berjalan && !panel && (
        <div className="flex flex-wrap gap-2">
          {berikut && (
            <Button onClick={() => bukaPanel(berikut.jenis)} className="flex-1 min-w-[180px] h-12 text-base">
              <MapPin className="w-5 h-5" /> Rekam {berikut.jenis}
            </Button>
          )}
          <Button variant="outline" onClick={() => bukaPanel('Tambahan')} className="h-12">
            <Plus className="w-4 h-4" /> Titik Kegiatan
          </Button>
        </div>
      )}
      {pesertaId && !berjalan && (
        <p className="text-sm text-slate-500">Penugasan belum/bukan berstatus Berjalan — presensi tidak dapat direkam.</p>
      )}

      {/* Panel perekaman */}
      {panel && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 space-y-4">
          <div className="font-semibold text-slate-800">Rekam titik: {panel}</div>

          {!pakaiFallback && (
            <div className="space-y-2">
              <Button type="button" variant="outline" size="sm" onClick={ambilLokasi}>
                <MapPin className="w-4 h-4" /> Ambil Lokasi
              </Button>
              {pos && (
                <p className="text-xs text-slate-600 font-mono">
                  {pos.lat.toFixed(6)}, {pos.lon.toFixed(6)} · akurasi ±{Math.round(pos.acc)} m
                </p>
              )}
              {posErr && <p className="text-xs text-red-600">{posErr}</p>}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
              <Camera className="w-4 h-4" /> Foto {panel === 'Tambahan' || panel === 'Kegiatan' ? 'kegiatan' : 'swafoto'}
            </label>
            <input type="file" accept="image/*" capture="user" onChange={pilihFoto} className="text-sm" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {fotoPreview && <img src={fotoPreview} alt="pratinjau" className="max-h-40 rounded-lg border" />}
          </div>

          {(panel === 'Kegiatan' || panel === 'Tambahan') && (
            <div className="space-y-1">
              <label className="text-sm font-medium text-slate-700">Keterangan kegiatan</label>
              <input value={keterangan} onChange={(e) => setKeterangan(e.target.value)} className={KELAS_INPUT}
                placeholder="mis. Pemeriksaan berkas keuangan perkara di ruang panitera" />
            </div>
          )}

          {(panel === 'Start' || panel === 'End') && (
            <div className="rounded-md border border-slate-200 p-2 space-y-2">
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input type="checkbox" checked={tempatSah} onChange={(e) => setTempatSah(e.target.checked)} />
                {panel === 'Start' ? 'Berangkat' : 'Pulang'} dari <b>Tempat Sah</b> (bukan kantor Bawas) — PMK 119/2023
              </label>
              {tempatSah && (
                <div className="space-y-2 pl-1">
                  <select value={tempatSahJenis} onChange={(e) => setTempatSahJenis(e.target.value)} className={KELAS_INPUT}>
                    <option value="fws">Flexible working space</option>
                    <option value="cuti">Lokasi cuti</option>
                    <option value="libur">Lokasi libur resmi</option>
                    <option value="penugasan_lain">Lokasi penugasan dinas lain</option>
                  </select>
                  <input value={tempatSahKet} onChange={(e) => setTempatSahKet(e.target.value)} className={KELAS_INPUT}
                    placeholder="Keterangan lokasi (mis. rumah dinas Surabaya)" />
                  <p className="text-[11px] text-amber-700">Biaya transport dibayar riil, maksimal setara estimasi kantor→tujuan.</p>
                </div>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={modeBerbagi} onChange={(e) => setModeBerbagi(e.target.checked)} />
            Direkam di perangkat milik anggota tim lain (mode berbagi)
          </label>
          {modeBerbagi && (
            <input value={pemilik} onChange={(e) => setPemilik(e.target.value)} className={KELAS_INPUT}
              placeholder="Nama pemilik perangkat" />
          )}

          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input type="checkbox" checked={pakaiFallback} onChange={(e) => setPakaiFallback(e.target.checked)} />
              <ShieldQuestion className="w-3.5 h-3.5" /> Lokasi gagal terekam — pakai jalur Surat Pernyataan
            </label>
            {pakaiFallback && (
              <div className="space-y-2 pl-1">
                <p className="text-xs text-amber-700">Jalur ini wajib disetujui PPK secara eksplisit dan tidak pernah lolos otomatis.</p>
                <input value={alasanFallback} onChange={(e) => setAlasanFallback(e.target.value)} className={KELAS_INPUT}
                  placeholder="Alasan lokasi gagal (mis. tanpa sinyal GPS di lokasi terpencil)" />
                <div>
                  <label className="text-xs font-medium text-slate-700">Berkas Surat Pernyataan Kepatuhan (PDF/foto)</label>
                  <input type="file" accept="image/*,application/pdf"
                    onChange={(e) => setPernyataan(e.target.files?.[0] ?? null)} className="text-sm block" />
                </div>
              </div>
            )}
          </div>

          {pesan && (
            <p className={`text-sm ${pesan.ok ? 'text-emerald-700' : 'text-red-600'}`}>{pesan.teks}</p>
          )}

          <div className="flex gap-2">
            <Button onClick={() => kirim(panel)} disabled={pending}>
              {pending ? 'Mengirim…' : 'Kirim titik presensi'}
            </Button>
            <Button variant="ghost" onClick={() => setPanel(null)} disabled={pending}>Batal</Button>
          </div>
        </div>
      )}

      {pesan && !panel && (
        <p className={`text-sm ${pesan.ok ? 'text-emerald-700' : 'text-red-600'}`}>{pesan.teks}</p>
      )}

      {/* Titik terekam */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-slate-700">Titik terekam ({terekam.length})</div>
        {terekam.length === 0 && <p className="text-sm text-slate-400">Belum ada titik terekam.</p>}
        {terekam.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-semibold">{t.jenis}</span>
              <span className="text-xs text-slate-400">{new Date(t.waktu_server).toLocaleString('id-ID')}</span>
              {pengawas && t.peserta_nama && <span className="text-xs text-slate-500">· {t.peserta_nama}</span>}
              <span className={`ml-auto text-[11px] rounded-full border px-2 py-0.5 ${BADGE[t.status_verifikasi] ?? ''}`}>
                {t.status_verifikasi}
              </span>
            </div>
            <div className="flex gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {t.fotoUrl && <img src={t.fotoUrl} alt="" className="h-16 w-16 rounded object-cover border shrink-0" />}
              <div className="text-xs text-slate-500 space-y-0.5">
                {t.sumber === 'fallback' && <div className="text-amber-700">Jalur pernyataan (fallback)</div>}
                {t.dari_tempat_sah && (
                  <div className="text-amber-700">Tempat Sah ({t.tempat_sah_jenis}) — {t.tempat_sah_keterangan}</div>
                )}
                {t.jarak_m != null && (
                  <div className={t.dalam_geofence === false ? 'text-red-600' : ''}>
                    Jarak ke acuan: {Math.round(t.jarak_m)} m {t.dalam_geofence === false ? '· di luar geofence' : t.dalam_geofence ? '· dalam geofence' : ''}
                  </div>
                )}
                {t.jarak_m == null && <div>Geofence tidak dievaluasi (koordinat acuan belum tersedia)</div>}
                {t.keterangan && <div>“{t.keterangan}”</div>}
                {t.catatan_verifikasi && <div className="text-slate-700">Catatan PPK: {t.catatan_verifikasi}</div>}
              </div>
            </div>
            {bisaPutus && ['anomali', 'pernyataan_pending'].includes(t.status_verifikasi) && (
              <PutusForm presensiId={t.id} onDone={() => router.refresh()} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PutusForm({ presensiId, onDone }: { presensiId: string; onDone: () => void }) {
  const [buka, setBuka] = useState(false)
  const [alasan, setAlasan] = useState('')
  const [pending, setPending] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function putus(keputusan: 'lolos' | 'tolak') {
    setErr(null); setPending(true)
    const fd = new FormData()
    fd.set('keputusan', keputusan); fd.set('alasan', alasan)
    const r = await putuskanPresensi(presensiId, fd)
    setPending(false)
    if ('error' in r) setErr(r.error)
    else { setBuka(false); setAlasan(''); onDone() }
  }

  if (!buka) return (
    <button onClick={() => setBuka(true)} className="text-xs font-semibold text-amber-700 flex items-center gap-1">
      <AlertTriangle className="w-3.5 h-3.5" /> Putuskan temuan
    </button>
  )
  return (
    <div className="space-y-2 border-t pt-2">
      <input value={alasan} onChange={(e) => setAlasan(e.target.value)} placeholder="Alasan keputusan (wajib)"
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-1.5 text-sm" />
      {err && <p className="text-xs text-red-600">{err}</p>}
      <div className="flex gap-2">
        <Button size="sm" disabled={pending || !alasan.trim()} onClick={() => putus('lolos')}>Terima</Button>
        <Button size="sm" variant="destructive" disabled={pending || !alasan.trim()} onClick={() => putus('tolak')}>Tolak</Button>
        <Button size="sm" variant="ghost" onClick={() => setBuka(false)}>Batal</Button>
      </div>
    </div>
  )
}
