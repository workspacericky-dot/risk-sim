import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { qrSvg, asalSitus } from '@/lib/e-perjadin/qr'
import { hitungJumlahHari, type RincianDanom } from '@/lib/e-perjadin/sbm'
import { LABEL_KATEGORI, type KategoriPelaksana } from '@/lib/e-perjadin/konstanta'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cetak SPD' }

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default async function CetakSpdPage({ params }: { params: Promise<{ id: string; pesertaId: string }> }) {
  const { id, pesertaId } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase
    .from('perjadin_penugasan').select('*, unit:unit_tujuan_id(nama_unit)').eq('id', id).single()
  if (!pn) notFound()

  const [{ data: ps }, { data: dok }, { data: mapPagu }, { data: stDok }] = await Promise.all([
    supabase.from('perjadin_peserta').select('*').eq('id', pesertaId).eq('penugasan_id', id).single(),
    supabase.from('perjadin_dokumen').select('nomor, token_qr, diterbitkan_pada').eq('peserta_id', pesertaId).eq('jenis', 'SPD').maybeSingle(),
    supabase.from('perjadin_penugasan_pagu').select('pagu:pagu_id(mata_anggaran)').eq('penugasan_id', id),
    supabase.from('perjadin_dokumen').select('nomor').eq('penugasan_id', id).eq('jenis', 'ST').maybeSingle(),
  ])
  if (!ps || !dok) notFound()

  const qr = await qrSvg(`${await asalSitus()}/verifikasi/${dok.token_qr}`)
  const unit = pn.unit as { nama_unit?: string } | null
  const hari = hitungJumlahHari(pn.tanggal_berangkat, pn.tanggal_kembali)
  const mataAnggaran = (mapPagu ?? []).map((m) => (m.pagu as { mata_anggaran?: string } | null)?.mata_anggaran).filter(Boolean).join(', ')
  const r = (ps.estimasi_rincian ?? {}) as Partial<RincianDanom>
  const labelHarian = 'Uang Harian' + (Number(r.faktorHarian ?? 1) !== 1 ? ` (${Math.round(Number(r.faktorHarian) * 100)}%)` : '')
  const komp: [string, number][] = [
    [labelHarian, Number(r.harian ?? 0)],
    ['Uang Representasi', Number(r.representasi ?? 0)],
    ['Biaya Penginapan', Number(r.penginapan ?? 0)],
    ['Transport Antarkota PP', Number(r.pesawat ?? 0)],
    ['DPR / Transport Lokal', Number(r.dpr ?? 0)],
  ]

  const baris: [string, string][] = [
    ['Pejabat pembuat komitmen', 'Badan Pengawasan Mahkamah Agung RI'],
    ['Nama / NIP', `${ps.nama}${ps.nip ? ` / ${ps.nip}` : ''}`],
    ['Jabatan / Kategori', `${ps.jabatan || '—'} / ${LABEL_KATEGORI[ps.tingkat_biaya as KategoriPelaksana] ?? `Kat. ${ps.tingkat_biaya}`}`],
    ['Peran dalam tim', ps.peran_tim],
    ['Maksud perjalanan dinas', pn.maksud],
    ['Alat angkut', '—'],
    ['Tempat berangkat', 'Jakarta (tempat kedudukan)'],
    ['Tempat tujuan', `${unit?.nama_unit ?? '—'} — ${pn.provinsi}`],
    ['Lama perjalanan dinas', `${hari} hari`],
    ['Tanggal berangkat', pn.tanggal_berangkat],
    ['Tanggal harus kembali', pn.tanggal_kembali],
    ['Pembebanan anggaran', mataAnggaran || '—'],
  ]

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 text-[11pt] text-slate-900">
      <style>{`@media print { @page { size: A4 portrait; margin: 1.6cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[14pt] underline underline-offset-4 mt-2">SURAT PERJALANAN DINAS (SPD)</h1>
      <p className="text-center text-[10pt] mb-1">Nomor: {dok.nomor}</p>
      {stDok && <p className="text-center text-[9pt] text-slate-500 mb-4">Dasar: Surat Tugas Nomor {stDok.nomor}</p>}

      <table className="w-full border-collapse text-[10.5pt]">
        <tbody>
          {baris.map(([k, v], i) => (
            <tr key={k}>
              <td className="border border-slate-300 px-2 py-1 w-8 align-top">{i + 1}</td>
              <td className="border border-slate-300 px-2 py-1 w-56 align-top">{k}</td>
              <td className="border border-slate-300 px-2 py-1">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-4 mb-1 font-semibold text-[10pt]">Rincian estimasi hak keuangan (DANOM):</p>
      <table className="w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left">Komponen</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Jumlah</th>
          </tr>
        </thead>
        <tbody>
          {komp.map(([label, nilai]) => (
            <tr key={label}>
              <td className="border border-slate-300 px-2 py-1">{label}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(nilai)}</td>
            </tr>
          ))}
          <tr className="font-semibold">
            <td className="border border-slate-300 px-2 py-1">Total Kwitansi</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(ps.estimasi_total ?? 0))}</td>
          </tr>
        </tbody>
      </table>
      {Number(r.pesawatBebanPribadi ?? 0) > 0 && (
        <p className="mt-1 text-[8.5pt] text-red-600">
          Selisih tiket di atas plafon + toleransi: {rupiah(Number(r.pesawatBebanPribadi))} menjadi beban pribadi pelaksana.
        </p>
      )}

      <div className="flex justify-between items-end mt-8">
        <div className="text-[8.5pt] text-slate-500 max-w-[300px]">
          <div dangerouslySetInnerHTML={{ __html: qr }} />
          Pindai untuk memverifikasi keaslian dokumen. Diterbitkan sistem{' '}
          {new Date(dok.diterbitkan_pada as string).toLocaleString('id-ID')}.
        </div>
        <TandaTanganDummy jabatan="Pejabat Pembuat Komitmen" />
      </div>
    </div>
  )
}
