import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { qrSvg, asalSitus } from '@/lib/e-perjadin/qr'
import type { RincianDanom } from '@/lib/e-perjadin/sbm'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cetak DANOM' }

const rp = (n: number) => Number(Math.round(n)).toLocaleString('id-ID')

export default async function CetakDanomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('*, unit:unit_tujuan_id(nama_unit)').eq('id', id).single()
  if (!pn) notFound()

  const [{ data: dok }, { data: stDok }, { data: peserta }] = await Promise.all([
    supabase.from('perjadin_dokumen').select('nomor, token_qr, diterbitkan_pada').eq('penugasan_id', id).eq('jenis', 'DANOM').maybeSingle(),
    supabase.from('perjadin_dokumen').select('nomor, diterbitkan_pada').eq('penugasan_id', id).eq('jenis', 'ST').maybeSingle(),
    supabase.from('perjadin_peserta').select('*').eq('penugasan_id', id).order('created_at', { ascending: true }),
  ])
  if (!dok) notFound()

  const qr = await qrSvg(`${await asalSitus()}/verifikasi/${dok.token_qr}`)
  const unit = pn.unit as { nama_unit?: string } | null
  const rows = (peserta ?? []).map((p) => ({
    nama: p.nama as string,
    r: (p.estimasi_rincian ?? {}) as Partial<RincianDanom>,
  }))
  const sum = (f: (r: Partial<RincianDanom>) => number) => rows.reduce((s, x) => s + f(x.r), 0)
  const tglTerbit = new Date((stDok?.diterbitkan_pada ?? dok.diterbitkan_pada) as string)

  return (
    <div className="w-full max-w-[1000px] mx-auto p-6 text-[10pt] text-slate-900">
      <style>{`@media print { @page { size: A4 landscape; margin: 1.2cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[13pt]">DAFTAR NOMINATIF BIAYA PERJALANAN DINAS</h1>
      <p className="text-center text-[11pt] uppercase">{pn.maksud} PADA {unit?.nama_unit ?? '—'}</p>
      <p className="text-center text-[10pt] mb-1">
        Surat Tugas Nomor: {stDok?.nomor ?? '—'} tanggal {tglTerbit.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
      <p className="text-center text-[9pt] text-slate-500 mb-4">DANOM Nomor: {dok.nomor}</p>

      <table className="w-full border-collapse text-[8.5pt]">
        <thead>
          <tr className="bg-yellow-200">
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>NO</th>
            <th className="border border-slate-500 px-2 py-1 text-left" rowSpan={2}>NAMA</th>
            <th className="border border-slate-500 px-1 py-1" colSpan={3}>HARIAN</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>REPRE-<br />SENTASI</th>
            <th className="border border-slate-500 px-1 py-1" colSpan={3}>PENGINAPAN</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>TRANSPOR<br />ANTARKOTA</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>DPR</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>SPJ<br />(Hrn+Rep+DPR)</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>KWITANSI<br />(Pngnp+Pswt+SPJ)</th>
            <th className="border border-slate-500 px-1 py-1" rowSpan={2}>TANDA TANGAN</th>
          </tr>
          <tr className="bg-yellow-200 text-[7.5pt]">
            <th className="border border-slate-500 px-1">Hari</th>
            <th className="border border-slate-500 px-1">Tarif</th>
            <th className="border border-slate-500 px-1">Jumlah</th>
            <th className="border border-slate-500 px-1">Malam</th>
            <th className="border border-slate-500 px-1">Tarif</th>
            <th className="border border-slate-500 px-1">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((x, i) => (
            <tr key={i}>
              <td className="border border-slate-400 px-1 py-1.5 text-center">{i + 1}</td>
              <td className="border border-slate-400 px-2 py-1.5">{x.nama}</td>
              <td className="border border-slate-400 px-1 text-center">{x.r.hari ?? 0}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.tarifHarian ?? 0))}{x.r.faktorHarian != null && x.r.faktorHarian !== 1 ? ` ×${x.r.faktorHarian}` : ''}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.harian ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.representasi ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-center">{x.r.malam ?? 0}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.tarifPenginapan ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.penginapan ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.pesawat ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.dpr ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right">{rp(Number(x.r.spj ?? 0))}</td>
              <td className="border border-slate-400 px-1 text-right font-semibold">{rp(Number(x.r.kwitansi ?? 0))}</td>
              <td className="border border-slate-400 px-1" />
            </tr>
          ))}
          <tr className="font-bold bg-slate-50">
            <td className="border border-slate-400 px-1 py-1.5 text-center" colSpan={2}>TOTAL</td>
            <td className="border border-slate-400" colSpan={2} />
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.harian ?? 0)))}</td>
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.representasi ?? 0)))}</td>
            <td className="border border-slate-400" colSpan={2} />
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.penginapan ?? 0)))}</td>
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.pesawat ?? 0)))}</td>
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.dpr ?? 0)))}</td>
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.spj ?? 0)))}</td>
            <td className="border border-slate-400 px-1 text-right">{rp(sum((r) => Number(r.kwitansi ?? 0)))}</td>
            <td className="border border-slate-400" />
          </tr>
        </tbody>
      </table>

      <div className="mt-8 flex justify-between items-start gap-6">
        <div className="text-[8pt] text-slate-500 max-w-[280px]">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          Pindai untuk memverifikasi keaslian DANOM.
        </div>
        <div className="flex gap-10">
          <TandaTanganDummy jabatan="Mengetahui / Menyetujui — Pejabat Pembuat Komitmen" />
          <TandaTanganDummy jabatan="Menyetujui — Kuasa Pengguna Anggaran (Sekretaris)" />
        </div>
      </div>
    </div>
  )
}
