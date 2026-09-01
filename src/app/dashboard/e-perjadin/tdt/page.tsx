import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { pekanTerakhir } from '@/lib/e-perjadin/metrik'
import { muatDeretMetrik } from './data'
import TdtDashboard from './TdtDashboard'

export const metadata = { title: 'TDT & Metrik Manajerial — E-Perjadin' }
export const dynamic = 'force-dynamic'

const PENGAWAS = ['pengelola_kegiatan', 'pemberi_tugas', 'staf_ppk', 'ppk', 'ppspm', 'bendahara', 'auditor_perjadin', 'kpa']

export default async function TdtPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) redirect('/dashboard/e-perjadin')

  const hariIni = new Date().toISOString().slice(0, 10)
  const deret = await muatDeretMetrik(supabase, hariIni)
  const pekanLalu = pekanTerakhir(hariIni, 2)[0]
  const barisPekanLalu = deret.find((d) => d.mingguMulai === pekanLalu)

  return (
    <TdtDashboard
      deret={deret}
      pekanLalu={pekanLalu}
      pekanLaluBelumSnapshot={!barisPekanLalu?.ada}
      dihitungPada={barisPekanLalu?.dihitungPada ?? null}
      bolehHitung={akses.isAdmin}
    />
  )
}
