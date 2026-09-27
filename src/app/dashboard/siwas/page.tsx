import { redirect } from 'next/navigation'
import { getSiwasSetting, getSiwasUser } from '@/lib/siwas-access'
import { getPohonSetting } from '@/lib/pohon-access'
import AdminMenuPortal from './AdminMenuPortal'

export default async function SiwasPage() {
  const user = await getSiwasUser()
  if (!user || user.role !== 'admin_sistem') redirect('/dashboard')
  const [siwas, pohon] = await Promise.all([getSiwasSetting(), getPohonSetting()])
  return <AdminMenuPortal configured={{ siwas: Boolean(siwas), pohon: Boolean(pohon) }} />
}
