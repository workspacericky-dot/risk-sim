import { AlertTriangle, CheckCircle2, Scale, Timer } from 'lucide-react'
import { DIMENSIONS, INTERVIEW_QUESTIONS, KEY_DIMENSIONS } from '@/lib/wawancara-zi/questions'

const rubric = [
  ['0','Tidak Terpenuhi','Tidak memahami/tidak ada implementasi, atau jawaban bertentangan dengan fakta material.'],
  ['1','Lemah / Formalitas','Ada dokumen atau jawaban normatif, tetapi praktik, dampak, atau tindak lanjut tidak terbukti.'],
  ['2','Memadai','Implementasi berjalan, bukti cukup, jawaban konsisten, risiko utama dikendalikan.'],
  ['3','Kuat / Berkelanjutan','Praktik membudaya, dipahami lintas aparatur, terukur, dievaluasi, dan diperbaiki.'],
]

export default function PanduanPage() {
  return <div className="grid gap-5 xl:grid-cols-[1.1fr_.9fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Scale className="h-5 w-5 text-teal-700"/><h2 className="font-bold">Prinsip dan rubrik</h2></div><div className="mt-4 grid gap-2">{rubric.map(([score,label,definition]) => <div key={score} className="grid grid-cols-[38px_1fr] gap-3 rounded-xl bg-slate-50 p-3"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-700 font-bold text-white">{score}</span><div><p className="text-sm font-bold text-slate-800">{label}</p><p className="mt-0.5 text-xs leading-relaxed text-slate-600">{definition}</p></div></div>)}</div><div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900"><p className="flex items-center gap-2 font-bold"><AlertTriangle className="h-4 w-4"/>Sistem gugur</p><p className="mt-1 text-xs leading-relaxed">Keempat dimensi kunci harus Memadai. Setiap butir kritis yang berlaku memiliki skor minimal 2, rata-rata dimensi minimal 2, seluruh butir lengkap, dan tidak ada red flag terbuka.</p></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Timer className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">Kendali diskusi 90 menit</h2></div><div className="mt-4 space-y-2">{DIMENSIONS.map((dimension) => { const items = INTERVIEW_QUESTIONS.filter((q) => q.dimension === dimension); const minutes = items.reduce((sum,q) => sum + q.minutes, 0); return <div key={dimension} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-3 py-2.5"><div><p className="text-sm font-semibold text-slate-800">{dimension}</p><p className="text-[11px] text-slate-500">{items.length} butir · {KEY_DIMENSIONS.includes(dimension) ? 'Dimensi kunci' : 'Penunjang/kontrol'}</p></div><span className="shrink-0 rounded-lg bg-cyan-50 px-2.5 py-1 text-xs font-bold text-cyan-800">{minutes} menit</span></div>})}</div></section>
    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 xl:col-span-2"><h2 className="flex items-center gap-2 font-bold text-emerald-950"><CheckCircle2 className="h-5 w-5"/>Pola wawancara</h2><p className="mt-2 text-sm text-emerald-900">Pertanyaan utama → penggalian → konfirmasi bukti. Dokumen atau SK saja belum cukup tanpa praktik, contoh kasus, data pemanfaatan, dampak, dan keberlanjutan yang dapat ditriangulasi.</p></section>
  </div>
}
