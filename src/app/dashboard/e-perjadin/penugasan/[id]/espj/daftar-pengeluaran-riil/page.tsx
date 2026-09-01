import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { LABEL_KOMPONEN_BIAYA, type KomponenBiaya } from '@/lib/e-perjadin/espj'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Daftar Pengeluaran Riil' }

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default async function DaftarPengeluaranRiilPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('nomor, maksud, unit:unit_tujuan_id(nama_unit)').eq('id', id).single()
  if (!pn) notFound()

  const { data: espj } = await supabase.from('perjadin_espj')
    .select('daftar_pengeluaran_disetujui').eq('penugasan_id', id).maybeSingle()

  const { data: biaya } = await supabase.from('perjadin_biaya')
    .select('komponen, uraian, tanggal, jumlah_diajukan, jumlah_diakui, peserta:peserta_id(nama)')
    .eq('penugasan_id', id).eq('tanpa_bukti', true).order('tanggal')
  if (!biaya || biaya.length === 0) notFound()

  const total = biaya.reduce((s, b) => s + Number(b.jumlah_diakui), 0)
  const unit = pn.unit as { nama_unit?: string } | null

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 text-[11pt] text-slate-900">
      <style>{`@media print { @page { size: A4 portrait; margin: 1.6cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[13pt] underline underline-offset-4 mt-2">DAFTAR PENGELUARAN RIIL</h1>
      <p className="text-center text-[9.5pt] text-slate-600 mb-5">
        ST {pn.nomor ?? '—'} · {pn.maksud} — {unit?.nama_unit ?? '—'}
      </p>

      <p className="mb-3">
        Yang bertanda tangan di bawah ini menyatakan dengan sebenarnya bahwa biaya di bawah ini
        benar-benar dikeluarkan untuk pelaksanaan perjalanan dinas dimaksud dan bukti pengeluarannya
        tidak diperoleh, serta bertanggung jawab penuh atas kebenaran pernyataan ini.
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left w-8">No</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Pelaksana</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Uraian</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {biaya.map((b, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1">{(b.peserta as { nama?: string } | null)?.nama}</td>
              <td className="border border-slate-300 px-2 py-1">
                {LABEL_KOMPONEN_BIAYA[b.komponen as KomponenBiaya]} — {b.uraian}{b.tanggal ? ` (${b.tanggal})` : ''}
              </td>
              <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(b.jumlah_diakui))}</td>
            </tr>
          ))}
          <tr className="font-semibold bg-slate-50">
            <td className="border border-slate-300 px-2 py-1" colSpan={3}>Jumlah</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="flex justify-between items-start mt-10">
        <div>
          <TandaTanganDummy jabatan="Mengetahui / Menyetujui — Pejabat Pembuat Komitmen" />
          {espj?.daftar_pengeluaran_disetujui && <p className="text-center text-[8pt] text-emerald-600 mt-1">Disetujui di sistem</p>}
        </div>
        <TandaTanganDummy jabatan="Pelaksana / Ketua Tim" />
      </div>
    </div>
  )
}
