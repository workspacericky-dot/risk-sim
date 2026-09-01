import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Button } from '@/components/ui/button'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { hitungRekapPeserta } from '@/lib/e-perjadin/espj'
import { pastikanEspj } from './actions'
import EspjClient from './EspjClient'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'E-SPJ' }

export type BiayaRow = {
  id: string; peserta_id: string; komponen: string; uraian: string; tanggal: string | null
  jumlah_diajukan: number; jumlah_diakui: number; melebihi_sbm: boolean; batas_sbm: number | null
  alasan_pelaksana: string | null; disetujui_ppk: boolean; tanpa_bukti: boolean
  status_verifikasi: string; catatan_verifikasi: string | null; dikunci: boolean; dibuat_oleh: string
}
export type RekapRow = {
  pesertaId: string; nama: string; hak_sbm: number; biaya_riil: number; uang_muka: number
  selisih: number; selisih_final: number | null; status_bayar: string; espjPesertaId: string | null
}

export default async function EspjPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.bisaAkses) redirect('/dashboard')

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('id, nomor, maksud, status, uang_muka_persen').eq('id', id).single()
  if (!pn) notFound()

  const { data: pesertaSaya } = await supabase.from('perjadin_peserta')
    .select('id, peran_tim').eq('penugasan_id', id).eq('user_id', akses.userId).maybeSingle()
  const bolehKetua = akses.isAdmin || akses.peran.includes('pengelola_kegiatan') || pesertaSaya?.peran_tim === 'Ketua Tim'

  const { data: espj } = await supabase.from('perjadin_espj')
    .select('id, status, siklus_revisi, catatan_pengembalian, daftar_pengeluaran_disetujui').eq('penugasan_id', id).maybeSingle()

  const header = (
    <div>
      <Link href={`/dashboard/e-perjadin/penugasan/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800">
        <ArrowLeft className="w-4 h-4" /> {pn.nomor ?? 'Penugasan'}
      </Link>
      <h2 className="text-xl font-bold tracking-tight mt-1">E-SPJ — Pertanggungjawaban</h2>
      <p className="text-sm text-muted-foreground">{pn.maksud}</p>
    </div>
  )

  const bisaMulai = !!pesertaSaya || akses.isAdmin || akses.peran.includes('pengelola_kegiatan')
  if (!espj) {
    return (
      <div className="max-w-2xl mx-auto space-y-5">
        {header}
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center space-y-3">
          <p className="text-sm text-slate-600">E-SPJ belum dibuka untuk penugasan ini.</p>
          {bisaMulai ? (
            <form action={async () => { 'use server'; await pastikanEspj(id) }}>
              <Button type="submit">Buka E-SPJ</Button>
            </form>
          ) : <p className="text-xs text-slate-400">Menunggu tim membuka E-SPJ.</p>}
        </div>
      </div>
    )
  }

  const [{ data: peserta }, { data: biaya }, { data: lines }, { data: temuan }, { data: dok }] = await Promise.all([
    supabase.from('perjadin_peserta').select('id, nama, estimasi_total').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_biaya').select('*').eq('penugasan_id', id).order('created_at'),
    supabase.from('perjadin_espj_peserta').select('*').eq('espj_id', espj.id),
    supabase.from('perjadin_temuan').select('id, kode, keparahan, ringkasan').eq('penugasan_id', id).eq('status', 'terbuka'),
    supabase.from('perjadin_dokumen').select('nomor').eq('penugasan_id', id).eq('jenis', 'RekapSPJ').maybeSingle(),
  ])

  const biayaRows = (biaya ?? []) as BiayaRow[]
  const lineMap = new Map((lines ?? []).map((l) => [l.peserta_id as string, l]))
  const persen = Number(pn.uang_muka_persen)

  const rekap: RekapRow[] = ((peserta ?? []) as { id: string; nama: string; estimasi_total: number }[]).map((p) => {
    const saved = lineMap.get(p.id)
    if (saved) {
      return {
        pesertaId: p.id, nama: p.nama, hak_sbm: Number(saved.hak_sbm), biaya_riil: Number(saved.biaya_riil),
        uang_muka: Number(saved.uang_muka), selisih: Number(saved.selisih),
        selisih_final: saved.selisih_final != null ? Number(saved.selisih_final) : null,
        status_bayar: saved.status_bayar as string, espjPesertaId: saved.id as string,
      }
    }
    const rows = biayaRows.filter((b) => b.peserta_id === p.id && b.status_verifikasi !== 'tolak')
    const biayaRiil = rows.reduce((s, b) => s + b.jumlah_diakui, 0)
    const tambahan = rows.reduce((s, b) => s + (b.disetujui_ppk && b.batas_sbm != null ? Math.max(0, b.jumlah_diakui - b.batas_sbm) : 0), 0)
    const r = hitungRekapPeserta({ hakSbm: Number(p.estimasi_total), biayaRiilDiakui: biayaRiil, tambahanDiakuiDiAtasSbm: tambahan, uangMukaPersen: persen })
    return { pesertaId: p.id, nama: p.nama, ...r, selisih_final: null, status_bayar: 'menunggu', espjPesertaId: null }
  })

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {header}
      <EspjClient
        penugasanId={id}
        penugasanStatus={pn.status}
        espj={espj as { id: string; status: string; siklus_revisi: number; catatan_pengembalian: string | null; daftar_pengeluaran_disetujui: boolean }}
        nomorRekap={dok?.nomor ?? null}
        sayaPesertaId={pesertaSaya?.id ?? null}
        bolehKetua={bolehKetua}
        isStafPpk={akses.isAdmin || akses.peran.includes('staf_ppk')}
        isPpk={akses.isAdmin || akses.peran.includes('ppk')}
        isBendahara={akses.isAdmin || akses.peran.includes('bendahara')}
        peserta={(peserta ?? []).map((p) => ({ id: p.id, nama: p.nama }))}
        biaya={biayaRows}
        rekap={rekap}
        temuan={(temuan ?? []) as { id: string; kode: string; keparahan: string; ringkasan: string }[]}
      />
    </div>
  )
}
