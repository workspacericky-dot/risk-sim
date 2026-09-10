import { redirect } from 'next/navigation'
import { SIWAS_PUBLIC_SUBJECT, getSiwasSetting, getSiwasUser, hasSiwasUnlock } from '@/lib/siwas-access'
import SiwasReportPortal from './SiwasReportPortal'

export default async function SiwasPage() {
  const user = await getSiwasUser()
  if (!user) redirect('/dashboard')
  const setting = await getSiwasSetting()
  const unlocked = await hasSiwasUnlock(SIWAS_PUBLIC_SUBJECT, setting)

  return <SiwasReportPortal initiallyUnlocked={unlocked} isAdmin={user.role === 'admin_sistem'} pinConfigured={Boolean(setting)} />
}
