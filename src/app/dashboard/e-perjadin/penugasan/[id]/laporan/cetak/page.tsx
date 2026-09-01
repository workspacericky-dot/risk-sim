import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { qrSvg, asalSitus } from '@/lib/e-perjadin/qr'
import { SEGMEN, JUDUL_SEGMEN } from '@/lib/e-perjadin/laporan'
import AutoPrint from '@/app/dashboard/rals/print/AutoPrint'
import TandaTanganDummy from '@/app/dashboard/e-perjadin/TandaTanganDummy'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cetak Laporan Hasil Dinas' }

export default async function CetakLaporanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('nomor, maksud, provinsi, tanggal_berangkat, tanggal_kembali, unit:unit_tujuan_id(nama_unit)')
    .eq('id', id).single()
  if (!pn) notFound()

  const { data: lap } = await supabase.from('perjadin_laporan')
    .select('id, status, difinalkan_pada').eq('penugasan_id', id).maybeSingle()
  if (!lap || lap.status !== 'final') notFound()

  const [{ data: segmen }, { data: dok }, { data: presensi }] = await Promise.all([
    supabase.from('perjadin_laporan_segmen').select('kunci, isi').eq('laporan_id', lap.id),
    supabase.from('perjadin_dokumen').select('nomor, token_qr').eq('penugasan_id', id).eq('jenis', 'Laporan').maybeSingle(),
    supabase.from('perjadin_presensi')
      .select('jenis, tanggal, waktu_server, lintang, bujur, path_foto, keterangan, peserta:peserta_id(nama)')
      .eq('penugasan_id', id).order('waktu_server', { ascending: true }),
  ])

  const isi = new Map((segmen ?? []).map((s) => [s.kunci, s.isi]))
  const admin = createAdminClient()
  const lampiran = await Promise.all(((presensi ?? []) as Record<string, unknown>[]).map(async (p) => {
    let url: string | null = null
    if (p.path_foto) {
      const { data } = await admin.storage.from('perjadin-presensi').createSignedUrl(p.path_foto as string, 3600)
      url = data?.signedUrl ?? null
    }
    return {
      jenis: p.jenis as string, tanggal: p.tanggal as string, waktu: p.waktu_server as string,
      lintang: p.lintang as number | null, bujur: p.bujur as number | null,
      keterangan: p.keterangan as string, nama: (p.peserta as { nama?: string } | null)?.nama ?? '',
      url,
    }
  }))

  const qr = dok ? await qrSvg(`${await asalSitus()}/verifikasi/${dok.token_qr}`) : ''
  const unit = pn.unit as { nama_unit?: string } | null

  return (
    <div className="w-full max-w-[720px] mx-auto p-6 text-[11pt] text-slate-900">
      <style>{`@media print { @page { size: A4 portrait; margin: 1.6cm; } }`}</style>
      <div className="no-print"><AutoPrint /></div>

      <h1 className="text-center font-bold text-[14pt] underline underline-offset-4 mt-2">LAPORAN HASIL PERJALANAN DINAS</h1>
      {dok && <p className="text-center text-[10pt] mb-1">Nomor: {dok.nomor}</p>}
      <p className="text-center text-[9.5pt] text-slate-600 mb-5">
        {pn.maksud} — {unit?.nama_unit ?? '—'} ({pn.provinsi}) · {pn.tanggal_berangkat} s.d. {pn.tanggal_kembali}
      </p>

      {SEGMEN.map((s, i) => (
        <div key={s.kunci} className="mb-4">
          <h2 className="font-bold text-[11.5pt]">{String.fromCharCode(65 + i)}. {JUDUL_SEGMEN[s.kunci]}</h2>
          <p className="whitespace-pre-wrap text-justify leading-relaxed mt-1">{isi.get(s.kunci) || '—'}</p>
        </div>
      ))}

      <h2 className="font-bold text-[11.5pt] mt-6 mb-2">Lampiran — Rekap Titik Presensi Bergeotag</h2>
      {lampiran.length === 0 ? (
        <p className="text-[10pt] text-slate-500">Tidak ada titik presensi terekam.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lampiran.map((l, i) => (
            <div key={i} className="border border-slate-300 rounded p-2 text-[8.5pt] break-inside-avoid">
              {l.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.url} alt="" className="w-full h-32 object-cover rounded mb-1" />
              )}
              <div className="font-semibold">{l.jenis} · {l.nama}</div>
              <div className="text-slate-500">{new Date(l.waktu).toLocaleString('id-ID')}</div>
              {l.lintang != null && <div className="text-slate-500 font-mono">{l.lintang.toFixed(6)}, {l.bujur?.toFixed(6)}</div>}
              {l.keterangan && <div className="text-slate-600">“{l.keterangan}”</div>}
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between items-end mt-8">
        <div className="text-[8.5pt] text-slate-500 max-w-[300px]">
          {qr && <div dangerouslySetInnerHTML={{ __html: qr }} />}
          Pindai untuk memverifikasi keaslian dokumen. Difinalkan{' '}
          {lap.difinalkan_pada ? new Date(lap.difinalkan_pada).toLocaleString('id-ID') : '—'}.
        </div>
        <TandaTanganDummy jabatan="Ketua Tim Pemeriksa" />
      </div>
    </div>
  )
}
