import { NextRequest, NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { createClient } from '@/utils/supabase/server'
import { EXPORT_STAGES, type ExportStage } from '@/lib/rals-export'
import { buildOrgStageExport } from '@/lib/rals-org-export'

export async function GET(request: NextRequest) {
  const stageParam = request.nextUrl.searchParams.get('stage')
  if (!EXPORT_STAGES.includes(stageParam as ExportStage)) {
    return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
  }
  const stage = stageParam as ExportStage

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Tidak terautentikasi.' }, { status: 401 })

  // Siapa pun peserta terdaftar di sesi ini boleh mengekspor rekap organisasi.
  const { data: membership } = await supabase
    .from('rals_participant').select('id').eq('session_id', sessionId).eq('user_id', user.id).maybeSingle()
  if (!membership) return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 })

  const sheet = await buildOrgStageExport(supabase, sessionId, stage)

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
  const filename = `RALS-${stage}-KepaniteraanMA.xlsx`
  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
