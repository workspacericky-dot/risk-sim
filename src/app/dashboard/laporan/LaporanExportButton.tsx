'use client'

import { useState, useTransition } from 'react'
import { generateMarpSlides } from './actions'
import { Presentation, Loader2, Download, Check } from 'lucide-react'

export function LaporanExportButton() {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ fileName: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleGenerate() {
    setError(null)
    setResult(null)
    startTransition(async () => {
      try {
        const res = await generateMarpSlides()
        setResult({ fileName: res.fileName })
      } catch (e) {
        setError('Gagal membuat presentasi. Coba lagi.')
      }
    })
  }

  if (result) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-800 text-sm">
          <Check className="size-4 shrink-0" />
          <span>File dibuat: <code className="font-mono text-xs">{result.fileName}</code></span>
        </div>
        <a
          href={`/generated-slides/${result.fileName}`}
          download
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-700 transition-colors"
        >
          <Download className="size-4" />
          Unduh .md
        </a>
        <button
          onClick={() => setResult(null)}
          className="px-3 py-2 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 transition-colors"
        >
          Buat Ulang
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span className="text-sm text-red-600">{error}</span>
      )}
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {isPending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Presentation className="size-4" />
        )}
        {isPending ? 'Membuat Paparan...' : 'Ekspor ke MARP Slides'}
      </button>
    </div>
  )
}
