import { notFound } from 'next/navigation'
import { requireZiAccess } from '@/lib/uji-publik-zi/access'
import { emptySnapshot } from '@/lib/wawancara-zi/questions'
import type { InterviewSessionRow, InterviewSnapshot } from '@/lib/wawancara-zi/types'
import { InterviewConsole } from './InterviewConsole'

function normalizeSnapshot(value: unknown): InterviewSnapshot {
  const empty = emptySnapshot()
  if (!value || typeof value !== 'object') return empty
  const source = value as Partial<InterviewSnapshot>
  return {
    ...empty,
    ...source,
    metadata: { ...empty.metadata, ...(source.metadata ?? {}) },
    preparation: {
      ...empty.preparation,
      ...(source.preparation ?? {}),
      readiness: { ...empty.preparation.readiness, ...(source.preparation?.readiness ?? {}) },
      andokIssues: Array.isArray(source.preparation?.andokIssues) ? source.preparation.andokIssues : [],
    },
    responses: Object.fromEntries(Object.entries(empty.responses).map(([code, response]) => [code, { ...response, ...(source.responses?.[code] ?? {}) }])),
    reconciliation: { ...empty.reconciliation, ...(source.reconciliation ?? {}) },
    timer: { ...empty.timer, ...(source.timer ?? {}) },
  }
}

export default async function InterviewSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { supabase } = await requireZiAccess()
  const { data, error } = await supabase.from('zi_interview_sessions').select('*').eq('id', id).single()
  if (error || !data) notFound()
  const session = data as InterviewSessionRow
  session.snapshot = normalizeSnapshot(session.snapshot)
  return <InterviewConsole session={session}/>
}
