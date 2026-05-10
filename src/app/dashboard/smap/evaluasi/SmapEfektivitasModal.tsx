'use client'

import { useState } from 'react'
import { X, ClipboardCheck } from 'lucide-react'

type Question = {
  id: string
  teks: string
  pilihan: { label: string; nilai: number }[]
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    teks: 'Pengendalian risiko ini telah ditetapkan dalam kebijakan / peraturan / SOP tertulis:',
    pilihan: [
      { label: 'Belum ada kebijakan/SOP tertulis', nilai: 0 },
      { label: 'Ada kebijakan namun masih bersifat umum (tidak spesifik)', nilai: 1 },
      { label: 'Ada kebijakan/SOP tertulis yang spesifik dan sedang berlaku', nilai: 2 },
    ],
  },
  {
    id: 'q2',
    teks: 'Pengendalian ini telah disosialisasikan kepada seluruh pelaksana tugas yang relevan:',
    pilihan: [
      { label: 'Belum disosialisasikan sama sekali', nilai: 0 },
      { label: 'Sudah disosialisasikan secara informal/lisan saja', nilai: 1 },
      { label: 'Sudah disosialisasikan secara formal dan terdokumentasi', nilai: 2 },
    ],
  },
  {
    id: 'q3',
    teks: 'Pengendalian ini dijalankan secara konsisten oleh pegawai yang bertanggung jawab:',
    pilihan: [
      { label: 'Tidak/jarang dilaksanakan', nilai: 0 },
      { label: 'Dilaksanakan sebagian waktu / kadang-kadang', nilai: 1 },
      { label: 'Selalu dilaksanakan sesuai prosedur yang ditetapkan', nilai: 2 },
    ],
  },
  {
    id: 'q4',
    teks: 'Terdapat mekanisme pemantauan/pengawasan atas pelaksanaan pengendalian ini:',
    pilihan: [
      { label: 'Tidak ada pemantauan', nilai: 0 },
      { label: 'Ada pemantauan namun tidak rutin atau tidak terstruktur', nilai: 1 },
      { label: 'Ada pemantauan rutin dan terstruktur dengan pelaporan', nilai: 2 },
    ],
  },
  {
    id: 'q5',
    teks: 'Efektivitas pengendalian ini telah dikaji/dievaluasi dalam 12 bulan terakhir:',
    pilihan: [
      { label: 'Belum pernah dikaji/dievaluasi', nilai: 0 },
      { label: 'Pernah dikaji namun tidak formal / tanpa rekomendasi tindak lanjut', nilai: 1 },
      { label: 'Sudah dikaji secara formal dengan rekomendasi tindak lanjut yang terukur', nilai: 2 },
    ],
  },
]

function getKesimpulan(total: number) {
  if (total >= 7) return {
    label: 'Memadai',
    color: 'bg-green-100 border-green-300 text-green-800',
    badge: 'bg-green-600 text-white',
    desc: 'Pengendalian dinilai efektif dan memadai dalam memitigasi risiko penyuapan.',
    icon: '✓',
  }
  if (total >= 4) return {
    label: 'Cukup Memadai',
    color: 'bg-amber-100 border-amber-300 text-amber-800',
    badge: 'bg-amber-500 text-white',
    desc: 'Pengendalian cukup memadai namun masih memerlukan perbaikan pada beberapa aspek.',
    icon: '~',
  }
  return {
    label: 'Tidak Memadai',
    color: 'bg-red-100 border-red-300 text-red-800',
    badge: 'bg-red-600 text-white',
    desc: 'Pengendalian belum memadai dan perlu perbaikan signifikan agar efektif memitigasi risiko.',
    icon: '✗',
  }
}

type Props = {
  currentLevel: string | null
  onConfirm: (level: string) => void
}

