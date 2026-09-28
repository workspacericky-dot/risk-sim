'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { hapusPenugasan } from './actions'

export default function TombolHapusPenugasan({ id, label }: { id: string; label: string }) {
  const router = useRouter()
  const [galat, setGalat] = useState<string | null>(null)
  const [menghapus, mulai] = useTransition()

  function hapus() {
    if (!window.confirm(`Hapus penugasan "${label}"?\n\nData peserta, dokumen, presensi, laporan, E-SPJ, dan komitmen anggaran terkait akan ikut dihapus. Tindakan ini tidak dapat dibatalkan.`)) return
    setGalat(null)
    mulai(async () => {
      try {
        const hasil = await hapusPenugasan(id)
        if ('error' in hasil) { setGalat(hasil.error); return }
        router.refresh()
      } catch {
        setGalat('Gagal menghapus penugasan. Silakan coba kembali.')
      }
    })
  }

  return (
    <div className="space-y-1">
      <Button type="button" variant="destructive" size="sm" disabled={menghapus} onClick={hapus} aria-label={`Hapus penugasan ${label}`}>
        <Trash2 className="size-4" aria-hidden="true" />
        {menghapus ? 'Menghapus...' : 'Hapus'}
      </Button>
      {galat && <p role="alert" className="max-w-64 whitespace-normal text-xs text-red-600">{galat}</p>}
    </div>
  )
}
