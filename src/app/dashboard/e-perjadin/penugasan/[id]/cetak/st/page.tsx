import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { qrSvg, asalSitus } from '@/lib/e-perjadin/qr'
import { LABEL_JENIS_DINAS, type JenisDinas } from '@/lib/e-perjadin/konstanta'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cetak Surat Tugas' }

export default async function CetakStPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('*, unit:unit_tujuan_id(nama_unit)').eq('id', id).single()
  if (!pn) notFound()

  const [{ data: dok }, { data: peserta }] = await Promise.all([
    supabase.from('perjadin_dokumen').select('nomor, token_qr, diterbitkan_pada').eq('penugasan_id', id).eq('jenis', 'ST').maybeSingle(),
    supabase.from('perjadin_peserta').select('*').eq('penugasan_id', id).order('created_at', { ascending: true }),
  ])
  if (!dok) notFound()

  const qr = await qrSvg(`${await asalSitus()}/verifikasi/${dok.token_qr}`)
  const unit = pn.unit as { nama_unit?: string } | null

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 text-[11pt] text-slate-900">
      <style>{`@media print { @page { size: A4 portrait; margin: 1.6cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[14pt] underline underline-offset-4 mt-2">SURAT TUGAS</h1>
      <p className="text-center text-[10pt] mb-5">Nomor: {dok.nomor}</p>

      <table className="w-full text-[11pt] leading-relaxed">
        <tbody>
          <tr><td className="align-top w-28 py-1">Dasar</td><td className="align-top w-3 py-1">:</td>
            <td className="py-1">Rencana pengawasan Badan Pengawasan Mahkamah Agung RI Tahun Anggaran {pn.tahun_anggaran}.</td></tr>
        </tbody>
      </table>

      <p className="mt-4 mb-1 font-semibold">Menugaskan kepada:</p>
      <table className="w-full border-collapse text-[10pt]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left w-8">No</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Nama / NIP</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Jabatan</th>
            <th className="border border-slate-400 px-2 py-1 text-left">Peran Tim</th>
          </tr>
        </thead>
        <tbody>
          {(peserta ?? []).map((p, i) => (
            <tr key={p.id as string}>
              <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1">
                {p.nama as string}{p.nip ? <div className="text-[8.5pt] text-slate-500">NIP {p.nip as string}</div> : null}
              </td>
              <td className="border border-slate-300 px-2 py-1">{(p.jabatan as string) || '—'}</td>
              <td className="border border-slate-300 px-2 py-1">{p.peran_tim as string}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table className="w-full text-[11pt] leading-relaxed mt-4">
        <tbody>
          <tr><td className="align-top w-28 py-1">Untuk</td><td className="align-top w-3 py-1">:</td>
            <td className="py-1">
              {pn.maksud} pada {unit?.nama_unit ?? '—'} ({pn.provinsi}). Jenis dinas: {LABEL_JENIS_DINAS[pn.jenis_dinas as JenisDinas] ?? pn.jenis_dinas}. Alur: {pn.jenis_alur}.
            </td></tr>
          <tr><td className="align-top py-1">Waktu</td><td className="py-1">:</td>
            <td className="py-1">{pn.tanggal_berangkat} s.d. {pn.tanggal_kembali}</td></tr>
        </tbody>
      </table>

      <p className="mt-4 text-[10pt] text-slate-500">
        Rincian biaya per komponen dan pembebanan anggaran tercantum pada Daftar Nominatif (DANOM) penugasan ini.
      </p>

      <div className="flex justify-between items-end mt-8">
        <div className="text-[8.5pt] text-slate-500 max-w-[300px]">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          Pindai untuk memverifikasi keaslian dokumen. Diterbitkan sistem{' '}
          {new Date(dok.diterbitkan_pada as string).toLocaleString('id-ID')}.
        </div>
        <TandaTanganDummy jabatan="Pemberi Tugas / Inspektur Wilayah" />
      </div>
    </div>
  )
}
