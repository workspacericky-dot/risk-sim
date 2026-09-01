import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { LABEL_PERAN, type PeranPerjadin } from '@/lib/e-perjadin/konstanta'
import EPerjadinHub from './EPerjadinHub'

export const metadata = { title: 'E-Perjadin Bawas' }

export default async function EPerjadinPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const bisaAnomali = akses.isAdmin || akses.peran.some((p) =>
    ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas', 'ppspm', 'bendahara'].includes(p))
  const bisaPenyelesaian = akses.isAdmin || akses.peran.some((p) => ['bendahara', 'ppk', 'staf_ppk'].includes(p))
  const bisaTdt = bisaAnomali || akses.peran.includes('kpa')

  return (
    <EPerjadinHub
      isAdmin={akses.isAdmin}
      bisaAnomali={bisaAnomali}
      bisaPenyelesaian={bisaPenyelesaian}
      bisaTdt={bisaTdt}
      peran={akses.peran.map((p) => LABEL_PERAN[p as PeranPerjadin])}
    />
  )
}
