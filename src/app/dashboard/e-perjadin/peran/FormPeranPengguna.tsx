'use client'

import { useState, useTransition } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { PERAN_PERJADIN, LABEL_PERAN, type PeranPerjadin } from '@/lib/e-perjadin/konstanta'
import { setPeranPengguna } from './actions'

export default function FormPeranPengguna({
  userId,
  peranAwal,
}: {
  userId: string
  peranAwal: string[]
}) {
  const [dipilih, setDipilih] = useState<Set<string>>(new Set(peranAwal))
  const [galat, setGalat] = useState<string | null>(null)
  const [tersimpan, setTersimpan] = useState(false)
  const [menyimpan, mulai] = useTransition()

  const berubah =
    dipilih.size !== peranAwal.length || peranAwal.some((p) => !dipilih.has(p))

  function toggle(p: string) {
    setTersimpan(false)
    setGalat(null)
    setDipilih((prev) => {
      const next = new Set(prev)
      if (next.has(p)) next.delete(p)
      else next.add(p)
      return next
    })
  }

  function simpan() {
    setGalat(null)
    mulai(async () => {
      const hasil = await setPeranPengguna(userId, [...dipilih])
      if (hasil.error) setGalat(hasil.error)
      else setTersimpan(true)
    })
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {PERAN_PERJADIN.map((p) => {
          const aktif = dipilih.has(p)
          return (
            <button
              key={p}
              type="button"
              onClick={() => toggle(p)}
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                aktif
                  ? 'border-slate-800 bg-slate-800 text-white'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400'
              }`}
            >
              {LABEL_PERAN[p as PeranPerjadin]}
            </button>
          )
        })}
      </div>

      {galat && (
        <p className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          {galat}
        </p>
      )}

      {berubah && (
        <button
          type="button"
          onClick={simpan}
          disabled={menyimpan}
          className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white disabled:opacity-50"
        >
          {menyimpan ? 'Menyimpan…' : 'Simpan'}
        </button>
      )}
      {tersimpan && !berubah && (
        <p className="flex items-center gap-1.5 text-xs text-green-600">
          <Check className="w-3.5 h-3.5" /> Tersimpan
        </p>
      )}
    </div>
  )
}
