'use client'

import { useState } from 'react'
import { login, register } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Lock } from 'lucide-react'
import Image from 'next/image'
import HeroScene from '@/components/HeroScene'

type Mode = 'masuk' | 'daftar'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('masuk')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    if (mode === 'daftar' && password !== confirmPassword) {
      setError('Konfirmasi kata sandi tidak cocok.')
      return
    }
    setIsLoading(true)
    const formData = new FormData(event.currentTarget)
    const result = mode === 'masuk' ? await login(formData) : await register(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirmPassword('')
  }

  const fieldStyle = {
    background: 'rgba(255,255,255,0.45)',
    border: '1px solid rgba(255,255,255,0.65)',
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Background scene */}
      <div className="absolute inset-0">
        <HeroScene />
      </div>

      {/* Card */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-sm space-y-6 pointer-events-auto">

          {/* Logo + title */}
          <div className="text-center space-y-2">
            <div className="mx-auto w-20 h-20 drop-shadow-lg">
              <Image src="/risk-sim-logo.png" alt="Risk-Sim Logo" width={80} height={80} className="object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-700">
                {mode === 'masuk' ? 'Login Portal' : 'Daftar Peserta'}
              </h1>
              <p className="text-sm text-slate-500/90 mt-0.5">
                {mode === 'masuk'
                  ? 'Gunakan kredensial yang telah terdaftar'
                  : 'Buat akun untuk mengikuti sesi consulting'}
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
            <div className="h-[3px] bg-gradient-to-r from-green-700 via-teal-400 to-blue-400" />

            <div className="px-7 py-6 space-y-4">
              {/* MASUK / DAFTAR toggle */}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.35)' }}>
                {(['masuk', 'daftar'] as Mode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      mode === m ? 'text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                    style={mode === m ? { background: 'linear-gradient(135deg, #1a5c38 0%, #1e7a50 100%)' } : undefined}
                  >
                    {m === 'masuk' ? 'Masuk' : 'Daftar'}
                  </button>
                ))}
              </div>

              {error && (
                <div className="p-3 text-sm font-medium text-red-800 bg-red-100/70 rounded-lg border border-red-200/60">
                  {error}
                </div>
              )}

              <form onSubmit={onSubmit} className="space-y-4">
                {mode === 'daftar' && (
                  <div className="space-y-1.5">
                    <Label htmlFor="nama_lengkap" className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                      Nama Lengkap
                    </Label>
                    <Input id="nama_lengkap" name="nama_lengkap" type="text" placeholder="Nama Anda" required
                      className="placeholder:text-slate-400 text-slate-700 focus-visible:ring-blue-400/60" style={fieldStyle} />
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-600 font-semibold text-xs tracking-wide uppercase flex items-center gap-1">
                    {mode === 'masuk' ? 'Email atau Nama Lengkap' : 'Email Pengguna'}
                    {mode === 'daftar' && (
                      <span className="relative inline-block group leading-none">
                        <span className="text-indigo-500 cursor-help align-super text-[13px]">*</span>
                        <span className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 w-52 rounded-lg bg-slate-800 text-white text-[10px] font-normal normal-case tracking-normal px-2.5 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-20 shadow-lg text-center">
                          Opsional. Tanpa email, Anda login memakai nama lengkap sebagai ID.
                        </span>
                      </span>
                    )}
                  </Label>
                  <Input id="email" name="email"
                    type={mode === 'masuk' ? 'text' : 'email'}
                    required={mode === 'masuk'}
                    placeholder={mode === 'masuk' ? 'Email atau nama lengkap' : 'nama@contoh.go.id (opsional)'}
                    className="placeholder:text-slate-400 text-slate-700 focus-visible:ring-blue-400/60" style={fieldStyle} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                    Kata Sandi
                  </Label>
                  <Input id="password" name="password" type="password" required
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    minLength={mode === 'daftar' ? 8 : undefined}
                    placeholder={mode === 'daftar' ? 'Minimal 8 karakter' : undefined}
                    className="text-slate-700 focus-visible:ring-blue-400/60" style={fieldStyle} />
                </div>

                {mode === 'daftar' && password.length > 0 && (
                  <div className="space-y-1.5">
                    <Label htmlFor="password_confirm" className="text-slate-600 font-semibold text-xs tracking-wide uppercase">
                      Konfirmasi Kata Sandi
                    </Label>
                    <Input id="password_confirm" name="password_confirm" type="password" required
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Ketik ulang kata sandi"
                      className="text-slate-700 focus-visible:ring-blue-400/60" style={fieldStyle} />
                    {confirmPassword.length > 0 && confirmPassword !== password && (
                      <p className="text-[11px] text-red-600">Belum cocok dengan kata sandi.</p>
                    )}
                  </div>
                )}

                {mode === 'daftar' && (
                  <div className="space-y-1.5">
                    <Label className="text-slate-600 font-semibold text-xs tracking-wide uppercase">Peran</Label>
                    <div className="relative">
                      <select
                        name="role"
                        disabled
                        className="w-full appearance-none rounded-md px-3 py-2 text-sm text-slate-700 cursor-not-allowed"
                        style={fieldStyle}
                      >
                        <option>Peserta Consulting</option>
                      </select>
                      <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[11px] text-slate-500/90">Peran terkunci untuk pendaftaran mandiri.</p>
                  </div>
                )}

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
                    {isLoading
                      ? (mode === 'masuk' ? 'Mengautentikasi...' : 'Mendaftarkan...')
                      : (mode === 'masuk' ? 'Masuk ke Sistem' : 'Daftar & Mulai')}
                  </Button>
                </div>
              </form>
            </div>

            <div
              className="px-7 py-3 text-center space-y-0.5 border-t"
              style={{ background: 'rgba(180, 215, 240, 0.15)', borderColor: 'rgba(255, 255, 255, 0.35)' }}
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
