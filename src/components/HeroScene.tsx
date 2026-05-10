'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

// Must be dynamically imported with ssr:false — Spline uses WebGL which is browser-only
const Spline = dynamic(() => import('@splinetool/react-spline'), { ssr: false })

const SCENE_URL = 'https://prod.spline.design/Dxjj84uOcWpueIG9/scene.splinecode'

export default function HeroScene() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div className="relative w-full h-full min-h-[400px] bg-black">
      {/* Loading skeleton — fades out once Spline fires onLoad */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black transition-opacity duration-700 z-10 ${
          loaded ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
      >
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping" />
          <div className="absolute inset-2 rounded-full border-2 border-white/15 animate-ping [animation-delay:300ms]" />
          <div className="absolute inset-4 rounded-full border-2 border-white/25 animate-ping [animation-delay:600ms]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-white/30 animate-pulse" />
          </div>
        </div>
        <p className="text-xs text-white/40 tracking-widest font-mono uppercase animate-pulse">
          Memuat scene...
        </p>
      </div>

      {/* Spline canvas — clean, no overlays */}
      <Spline
        scene={SCENE_URL}
        onLoad={() => setLoaded(true)}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
