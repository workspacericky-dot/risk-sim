import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { EXPORT_STAGES, buildStageExport, STAGE_TITLES, type ExportStage } from '@/lib/rals-export'
import AutoPrint from './AutoPrint'

export const dynamic = 'force-dynamic'

export default async function RalsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ participantId?: string; stage?: string }>
}) {
  const { participantId, stage: stageParam } = await searchParams
  if (!participantId || !EXPORT_STAGES.includes(stageParam as ExportStage)) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Parameter ekspor tidak valid.</div>
  }
  const stage = stageParam as ExportStage

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: participant } = await supabase
    .from('rals_participant').select('id, nama, session_id, user_id, konteks').eq('id', participantId).single()
  if (!participant || participant.user_id !== user.id) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Akses ditolak — data ini bukan milik akun Anda.</div>
  }

  const { data: session } = await supabase.from('rals_session').select('judul').eq('id', participant.session_id).single()
  const sheet = await buildStageExport(supabase, participant, stage)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      <AutoPrint />

      <div className="text-center space-y-1 border-b-2 border-slate-800 pb-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-400">RALS — Risk Assessment Live Simulator · Khusus Edukasi</p>
        <h1 className="text-xl font-bold font-serif">{STAGE_TITLES[stage]}</h1>
        <p className="text-xs text-slate-500">
          {session?.judul ?? 'Sesi RALS'} — {participant.nama} · Dicetak {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {sheet.rows.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-10">Belum ada data untuk tahap ini.</p>
      ) : (
        <table className="w-full text-[10px] border-collapse">
          <thead>
            <tr className="bg-slate-100">
              {sheet.columns.map((c) => (
                <th key={c.key} className="border border-slate-300 px-2 py-1.5 text-left font-semibold text-slate-700">{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, i) => (
              <tr key={i} className="even:bg-slate-50">
                {sheet.columns.map((c) => (
                  <td key={c.key} className="border border-slate-200 px-2 py-1.5 align-top text-slate-700">{row[c.key] ?? ''}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="text-[9px] text-slate-400 text-center pt-4">
        Dokumen ini dihasilkan oleh simulasi RALS untuk tujuan pelatihan/edukasi — bukan dokumen manajemen risiko resmi.
      </p>
    </div>
  )
}
