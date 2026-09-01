import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileSpreadsheet } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { biayaPerPenugasan, cakupanSatker } from '@/lib/e-perjadin/manajerial'
import { muatMentahPenugasan } from './data'

export const metadata = { title: 'Laporan Manajerial — E-Perjadin' }
export const dynamic = 'force-dynamic'

const PENGAWAS = ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas']
const rp = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')

export default async function LaporanManajerialPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.isAdmin && !akses.peran.some((p) => PENGAWAS.includes(p))) redirect('/dashboard/e-perjadin')

  const mentah = await muatMentahPenugasan(supabase)
  const biaya = biayaPerPenugasan(mentah)
  const cakupan = cakupanSatker(mentah)
  const totalBiaya = biaya.reduce((s, b) => s + b.costPerPenugasan, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Laporan Manajerial</h2>
          <p className="text-muted-foreground">Biaya per penugasan &amp; cakupan satker — menautkan biaya pengawasan ke keluarannya (O4).</p>
        </div>
        <a href="/dashboard/e-perjadin/laporan-manajerial/rekap.xlsx"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metrik label="Penugasan (Berjalan/Selesai)" nilai={String(biaya.length)} />
        <Metrik label="Satker tercakup" nilai={String(cakupan.length)} />
        <Metrik label="Total biaya pengawasan" nilai={rp(totalBiaya)} />
      </div>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-base">Biaya per Penugasan</CardTitle>
          <CardDescription>Realisasi bila E-SPJ tuntas; jika belum, dipakai estimasi.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">ST / Maksud</th><th className="px-4 py-2 text-left">Satker</th>
                <th className="px-4 py-2 text-center">PKA</th><th className="px-4 py-2 text-right">Peserta</th>
                <th className="px-4 py-2 text-right">Estimasi</th><th className="px-4 py-2 text-right">Realisasi</th>
                <th className="px-4 py-2 text-right">Biaya / Penugasan</th>
              </tr>
            </thead>
            <tbody>
              {biaya.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Belum ada penugasan berjalan/selesai.</td></tr>}
              {biaya.map((b) => (
                <tr key={b.id} className="border-t">
                  <td className="px-4 py-2">
                    <Link href={`/dashboard/e-perjadin/penugasan/${b.id}`} className="font-medium hover:underline">{b.nomor ?? 'Draf'}</Link>
                    <div className="text-xs text-slate-400 line-clamp-1">{b.maksud}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{b.satker}<div className="text-slate-400">{b.provinsi}</div></td>
                  <td className="px-4 py-2 text-center">{b.adaPka ? '✓' : '—'}</td>
                  <td className="px-4 py-2 text-right">{b.jumlahPeserta}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{rp(b.estimasiTotal)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{b.realisasi ? rp(b.realisasi) : '—'}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs font-semibold">{rp(b.costPerPenugasan)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
          <CardTitle className="text-base">Cakupan Satker</CardTitle>
          <CardDescription>Satker yang benar-benar diuji di lapangan dan risiko mana yang tertaut PKA.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">Satker</th><th className="px-4 py-2 text-left">Provinsi</th>
                <th className="px-4 py-2 text-right">Kunjungan</th><th className="px-4 py-2 text-right">Tertaut PKA</th>
                <th className="px-4 py-2 text-right">Total Estimasi</th><th className="px-4 py-2 text-right">Total Realisasi</th>
              </tr>
            </thead>
            <tbody>
              {cakupan.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">—</td></tr>}
              {cakupan.map((c, i) => (
                <tr key={i} className="border-t">
                  <td className="px-4 py-2">{c.satker}</td>
                  <td className="px-4 py-2 text-xs">{c.provinsi}</td>
                  <td className="px-4 py-2 text-right">{c.kunjungan}</td>
                  <td className="px-4 py-2 text-right">{c.penugasanTertautPka}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{rp(c.totalEstimasi)}</td>
                  <td className="px-4 py-2 text-right font-mono text-xs">{c.totalRealisasi ? rp(c.totalRealisasi) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  )
}

function Metrik({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-xl font-bold tabular-nums">{nilai}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
