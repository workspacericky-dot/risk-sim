import 'server-only'

import { createPpgAdminClient, PPG_DEMO_SCENARIO_ID } from './scenario'

const ids = {
  risks: ['d1000000-0000-4000-8000-000000000001', 'd1000000-0000-4000-8000-000000000002', 'd1000000-0000-4000-8000-000000000003', 'd1000000-0000-4000-8000-000000000004', 'd1000000-0000-4000-8000-000000000005'],
  controls: ['d2000000-0000-4000-8000-000000000001', 'd2000000-0000-4000-8000-000000000002', 'd2000000-0000-4000-8000-000000000003', 'd2000000-0000-4000-8000-000000000004', 'd2000000-0000-4000-8000-000000000005', 'd2000000-0000-4000-8000-000000000006', 'd2000000-0000-4000-8000-000000000007', 'd2000000-0000-4000-8000-000000000008'],
  batch: 'd3000000-0000-4000-8000-000000000001',
  snapshot: 'd4000000-0000-4000-8000-000000000001',
  program: 'd5000000-0000-4000-8000-000000000001',
  programItem: 'd5100000-0000-4000-8000-000000000001',
  riskImportBatch: 'd6000000-0000-4000-8000-000000000001',
  candidate: 'd6100000-0000-4000-8000-000000000001',
}

type DemoSeedResult = { ok: boolean; created: boolean; message: string }

