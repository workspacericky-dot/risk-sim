'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Shield } from 'lucide-react'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      {/* Background decoration */}
      <div className="absolute top-0 w-full h-[40vh] bg-green-900 border-b-4 border-yellow-500 rounded-b-[20%] shadow-lg -z-10" />
      
      <div className="mb-8 text-center text-white">
        <div className="mx-auto w-20 h-20 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-xl mb-4">
          <Shield className="w-10 h-10 text-yellow-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Sistem Manajemen Risiko</h1>
        <p className="text-green-50 opacity-90 max-w-md mx-auto">Mahkamah Agung Republik Indonesia</p>
      </div>

      <Card className="w-full max-w-md shadow-2xl border-0 overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-green-800 to-yellow-500" />
        <CardHeader className="space-y-1 pb-6">
          <CardTitle className="text-2xl font-semibold text-center">Login Portal</CardTitle>
          <CardDescription className="text-center">
            Gunakan kredensial satker yang telah terdaftar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form id="login-form" onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm font-medium text-red-800 bg-red-100 rounded-md border border-red-200">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Pengguna</Label>
              <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="pn-contoh@mahkamahagung.go.id" 
                required 
                className="focus-visible:ring-green-700"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Kata Sandi</Label>
              </div>
              <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
                className="focus-visible:ring-green-700"
              />
            </div>
            <div className="pt-2">
              <Button 
                type="submit" 
                className="w-full bg-green-800 hover:bg-green-900 text-white transition-colors"
                disabled={isLoading}
              >
                {isLoading ? 'Mengautentikasi...' : 'Masuk ke Sistem'}
              </Button>
            </div>
          </form>
        </CardContent>
        <CardFooter className="bg-slate-50 border-t flex flex-col items-center gap-0.5 py-4 text-xs text-slate-500">
          <p>© 2026 Ricky Pramoedya Hermawan. All rights reserved.</p>
          <p className="text-[10px] text-slate-400">Mahkamah Agung Republik Indonesia</p>
        </CardFooter>
      </Card>
    </div>
  )
}
