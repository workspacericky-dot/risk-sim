import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { EXPORT_STAGES, buildStageExport, type ExportStage, type ExportSheet } from '@/lib/rals-export'
import { buildOrgStageExport } from '@/lib/rals-org-export'

export async function GET(request: NextRequest) {
  const stageParam = request.nextUrl.searchParams.get('stage')
  if (!EXPORT_STAGES.includes(stageParam as ExportStage)) {
    return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
  }
  const stage = stageParam as ExportStage
  const scope = request.nextUrl.searchParams.get('scope') === 'org' ? 'org' : 'own'

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })

  let sheet: ExportSheet
  let filenameSuffix: string

  if (scope === 'org') {
    const sessionId = request.nextUrl.searchParams.get('sessionId')
    if (!sessionId) return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
    // Siapa pun peserta terdaftar di sesi ini boleh mengekspor rekap organisasi.
    const { data: membership } = await supabase
      .from('rals_participant').select('id').eq('session_id', sessionId).eq('user_id', user.id).maybeSingle()
    if (!membership) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    sheet = await buildOrgStageExport(supabase, sessionId, stage)
    filenameSuffix = 'KepaniteraanMA'
  } else {
    const participantId = request.nextUrl.searchParams.get('participantId')
    if (!participantId) return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
    const { data: participant } = await supabase
      .from('rals_participant').select('id, nama, session_id, user_id, konteks').eq('id', participantId).single()
    if (!participant || participant.user_id !== user.id) {
      return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
    }
    sheet = await buildStageExport(supabase, participant, stage)
    filenameSuffix = participant.nama.replace(/\s+/g, '_')
  }

  const wb = new ExcelJS.Workbook()
  wb.creator = 'RALS — Risk Assessment Live Simulator'
  wb.created = new Date()
  const ws = wb.addWorksheet(sheet.title)
  ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  ws.addRows(sheet.rows)
  const headerRow = ws.getRow(1)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } } // slate-200, senada tabel PDF
  headerRow.alignment = { vertical: 'middle' }
  ws.views = [{ state: 'frozen', ySplit: 1 }]

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `RALS-${stage}-${filenameSuffix}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
