'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, BookOpenCheck, Check, CheckCircle2, ChevronLeft, ChevronRight,
  ClipboardCheck, Clock3, FileText, Lightbulb, Loader2, Pause, Play, Plus, RotateCcw,
  Save, Search, ShieldCheck, Sparkles, Target, Trash2, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { COMMON_PROBES, DIMENSIONS, INTERVIEW_QUESTIONS, READINESS_ITEMS, blankResponse } from '@/lib/wawancara-zi/questions'
import { computeInterviewSummary, isQuestionComplete } from '@/lib/wawancara-zi/scoring'
import type { AndokIssue, InterviewSessionRow, InterviewSnapshot, QuestionResponse } from '@/lib/wawancara-zi/types'
import { saveInterviewSnapshot } from '../actions'

type Stage = 'persiapan' | 'wawancara' | 'ringkasan'
type Gap = 'semua' | 'normatif' | 'contoh' | 'proses' | 'dampak' | 'bukti' | 'keberlanjutan' | 'triangulasi'

const field = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100'
const area = `${field} min-h-24 resize-y leading-relaxed`

const gapConfig: Array<{ id: Gap; label: string; terms: string[] }> = [
  { id: 'semua', label: 'Semua', terms: [] },
  { id: 'normatif', label: 'Jawaban normatif', terms: ['contoh','terakhir','proses','siapa'] },
  { id: 'contoh', label: 'Belum ada contoh', terms: ['contoh','kasus','terakhir'] },
  { id: 'proses', label: 'Proses belum jelas', terms: ['proses','awal','siapa','keputusan'] },
  { id: 'dampak', label: 'Dampak belum terukur', terms: ['berubah','dampak','hasil','efektif','indikator','ukur'] },
  { id: 'bukti', label: 'Bukti belum jelas', terms: ['bukti','dokumen','data','log','aplikasi','register'] },
  { id: 'keberlanjutan', label: 'Keberlanjutan belum teruji', terms: ['berganti','tetap berjalan','keberlanjutan','figur','dilembagakan'] },
  { id: 'triangulasi', label: 'Perlu triangulasi', terms: ['pegawai lain','pihak lain','konsisten','bandingkan'] },
]

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

