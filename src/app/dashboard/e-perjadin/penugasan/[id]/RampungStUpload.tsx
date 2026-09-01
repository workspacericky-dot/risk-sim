'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { unggahStRampung } from '../actions'

export default function RampungStUpload({
  penugasanId, adaBerkas, unduhUrl, bolehUnggah,
}: {
  penugasanId: string
  adaBerkas: boolean
  unduhUrl: string | null
  bolehUnggah: boolean
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const [pending, mulai] = useTransition()

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-2">
      <div className="font-semibold text-amber-900">Alur Rampung — Surat Tugas eksternal</div>
      {adaBerkas && unduhUrl && (
        <a href={unduhUrl} target="_blank" className="inline-flex items-center gap-1.5 text-amber-800 underline font-medium">
          <Upload className="w-3.5 h-3.5 rotate-180" /> Unduh berkas ST terlampir
        </a>
      )}
      {bolehUnggah && (
        <form className="flex flex-wrap items-center gap-2"
          action={(fd) => {
            setErr(null)
            if (file) fd.set('berkas', file)
            mulai(async () => {
              const r = await unggahStRampung(penugasanId, fd)
              if ('error' in r) setErr(r.error)
              else { setFile(null); router.refresh() }
            })
          }}>
          <input type="file" accept="image/*,application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-xs" />
          <Button type="submit" size="sm" disabled={pending || !file}>{adaBerkas ? 'Ganti berkas' : 'Unggah berkas ST'}</Button>
        </form>
      )}
      {!bolehUnggah && !adaBerkas && <p className="text-xs text-amber-700">Menunggu Pengelola melampirkan berkas ST.</p>}
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  )
}