export async function ensurePpgDemoData(actorId?: string): Promise<DemoSeedResult> {
  const db = createPpgAdminClient(PPG_DEMO_SCENARIO_ID)
  const [existingRisks, existingReports, existingPrograms, existingLossEvents, existingAppetites] = await Promise.all([
    db.from('ppg_risk_library').select('id', { count: 'exact', head: true }),
    db.from('ppg_reports').select('id', { count: 'exact', head: true }),
    db.from('ppg_programs').select('id', { count: 'exact', head: true }),
    db.from('ppg_loss_events').select('id', { count: 'exact', head: true }),
    db.from('ppg_risk_appetites').select('id', { count: 'exact', head: true }),
  ])
  if (existingRisks.count === 5 && existingReports.count === 369 && existingPrograms.count === 1 && (existingLossEvents.count || 0) >= 50 && (existingAppetites.count || 0) >= 25) return { ok: true, created: false, message: 'Data simulasi sudah tersedia.' }
  if ((existingRisks.count || 0) + (existingReports.count || 0) + (existingPrograms.count || 0) + (existingLossEvents.count || 0) + (existingAppetites.count || 0) > 0) return resetPpgDemoData(actorId)

  const [{ data: units, error: unitError }, { data: actions, error: actionError }] = await Promise.all([
    db.from('unit_kerja').select('id,nama_unit').ilike('nama_unit', '%Pengadilan%').order('nama_unit').limit(60),
    db.from('ppg_action_catalog').select('id,kode').eq('status', 'aktif').order('kode').limit(1),
  ])
  if (unitError || !units?.length) return { ok: false, created: false, message: `Master Satker tidak tersedia: ${unitError?.message || 'kosong'}` }
  if (actionError || !actions?.length) return { ok: false, created: false, message: `Katalog tindakan tidak tersedia: ${actionError?.message || 'kosong'}` }

  const risks = [
    ['PPG.RK.1', 'Risiko Kecurangan', 'Pelayanan Publik', '', 'Sektor Pelayanan Publik', 'Sistem', 'Pemberian uang atau fasilitas untuk memengaruhi layanan pengadilan.', 'Interaksi langsung belum seluruhnya transparan.', 'Independensi layanan dan reputasi lembaga menurun.'],
    ['PPG.RP.1', 'Risiko Kepatuhan', 'Administrasi Perkara', '', 'Sektor Pelayanan Publik', 'Pemahaman', 'Keterlambatan pelaporan penerimaan gratifikasi oleh aparatur.', 'Batas waktu dan kanal pelaporan belum dipahami merata.', 'Kepatuhan pelaporan menurun dan tindak lanjut terlambat.'],
    ['PPG.RO.1', 'Risiko Operasional', 'Administrasi Umum', 'Pengadaan Barang/Jasa', 'Sektor Pengadaan Barang dan/atau Jasa', 'Penegakan Aturan', 'Pemberian hadiah oleh penyedia pada tahapan pengadaan.', 'Deklarasi konflik kepentingan belum konsisten.', 'Objektivitas pengadaan dan kepercayaan penyedia terganggu.'],
    ['PPG.RK.2', 'Risiko Kecurangan', 'Administrasi Persidangan', '', 'Sektor Pelayanan Publik', 'Pemeriksaan', 'Pemberian parsel pada periode hari raya kepada pejabat atau pegawai.', 'Pemantauan periode rawan belum berbasis pola data.', 'Muncul persepsi keberpihakan dan konflik kepentingan.'],
    ['PPG.RM.1', 'Risiko Kemitraan', 'Penanganan Pengaduan', '', 'Sektor Lainnya', 'Sistem', 'Pemberian fasilitas dari mitra eksternal dalam kegiatan kedinasan.', 'Standar penerimaan fasilitas eksternal belum seragam.', 'Hubungan kemitraan menjadi tidak independen.'],
  ].map((row, index) => ({ id: ids.risks[index], kode: row[0], kategori: row[1], proses_bisnis: row[2], subproses_bisnis: row[3], klasifikasi_risiko: row[4], faktor_penyebab: row[5], peristiwa: row[6], penyebab: row[7], dampak: row[8], status: 'aktif', created_by: actorId || null }))
  const controls = [
    ['PPG.K.1', 'Banner larangan gratifikasi pada area layanan', 'Preventif'],
    ['PPG.K.2', 'Kanal pelaporan dan pengingat batas waktu', 'Preventif'],
    ['PPG.K.3', 'Register penerimaan/penolakan gratifikasi', 'Detektif'],
    ['PPG.K.4', 'Deklarasi konflik kepentingan pengadaan', 'Preventif'],
    ['PPG.K.5', 'Reviu berkala transaksi dan dokumen pendukung', 'Detektif'],
    ['PPG.K.6', 'Briefing integritas menjelang periode rawan', 'Preventif'],
    ['PPG.K.7', 'Verifikasi UPG atas bukti pelaporan', 'Detektif'],
    ['PPG.K.8', 'Tindak lanjut korektif dan lesson learned', 'Korektif'],
  ].map((row, index) => ({ id: ids.controls[index], kode: row[0], nama: row[1], jenis: row[2], uraian: `${row[1]} disertai bukti pelaksanaan yang dapat diverifikasi.`, status: 'aktif', created_by: actorId || null }))

  let result = await db.from('ppg_risk_library').insert(risks)
  if (result.error) return failed('Risk Library', result.error.message)
  result = await db.from('ppg_control_library').insert(controls)
  if (result.error) return failed('Control Library', result.error.message)
  const mappings = risks.flatMap((risk, riskIndex) => [0, 1, 2].map((offset) => ({ risk_library_id: risk.id, control_id: controls[(riskIndex + offset) % controls.length].id, catatan_keterkaitan: 'Kontrol generik yang direkomendasikan untuk risiko ini.', created_by: actorId || null })))
  result = await db.from('ppg_library_risk_controls').insert(mappings)
  if (result.error) return failed('Pemetaan kontrol', result.error.message)

  result = await db.from('ppg_import_batches').insert({ id: ids.batch, nama_file: 'SIMULASI_Rekap_Gratifikasi_2026.xlsx', file_hash: 'demo-ppg-369-reports-v1', source_sheet: 'Worksheet', status: 'selesai', total_baris: 369, baris_diterima: 369, baris_ditolak: 0, catatan: 'DATA DUMMY — 369 laporan sintetis untuk demonstrasi analitik.', created_by: actorId || null, completed_at: '2026-09-01T08:00:00Z' })
  if (result.error) return failed('Batch laporan', result.error.message)
  const reportLabels = ['Pemberian terkait layanan perkara', 'Parsel hari raya', 'Fasilitas dari penyedia', 'Jamuan kegiatan kedinasan']
  const reports = Array.from({ length: 369 }, (_, index) => {
    const unit = units[index % units.length]
    const hasContext = index >= 253
    const month = (index % 8) + 1
    const day = (index % 27) + 1
    return {
      id: demoUuid('a', index + 1), import_batch_id: ids.batch, source_row: index + 2,
      nomor_laporan: `SIM/LG/2026/${String(index + 1).padStart(4, '0')}`,
      jabatan_penerima: ['Panitera Muda', 'Staf Pelayanan', 'Pejabat Pengadaan', 'Sekretaris'][index % 4],
      unit_kerja_id: unit.id, unit_nama: unit.nama_unit,
      jenis_penerimaan: ['Uang', 'Barang', 'Jamuan', 'Fasilitas'][index % 4],
      tanggal_penerimaan: `2026-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      tanggal_pelaporan: `2026-${String(month).padStart(2, '0')}-${String(Math.min(28, day + 1)).padStart(2, '0')}`,
      objek: hasContext ? reportLabels[index % reportLabels.length] : 'Penerimaan tanpa uraian konteks memadai',
      nilai_penetapan: 100000 + (index % 25) * 75000,
      status_penetapan: index % 5 === 0 ? 'Milik Negara' : 'Dikembalikan kepada pemberi',
      kategori_objek: hasContext ? ['Uang/setara uang', 'Barang', 'Jamuan', 'Fasilitas'][index % 4] : '',
      label_skenario: hasContext ? reportLabels[index % reportLabels.length] : null,
      kegiatan: hasContext ? ['Layanan perkara', 'Hari raya', 'Pengadaan', 'Rapat koordinasi'][index % 4] : '',
      dugaan_momen: hasContext ? ['Pasca layanan', 'Periode rawan', 'Evaluasi penawaran', 'Pelaksanaan kegiatan'][index % 4] : '',
      classification_source: hasContext ? 'eksplisit' : null,
      review_status: index % 11 === 0 ? 'belum_ditinjau' : 'disetujui',
    }
  })
  for (let start = 0; start < reports.length; start += 200) {
    result = await db.from('ppg_reports').insert(reports.slice(start, start + 200))
    if (result.error) return failed('Laporan simulasi', result.error.message)
  }

  const registers = units.flatMap((unit, unitIndex) => [0, 1].map((periodIndex) => {
    const index = unitIndex * 2 + periodIndex
    const risk = risks[(unitIndex + periodIndex) % risks.length]
    const inherentK = index % 3 === 0 ? 5 : 4
    const inherentD = index % 4 === 0 ? 5 : 4
    const residualK = index % 3 === 0 ? 3 : 2
    const residualD = index % 4 === 0 ? 4 : 3
    const residualScore = residualK * residualD
    return {
      id: demoUuid('b', index + 1), kode: risk.kode, risk_library_id: risk.id, unit_kerja_id: unit.id, unit_nama: unit.nama_unit,
      tahun: 2026, periode: periodIndex ? 'Triwulan III' : 'Tahunan', kategori: risk.kategori,
      proses_bisnis: risk.proses_bisnis, subproses_bisnis: risk.subproses_bisnis, klasifikasi_risiko: risk.klasifikasi_risiko,
      faktor_penyebab: risk.faktor_penyebab, penyebab: risk.penyebab, peristiwa: risk.peristiwa, dampak: risk.dampak,
      kemungkinan_inherent: inherentK, dampak_inherent: inherentD, skor_inherent: inherentK * inherentD, level_inherent: inherentK * inherentD >= 20 ? 'Sangat Tinggi' : 'Tinggi',
      kemungkinan_existing: residualK, dampak_existing: residualD, skor_existing: residualScore, level_existing: residualScore >= 12 ? 'Tinggi' : residualScore >= 5 ? 'Sedang' : 'Rendah',
      status: index % 4 === 0 ? 'review' : 'aktif', created_by: actorId || null,
    }
  }))
  result = await db.from('ppg_register').insert(registers)
  if (result.error) return failed('Risk Register', result.error.message)
  const appliedControls = registers.flatMap((register, index) => [0, 1].map((offset) => ({
    risk_id: register.id, control_id: controls[(index + offset) % controls.length].id,
    efektivitas: ['tidak_efektif', 'sebagian', 'efektif'][index % 3],
    catatan: 'Hasil self-assessment Satker pada data simulasi.',
    bukti_efektivitas_url: `https://example.invalid/simulasi/kontrol/${index + 1}-${offset + 1}`,
    created_by: actorId || null,
  })))
  result = await db.from('ppg_risk_controls').insert(appliedControls)
  if (result.error) return failed('Efektivitas kontrol', result.error.message)
  result = await db.from('ppg_risk_control_validations').insert(appliedControls.map((item, index) => ({ risk_id: item.risk_id, control_id: item.control_id, status: index % 5 === 0 ? 'perlu_perbaikan' : 'disetujui', catatan: index % 5 === 0 ? 'Tambahkan dokumen pendukung.' : 'Bukti simulasi dinilai memadai.', validated_at: '2026-08-31T08:00:00Z' })))
  if (result.error) return failed('Validasi kontrol', result.error.message)
  result = await db.from('ppg_mitigations').insert(registers.map((register, index) => ({ id: demoUuid('c', index + 1), register_id: register.id, tindakan: `Tindak lanjut penguatan kontrol prioritas ${index + 1}`, pic_jabatan: 'Koordinator UPG Satker', tenggat: '2026-12-15', status: index % 3 === 0 ? 'selesai' : 'berjalan', progres: index % 3 === 0 ? 100 : 60, bukti_url: `https://example.invalid/simulasi/mitigasi/${index + 1}`, catatan: 'Pelaksanaan dummy yang dapat dieksplorasi pengguna.', created_by: actorId || null })))
  if (result.error) return failed('Mitigasi', result.error.message)
  result = await db.from('ppg_risk_appetites').insert(units.map((unit, index) => ({ unit_kerja_id: unit.id, tahun: 2026, strategis: 9, kebijakan: 9, kecurangan: index % 4 === 0 ? 3 : 4, bencana: 9, kepatuhan: 8, operasional: 9, kemitraan: 8, catatan: 'Penetapan dummy: toleransi sangat rendah untuk gratifikasi/kecurangan dan konservatif untuk kepatuhan.', ditetapkan_by: actorId || null, ditetapkan_at: '2026-01-05T08:00:00Z' })))
  if (result.error) return failed('Selera risiko Satker', result.error.message)

  result = await db.from('ppg_analysis_snapshots').insert({ id: ids.snapshot, analysis_start: '2026-01-01', analysis_end: '2026-06-30', baseline_start: '2025-07-01', baseline_end: '2025-12-31', period_label: 'Semester I 2026', program_label: 'Semester II 2026', summary: { reports: 369, without_context: 253, without_context_pct: 68.56 }, recommendations: [{ actionCode: String(actions[0].kode), reason: 'Kualitas konteks laporan dan paparan risiko membutuhkan intervensi nasional.' }], created_by: actorId || null })
  if (result.error) return failed('Snapshot analitik', result.error.message)
  result = await db.from('ppg_programs').insert({ id: ids.program, kode: 'SIM-PPG-2026-01', nama: 'Penguatan Pengendalian Gratifikasi Periode Rawan', snapshot_id: ids.snapshot, analysis_start: '2026-01-01', analysis_end: '2026-06-30', program_start: '2026-07-01', program_end: '2026-08-31', period_label: 'Semester II 2026', status: 'selesai', created_by: actorId || null })
  if (result.error) return failed('Program PPG', result.error.message)
  result = await db.from('ppg_program_items').insert({ id: ids.programItem, program_id: ids.program, risk_library_id: risks[0].id, action_catalog_id: actions[0].id, rationale: 'Insight menunjukkan paparan lintas Satker dan kualitas konteks data yang perlu diperbaiki.', target: 'Seluruh Satker dengan fokus klaster berbasis paparan.', pic_jabatan: 'Koordinator UPG Pusat', mulai: '2026-07-01', selesai_rencana: '2026-08-31', status: 'selesai', progres: 100, output_target: '100% Satker menerima paket komunikasi dan daftar periksa.', outcome_target: 'Penurunan residual risk dan peningkatan konteks laporan.', sasaran_program: 'Menurunkan paparan gratifikasi pada layanan prioritas.', indikator_program: 'Persentase Satker menyelesaikan paket PPG', baseline_indikator: '42', target_indikator: '90', satuan_indikator: '%', arah_target: 'minimal', sumber_data_indikator: 'Laporan monitoring UPG Satker', frekuensi_pengukuran: 'akhir_program', target_cakupan_satker: 90, kri_indikator: 'Satker belum menyelesaikan paket', kri_ambang_hijau: '<10%', kri_ambang_waspada: '10–25%', kri_ambang_merah: '>25%', outcome_a_indikator: 'Laporan dengan konteks lengkap', outcome_a_baseline_pct: 31.44, outcome_a_target_pct: 80, outcome_b_indikator: 'Kontrol disetujui UPG Pusat', outcome_b_baseline_pct: 45, outcome_b_target_pct: 85, catatan_keputusan: 'Program dummy ditetapkan berdasarkan Insight A dan B.', created_by: actorId || null })
  if (result.error) return failed('Item program', result.error.message)
  result = await db.from('ppg_program_item_controls').insert(controls.slice(0, 3).map((control) => ({ program_item_id: ids.programItem, control_id: control.id })))
  if (result.error) return failed('Kontrol program', result.error.message)
  const clusters = [
    { id: 'd5200000-0000-4000-8000-000000000001', kode: 1, nama: 'Realisasi kritis', kriteria: 'Dampak tinggi atau berulang.', fokus_tindakan: 'RCA dan validasi intensif.', target_cakupan_satker: 100 },
    { id: 'd5200000-0000-4000-8000-000000000002', kode: 2, nama: 'Realisasi terbatas/preventif', kriteria: 'Satu kejadian dengan dampak moderat.', fokus_tindakan: 'Pencegahan dan deteksi dini.', target_cakupan_satker: 90 },
    { id: 'd5200000-0000-4000-8000-000000000003', kode: 3, nama: 'Terkendali/monitoring', kriteria: 'Belum ada loss event tervalidasi.', fokus_tindakan: 'Monitoring dan kualitas data.', target_cakupan_satker: 85 },
  ].map((cluster) => ({ ...cluster, program_item_id: ids.programItem }))
  result = await db.from('ppg_program_clusters').insert(clusters)
  if (result.error) return failed('Klaster program', result.error.message)
  result = await db.from('ppg_program_cluster_units').insert(units.map((unit, index) => ({ program_cluster_id: clusters[index % 3].id, unit_kerja_id: unit.id, basis: { source: 'insight_b', event_count: index % 4, highest_impact: (index % 5) + 1 } })))
  if (result.error) return failed('Anggota klaster', result.error.message)
  result = await db.from('ppg_program_updates').insert([
    { id: 'd5300000-0000-4000-8000-000000000001', program_item_id: ids.programItem, tanggal: '2026-07-31', status: 'berjalan', progres: 55, realisasi_indikator: '52%', output_realisasi: 'Materi dan daftar periksa didistribusikan.', outcome_realisasi: 'Bukti awal mulai masuk.', catatan: 'Sebagian Satker memerlukan asistensi.', bukti_url: 'https://example.invalid/simulasi/program/progres-1', created_by: actorId || null },
    { id: 'd5300000-0000-4000-8000-000000000002', program_item_id: ids.programItem, tanggal: '2026-08-31', status: 'selesai', progres: 100, realisasi_indikator: '92%', output_realisasi: 'Paket PPG selesai pada seluruh klaster.', outcome_realisasi: 'Residual risk sampel menurun.', catatan: 'Program ditutup dan masuk evaluasi treated risk.', bukti_url: 'https://example.invalid/simulasi/program/final', created_by: actorId || null },
  ])
  if (result.error) return failed('Monitoring program', result.error.message)
  result = await db.from('ppg_register').update({ treated_program_id: ids.program, kemungkinan_treated: 1, dampak_treated: 3, skor_treated: 3, level_treated: 'Rendah', efektivitas_program: 'efektif', bukti_efektivitas_program_url: 'https://example.invalid/simulasi/program/evaluasi-treated-risk', treated_assessed_at: '2026-09-01T08:00:00Z' }).in('id', registers.slice(0, 4).map((row) => row.id))
  if (result.error) return failed('Treated risk', result.error.message)

  const lossEvents = risks.flatMap((risk) => registers.filter((register) => register.risk_library_id === risk.id).slice(0, 12)).map((register, index) => ({ id: demoUuid('e', index + 1), kode: '', unit_kerja_id: register.unit_kerja_id, unit_nama: register.unit_nama, nama_peristiwa: `Loss event simulasi ${index + 1}: indikasi pemberian pada layanan`, tanggal_kejadian: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index % 20) + 1).padStart(2, '0')}`, tanggal_diketahui: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index % 20) + 2).padStart(2, '0')}`, tanggal_dilaporkan: `2026-${String((index % 8) + 1).padStart(2, '0')}-${String((index % 20) + 3).padStart(2, '0')}`, sumber_informasi: index % 2 ? 'pengaduan' : 'laporan_gratifikasi', lokasi: 'Area layanan terpadu', kategori_risiko: register.kategori, proses_bisnis: register.proses_bisnis, kronologi: 'Pemberian terindikasi terjadi setelah layanan; Satker menolak, mencatat, dan melaporkannya kepada UPG.', register_id: register.id, risk_library_id: register.risk_library_id, metode_rca: '5 Why', akar_masalah: 'Komunikasi larangan belum menjangkau seluruh pengguna layanan.', kegagalan_kontrol: 'Keterangan tambahan: banner tidak terlihat pada jalur masuk alternatif.', jenis_dampak: index % 2 ? 'Penurunan Reputasi' : 'Gangguan terhadap Layanan Tusi Organisasi', level_dampak: index % 3 === 0 ? 4 : 3, uraian_dampak: 'Muncul pengaduan dan kebutuhan klarifikasi oleh pimpinan Satker.', klasifikasi_limit: index % 3 === 0 ? 'upper_limit' : 'under_limit', lesson_learned: 'Perlu penempatan media pengendalian di seluruh titik interaksi.', status: index % 3 === 0 ? 'tindak_lanjut' : 'tervalidasi', submitted_at: '2026-08-20T08:00:00Z', validated_at: '2026-08-22T08:00:00Z', created_by: actorId || null }))
  result = await db.from('ppg_loss_events').insert(lossEvents)
  if (result.error) return failed('Loss Event', result.error.message)
  result = await db.from('ppg_loss_event_controls').insert(lossEvents.map((event) => ({ loss_event_id: event.id, control_id: appliedControls.find((usage) => usage.risk_id === event.register_id)?.control_id || controls[0].id, created_by: actorId || null })))
  if (result.error) return failed('Kontrol gagal', result.error.message)
  result = await db.from('ppg_program_loss_events').insert({ program_item_id: ids.programItem, loss_event_id: lossEvents[0].id })
  if (result.error) return failed('Dasar LED program', result.error.message)
  result = await db.from('ppg_loss_event_report_links').insert(lossEvents.slice(0, 4).map((event, index) => ({ loss_event_id: event.id, report_id: reports[index].id, link_type: 'terkonfirmasi', match_score: 94 - index, match_reasons: ['Satker sama', 'Tanggal berdekatan', 'Objek relevan'], created_by: actorId || null, reviewed_at: '2026-08-22T08:00:00Z' })))
  if (result.error) return failed('Relasi laporan', result.error.message)

  result = await db.from('ppg_risk_import_batches').insert({ id: ids.riskImportBatch, nama_file: 'SIMULASI_Risk_Register_2026.xlsx', file_hash: 'demo-risk-register-v1', source_sheet: 'Risk Register 2026', mode: 'bootstrap_library', tahun: 2026, periode: 'Tahunan', status: 'siap_dikurasi', total_baris: 3, baris_valid: 3, baris_perlu_perbaikan: 0, catatan: 'Dummy antrean bottom-up curation.', created_by: actorId || null, completed_at: '2026-08-30T08:00:00Z' })
  if (result.error) return failed('Impor Risk Register', result.error.message)
  result = await db.from('ppg_risk_candidates').insert({ id: ids.candidate, klasifikasi_risiko: 'Sektor Pelayanan Publik', faktor_penyebab: 'Sistem', peristiwa: 'Pemberian fasilitas transportasi kepada petugas layanan', penyebab: 'Pedoman fasilitas belum dipahami pihak eksternal.', dampak: 'Potensi konflik kepentingan.', normalized_signature: 'pemberian fasilitas transportasi petugas layanan', confidence: 86, status: 'review', created_by: actorId || null })
  if (result.error) return failed('Kandidat risiko', result.error.message)
  const importRows = Array.from({ length: 3 }, (_, index) => ({ id: demoUuid('f', index + 1), batch_id: ids.riskImportBatch, source_row: index + 2, unit_kerja_id: units[index % units.length].id, unit_nama_raw: units[index % units.length].nama_unit, tahun: 2026, periode: 'Tahunan', klasifikasi_risiko: 'Sektor Pelayanan Publik', faktor_penyebab: 'Sistem', peristiwa: 'Pemberian fasilitas transportasi kepada petugas layanan', penyebab: 'Pedoman fasilitas belum dipahami pihak eksternal.', dampak: 'Potensi konflik kepentingan.', kemungkinan_inherent: 4, dampak_inherent: 4, control_text: 'Deklarasi dan komunikasi larangan gratifikasi', mitigation_text: 'Sosialisasi kepada mitra layanan', normalized_signature: 'pemberian fasilitas transportasi petugas layanan', validation_errors: [], raw_payload: { dummy: true }, match_status: 'kandidat_tergabung' }))
  result = await db.from('ppg_risk_import_rows').insert(importRows)
  if (result.error) return failed('Baris impor risiko', result.error.message)
  result = await db.from('ppg_risk_candidate_members').insert(importRows.map((row, index) => ({ candidate_id: ids.candidate, import_row_id: row.id, similarity: 92 - index * 2 })))
  if (result.error) return failed('Anggota kandidat', result.error.message)

  await db.from('ppg_audit_log').insert({ actor_id: actorId || null, entity_type: 'ppg_demo', entity_id: PPG_DEMO_SCENARIO_ID, action: 'seed_demo', changes: { reports: 369, risks: risks.length, controls: controls.length, registers: registers.length, loss_events: lossEvents.length } })
  return { ok: true, created: true, message: 'Data simulasi lengkap berhasil disiapkan.' }
}

export async function resetPpgDemoData(actorId?: string): Promise<DemoSeedResult> {
  const db = createPpgAdminClient(PPG_DEMO_SCENARIO_ID)
  const order = ['ppg_programs', 'ppg_loss_events', 'ppg_loss_event_code_counters', 'ppg_risk_import_batches', 'ppg_risk_candidates', 'ppg_import_batches', 'ppg_register', 'ppg_risk_appetites', 'ppg_audit_log', 'ppg_analysis_snapshots', 'ppg_risk_library', 'ppg_control_library']
  for (const table of order) {
    const { error } = await db.from(table).delete().neq('scenario_id', '00000000-0000-0000-0000-000000000000')
    if (error) return failed(`Reset ${table}`, error.message)
  }
  return ensurePpgDemoData(actorId)
}

function demoUuid(prefix: string, sequence: number) {
  return `${prefix}0000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`
}

function failed(part: string, message: string) {
  return { ok: false, created: false, message: `${part} gagal disiapkan: ${message}` }
}
