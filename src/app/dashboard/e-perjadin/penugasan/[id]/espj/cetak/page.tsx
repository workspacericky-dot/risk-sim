import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { qrSvg, asalSitus } from '@/lib/e-perjadin/qr'
import { LABEL_KOMPONEN_BIAYA, type KomponenBiaya } from '@/lib/e-perjadin/espj'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cetak Rekap SPJ' }

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default async function CetakRekapSpjPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('nomor, maksud, provinsi, tanggal_berangkat, tanggal_kembali, uang_muka_persen, unit:unit_tujuan_id(nama_unit)')
    .eq('id', id).single()
  if (!pn) notFound()

  const { data: espj } = await supabase.from('perjadin_espj')
    .select('id, status, disetujui_pada').eq('penugasan_id', id).maybeSingle()
  if (!espj || !['disetujui', 'selesai'].includes(espj.status)) notFound()

  const [{ data: lines }, { data: peserta }, { data: biaya }, { data: dok }] = await Promise.all([
    supabase.from('perjadin_espj_peserta').select('*').eq('espj_id', espj.id),
    supabase.from('perjadin_peserta').select('id, nama, nip').eq('penugasan_id', id),
    supabase.from('perjadin_biaya').select('peserta_id, komponen, uraian, jumlah_diakui, status_verifikasi').eq('penugasan_id', id),
    supabase.from('perjadin_dokumen').select('nomor, token_qr').eq('penugasan_id', id).eq('jenis', 'RekapSPJ').maybeSingle(),
  ])

  const namaMap = new Map((peserta ?? []).map((p) => [p.id, p]))
  const qr = dok ? await qrSvg(`${await asalSitus()}/verifikasi/${dok.token_qr}`) : ''
  const unit = pn.unit as { nama_unit?: string } | null
  const totalKurang = (lines ?? []).reduce((s, l) => { const v = l.selisih_final ?? l.selisih; return s + (v > 0 ? v : 0) }, 0)
  const totalLebih = (lines ?? []).reduce((s, l) => { const v = l.selisih_final ?? l.selisih; return s + (v < 0 ? -v : 0) }, 0)

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 text-[11pt] text-slate-900">
      <style>{`@media print { @page { size: A4 portrait; margin: 1.6cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[14pt] underline underline-offset-4 mt-2">REKAPITULASI PERTANGGUNGJAWABAN (E-SPJ)</h1>
      {dok && <p className="text-center text-[10pt] mb-1">Nomor: {dok.nomor}</p>}
      <p className="text-center text-[9.5pt] text-slate-600 mb-5">
        ST {pn.nomor ?? '—'} · {pn.maksud} — {unit?.nama_unit ?? '—'} ({pn.provinsi}) · {pn.tanggal_berangkat} s.d. {pn.tanggal_kembali} · uang muka {pn.uang_muka_persen}%
      </p>

      <table className="w-full border-collapse text-[9.5pt]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-400 px-2 py-1 text-left">Peserta</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Hak SBM</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Biaya Riil Diakui</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Uang Muka</th>
            <th className="border border-slate-400 px-2 py-1 text-right">Kurang / (Lebih) Bayar</th>
          </tr>
        </thead>
        <tbody>
          {(lines ?? []).map((l) => {
            const pes = namaMap.get(l.peserta_id)
            const v = l.selisih_final ?? l.selisih
            return (
              <tr key={l.id}>
                <td className="border border-slate-300 px-2 py-1">{pes?.nama}{pes?.nip ? <div className="text-[8pt] text-slate-500">NIP {pes.nip}</div> : null}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(l.hak_sbm))}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(l.biaya_riil))}</td>
                <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(l.uang_muka))}</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-semibold">{v < 0 ? `(${rupiah(-v)})` : rupiah(v)}</td>
              </tr>
            )
          })}
          <tr className="font-semibold bg-slate-50">
            <td className="border border-slate-300 px-2 py-1" colSpan={4}>Total kurang bayar (dibayarkan) / lebih bayar (disetor)</td>
            <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(totalKurang)} / ({rupiah(totalLebih)})</td>
          </tr>
        </tbody>
      </table>

      <h2 className="font-bold text-[11pt] mt-5 mb-1">Rincian biaya riil diakui</h2>
      <table className="w-full border-collapse text-[9pt]">
        <tbody>
          {(biaya ?? []).filter((b) => b.status_verifikasi !== 'tolak').map((b, i) => (
            <tr key={i}>
              <td className="border border-slate-300 px-2 py-1">{namaMap.get(b.peserta_id)?.nama}</td>
              <td className="border border-slate-300 px-2 py-1">{LABEL_KOMPONEN_BIAYA[b.komponen as KomponenBiaya]}</td>
              <td className="border border-slate-300 px-2 py-1 text-slate-600">{b.uraian}</td>
              <td className="border border-slate-300 px-2 py-1 text-right">{rupiah(Number(b.jumlah_diakui))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-end mt-8">
        <div className="text-[8.5pt] text-slate-500 max-w-[300px]">
          {qr && <div dangerouslySetInnerHTML={{ __html: qr }} />}
          Pindai untuk memverifikasi keaslian dokumen. Disetujui PPK{' '}
          {espj.disetujui_pada ? new Date(espj.disetujui_pada).toLocaleString('id-ID') : '—'}.
        </div>
        <TandaTanganDummy jabatan="Pejabat Pembuat Komitmen" />
      </div>
    </div>
  )
}
