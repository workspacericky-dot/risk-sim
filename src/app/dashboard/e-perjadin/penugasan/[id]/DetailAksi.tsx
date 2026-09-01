'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  ajukanST, setujuiST, kembalikanST, ajukanDanom, setujuiDanomPpk, setujuiDanomKpa,
  kembalikanDanom, bayarUangMuka, batalkanPenugasan, hapusDraf,
} from '../actions'

type Boleh = { kelola: boolean; pemberiTugas: boolean; ppk: boolean; kpa: boolean; bendahara: boolean }
type Hasil = { error: string } | { success: true }

export default function DetailAksi({
  penugasanId, stStatus, danomStatus, overallStatus, boleh, siapAjukanST, siapAjukanDanom,
  uangMukaPersen, uangMukaDibayar,
}: {
  penugasanId: string
  stStatus: string
  danomStatus: string
  overallStatus: string
  boleh: Boleh
  siapAjukanST: boolean
  siapAjukanDanom: boolean
  uangMukaPersen: number
  uangMukaDibayar: boolean
}) {
  const router = useRouter()
  const [galat, setGalat] = useState<string | null>(null)
  const [box, setBox] = useState<string | null>(null)
  const [alasan, setAlasan] = useState('')
  const [pending, mulai] = useTransition()

  function jalan(fn: () => Promise<Hasil>, keDaftar = false) {
    setGalat(null)
    mulai(async () => {
      const r = await fn()
      if ('error' in r) { setGalat(r.error); return }
      setBox(null); setAlasan('')
      if (keDaftar) router.push('/dashboard/e-perjadin/penugasan')
      router.refresh()
    })
  }
  const withAlasan = (fn: (id: string, fd: FormData) => Promise<Hasil>) => {
    const fd = new FormData(); fd.set('alasan', alasan)
    return jalan(() => fn(penugasanId, fd))
  }

  const aktif = !['Selesai', 'Dibatalkan'].includes(overallStatus)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
      {/* Jalur Surat Tugas */}
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Jalur Surat Tugas — {stStatus}</div>
        <div className="flex flex-wrap gap-2">
          {stStatus === 'draf' && boleh.kelola && (
            <div className="flex flex-col gap-1">
              <Button type="button" size="sm" disabled={pending || !siapAjukanST} onClick={() => jalan(() => ajukanST(penugasanId))}>
                Ajukan ke Pemberi Tugas
              </Button>
              {!siapAjukanST && <span className="text-[11px] text-slate-400">Perlu ≥ 1 peserta.</span>}
            </div>
          )}
          {stStatus === 'diajukan' && boleh.pemberiTugas && (
            <>
              <Button type="button" size="sm" disabled={pending} onClick={() => jalan(() => setujuiST(penugasanId))}>
                Terbitkan ST + SPD
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setBox(box === 'st' ? null : 'st')}>Kembalikan</Button>
            </>
          )}
          {stStatus === 'diajukan' && !boleh.pemberiTugas && <span className="text-sm text-slate-500">Menunggu Pemberi Tugas.</span>}
          {stStatus === 'terbit' && <span className="text-sm text-emerald-700">Surat Tugas terbit.</span>}
        </div>
        {box === 'st' && (
          <AlasanBox alasan={alasan} setAlasan={setAlasan} pending={pending}
            onKonfirmasi={() => withAlasan(kembalikanST)} />
        )}
      </div>

      {/* Jalur DANOM */}
      <div className="border-t pt-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Jalur DANOM / Anggaran — {danomStatus}</div>
        <div className="flex flex-wrap gap-2">
          {danomStatus === 'draf' && boleh.kelola && (
            <div className="flex flex-col gap-1">
              <Button type="button" size="sm" disabled={pending || !siapAjukanDanom} onClick={() => jalan(() => ajukanDanom(penugasanId))}>
                Ajukan DANOM ke PPK
              </Button>
              {!siapAjukanDanom && <span className="text-[11px] text-slate-400">Perlu peserta berestimasi &amp; pagu terpetakan.</span>}
            </div>
          )}
          {danomStatus === 'diajukan_ppk' && boleh.ppk && (
            <>
              <Button type="button" size="sm" disabled={pending} onClick={() => jalan(() => setujuiDanomPpk(penugasanId))}>
                Setujui DANOM (PPK) &amp; pesan pagu
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setBox(box === 'dppk' ? null : 'dppk')}>Kembalikan</Button>
            </>
          )}
          {danomStatus === 'diajukan_ppk' && !boleh.ppk && <span className="text-sm text-slate-500">Menunggu PPK.</span>}
          {danomStatus === 'diajukan_kpa' && boleh.kpa && (
            <>
              <Button type="button" size="sm" disabled={pending} onClick={() => jalan(() => setujuiDanomKpa(penugasanId))}>
                Setujui Anggaran (KPA)
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setBox(box === 'dkpa' ? null : 'dkpa')}>Kembalikan</Button>
            </>
          )}
          {danomStatus === 'diajukan_kpa' && !boleh.kpa && <span className="text-sm text-slate-500">Menunggu KPA (Sekretaris).</span>}
          {danomStatus === 'disetujui' && <span className="text-sm text-emerald-700">DANOM disetujui KPA.</span>}
        </div>
        {(box === 'dppk' || box === 'dkpa') && (
          <AlasanBox alasan={alasan} setAlasan={setAlasan} pending={pending}
            onKonfirmasi={() => withAlasan(kembalikanDanom)} />
        )}
      </div>

      {/* Uang muka (Bendahara) */}
      {danomStatus === 'disetujui' && uangMukaPersen > 0 && (
        <div className="border-t pt-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">Uang Muka ({uangMukaPersen}%)</div>
          {uangMukaDibayar ? <span className="text-sm text-emerald-700">Uang muka tercatat dibayar.</span>
            : boleh.bendahara ? (
              <form className="flex flex-wrap items-center gap-2"
                action={(fd) => jalan(() => bayarUangMuka(penugasanId, fd))}>
                <input name="tanggal" type="date" required className="h-8 rounded border border-slate-200 px-2 text-xs" />
                <input name="bukti" type="file" accept="image/*,application/pdf" className="text-xs" />
                <Button type="submit" size="sm" disabled={pending}>Catat pembayaran</Button>
              </form>
            ) : <span className="text-sm text-slate-500">Menunggu Bendahara mencatat pembayaran.</span>}
        </div>
      )}

      {/* Pembatalan / hapus draf */}
      {aktif && (boleh.ppk || boleh.pemberiTugas) && (
        <div className="border-t pt-4">
          <Button type="button" size="sm" variant="destructive" onClick={() => setBox(box === 'batal' ? null : 'batal')}>
            Batalkan Penugasan
          </Button>
          {box === 'batal' && (
            <AlasanBox alasan={alasan} setAlasan={setAlasan} pending={pending} wajib
              label="Alasan pembatalan (wajib, tercatat permanen)"
              onKonfirmasi={() => withAlasan(batalkanPenugasan)} />
          )}
        </div>
      )}
      {stStatus === 'draf' && danomStatus === 'draf' && boleh.kelola && (
        <div className="border-t pt-4">
          <Button type="button" size="sm" variant="ghost" disabled={pending}
            onClick={() => { if (confirm('Hapus draf penugasan ini?')) jalan(() => hapusDraf(penugasanId), true) }}>
            Hapus Draf
          </Button>
        </div>
      )}

      {galat && <p className="text-sm text-red-600 whitespace-pre-wrap">{galat}</p>}
    </div>
  )
}

function AlasanBox({
  alasan, setAlasan, pending, onKonfirmasi, label = 'Alasan pengembalian', wajib = true,
}: {
  alasan: string; setAlasan: (v: string) => void; pending: boolean
  onKonfirmasi: () => void; label?: string; wajib?: boolean
}) {
  return (
    <div className="mt-2 space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <textarea rows={2} value={alasan} onChange={(e) => setAlasan(e.target.value)}
        className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm" />
      <Button type="button" size="sm" disabled={pending || (wajib && !alasan.trim())} onClick={onKonfirmasi}>Konfirmasi</Button>
    </div>
  )
}
