import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { EXPORT_STAGES, type ExportStage } from '@/lib/rals-export'
import { buildOrgStageExport } from '@/lib/rals-org-export'
import AutoPrint from './AutoPrint'

export const dynamic = 'force-dynamic'

export default async function RalsPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ sessionId?: string; stage?: string }>
}) {
  const { sessionId, stage: stageParam } = await searchParams
  if (!EXPORT_STAGES.includes(stageParam as ExportStage)) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Parameter ekspor tidak valid.</div>
  }
  const stage = stageParam as ExportStage
  if (!sessionId) return <div className="p-8 text-center text-sm text-muted-foreground">Parameter ekspor tidak valid.</div>

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Siapa pun peserta terdaftar di sesi ini boleh mengekspor rekap organisasi.
  const { data: membership } = await supabase
    .from('rals_participant').select('id').eq('session_id', sessionId).eq('user_id', user.id).maybeSingle()
  if (!membership) return <div className="p-8 text-center text-sm text-muted-foreground">Akses ditolak.</div>

  const sheet = await buildOrgStageExport(supabase, sessionId, stage)

  return (
    <div className="w-full p-6 space-y-3">
      <AutoPrint />

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
