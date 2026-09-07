import ExcelJS from 'exceljs'
import { NextRequest, NextResponse } from 'next/server'
import { getPpgProgram } from '@/lib/ppg/data'

type Context = { params: Promise<{ fase: string }> }

export async function GET(request: NextRequest, { params }: Context) {
  const { fase } = await params
  const programId = request.nextUrl.searchParams.get('program') || ''
  if (!['perencanaan', 'pelaksanaan'].includes(fase) || !uuid(programId)) return NextResponse.json({ error: 'Parameter tidak valid.' }, { status: 400 })
  const { row: program } = await getPpgProgram(programId)
  if (!program) return NextResponse.json({ error: 'Program tidak ditemukan.' }, { status: 404 })
  const planning = fase === 'perencanaan'
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Risk-Sim'
  workbook.created = new Date()
  const sheet = workbook.addWorksheet(planning ? 'Perencanaan PPG' : 'Pelaksanaan PPG', { views: [{ state: 'frozen', ySplit: 6 }] })
  sheet.mergeCells('A1:M1'); sheet.getCell('A1').value = `LAPORAN ${planning ? 'PERENCANAAN' : 'PELAKSANAAN'} PROGRAM PENGENDALIAN GRATIFIKASI`
  sheet.getCell('A2').value = 'Kode'; sheet.getCell('B2').value = String(program.kode)
  sheet.getCell('A3').value = 'Program'; sheet.getCell('B3').value = String(program.nama)
  sheet.getCell('A4').value = 'Periode'; sheet.getCell('B4').value = String(program.period_label)
  sheet.getCell('A5').value = 'Dasar analisis'; sheet.getCell('B5').value = `${program.analysis_start} s.d. ${program.analysis_end}`
  const headers = planning
    ? ['Kode Tindakan','Rencana Tindakan','Kode Risiko','Peristiwa Risiko','Kontrol Terkait','Kelompok Sasaran','Sasaran Program','Indikator Program','Baseline','Target Indikator','Sumber/Frekuensi','PIC/Jadwal','Target Output']
    : ['Tanggal Update','Kode Tindakan','Rencana Tindakan','Kode Risiko','Kontrol Terkait','Indikator Program','Target Indikator','Realisasi Indikator','Status','Progres','Realisasi Output','Outcome/Catatan','Bukti']
  sheet.addRow(headers)
  const items = arrayRecords(program.items)
  for (const item of items) {
    const action = record(item.action); const legacyControl = record(item.control); const controls = arrayRecords(item.controls).map((link) => record(link.control)); const linkedControls = controls.length ? controls : (Object.keys(legacyControl).length ? [legacyControl] : []); const risk = record(item.risk)
    const controlLabel = linkedControls.map((control) => `${String(control.kode || '')} · ${String(control.nama || '')} (${String(control.jenis || '')})`).join('; ')
    if (planning) {
      sheet.addRow([action.kode, action.nama, risk.kode, risk.peristiwa, controlLabel, item.target, item.sasaran_program, item.indikator_program, `${String(item.baseline_indikator || '')} ${String(item.satuan_indikator || '')}`, `${String(item.arah_target || '')} ${String(item.target_indikator || '')} ${String(item.satuan_indikator || '')}`, `${String(item.sumber_data_indikator || '')} / ${String(item.frekuensi_pengukuran || '')}`, `${String(item.pic_jabatan || '')} / ${String(item.mulai || '')}–${String(item.selesai_rencana || '')}`, item.output_target])
    } else {
      const updates = arrayRecords(item.updates)
      if (!updates.length) sheet.addRow(['', action.kode, action.nama, risk.kode, controlLabel, item.indikator_program, item.target_indikator, '', item.status, `${item.progres}%`, '', 'Belum ada pembaruan', ''])
      for (const update of updates) sheet.addRow([update.tanggal, action.kode, action.nama, risk.kode, controlLabel, item.indikator_program, `${String(item.target_indikator || '')} ${String(item.satuan_indikator || '')}`, `${String(update.realisasi_indikator || '')} ${String(item.satuan_indikator || '')}`, String(update.status).replaceAll('_', ' '), `${update.progres}%`, update.output_realisasi, `${String(update.outcome_realisasi || '')} / ${String(update.catatan || '')}`, update.bukti_url])
    }
  }
  sheet.columns = [{ width: 18 }, { width: 34 }, { width: 18 }, { width: 36 }, { width: 34 }, { width: 28 }, { width: 34 }, { width: 38 }, { width: 18 }, { width: 20 }, { width: 28 }, { width: 28 }, { width: 34 }]
  sheet.getRow(1).height = 28
  sheet.getCell('A1').font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 14 }; sheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' }; sheet.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3730A3' } }
  const header = sheet.getRow(6); header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; header.alignment = { vertical: 'middle', wrapText: true }
  sheet.eachRow((row, number) => { if (number >= 6) { row.alignment = { vertical: 'top', wrapText: true }; row.eachCell((cell) => { cell.border = { top: { style: 'thin', color: { argb: 'FFD1D5DB' } }, left: { style: 'thin', color: { argb: 'FFD1D5DB' } }, bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } }, right: { style: 'thin', color: { argb: 'FFD1D5DB' } } } }) } })
  sheet.autoFilter = { from: 'A6', to: 'M6' }
  sheet.pageSetup = { orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, paperSize: 9 }
  const buffer = await workbook.xlsx.writeBuffer()
  const safeCode = String(program.kode).replace(/[^a-z0-9_-]/gi, '-')
  return new NextResponse(new Uint8Array(buffer), { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': `attachment; filename="${safeCode}-${fase}.xlsx"`, 'Cache-Control': 'no-store' } })
}

function uuid(value: string) { return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value) }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function arrayRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : [] }
