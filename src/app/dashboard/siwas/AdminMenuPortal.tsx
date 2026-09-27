'use client'

import { useActionState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, ChartNoAxesCombined, KeyRound, Network, ShieldCheck } from 'lucide-react'
import { updateSiwasPin, type SiwasActionState } from './actions'
import { updatePohonPin, type PohonActionState } from './pohon-actions'

type Menu = 'siwas' | 'pohon'

const items = [
  { key: 'siwas' as const, href: '/siwas', title: 'Laporan Analisis SIWAS', description: 'Analisis ketepatan waktu penanganan pengaduan.', icon: ChartNoAxesCombined },
  { key: 'pohon' as const, href: '/pohon-kinerja', title: 'Pohon Kinerja Bawas MA', description: 'Sasaran, indikator, dan jalur kontribusi kinerja 2025.', icon: Network },
]

export default function AdminMenuPortal({ configured }: { configured: Record<Menu, boolean> }) {
  const router = useRouter()
  const [siwasState, siwasAction, savingSiwas] = useActionState(async (state: SiwasActionState, data: FormData) => {
    const result = await updateSiwasPin(state, data)
    if (result.success) router.refresh()
    return result
  }, {})
  const [pohonState, pohonAction, savingPohon] = useActionState(async (state: PohonActionState, data: FormData) => {
    const result = await updatePohonPin(state, data)
    if (result.success) router.refresh()
    return result
  }, {})

  const forms = [
    { key: 'siwas' as const, title: 'PIN Laporan Analisis SIWAS', state: siwasState, action: siwasAction, saving: savingSiwas },
    { key: 'pohon' as const, title: 'PIN Pohon Kinerja Bawas MA', state: pohonState, action: pohonAction, saving: savingPohon },
  ]

  return (
    <div className="space-y-8">
      <header>
        <p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Badan Pengawasan</p>
        <h1 className="font-serif text-3xl font-bold text-slate-900">Menu Lainnya</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Buka salah satu menu di bawah. Administrator mengatur PIN setiap menu secara terpisah.</p>
      </header>

      <div className="grid gap-5 lg:grid-cols-2">
        {items.map(({ key, href, title, description, icon: Icon }) => (
          <Link key={key} href={href} className="group flex min-h-64 flex-col rounded-[28px] border border-white/80 bg-white/80 p-7 shadow-[0_18px_60px_rgba(15,23,42,.09)] transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_25px_70px_rgba(15,23,42,.15)] focus:outline-none focus:ring-4 focus:ring-emerald-500/20">
            <div className="flex items-start justify-between gap-3"><span className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon className="h-8 w-8" /></span><span className={`rounded-full px-3 py-1 text-xs font-bold ${configured[key] ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>{configured[key] ? 'PIN diatur' : 'PIN belum diatur'}</span></div>
            <h2 className="mt-7 font-serif text-2xl font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-emerald-700">Buka menu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          </Link>
        ))}
      </div>

      <section aria-label="Pengaturan PIN administrator">
        <div className="mb-4 flex items-center gap-2"><KeyRound className="h-5 w-5 text-emerald-700" /><h2 className="font-serif text-xl font-bold text-slate-900">Pengaturan PIN terpisah</h2></div>
        <div className="grid gap-5 xl:grid-cols-2">
          {forms.map(({ key, title, state, action, saving }) => (
            <div key={key} className="rounded-2xl border border-white/80 bg-white/80 p-6 shadow-sm">
              <div className="flex items-start justify-between gap-3"><h3 className="text-base font-bold text-slate-900">{title}</h3>{configured[key] && <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />}</div>
              <p className="mt-2 text-xs leading-5 text-slate-500">{configured[key] ? 'PIN sudah tersedia. Menggantinya akan membatalkan akses lama untuk menu ini saja.' : 'Tetapkan PIN sebelum menu ini dapat dibuka.'}</p>
              <form action={action} className="mt-5 space-y-3">
                <input name="new_pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required placeholder="PIN baru (4–12 angka)" aria-label={`PIN baru ${title}`} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
                <input name="confirm_pin" type="password" inputMode="numeric" pattern="[0-9]{4,12}" minLength={4} maxLength={12} required placeholder="Ulangi PIN baru" aria-label={`Konfirmasi PIN ${title}`} className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10" />
                {(state.error || state.message) && <p role="status" className={`rounded-xl px-3 py-2 text-xs ${state.error ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>{state.error ?? state.message}</p>}
                <button disabled={saving} className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:opacity-50">{saving ? 'Menyimpan…' : 'Simpan PIN'}</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
