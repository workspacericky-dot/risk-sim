'use client'

import { useEffect, useRef, useState } from 'react'
import { Expand, Minimize, ExternalLink, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react'

const DECK_URL = '/knowledge-decks/tinjauan-dokumen.html'
type VideoState = { active: boolean; playing: boolean; currentTime: number; duration: number; muted: boolean }
const initialVideoState: VideoState = { active: false, playing: false, currentTime: 0, duration: 0, muted: false }

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return '0:00'
  const value = Math.floor(seconds)
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`
}

export default function DeckViewer() {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoState, setVideoState] = useState<VideoState>(initialVideoState)

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current)
    document.addEventListener('fullscreenchange', onFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
  }, [])

  useEffect(() => {
    const onVideoState = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return
      if (event.data?.type !== 'smap-deck-video-state') return
      const { active, playing, currentTime, duration, muted } = event.data
      if (typeof active === 'boolean' && typeof playing === 'boolean' && typeof currentTime === 'number' && typeof duration === 'number' && typeof muted === 'boolean') {
        setVideoState({ active, playing, currentTime, duration, muted })
      }
    }
    window.addEventListener('message', onVideoState)
    return () => window.removeEventListener('message', onVideoState)
  }, [])

  function getVideo() {
    return iframeRef.current?.contentDocument?.querySelector<HTMLVideoElement>('[data-deck-video]')
  }

  function togglePlayback() {
    const video = getVideo()
    if (!video) return
    if (video.paused) void video.play().catch(() => {})
    else video.pause()
  }

  function skip(seconds: number) {
    const video = getVideo()
    if (video) video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + seconds))
  }

  function seek(seconds: number) {
    const video = getVideo()
    if (video) video.currentTime = seconds
  }

  function toggleMute() {
    const video = getVideo()
    if (video) video.muted = !video.muted
  }

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
        <span className="text-xs font-semibold">Tinjauan Dokumen SMAP · 61 slide</span>
        <div className="flex items-center gap-2">
          <a href={DECK_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10" title="Buka deck di tab baru"><ExternalLink className="size-4" /> Buka tab baru</a>
          <button type="button" onClick={toggleFullscreen} className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-semibold hover:bg-white/10" aria-label={isFullscreen ? 'Keluar dari fullscreen' : 'Tampilkan fullscreen'}>
            {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
            {isFullscreen ? 'Keluar fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </div>
      {videoState.active && (
        <div className="flex flex-wrap items-center gap-2 border-b border-white/10 bg-slate-900 px-4 py-2 text-white" role="group" aria-label="Kontrol video penilaian dokumen">
          <button type="button" onClick={() => skip(-10)} aria-label="Mundur 10 detik" className="rounded-lg p-2 hover:bg-white/10"><SkipBack className="size-4" /></button>
          <button type="button" onClick={togglePlayback} aria-label={videoState.playing ? 'Jeda video' : 'Putar video'} className="rounded-lg bg-amber-400 p-2 text-slate-950 hover:bg-amber-300">{videoState.playing ? <Pause className="size-4" /> : <Play className="size-4" />}</button>
          <button type="button" onClick={() => skip(10)} aria-label="Maju 10 detik" className="rounded-lg p-2 hover:bg-white/10"><SkipForward className="size-4" /></button>
          <span className="min-w-24 text-center text-xs tabular-nums text-slate-200">{formatTime(videoState.currentTime)} / {formatTime(videoState.duration)}</span>
          <input type="range" min={0} max={videoState.duration || 1} step={0.1} value={Math.min(videoState.currentTime, videoState.duration || 1)} onChange={event => seek(Number(event.target.value))} disabled={!videoState.duration} aria-label="Posisi video" className="min-w-36 flex-1 accent-amber-400" />
          <button type="button" onClick={toggleMute} aria-label={videoState.muted ? 'Nyalakan suara' : 'Bisukan suara'} className="rounded-lg p-2 hover:bg-white/10">{videoState.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}</button>
        </div>
      )}
      <iframe ref={iframeRef} title="Paparan Tinjauan Dokumen SMAP" src={DECK_URL} allow="fullscreen" className={`w-full border-0 bg-white ${isFullscreen ? 'min-h-0 flex-1' : 'h-[75vh] min-h-[520px]'}`} />
    </div>
  )
}
