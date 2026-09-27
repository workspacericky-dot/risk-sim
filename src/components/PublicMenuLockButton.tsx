'use client'

import { useRouter } from 'next/navigation'
import { LockKeyhole } from 'lucide-react'
import { lockSiwasReport } from '@/app/dashboard/siwas/actions'
import { lockPohonKinerja } from '@/app/dashboard/siwas/pohon-actions'

export default function PublicMenuLockButton({ kind }: { kind: 'siwas' | 'pohon' }) {
  const router = useRouter()
  async function lock() {
    if (kind === 'siwas') await lockSiwasReport()
    else await lockPohonKinerja()
    router.refresh()
  }
  return <button type="button" onClick={lock} className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"><LockKeyhole className="h-4 w-4" /> Kunci menu</button>
}
