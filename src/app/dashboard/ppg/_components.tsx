import type { LucideIcon } from 'lucide-react'

export function StatCard({ label, value, note, icon: Icon, tone = 'indigo' }: { label: string; value: string | number; note?: string; icon: LucideIcon; tone?: 'indigo' | 'cyan' | 'amber' | 'rose' }) {
  const tones = { indigo: 'bg-indigo-50 text-indigo-700', cyan: 'bg-cyan-50 text-cyan-700', amber: 'bg-amber-50 text-amber-700', rose: 'bg-rose-50 text-rose-700' }
  return <article className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className={`mb-4 inline-flex rounded-xl p-2.5 ${tones[tone]}`}><Icon className="h-5 w-5" /></div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-1 break-words text-2xl font-bold leading-tight tracking-tight text-slate-900 [overflow-wrap:anywhere]">{value}</p>{note && <p className="mt-2 break-words text-xs text-slate-500">{note}</p>}</article>
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-12 text-center"><h3 className="font-semibold text-slate-800">{title}</h3><p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">{description}</p></div>
}

export function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">{eyebrow}</p><h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>
}
