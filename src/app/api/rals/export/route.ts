import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { EXPORT_STAGES, buildStageExport, type ExportStage } from '@/lib/rals-export'

export async function GET(request: NextRequest) {
  const participantId = request.nextUrl.searchParams.get('participantId')
  const stageParam = request.nextUrl.searchParams.get('stage')
  if (!participantId || !EXPORT_STAGES.includes(stageParam as ExportStage)) {
    return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
  }
  const stage = stageParam as ExportStage

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })

  const { data: participant } = await supabase
    .from('rals_participant').select('id, nama, session_id, user_id, konteks').eq('id', participantId).single()
  if (!participant || participant.user_id !== user.id) {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })
  }

  const sheet = await buildStageExport(supabase, participant, stage)

  const wb = new ExcelJS.Workbook()
  wb.creator = 'RALS — Risk Assessment Live Simulator'
  wb.created = new Date()
  const ws = wb.addWorksheet(sheet.title)
  ws.columns = sheet.columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 20 }))
  ws.addRows(sheet.rows)
  ws.getRow(1).font = { bold: true }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `RALS-${stage}-${participant.nama.replace(/\s+/g, '_')}.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
