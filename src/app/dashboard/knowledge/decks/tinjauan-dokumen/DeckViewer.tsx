'use client'

import { useEffect, useRef, useState } from 'react'
import { Expand, Minimize, ExternalLink } from 'lucide-react'

const DECK_URL = '/knowledge-decks/tinjauan-dokumen.html'

export default function DeckViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  async function toggleFullscreen() {
    if (document.fullscreenElement === containerRef.current) {
      await document.exitFullscreen()
    } else {
      await containerRef.current?.requestFullscreen()
    }
  }

  return (
    <div ref={containerRef} className={`overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm ${isFullscreen ? 'flex h-screen flex-col rounded-none border-0' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-slate-900 px-4 py-2 text-white">
        <span className="text-xs font-semibold">Tinjauan Dokumen SMAP · 59 slide</span>
        <div className="flex items-center gap-2">
          <a href={DECK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10" title="Buka deck di tab baru"><ExternalLink className="size-4" /> Buka tab baru</a>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10" aria-label={isFullscreen ? 'Keluar dari fullscreen' : 'Tampilkan fullscreen'}>
            {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
            {isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>
      <iframe title="Paparan Tinjauan Dokumen SMAP" src={DECK_URL} allow="fullscreen" className={`w-full border-0 bg-white ${isFullscreen ? 'min-h-0 flex-1' : 'h-[75vh] min-h-[520px]'}`} />
    </div>
  )
}
