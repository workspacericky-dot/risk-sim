import { createAdminClient } from '@/utils/supabase/admin'
import { CheckCircle2, XCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Verifikasi Dokumen — E-Perjadin Bawas' }

// Portal verifikasi publik-terbatas (PRD F-4.3). Hanya menampilkan metadata
// non-sensitif: TIDAK memuat NIP, nominal, atau data pribadi lainnya.
// Memakai service role untuk lookup token; field yang diekspos dikunci di kode ini.
type DokVerifikasi = {
  jenis: string; nomor: string; diterbitkan_pada: string
  penugasan: { maksud: string; status: string; provinsi: string; tanggal_berangkat: string; tanggal_kembali: string; unit: { nama_unit: string } | null } | null
  peserta: { nama: string } | null
}

export default async function VerifikasiPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  let dok: DokVerifikasi | null = null
  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('perjadin_dokumen')
      .select('jenis, nomor, diterbitkan_pada, penugasan:penugasan_id(maksud, status, provinsi, tanggal_berangkat, tanggal_kembali, unit:unit_tujuan_id(nama_unit)), peserta:peserta_id(nama)')
      .eq('token_qr', token)
      .maybeSingle()
    dok = (data as DokVerifikasi | null) ?? null
  } catch {
    dok = null
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-slate-900">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Badan Pengawasan Mahkamah Agung RI — E-Perjadin
        </p>

        {!dok ? (
          <div className="mt-4 flex items-start gap-3">
            <XCircle className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <h1 className="font-bold text-lg">Dokumen tidak dikenali</h1>
              <p className="text-sm text-slate-500 mt-1">
                Token verifikasi tidak cocok dengan dokumen mana pun di sistem. Lembar cetak
                kemungkinan tidak sah atau telah dimodifikasi.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-4 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <h1 className="font-bold text-lg">Dokumen terverifikasi</h1>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Baris k="Jenis dokumen" v={
                dok.jenis === 'ST' ? 'Surat Tugas'
                  : dok.jenis === 'SPD' ? 'Surat Perjalanan Dinas'
                  : dok.jenis === 'Laporan' ? 'Laporan Hasil Perjalanan Dinas'
                  : dok.jenis === 'RekapSPJ' ? 'Rekapitulasi Pertanggungjawaban'
                  : dok.jenis
              } />
              <Baris k="Nomor" v={dok.nomor} />
              {dok.peserta && <Baris k="Atas nama" v={dok.peserta.nama} />}
              <Baris k="Maksud penugasan" v={dok.penugasan?.maksud ?? '—'} />
              <Baris k="Satker tujuan" v={`${dok.penugasan?.unit?.nama_unit ?? '—'} · ${dok.penugasan?.provinsi ?? ''}`} />
              <Baris k="Periode" v={`${dok.penugasan?.tanggal_berangkat ?? ''} s.d. ${dok.penugasan?.tanggal_kembali ?? ''}`} />
              <Baris k="Status penugasan" v={dok.penugasan?.status ?? '—'} />
              <Baris k="Diterbitkan" v={new Date(dok.diterbitkan_pada).toLocaleString('id-ID')} />
            </dl>
            <p className="mt-5 text-xs text-slate-400">
              Halaman ini tidak menampilkan NIP, nominal, maupun data pribadi. Verifikasi hanya
              memastikan lembar cetak sesuai dengan data yang tercatat di sistem.
            </p>
          </>
        )}
      </div>
    </main>
  )
}

function Baris({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <dt className="w-32 shrink-0 text-slate-400">{k}</dt>
      <dd className="font-medium">{v}</dd>
    </div>
  )
}
