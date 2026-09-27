import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, ChartNoAxesCombined, Network } from 'lucide-react'

export const metadata = {
  title: 'Menu Lainnya — Risk-Sim',
  description: 'Akses publik Laporan Analisis SIWAS dan Pohon Kinerja Bawas MA.',
}

const menus = [
  {
    href: '/siwas',
    title: 'Laporan Analisis SIWAS',
    description: 'Jelajahi analisis ketepatan waktu penanganan pengaduan dan kinerja unit pengawasan.',
    icon: ChartNoAxesCombined,
  },
  {
    href: '/pohon-kinerja',
    title: 'Pohon Kinerja Bawas MA',
    description: 'Telusuri sasaran, indikator, dan jalur kontribusi kinerja Bawas MA tahun 2025.',
    icon: Network,
  },
]

export default function MenuLainnyaPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(150deg,#e4edf3_0%,#d6e8f5_50%,#cbe2f4_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/70 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"><ArrowLeft className="h-4 w-4" /> Kembali</Link>
        <header className="mt-12 text-center sm:mt-16">
          <Image src="/siwas-logo.png" alt="Logo SIWAS" width={96} height={88} className="mx-auto h-20 w-24 rounded-2xl object-cover shadow-lg" priority />
          <p className="mt-7 text-xs font-bold uppercase tracking-[.2em] text-emerald-700">Akses publik · tanpa login · PIN per menu</p>
          <h1 className="mt-3 font-serif text-4xl font-bold text-slate-900">Menu Lainnya...</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600">Pilih layanan, lalu masukkan PIN khusus menu yang diberikan administrator.</p>
        </header>
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {menus.map(({ href, title, description, icon: Icon }) => (
            <Link key={href} href={href} className="group flex min-h-64 flex-col rounded-[26px] border border-white/90 bg-white/80 p-7 shadow-[0_16px_45px_rgba(15,72,73,.09)] transition hover:-translate-y-1 hover:bg-white hover:shadow-[0_22px_55px_rgba(15,72,73,.15)] focus:outline-none focus:ring-4 focus:ring-emerald-500/20">
              <span className="grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-800"><Icon className="h-7 w-7" /></span>
              <h2 className="mt-7 font-serif text-2xl font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-bold text-emerald-700">Buka menu <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
