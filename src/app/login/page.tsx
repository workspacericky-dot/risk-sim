'use client'

import { useState } from 'react'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Image from 'next/image'
import HeroScene from '@/components/HeroScene'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsLoading(true)
    setError(null)

    const formData = new FormData(event.currentTarget)
    const result = await login(formData)

    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">

      {/* ── Spline: full-screen background ───────────────────────────────── */}
      <div className="absolute inset-0">
        <HeroScene />
      </div>

      {/* ── Login card: centered, floating over the scene ─────────────────── */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm space-y-6 pointer-events-auto">

          {/* Logo + title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 drop-shadow-lg">
              <Image
                src="/risk-sim-logo.png"
                alt="Risk-Sim Logo"
                width={80}
                height={80}
                className="object-contain"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-700">Login Portal</h1>
              <p className="text-sm text-slate-500/90 mt-0.5">
                Gunakan kredensial satker yang telah terdaftar
              </p>
            </div>
          </div>

          {/* Glass card */}
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(195, 220, 240, 0.25)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
              border: '1px solid rgba(255, 255, 255, 0.45)',
              boxShadow: '0 8px 32px rgba(100, 160, 210, 0.18), inset 0 1px 0 rgba(255,255,255,0.6)',
            }}
          >
            {/* Gradient top bar */}
            <div className="h-[3px] bg-gradient-to-r from-green-700 via-teal-400 to-blue-400" />

            <div className="px-7 py-6 space-y-4">
              {error && (
                <div className="p-3 text-sm font-medium text-red-800 bg-red-100/70 rounded-lg border border-red-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                    Email Pengguna
                  </Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="pn-contoh@mahkamahagung.go.id"
                    required
                    className="placeholder:text-slate-400 text-slate-700 focus-visible:ring-blue-400/60"
                    style={{
                      background: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.65)',
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                    Kata Sandi
                  </Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="text-slate-700 focus-visible:ring-blue-400/60"
                    style={{
                      background: 'rgba(255,255,255,0.45)',
                      border: '1px solid rgba(255,255,255,0.65)',
                    }}
                  />
                </div>

                <div className="pt-1">
                  <Button
                    type="submit"
                    className="w-full text-white font-semibold transition-all"
                    disabled={isLoading}
                    style={{
                      background: 'linear-gradient(135deg, #1a5c38 0%, #1e7a50 100%)',
                      boxShadow: '0 4px 14px rgba(26, 92, 56, 0.4)',
                    }}
                  >
                    {isLoading ? 'Mengautentikasi...' : 'Masuk ke Sistem'}
                  </Button>
                </div>
              </form>
            </div>

            {/* Footer */}
            <div
              className="px-7 py-3 text-center space-y-0.5 border-t"
              style={{
                background: 'rgba(180, 215, 240, 0.15)',
                borderColor: 'rgba(255, 255, 255, 0.35)',
              }}
            >
              <p className="text-[11px] text-slate-500">© 2026 Ricky Pramoedya Hermawan. All rights reserved.</p>
              <p className="text-[10px] text-slate-400">Mahkamah Agung Republik Indonesia</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  )
}
