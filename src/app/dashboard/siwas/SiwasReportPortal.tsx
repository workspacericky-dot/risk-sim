'use client'

import { useActionState, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileChartColumnIncreasing, FolderLock, KeyRound, LockKeyhole, ShieldCheck, X } from 'lucide-react'
import { lockSiwasReport, unlockSiwasReport, updateSiwasPin, type SiwasActionState } from './actions'

const initialState: SiwasActionState = {}

export default function SiwasReportPortal({
  initiallyUnlocked,
  isAdmin,
  pinConfigured,
}: {
  initiallyUnlocked: boolean
  isAdmin: boolean
  pinConfigured: boolean
}) {
  const router = useRouter()
  const [showPin, setShowPin] = useState(false)
  const [unlocked, setUnlocked] = useState(initiallyUnlocked)
  const [unlockState, unlockAction, unlocking] = useActionState(async (state: SiwasActionState, data: FormData) => {
    const result = await unlockSiwasReport(state, data)
    if (result.success) {
      setUnlocked(true)
      setShowPin(false)
      router.refresh()
    }
    return result
  }, initialState)
  const [adminState, adminAction, saving] = useActionState(async (state: SiwasActionState, data: FormData) => {
    const result = await updateSiwasPin(state, data)
    if (result.success) {
      setUnlocked(false)
      router.refresh()
    }
    return result
  }, initialState)

  async function lockReport() {
    await lockSiwasReport()
    setUnlocked(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">Badan Pengawasan</p>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-slate-900">Laporan Analisis SIWAS</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Pilih folder lalu masukkan PIN yang diberikan administrator untuk membuka laporan.</p>
        </div>
        {unlocked && (
          <button onClick={lockReport} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900">
            <LockKeyhole className="h-4 w-4" /> Kunci laporan
          </button>
        )}
      </div>

      {!unlocked ? (
        <div>
          <button
            type="button"
            onClick={() => setShowPin(true)}
            className="group relative min-h-72 w-full overflow-hidden rounded-[28px] border border-white/80 bg-white/80 p-8 text-left shadow-[0_18px_60px_rgba(15,23,42,0.10)] backdrop-blur-xl transition duration-500 hover:-translate-y-2 hover:shadow-[0_28px_80px_rgba(15,23,42,0.16)] focus:outline-none focus:ring-4 focus:ring-emerald-500/20"
          >
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-sky-200/50 blur-3xl transition duration-700 group-hover:scale-125" />
            <div className="absolute -bottom-20 left-10 h-44 w-44 rounded-full bg-emerald-200/50 blur-3xl transition duration-700 group-hover:translate-x-16" />
            <div className="relative flex h-full flex-col justify-between gap-10">
              <div className="flex items-start justify-between">
                <div className="relative transition duration-500 group-hover:rotate-[-4deg] group-hover:scale-105">
                  <FolderLock className="h-24 w-24 fill-emerald-100 text-emerald-700" strokeWidth={1.3} />
                  <span className="absolute -right-1 bottom-1 grid h-9 w-9 place-items-center rounded-full bg-slate-900 text-white shadow-lg"><KeyRound className="h-4 w-4" /></span>
                </div>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700">Terkunci</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Laporan analitik</p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-slate-900">Laporan Ketepatan Waktu SIWAS</h2>
                <p className="mt-3 text-sm text-slate-500">Periode 1 Januari 2024–4 Agustus 2026</p>
                <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700">Buka folder <span className="transition-transform group-hover:translate-x-1">→</span></span>
              </div>
            </div>
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.14)]">
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-5 py-4">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><FileChartColumnIncreasing className="h-5 w-5" /></span>
            <div><p className="text-sm font-bold text-slate-800">Laporan Ketepatan Waktu SIWAS</p><p className="text-xs text-slate-400">Akses terverifikasi</p></div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700"><ShieldCheck className="h-3.5 w-3.5" /> Terbuka</span>
          </div>
          <iframe title="Laporan Ketepatan Waktu SIWAS" src="/api/siwas-report" className="h-[calc(100vh-13rem)] min-h-[720px] w-full bg-white" />
        </div>
      )}

      {isAdmin && (
        <details className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur-xl">
          <summary className="cursor-pointer text-sm font-bold text-slate-700">Pengaturan PIN administrator</summary>
          <form action={adminAction} className="mt-5 grid gap-4 sm:grid-cols-2">
            <p className="sm:col-span-2 text-sm text-slate-500">{pinConfigured ? 'PIN telah dikonfigurasi. Menggantinya akan mengunci semua sesi laporan yang sedang terbuka.' : 'Belum ada PIN. Tetapkan PIN sebelum laporan dapat diakses.'}</p>
            <input name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required placeholder="PIN baru (4–12 angka)" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
            <input name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required placeholder="Ulangi PIN baru" className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
            {(adminState.error || adminState.message) && <p className={`sm:col-span-2 rounded-xl px-4 py-3 text-sm ${adminState.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{adminState.error ?? adminState.message}</p>}
            <button disabled={saving} className="sm:col-span-2 justify-self-start rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-emerald-700 disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan PIN'}</button>
          </form>
        </details>
      )}

      {showPin && !unlocked && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-md" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPin(false) }}>
          <div className="w-full max-w-md animate-[siwas-pop_.3s_ease-out] rounded-[28px] border border-white/20 bg-white p-7 shadow-2xl">
            <div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><KeyRound className="h-6 w-6" /></span><button type="button" onClick={() => setShowPin(false)} className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700" aria-label="Tutup"><X className="h-5 w-5" /></button></div>
            <h2 className="mt-6 font-serif text-2xl font-bold text-slate-900">Masukkan PIN laporan</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Gunakan PIN yang diberikan oleh administrator.</p>
            <form action={unlockAction} className="mt-6 space-y-4">
              <input autoFocus name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required autoComplete="off" aria-label="PIN laporan" placeholder="••••••" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 text-center font-mono text-2xl tracking-[0.5em] outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-500/10" />
              {unlockState.error && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{unlockState.error}</p>}
              <button disabled={unlocking} className="w-full rounded-2xl bg-emerald-700 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 hover:bg-emerald-800 disabled:opacity-50">{unlocking ? 'Memverifikasi…' : 'Buka laporan'}</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
