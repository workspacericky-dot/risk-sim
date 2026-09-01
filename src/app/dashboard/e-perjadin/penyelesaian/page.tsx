import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'

export const metadata = { title: 'Penyelesaian — E-Perjadin' }
export const dynamic = 'force-dynamic'

const rupiah = (n: number) => 'Rp ' + Number(n).toLocaleString('id-ID')
const HARI = 86_400_000

export default async function PenyelesaianPage() {
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.isAdmin && !akses.peran.some((p) => ['bendahara', 'ppk', 'staf_ppk'].includes(p))) redirect('/dashboard/e-perjadin')

  const { data: espjs } = await supabase.from('perjadin_espj')
    .select('id, status, disetujui_pada, penugasan:penugasan_id(id, nomor, maksud)')
    .in('status', ['disetujui', 'selesai'])
    .order('disetujui_pada', { ascending: false })

  const ids = (espjs ?? []).map((e) => e.id)
  const { data: lines } = ids.length
    ? await supabase.from('perjadin_espj_peserta')
        .select('espj_id, selisih, selisih_final, status_bayar, tanggal_bayar, peserta:peserta_id(nama)')
        .in('espj_id', ids)
    : { data: [] as unknown[] }

  const perEspj = new Map<string, { selisih: number; status_bayar: string; nama: string }[]>()
  for (const l of (lines ?? []) as Record<string, unknown>[]) {
    const arr = perEspj.get(l.espj_id as string) ?? []
    arr.push({
      selisih: (l.selisih_final as number | null) ?? (l.selisih as number),
      status_bayar: l.status_bayar as string,
      nama: (l.peserta as { nama?: string } | null)?.nama ?? '—',
    })
    perEspj.set(l.espj_id as string, arr)
  }

  // Server Component non-cached (force-dynamic) — waktu sekarang dievaluasi sekali per request.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const tunggakan: { nama: string; nominal: number; hari: number; penugasanId: string; nomor: string | null }[] = []
  for (const e of espjs ?? []) {
    if (e.status !== 'disetujui' || !e.disetujui_pada) continue
    const umur = Math.floor((now - Date.parse(e.disetujui_pada)) / HARI)
    if (umur <= 30) continue
    const pg = e.penugasan as unknown as { id: string; nomor: string | null } | null
    for (const l of perEspj.get(e.id) ?? []) {
      if (l.status_bayar !== 'lunas' && l.selisih < 0) {
        tunggakan.push({ nama: l.nama, nominal: -l.selisih, hari: umur, penugasanId: pg?.id ?? '', nomor: pg?.nomor ?? null })
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Penyelesaian &amp; Rekonsiliasi Uang Muka</h2>
        <p className="text-muted-foreground">Kewajiban bayar kurang bayar dan piutang sisa uang muka per penugasan.</p>
      </div>

      {tunggakan.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50/60 border-b pb-4 mb-4">
            <CardTitle className="text-base text-red-800">Tunggakan Sisa Uang Muka &gt; 30 Hari</CardTitle>
            <CardDescription>Lebih bayar yang belum disetor melewati 30 hari sejak persetujuan PPK.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {tunggakan.map((t, i) => (
              <div key={i} className="flex items-center justify-between gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                <span>{t.nama} · <Link href={`/dashboard/e-perjadin/penugasan/${t.penugasanId}/espj`} className="underline">{t.nomor ?? 'ST'}</Link></span>
                <span className="flex items-center gap-2">
                  <span className="font-mono text-xs">{rupiah(t.nominal)}</span>
                  <Badge variant="outline" className={t.hari > 60 ? 'bg-red-100 text-red-800 border-red-300' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                    {t.hari} hari
                  </Badge>
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
          <CardTitle className="text-base">Daftar Penyelesaian</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(espjs ?? []).length === 0 && <p className="text-sm text-slate-500">Belum ada E-SPJ disetujui.</p>}
          {(espjs ?? []).map((e) => {
            const pg = e.penugasan as unknown as { id: string; nomor: string | null; maksud: string } | null
            const arr = perEspj.get(e.id) ?? []
            const totalKurang = arr.reduce((s, l) => s + (l.selisih > 0 ? l.selisih : 0), 0)
            const totalLebih = arr.reduce((s, l) => s + (l.selisih < 0 ? -l.selisih : 0), 0)
            const lunas = arr.filter((l) => l.status_bayar === 'lunas').length
            return (
              <Link key={e.id} href={`/dashboard/e-perjadin/penugasan/${pg?.id}/espj`}
                className="block rounded-lg border border-slate-200 p-3 hover:border-slate-300 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{pg?.nomor ?? 'ST'} — <span className="text-slate-500 font-normal">{pg?.maksud}</span></span>
                  <Badge variant="outline" className={e.status === 'selesai' ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-50 text-emerald-700'}>{e.status}</Badge>
                </div>
                <div className="mt-1 text-xs text-slate-500 font-mono">
                  kurang bayar {rupiah(totalKurang)} · lebih bayar {rupiah(totalLebih)} · {lunas}/{arr.length} baris lunas
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
