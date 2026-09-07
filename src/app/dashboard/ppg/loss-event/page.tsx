import Link from 'next/link'
import { AlertTriangle, BookOpen, DatabaseZap, Gauge, Link2 } from 'lucide-react'
import { getPpgLossEventWorkspace } from '@/lib/ppg/data'
import { PPG_IMPACT_AREAS, PPG_IMPACT_KNOWLEDGE_ID, PPG_IMPACT_LEVELS } from '@/lib/ppg/references'
import { ProcessBusinessFields } from '../ProcessBusinessFields'
import { PpgCombobox } from '../PpgCombobox'
import { SearchableUnitSelect } from '@/components/SearchableUnitSelect'
import { EmptyState, SectionHeading, StatCard } from '../_components'
import { LossEventForm } from './LossEventForm'
import { LedLimitForm } from './LedLimitForm'
import { LossEventBrowser } from './LossEventBrowser'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'

export default async function LossEventPage() {
  const data = await getPpgLossEventWorkspace()
  const events = data.events
  const validated = events.filter((row) => ['tervalidasi','tindak_lanjut','ditutup'].includes(String(row.status)))
  const upper = validated.filter((row) => row.klasifikasi_limit === 'upper_limit')
  const highestImpact = validated.reduce((highest, row) => Math.max(highest, Number(row.level_dampak || 0)), 0)
  const highImpact = validated.filter((row) => Number(row.level_dampak || 0) >= 4).length
  const confirmedReports = new Set(validated.flatMap((row) => arrayRecords(row.links).filter((link) => link.link_type === 'terkonfirmasi').map((link) => String(link.report_id)))).size
  const currentYear = new Date().getFullYear()
  const currentLimit = data.limits.find((row) => Number(row.tahun) === currentYear)

  return <div className="space-y-6">
    <SectionHeading eyebrow="Backward-looking evidence" title="Loss Event Database Management" description="UPG Satker membuktikan realisasi risiko; UPG Pusat memvalidasi, menghubungkannya dengan laporan gratifikasi, dan memakai polanya untuk Program PPG berikutnya." />
    {data.error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Skema LEDM belum tersedia. Jalankan migration_ppg.sql terbaru.</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Loss event" value={events.length} note={`${validated.length} tervalidasi`} icon={DatabaseZap} /><StatCard label="Upper limit" value={upper.length} note="Memerlukan tindak lanjut intensif" icon={AlertTriangle} tone="rose" /><StatCard label="Level dampak tertinggi" value={highestImpact ? `Level ${highestImpact}` : '—'} note={`${highImpact} kejadian berdampak tinggi/sangat tinggi`} icon={Gauge} tone="amber" /><StatCard label="Laporan terkonfirmasi" value={confirmedReports} note="Hubungan yang telah direview pusat" icon={Link2} tone="cyan" /></div>
    {data.access.isPusat && <ReportCoverage reports={data.reports} events={events} />}

    {data.access.isPusat && <LedLimitForm year={currentYear} level={Number(currentLimit?.level_dampak_upper || 4)} versions={data.limits.map((item) => ({ tahun: Number(item.tahun), level: Number(item.level_dampak_upper || 4) }))} />}

    <LossEventForm>
      <div><h3 className="font-bold">Laporkan loss event</h3><p className="mt-1 text-xs text-slate-500">Laporan gratifikasi yang dipilih merupakan klaim keterhubungan dari satker; UPG Pusat tetap melakukan konfirmasi.</p></div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {data.access.isPusat ? <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Satker pelapor</span><SearchableUnitSelect units={data.units} name="unit_kerja_id" required /></div> : <div className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-900 xl:col-span-2"><b>Satker pelapor</b><p>{String(data.units[0]?.nama_unit || 'Unit akun')}</p></div>}
        <label className="grid gap-1 text-xs font-semibold text-slate-600 xl:col-span-2">Nama loss event<input name="nama_peristiwa" required placeholder="Ringkasan kejadian yang telah terealisasi" className={input} /></label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Tanggal kejadian<input name="tanggal_kejadian" type="date" required className={input} /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Tanggal diketahui<input name="tanggal_diketahui" type="date" className={input} /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Sumber informasi<select name="sumber_informasi" className={input}><option value="laporan_gratifikasi">Laporan gratifikasi</option><option value="pengaduan">Pengaduan</option><option value="audit">Temuan audit</option><option value="observasi">Observasi satker</option><option value="lainnya">Lainnya</option></select></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Lokasi<input name="lokasi" placeholder="Lokasi kejadian" className={input} /></label>
        <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Risiko generik utama</span><PpgCombobox name="risk_library_id" required searchable placeholder="Pilih satu risiko utama dari Risk Library" options={data.riskLibrary.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.kategori)}`, description: String(row.peristiwa) }))} /><p className="mt-1 text-[11px] font-normal text-slate-500">Menjadi dasar kompilasi Insight B nasional dan hanya boleh satu untuk setiap loss event.</p></div><ProcessBusinessFields className="md:col-span-2 xl:col-span-2" />
        <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Risk Register Satker <span className="font-normal text-slate-400">(opsional)</span></span><PpgCombobox name="register_id" searchable placeholder="Pilih bila risiko sudah diadopsi Satker" options={data.registers.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.unit_nama)}`, description: String(row.peristiwa) }))} /></div>
        <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Laporan gratifikasi yang diduga terkait <span className="font-normal text-slate-400">(boleh kosong pada draf; wajib saat diajukan bila menjadi sumber)</span></span><PpgCombobox name="report_id" searchable placeholder="Belum ada laporan yang dipilih" options={data.reports.map((row) => ({ value: String(row.id), label: `${String(row.nomor_laporan || 'Tanpa nomor')} · ${dateLabel(row.tanggal_penerimaan)}`, description: `${String(row.unit_nama)} · ${String(row.objek)}` }))} /></div>
        <textarea name="kronologi" required placeholder="Kronologi kejadian" className={`${input} min-h-24 md:col-span-2 xl:col-span-4`} />
        <textarea name="kegagalan_kontrol" placeholder="Kontrol yang gagal atau tidak tersedia" className={`${input} md:col-span-2`} />
        <label className="grid gap-1 text-xs font-semibold text-slate-600">Metode RCA<select name="metode_rca" className={input}><option value="">Belum dianalisis</option><option>5-Why</option><option>Fishbone/Ishikawa</option><option>Fault Tree Analysis</option><option>RCA lainnya</option></select></label><textarea name="akar_masalah" placeholder="Akar masalah, bukan sekadar gejala" className={input} />
      </div>

      <section className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h4 className="text-sm font-bold text-slate-900">Dampak aktual</h4><p className="mt-1 text-xs text-slate-500">Gunakan satu area dampak resmi yang paling relevan dan jelaskan fakta pendukung levelnya.</p></div><Link href={`/dashboard/knowledge/${PPG_IMPACT_KNOWLEDGE_ID}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"><BookOpen className="size-4" />Lihat kriteria dampak</Link></div>
        <div className="mt-3 grid gap-3 md:grid-cols-2"><label className="grid gap-1 text-xs font-semibold text-slate-600">Jenis/area dampak<PpgCombobox name="jenis_dampak" required placeholder="Pilih jenis dampak" options={PPG_IMPACT_AREAS.map((area) => ({ value: area, label: area }))} /></label><label className="grid gap-1 text-xs font-semibold text-slate-600">Level dampak<PpgCombobox name="level_dampak" required defaultValue="1" placeholder="Pilih level dampak" options={PPG_IMPACT_LEVELS.map((item) => ({ value: String(item.value), label: item.label }))} /></label><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Uraian dampak aktual<textarea name="uraian_dampak" required placeholder="Jelaskan fakta, ukuran, durasi, jumlah, atau bukti yang mendukung level dampak" className={`${input} min-h-24`} /></label></div>
      </section>

      <div className="grid gap-3 md:grid-cols-2"><textarea name="lesson_learned" placeholder="Lesson learned awal" className={`${input} md:col-span-2`} /><label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2">Bukti pendukung privat (PDF/JPG/PNG/WebP, maks. 10 MB)<input name="bukti" type="file" accept="application/pdf,image/jpeg,image/png,image/webp" className={input} /></label></div>
      <div className="flex justify-end gap-2"><button name="submit_mode" value="draft" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold">Simpan draf</button><button name="submit_mode" value="submit" className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Ajukan ke UPG Pusat</button></div>
    </LossEventForm>

    {events.length ? <LossEventBrowser events={events} isPusat={data.access.isPusat} riskOptions={data.riskLibrary} /> : <EmptyState title="Belum ada loss event" description="Loss event pertama akan tampil setelah UPG Satker menyimpan draf atau mengajukan kejadian." />}
  </div>
}

function ReportCoverage({ reports, events }: { reports: Record<string, unknown>[]; events: Record<string, unknown>[] }) { const links = events.flatMap((event) => arrayRecords(event.links)); const rank: Record<string, number> = { terkonfirmasi: 4, dilaporkan_satker: 3, kandidat_mesin: 2, ditolak: 1 }; return <details className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5"><summary className="cursor-pointer font-bold text-cyan-950">Coverage laporan terhadap LED ({reports.length} laporan terbaru)</summary><p className="mt-1 text-xs text-cyan-800">Menunjukkan laporan mana yang sudah terbukti menjadi loss event, masih kandidat, atau belum memiliki bukti LED.</p><div className="mt-4 max-h-96 overflow-auto rounded-xl border bg-white"><table className="w-full min-w-[760px] text-left text-xs"><thead className="sticky top-0 bg-slate-50"><tr><th className="p-2">Nomor laporan</th><th className="p-2">Tanggal</th><th className="p-2">Satker</th><th className="p-2">Objek/Skenario</th><th className="p-2">Status LED</th></tr></thead><tbody>{reports.map((report) => { const related = links.filter((link) => String(link.report_id) === String(report.id)).sort((a,b) => (rank[String(b.link_type)] || 0) - (rank[String(a.link_type)] || 0)); const status = String(related[0]?.link_type || 'belum_ada_bukti'); return <tr key={String(report.id)} className="border-t"><td className="p-2 font-semibold">{String(report.nomor_laporan || 'Tanpa nomor')}</td><td className="p-2">{dateLabel(report.tanggal_penerimaan)}</td><td className="p-2">{String(report.unit_nama || '—')}</td><td className="p-2">{String(report.label_skenario || report.objek || '—')}</td><td className="p-2"><Badge value={status} /></td></tr>})}</tbody></table></div></details> }
function Badge({ value }: { value: string }) { return <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-600">{value.replaceAll('_',' ')}</span> }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function arrayRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : [] }
function dateLabel(value: unknown) { const source = String(value || ''); return source ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${source.slice(0,10)}T00:00:00Z`)) : '—' }
