'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { KeyRound, LockKeyhole } from 'lucide-react'
import { unlockSiwasReport, type SiwasActionState } from '@/app/dashboard/siwas/actions'
import { unlockPohonKinerja } from '@/app/dashboard/siwas/pohon-actions'

type Kind = 'siwas' | 'pohon'

const content = {
  siwas: {
    title: 'Laporan Analisis SIWAS',
    description: 'Analisis ketepatan waktu penanganan pengaduan dan kinerja unit pengawasan.',
  },
  pohon: {
    title: 'Pohon Kinerja Bawas MA',
    description: 'Penelusuran sasaran, indikator, dan kontribusi kinerja Bawas MA tahun 2025.',
  },
}

export default function PublicMenuPinGate({ kind, configured }: { kind: Kind; configured: boolean }) {
  const router = useRouter()
  const [state, action, pending] = useActionState(async (previous: SiwasActionState, data: FormData) => {
    const result = kind === 'siwas' ? await unlockSiwasReport(previous, data) : await unlockPohonKinerja(previous, data)
    if (result.success) router.refresh()
    return result
  }, {})
  const menu = content[kind]

  return (
    <section className="mx-auto max-w-3xl overflow-hidden rounded-[28px] border border-white/80 bg-white/85 shadow-[0_25px_80px_rgba(15,72,73,.13)] backdrop-blur-xl">
      <div className="h-2 bg-gradient-to-r from-emerald-800 via-teal-500 to-sky-400" />
      <div className="p-7 sm:p-12">
        <span className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800"><LockKeyhole className="h-8 w-8" /></span>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Badan Pengawasan · akses tanpa login</p>
        <h1 className="mt-3 font-serif text-3xl font-bold leading-tight sm:text-4xl">{menu.title}</h1>
        <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">{menu.description}</p>
        <div className="mt-8 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-bold text-emerald-900"><KeyRound className="h-4 w-4" /> Masukkan PIN khusus menu ini</div>
          <form action={action} className="flex flex-col gap-3 sm:flex-row">
            <input name="pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required autoComplete="off" aria-label={`PIN ${menu.title}`} placeholder="PIN dari administrator" className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-600 focus:ring-4 focus:ring-emerald-500/10" />
            <button disabled={pending || !configured} className="rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">{pending ? 'Memverifikasi…' : 'Buka menu'}</button>
          </form>
          {!configured && <p className="mt-3 text-sm text-amber-800">PIN menu ini belum ditetapkan oleh administrator sistem.</p>}
          {state.error && <p role="alert" className="mt-3 text-sm font-medium text-red-700">{state.error}</p>}
        </div>
      </div>
    </section>
  )
}
