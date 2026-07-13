import { createClient } from '@/utils/supabase/server'
import InstructorConsole from './InstructorConsole'
import ParticipantView from './ParticipantView'

export const dynamic = 'force-dynamic'

export default async function RalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('users').select('role').eq('id', user.id).single()
    : { data: null }

  if (profile?.role === 'peserta_consulting') {
    return <ParticipantView />
  }

  const { data: sessions } = await supabase
    .from('rals_session')
    .select('id, kode, judul, scenario_id, tahap, created_at')
    .order('created_at', { ascending: false })

  return <InstructorConsole sessions={sessions ?? []} />
}
