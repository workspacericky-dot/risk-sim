'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { reviewPpgLossEventLink, validatePpgLossEvent } from '../actions'
import { PpgCombobox } from '../PpgCombobox'

const input = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
const pageSizes = [5, 10, 50, 100] as const

export function LossEventBrowser({ events, isPusat, riskOptions }: { events: Record<string, unknown>[]; isPusat: boolean; riskOptions: Record<string, unknown>[] }) {
  const [query, setQuery] = useState('')
  const [pageSize, setPageSize] = useState<number>(10)
  const [page, setPage] = useState(1)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('id-ID')
    if (!needle) return events
    return events.filter((event) => searchableText(event).includes(needle))
  }, [events, query])
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const visible = filtered.slice((safePage - 1) * pageSize, safePage * pageSize)

  return <section className="space-y-3">
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
      <label className="relative block min-w-0 flex-1 lg:max-w-2xl"><span className="sr-only">Cari loss event</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1) }} placeholder="Cari kode, Satker, peristiwa, risiko, dampak, atau status…" className={`${input} pl-9`} /></label>
      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end"><p className="text-xs text-slate-500">Menampilkan <b className="text-slate-800">{visible.length}</b> dari <b className="text-slate-800">{filtered.length}</b> hasil</p><label className="flex items-center gap-2 text-xs font-semibold text-slate-600">Data per halaman<select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{pageSizes.map((size) => <option key={size} value={size}>{size}</option>)}</select></label></div>
    </div>

    {visible.length ? <div className="space-y-3">{visible.map((event) => <EventRow key={String(event.id)} event={event} isPusat={isPusat} riskOptions={riskOptions} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h3 className="font-bold text-slate-900">Loss event tidak ditemukan</h3><p className="mt-1 text-sm text-slate-500">Ubah kata kunci pencarian atau hapus filter.</p></div>}

    {filtered.length > 0 && <nav aria-label="Paginasi loss event" className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Halaman <b className="text-slate-800">{safePage}</b> dari <b className="text-slate-800">{pageCount}</b></p><div className="flex gap-2"><button type="button" disabled={safePage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" />Sebelumnya</button><button type="button" disabled={safePage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))} className="inline-flex items-center gap-1 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">Berikutnya<ChevronRight className="size-4" /></button></div></nav>}
  </section>
}

function EventRow({ event, isPusat, riskOptions }: { event: Record<string, unknown>; isPusat: boolean; riskOptions: Record<string, unknown>[] }) {
  const links = arrayRecords(event.links)
  const risk = record(event.risk)
  return <details className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm open:border-indigo-200">
    <summary className="cursor-pointer list-none p-4 marker:hidden sm:p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0 flex-1"><p className="text-xs font-bold text-indigo-700">{String(event.kode)} · {String(event.unit_nama)}</p><h3 className="mt-1 truncate font-bold text-slate-900">{String(event.nama_peristiwa)}</h3><p className="mt-1 text-xs text-slate-500">Kejadian {dateLabel(event.tanggal_kejadian)} · {String(risk.kode || 'Risiko belum dipetakan')} · {String(event.jenis_dampak || 'Dampak belum dipetakan')} · Level {String(event.level_dampak || 1)}</p></div><div className="flex flex-wrap items-center gap-2"><Badge value={String(event.status)} /><Badge value={String(event.klasifikasi_limit)} /><span className="rounded-lg border border-indigo-200 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 group-open:bg-indigo-700 group-open:text-white"><span className="group-open:hidden">Lihat detail</span><span className="hidden group-open:inline">Tutup detail</span></span></div></div></summary>
    <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5">
      <p className="text-sm leading-relaxed text-slate-600">{String(event.kronologi)}</p>
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 xl:grid-cols-3"><Info label="Risiko generik utama" value={`${String(risk.kode || 'Belum dipetakan')} · ${String(risk.peristiwa || '')}`} /><Info label="Jenis dampak" value={event.jenis_dampak || 'Data historis belum diklasifikasikan'} /><Info label="Level dampak" value={`Level ${String(event.level_dampak || event.level_nonfinansial || 1)}`} /><Info label="Uraian dampak" value={event.uraian_dampak || event.dampak_nonfinansial || 'Belum diisi'} /><Info label="Akar masalah" value={event.akar_masalah || event.penyebab_aktual || 'Belum dianalisis'} /><Info label="Kontrol gagal" value={event.kegagalan_kontrol || 'Belum diidentifikasi'} /><Info label="Lesson learned" value={event.lesson_learned || 'Belum diisi'} /></div>
      {Boolean(event.bukti_url) && <a href={String(event.bukti_url)} target="_blank" rel="noreferrer" className="mt-3 inline-flex text-xs font-semibold text-indigo-700 underline">Buka bukti privat (berlaku 1 jam)</a>}
      <details className="mt-4 rounded-xl bg-slate-50 p-3"><summary className="cursor-pointer text-sm font-semibold">Keterhubungan laporan ({links.length})</summary><div className="mt-3 space-y-2">{links.map((link) => { const report = record(link.report); return <div key={String(link.report_id)} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3 text-xs"><div><b>{String(report.nomor_laporan || 'Tanpa nomor')}</b><p className="text-slate-500">{dateLabel(report.tanggal_penerimaan)} · {String(report.objek || '')}</p><p className="text-slate-400">{String(link.link_type).replaceAll('_',' ')}{link.match_score ? ` · skor ${String(link.match_score)} · ${arrayStrings(link.match_reasons).join(', ')}` : ''}</p></div>{isPusat && !['terkonfirmasi','ditolak'].includes(String(link.link_type)) && <div className="flex gap-2"><LinkDecision eventId={String(event.id)} reportId={String(link.report_id)} decision="terkonfirmasi" label="Konfirmasi" /><LinkDecision eventId={String(event.id)} reportId={String(link.report_id)} decision="ditolak" label="Tolak" /></div>}</div>})}{!links.length && <p className="text-slate-500">Belum ada hubungan eksplisit maupun kandidat mesin.</p>}</div></details>
      {isPusat && <form action={validatePpgLossEvent} className="mt-4 grid gap-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 md:grid-cols-2 xl:grid-cols-[1.2fr_1fr_180px_auto]"><input type="hidden" name="loss_event_id" value={String(event.id)} /><div><span className="mb-1 block text-xs font-semibold text-indigo-900">Konfirmasi risiko generik utama</span><PpgCombobox name="risk_library_id" required searchable defaultValue={String(event.risk_library_id || '')} placeholder="Pilih risiko generik" options={riskOptions.map((option) => ({ value: String(option.id), label: `${String(option.kode)} · ${String(option.kategori)}`, description: String(option.peristiwa) }))} /></div><input name="catatan_validasi" defaultValue={String(event.catatan_validasi || '')} placeholder="Catatan validasi/perbaikan" className={input} /><select name="decision" defaultValue={['tervalidasi','perlu_perbaikan','tindak_lanjut','ditutup'].includes(String(event.status)) ? String(event.status) : 'tervalidasi'} className={input}><option value="perlu_perbaikan">Perlu perbaikan</option><option value="tervalidasi">Tervalidasi</option><option value="tindak_lanjut">Tindak lanjut</option><option value="ditutup">Ditutup</option></select><button className="rounded-xl bg-indigo-700 px-4 py-2 text-sm font-semibold text-white">Simpan validasi</button></form>}
    </div>
  </details>
}

function searchableText(event: Record<string, unknown>) {
  const risk = record(event.risk)
  return [event.kode, event.unit_nama, event.nama_peristiwa, event.kronologi, event.status, event.klasifikasi_limit, event.jenis_dampak, event.uraian_dampak, event.akar_masalah, event.kegagalan_kontrol, risk.kode, risk.kategori, risk.peristiwa].map((value) => String(value || '').toLocaleLowerCase('id-ID')).join(' ')
}
function LinkDecision({ eventId, reportId, decision, label }: { eventId: string; reportId: string; decision: string; label: string }) { return <form action={reviewPpgLossEventLink}><input type="hidden" name="loss_event_id" value={eventId} /><input type="hidden" name="report_id" value={reportId} /><button name="decision" value={decision} className={`rounded-lg px-3 py-1.5 font-semibold ${decision === 'terkonfirmasi' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>{label}</button></form> }
function Badge({ value }: { value: string }) { return <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold uppercase text-slate-600">{value.replaceAll('_',' ')}</span> }
function Info({ label, value }: { label: string; value: unknown }) { return <div className="rounded-lg bg-slate-50 p-2"><b className="block text-slate-500">{label}</b><span>{String(value)}</span></div> }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {} }
function arrayRecords(value: unknown): Record<string, unknown>[] { return Array.isArray(value) ? value.map(record) : [] }
function arrayStrings(value: unknown): string[] { return Array.isArray(value) ? value.map(String) : [] }
function dateLabel(value: unknown) { const source = String(value || ''); return source ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(new Date(`${source.slice(0,10)}T00:00:00Z`)) : '—' }