function StatusPill({ value }: { value: string }) {
  const tone = value === 'LULUS' || value === 'MEMADAI' || value === 'TERPENUHI' ? 'bg-emerald-50 text-emerald-800' : value.includes('TIDAK') ? 'bg-rose-50 text-rose-800' : value.includes('BELUM') ? 'bg-amber-50 text-amber-800' : 'bg-violet-50 text-violet-800'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${tone}`}>{value}</span>
}

export function InterviewConsole({ session }: { session: InterviewSessionRow }) {
  const [snapshot, setSnapshot] = useState(session.snapshot)
  const [stage, setStage] = useState<Stage>('persiapan')
  const [activeCode, setActiveCode] = useState(INTERVIEW_QUESTIONS[0].code)
  const [query, setQuery] = useState('')
  const [gap, setGap] = useState<Gap>('semua')
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(snapshot.timer.secondsRemaining)
  const [status, setStatus] = useState(session.status)
  const [saveState, setSaveState] = useState<'idle'|'saving'|'saved'|'error'>('idle')
  const initialized = useRef(false)
  const timerTicks = useRef(0)

  const summary = useMemo(() => computeInterviewSummary(snapshot), [snapshot])
  const activeIndex = INTERVIEW_QUESTIONS.findIndex((q) => q.code === activeCode)
  const question = INTERVIEW_QUESTIONS[activeIndex] ?? INTERVIEW_QUESTIONS[0]
  const response = snapshot.responses[question.code] ?? blankResponse()
  const visibleQuestions = useMemo(() => INTERVIEW_QUESTIONS.filter((item) => !query.trim() || `${item.code} ${item.dimension} ${item.question} ${item.target}`.toLowerCase().includes(query.toLowerCase())), [query])

  useEffect(() => {
    if (!initialized.current) { initialized.current = true; return }
    const timeout = window.setTimeout(async () => {
      setSaveState('saving')
      const result = await saveInterviewSnapshot(session.id, snapshot, status)
      setSaveState(result.ok ? 'saved' : 'error')
    }, 850)
    return () => window.clearTimeout(timeout)
  }, [session.id, snapshot, status])

  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => {
      setSeconds((current) => {
        const next = Math.max(0, current - 1)
        timerTicks.current += 1
        if (timerTicks.current % 30 === 0 || next === 0) setSnapshot((old) => ({ ...old, timer: { secondsRemaining: next } }))
        if (next === 0) setRunning(false)
        return next
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [running])

  function updateResponse(patch: Partial<QuestionResponse>) {
    setSnapshot((old) => ({ ...old, responses: { ...old.responses, [question.code]: { ...(old.responses[question.code] ?? blankResponse()), ...patch } } }))
  }

  function updateMetadata(key: string, value: string) {
    setSnapshot((old) => ({ ...old, metadata: { ...old.metadata, [key]: value } }))
  }

  function pauseTimer() {
    setRunning(false)
    setSnapshot((old) => ({ ...old, timer: { secondsRemaining: seconds } }))
  }

  function selectQuestion(code: string) {
    setActiveCode(code)
    setStage('wawancara')
    setGap('semua')
  }

  const allProbes = [...question.probes, ...COMMON_PROBES.filter((probe) => !question.probes.includes(probe))]
  const selectedTerms = gapConfig.find((item) => item.id === gap)?.terms ?? []
  const visibleProbes = gap === 'semua' ? allProbes : allProbes.filter((probe) => selectedTerms.some((term) => probe.toLowerCase().includes(term)))

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard/wawancara-zi" className="rounded-xl p-2 text-slate-500 hover:bg-slate-100" aria-label="Kembali"><ArrowLeft className="h-5 w-5"/></Link><div className="min-w-0"><p className="truncate font-bold text-slate-900">{session.unit_name}</p><p className="truncate text-xs text-slate-500">{session.candidate_stage || 'Tahap belum diisi'} · {session.kke_number || 'KKE belum diisi'}</p></div></div>
      <div className="flex items-center gap-2"><span className={cn('flex items-center gap-1.5 text-xs font-semibold', saveState === 'error' ? 'text-rose-700' : 'text-slate-500')}>{saveState === 'saving' ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : saveState === 'saved' ? <Check className="h-3.5 w-3.5 text-emerald-600"/> : <Save className="h-3.5 w-3.5"/>}{saveState === 'saving' ? 'Menyimpan' : saveState === 'error' ? 'Gagal menyimpan' : saveState === 'saved' ? 'Tersimpan' : 'Autosave'}</span><StatusPill value={status.toUpperCase()}/></div>
    </div>

    <div className="grid grid-cols-3 gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
      {([['persiapan','Persiapan',ClipboardCheck],['wawancara','Wawancara',Sparkles],['ringkasan','Ringkasan',ShieldCheck]] as const).map(([id,label,Icon]) => <button key={id} onClick={() => setStage(id)} className={cn('flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition', stage === id ? 'bg-teal-700 text-white' : 'text-slate-600 hover:bg-teal-50')}><Icon className="h-4 w-4"/><span className="hidden sm:inline">{label}</span></button>)}
    </div>

    {stage === 'persiapan' && <PreparationPanel snapshot={snapshot} setSnapshot={setSnapshot} updateMetadata={updateMetadata}/>}
    {stage === 'wawancara' && <div className="grid gap-4 xl:grid-cols-[270px_minmax(0,1fr)_330px]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari butir..." className={`${field} py-2 pl-9 text-xs`}/></div>
        <div className="mt-3 space-y-4">{DIMENSIONS.map((dimension) => { const items = visibleQuestions.filter((item) => item.dimension === dimension); if (!items.length) return null; const done = INTERVIEW_QUESTIONS.filter((item) => item.dimension === dimension && isQuestionComplete(item, snapshot.responses[item.code] ?? blankResponse())).length; const total = INTERVIEW_QUESTIONS.filter((item) => item.dimension === dimension).length; return <div key={dimension}><div className="mb-1.5 flex items-start justify-between gap-2 px-1"><p className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-500">{dimension}</p><span className="text-[10px] font-bold text-teal-700">{done}/{total}</span></div><div className="space-y-1">{items.map((item) => { const itemResponse = snapshot.responses[item.code] ?? blankResponse(); const complete = isQuestionComplete(item,itemResponse); return <button key={item.code} onClick={() => selectQuestion(item.code)} className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition', activeCode === item.code ? 'bg-teal-700 text-white' : 'hover:bg-slate-50 text-slate-600')}><span className={cn('flex h-5 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold', activeCode === item.code ? 'bg-white/15' : complete ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500')}>{complete ? <Check className="h-3 w-3"/> : item.code}</span><span className="line-clamp-2">{item.indicator}</span></button>})}</div></div>})}</div>
      </aside>

      <main className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded-lg bg-teal-700 px-2.5 py-1 text-xs font-bold text-white">{question.code}</span><span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">{question.kind}</span>{question.critical && <span className="rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700">Kritis</span>}</div><span className="flex items-center gap-1 text-xs font-semibold text-slate-500"><Clock3 className="h-3.5 w-3.5"/>{question.minutes} menit</span></div>
          <p className="mt-4 text-xs font-semibold text-teal-700">Target: {question.target}</p><h2 className="mt-2 text-lg font-bold leading-relaxed text-slate-900">{question.question}</h2><div className="mt-4 rounded-xl bg-cyan-50 p-3 text-xs leading-relaxed text-cyan-950"><b>Pendalaman dan bukti minimum:</b> {question.evidence}</div>
        </section>
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="grid gap-1.5 text-xs font-bold text-slate-700">Ringkasan jawaban<textarea value={response.answer} onChange={(event) => updateResponse({ answer: event.target.value })} className={area} placeholder="Catat fakta, contoh, proses, aktor, dan hasil yang disampaikan..."/></label>
          <label className="grid gap-1.5 text-xs font-bold text-slate-700">Bukti aktual / referensi<textarea value={response.evidence} onChange={(event) => updateResponse({ evidence: event.target.value })} className={area} placeholder="Dokumen, data, log, contoh kasus, tanggal, dan pihak yang mengonfirmasi..."/></label>
          <div className="grid gap-4 md:grid-cols-2"><label className="grid gap-1.5 text-xs font-bold text-slate-700">Konsistensi<select className={field} value={response.consistency} onChange={(event) => updateResponse({ consistency: event.target.value as QuestionResponse['consistency'], asked: event.target.value === 'na' ? true : response.asked })}><option value="belum">Belum dinilai</option><option value="konsisten">Konsisten</option><option value="sebagian">Sebagian konsisten</option><option value="bertentangan">Bertentangan</option><option value="na">NA / tidak berlaku</option></select></label><label className="grid gap-1.5 text-xs font-bold text-slate-700">Evaluator<input className={field} value={response.interviewer} onChange={(event) => updateResponse({ interviewer: event.target.value })} placeholder="Nama evaluator"/></label></div>
          {question.role === 'Kunci' ? <div><p className="text-xs font-bold text-slate-700">Skor kunci 0–3</p><div className="mt-2 grid grid-cols-4 gap-2">{[0,1,2,3].map((score) => <button key={score} onClick={() => updateResponse({ score, asked: true })} className={cn('rounded-xl border px-3 py-3 text-sm font-bold transition', response.score === score ? score < 2 ? 'border-rose-600 bg-rose-600 text-white' : 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-200 text-slate-600 hover:border-teal-300')}>{score}</button>)}</div><p className="mt-2 text-[11px] text-slate-500">0 Tidak Terpenuhi · 1 Lemah/Formalitas · 2 Memadai · 3 Kuat/Berkelanjutan</p></div> : <div><p className="text-xs font-bold text-slate-700">Hasil penunjang/kontrol</p><div className="mt-2 grid grid-cols-3 gap-2">{(['ya','tidak','na'] as const).map((result) => <button key={result} onClick={() => updateResponse({ supportingResult: result, asked: true, consistency: result === 'na' ? 'na' : response.consistency })} className={cn('rounded-xl border px-3 py-2.5 text-xs font-bold uppercase transition', response.supportingResult === result ? result === 'ya' ? 'border-emerald-600 bg-emerald-600 text-white' : result === 'tidak' ? 'border-rose-600 bg-rose-600 text-white' : 'border-slate-600 bg-slate-600 text-white' : 'border-slate-200 text-slate-600')}>{result}</button>)}</div></div>}
          <div className="grid gap-3 rounded-xl border border-rose-100 bg-rose-50/60 p-3 md:grid-cols-[auto_auto_1fr]"><label className="flex items-center gap-2 text-xs font-bold text-rose-800"><input type="checkbox" checked={response.redFlag} onChange={(event) => updateResponse({ redFlag: event.target.checked, redFlagControlled: event.target.checked ? response.redFlagControlled : false })}/>Red flag</label><label className="flex items-center gap-2 text-xs font-bold text-rose-800"><input type="checkbox" checked={response.redFlagControlled} disabled={!response.redFlag} onChange={(event) => updateResponse({ redFlagControlled: event.target.checked })}/>Terkendali</label><input className={field} value={response.followUp} onChange={(event) => updateResponse({ followUp: event.target.value })} placeholder="Tindak lanjut / bukti tambahan"/></div>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700"><input type="checkbox" checked={response.asked} onChange={(event) => updateResponse({ asked: event.target.checked })}/>Pertanyaan telah digali</label>
        </section>
        <div className="flex items-center justify-between"><button disabled={activeIndex <= 0} onClick={() => selectQuestion(INTERVIEW_QUESTIONS[activeIndex-1].code)} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Sebelumnya</button><button disabled={activeIndex >= INTERVIEW_QUESTIONS.length-1} onClick={() => selectQuestion(INTERVIEW_QUESTIONS[activeIndex+1].code)} className="inline-flex items-center gap-1 rounded-xl bg-teal-700 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40">Berikutnya<ChevronRight className="h-4 w-4"/></button></div>
      </main>

      <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
        <section className={cn('rounded-2xl border p-4 shadow-sm', seconds <= 600 ? 'border-rose-200 bg-rose-50' : 'border-cyan-200 bg-white')}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Waktu diskusi</p><p className={cn('mt-1 font-mono text-3xl font-bold', seconds <= 600 ? 'text-rose-700' : 'text-cyan-800')}>{formatTime(seconds)}</p></div><Clock3 className="h-8 w-8 text-cyan-200"/></div><div className="mt-3 grid grid-cols-3 gap-2"><button onClick={() => { setRunning(!running); if (!running) setStatus('berlangsung'); else pauseTimer() }} className="flex items-center justify-center rounded-lg bg-cyan-700 py-2 text-white">{running ? <Pause className="h-4 w-4"/> : <Play className="h-4 w-4"/>}</button><button onClick={pauseTimer} className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-slate-600"><Save className="h-4 w-4"/></button><button onClick={() => { setRunning(false); setSeconds(5400); setSnapshot((old) => ({ ...old, timer: { secondsRemaining: 5400 } })) }} className="flex items-center justify-center rounded-lg border border-slate-200 bg-white py-2 text-slate-600"><RotateCcw className="h-4 w-4"/></button></div></section>
        <section className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm"><div className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-violet-700"/><h3 className="font-bold text-slate-900">Asisten probing</h3></div><p className="mt-1 text-xs leading-relaxed text-slate-500">Pilih celah jawaban. Klik pertanyaan probing untuk menandainya telah digunakan.</p><div className="mt-3 flex flex-wrap gap-1.5">{gapConfig.map((item) => <button key={item.id} onClick={() => setGap(item.id)} className={cn('rounded-full border px-2.5 py-1.5 text-[10px] font-bold transition', gap === item.id ? 'border-violet-700 bg-violet-700 text-white' : 'border-violet-100 bg-violet-50 text-violet-800 hover:border-violet-300')}>{item.label}</button>)}</div><div className="mt-4 max-h-[56vh] space-y-2 overflow-y-auto pr-1">{visibleProbes.map((probe) => { const used = response.usedProbes.includes(probe); return <button key={probe} onClick={() => updateResponse({ usedProbes: used ? response.usedProbes.filter((item) => item !== probe) : [...response.usedProbes, probe] })} className={cn('w-full rounded-xl border p-3 text-left text-xs leading-relaxed transition', used ? 'border-emerald-300 bg-emerald-50 text-emerald-900' : 'border-slate-200 bg-white text-slate-700 hover:border-violet-300 hover:bg-violet-50')}><span className="flex items-start gap-2">{used ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"/> : <Target className="mt-0.5 h-4 w-4 shrink-0 text-violet-500"/>}<span>{probe}</span></span></button>})}</div></section>
      </aside>
    </div>}
    {stage === 'ringkasan' && <SummaryPanel snapshot={snapshot} setSnapshot={setSnapshot} summary={summary} status={status} setStatus={setStatus}/>}
  </div>
}

function PreparationPanel({ snapshot, setSnapshot, updateMetadata }: { snapshot: InterviewSnapshot; setSnapshot: React.Dispatch<React.SetStateAction<InterviewSnapshot>>; updateMetadata: (key:string,value:string)=>void }) {
  function addIssue() {
    const issue: AndokIssue = { id: crypto.randomUUID(), source: '', dimension: '', finding: '', risk: '', clarification: '', expectedEvidence: '', evaluator: '', required: true }
    setSnapshot((old) => ({ ...old, preparation: { ...old.preparation, andokIssues: [...old.preparation.andokIssues, issue] } }))
  }
  function updateIssue(id: string, patch: Partial<AndokIssue>) { setSnapshot((old) => ({ ...old, preparation: { ...old.preparation, andokIssues: old.preparation.andokIssues.map((issue) => issue.id === id ? { ...issue, ...patch } : issue) } })) }
  function removeIssue(id: string) { setSnapshot((old) => ({ ...old, preparation: { ...old.preparation, andokIssues: old.preparation.andokIssues.filter((issue) => issue.id !== id) } })) }
  return <div className="space-y-4">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Users className="h-5 w-5 text-teal-700"/><h2 className="font-bold">Konteks satuan kerja</h2></div><div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">{[['ketua','Ketua'],['wakilKetua','Wakil Ketua'],['panitera','Panitera'],['sekretarisSatker','Sekretaris satker'],['jumlahPegawai','Jumlah pegawai'],['kompleksitasPerkara','Jumlah/kompleksitas perkara'],['riwayatEvaluasi','Riwayat evaluasi ZI'],['statusUpg','Status UPG & laporan terakhir'],['statusPemeriksaan','Pemeriksaan internal/eksternal'],['rekomendasiAndok','Rekomendasi ANDOK'],['keputusanPanel','Keputusan Panel TPI'],['tahunSebelumnya','Tahun pengusulan sebelumnya']].map(([key,label]) => <label key={key} className="grid gap-1 text-xs font-bold text-slate-600">{label}<input className={field} value={snapshot.metadata[key] ?? ''} onChange={(event) => updateMetadata(key,event.target.value)}/></label>)}</div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><div className="flex items-center gap-2"><FileText className="h-5 w-5 text-cyan-700"/><h2 className="font-bold">Telaah ANDOK / Panel TPI</h2></div><p className="mt-1 text-sm text-slate-500">Terjemahkan setiap catatan material menjadi klarifikasi dan bukti yang harus diuji.</p></div><button onClick={addIssue} className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-cyan-700 px-3 py-2 text-xs font-bold text-white"><Plus className="h-4 w-4"/>Tambah isu</button></div><div className="mt-4 space-y-3">{!snapshot.preparation.andokIssues.length && <button onClick={addIssue} className="w-full rounded-xl border border-dashed border-slate-300 py-8 text-sm font-semibold text-slate-500 hover:border-cyan-300 hover:bg-cyan-50">Belum ada isu. Tambahkan catatan material pertama.</button>}{snapshot.preparation.andokIssues.map((issue,index) => <div key={issue.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-3"><div className="mb-3 flex items-center justify-between"><span className="text-xs font-bold text-cyan-800">Isu {index+1}</span><button onClick={() => removeIssue(issue.id)} className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50" aria-label="Hapus isu"><Trash2 className="h-4 w-4"/></button></div><div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">{([['source','Sumber/catatan'],['dimension','Dimensi'],['finding','Temuan/kelemahan/kelebihan'],['risk','Risiko atau kontradiksi'],['clarification','Pertanyaan klarifikasi'],['expectedEvidence','Bukti yang diharapkan'],['evaluator','PIC evaluator']] as const).map(([key,label]) => <label key={key} className={cn('grid gap-1 text-xs font-bold text-slate-600', ['finding','risk','clarification','expectedEvidence'].includes(key) && 'lg:col-span-1')}>{label}<textarea className={`${field} min-h-20`} value={String(issue[key])} onChange={(event) => updateIssue(issue.id,{ [key]: event.target.value })}/></label>)}<label className="flex items-center gap-2 text-xs font-bold text-slate-600"><input type="checkbox" checked={issue.required} onChange={(event) => updateIssue(issue.id,{ required:event.target.checked })}/>Wajib digali</label></div></div>)}</div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-emerald-700"/><h2 className="font-bold">Kesiapan sebelum wawancara</h2></div><div className="mt-4 grid gap-2 md:grid-cols-2">{READINESS_ITEMS.map((item,index) => <label key={item} className={cn('flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition', snapshot.preparation.readiness[String(index)] ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-slate-200 text-slate-700')}><input type="checkbox" className="mt-1" checked={Boolean(snapshot.preparation.readiness[String(index)])} onChange={(event) => setSnapshot((old) => ({ ...old, preparation: { ...old.preparation, readiness: { ...old.preparation.readiness, [String(index)]: event.target.checked } } }))}/><span>{item}</span></label>)}</div><label className="mt-4 grid gap-1.5 text-xs font-bold text-slate-700">Catatan persiapan<textarea className={area} value={snapshot.preparation.notes} onChange={(event) => setSnapshot((old) => ({ ...old, preparation: { ...old.preparation, notes:event.target.value } }))}/></label></section>
  </div>
}

function SummaryPanel({ snapshot, setSnapshot, summary, status, setStatus }: { snapshot: InterviewSnapshot; setSnapshot: React.Dispatch<React.SetStateAction<InterviewSnapshot>>; summary: ReturnType<typeof computeInterviewSummary>; status: string; setStatus: (value: InterviewSessionRow['status'])=>void }) {
  const finalTone = summary.finalStatus === 'LULUS' ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : summary.finalStatus === 'TIDAK LULUS' ? 'border-rose-200 bg-rose-50 text-rose-950' : 'border-amber-200 bg-amber-50 text-amber-950'
  const recFields = [['strengths','Kekuatan utama'],['weaknesses','Kelemahan utama'],['redFlags','Red flags dan mitigasi'],['additionalEvidence','Bukti tambahan yang diminta'],['examination','Kondisi pemeriksaan internal/eksternal'],['differences','Perbedaan pendapat evaluator'],['conclusionBasis','Dasar kesimpulan akhir'],['handoff','Catatan handoff KKE Lead']] as const
  return <div className="space-y-4"><section className={`rounded-2xl border p-6 shadow-sm ${finalTone}`}><p className="text-xs font-bold uppercase tracking-wider">Status akhir berbasis aturan</p><h2 className="mt-2 text-3xl font-black">{summary.finalStatus}</h2><div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-white/70 px-3 py-1.5">{summary.complete}/28 butir lengkap</span><span className="rounded-full bg-white/70 px-3 py-1.5">{summary.openFlags} red flag terbuka</span><span className="rounded-full bg-white/70 px-3 py-1.5">4 dimensi kunci wajib Memadai</span></div></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-xs"><thead className="bg-slate-50 text-slate-600"><tr><th className="p-3">Dimensi</th><th className="p-3">Peran</th><th className="p-3">Selesai</th><th className="p-3">Rata-rata</th><th className="p-3">Skor kritis min.</th><th className="p-3">Red flag</th><th className="p-3">Status</th></tr></thead><tbody>{summary.dimensions.map((row) => <tr key={row.dimension} className="border-t border-slate-100"><td className="p-3 font-semibold text-slate-800">{row.dimension}</td><td className="p-3">{row.key ? 'Kunci' : 'Penunjang'}</td><td className="p-3">{row.complete}/{row.total}</td><td className="p-3">{row.average === null ? '—' : row.average.toFixed(2)}</td><td className="p-3">{row.criticalMin ?? '—'}</td><td className="p-3">{row.openFlags}</td><td className="p-3"><StatusPill value={row.status}/></td></tr>)}</tbody></table></div></section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><BookOpenCheck className="h-5 w-5 text-violet-700"/><h2 className="font-bold">Rekonsiliasi tim</h2></div><div className="mt-4 grid gap-4 md:grid-cols-2">{recFields.map(([key,label]) => <label key={key} className="grid gap-1.5 text-xs font-bold text-slate-700">{label}<textarea className={area} value={snapshot.reconciliation[key] ?? ''} onChange={(event) => setSnapshot((old) => ({ ...old, reconciliation: { ...old.reconciliation, [key]:event.target.value } }))}/></label>)}</div></section>
    <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div><p className="font-bold text-slate-900">Tahap sesi saat ini: {status}</p><p className="mt-1 text-xs text-slate-500">Status selesai tidak mengubah hasil aturan; lengkapi bukti dan rekonsiliasi sebelum menutup sesi.</p></div><div className="flex gap-2"><button onClick={() => setStatus('rekonsiliasi')} className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-bold text-violet-800">Tandai rekonsiliasi</button><button disabled={summary.finalStatus === 'BELUM DAPAT DISIMPULKAN'} onClick={() => setStatus('selesai')} className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40">Selesaikan sesi</button></div></section>
  </div>
}