export default function SmapEfektivitasModal({ currentLevel, onConfirm }: Props) {
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const allAnswered = QUESTIONS.every(q => answers[q.id] !== undefined)
  const total = Object.values(answers).reduce((s, v) => s + v, 0)
  const kesimpulan = allAnswered ? getKesimpulan(total) : null

  function handleConfirm() {
    if (!kesimpulan) return
    onConfirm(kesimpulan.label)
    setOpen(false)
  }

  function handleOpen() {
    setAnswers({})
    setOpen(true)
  }

  const levelColor = (l: string | null) => {
    if (l === 'Memadai') return 'bg-green-100 text-green-700 border-green-300'
    if (l === 'Cukup Memadai') return 'bg-amber-100 text-amber-700 border-amber-300'
    if (l === 'Tidak Memadai') return 'bg-red-100 text-red-700 border-red-300'
    return 'bg-slate-100 text-slate-500 border-slate-200'
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`w-full flex items-center justify-center gap-1 px-2 py-1.5 rounded border text-[10px] font-semibold transition-colors hover:opacity-80 ${levelColor(currentLevel)}`}
        title="Klik untuk menilai efektivitas pengendalian"
      >
        <ClipboardCheck className="w-3 h-3 shrink-0" />
        <span className="truncate">{currentLevel ?? 'Nilai Efektivitas'}</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-teal-50/60 shrink-0">
              <div>
                <h3 className="text-sm font-bold font-serif text-slate-800">Pengujian Efektivitas Pengendalian</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Jawab 5 pertanyaan untuk menentukan tingkat efektivitas</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Questions */}
            <div className="overflow-y-auto flex-1 p-5 space-y-4">
              {QUESTIONS.map((q, idx) => {
                const answered = answers[q.id] !== undefined
                return (
                  <div key={q.id} className={`rounded-xl border p-4 transition-colors ${answered ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200'}`}>
                    <p className="text-xs font-semibold text-slate-700 mb-3 leading-relaxed">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-black mr-2 shrink-0 align-middle">
                        {idx + 1}
                      </span>
                      {q.teks}
                    </p>
                    <div className="space-y-2">
                      {q.pilihan.map(p => {
                        const selected = answers[q.id] === p.nilai
                        return (
                          <label
                            key={p.nilai}
                            className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all text-[11px] leading-relaxed ${
                              selected
                                ? 'border-teal-400 bg-teal-50 text-teal-800 font-semibold'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name={q.id}
                              value={p.nilai}
                              checked={selected}
                              onChange={() => setAnswers(prev => ({ ...prev, [q.id]: p.nilai }))}
                              className="mt-0.5 shrink-0 accent-teal-600"
                            />
                            <span>{p.label}</span>
                            {selected && (
                              <span className="ml-auto shrink-0 text-[10px] font-black text-teal-600">
                                +{p.nilai}
                              </span>
                            )}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Progress */}
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <div className="flex-1 bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-teal-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(Object.keys(answers).length / QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <span>{Object.keys(answers).length}/{QUESTIONS.length} dijawab</span>
              </div>

              {/* Kesimpulan */}
              {kesimpulan && (
                <div className={`rounded-xl border-2 p-4 ${kesimpulan.color}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center text-base font-black ${kesimpulan.badge}`}>
                      {kesimpulan.icon}
                    </span>
                    <div>
                      <p className="text-sm font-black">{kesimpulan.label}</p>
                      <p className="text-[10px] font-medium opacity-70">Skor: {total}/10</p>
                    </div>
                  </div>
                  <p className="text-xs leading-relaxed opacity-90">{kesimpulan.desc}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-slate-50 flex items-center justify-between gap-3 shrink-0">
              <p className="text-[10px] text-slate-400">
                Skor 0–3: Tidak Memadai · 4–6: Cukup Memadai · 7–10: Memadai
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-lg border text-xs text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!allAnswered}
                  className="px-4 py-2 rounded-lg text-xs font-semibold transition-colors bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Gunakan Hasil Ini
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
