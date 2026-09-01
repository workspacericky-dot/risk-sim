import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'

export const metadata = { title: 'Anomali — E-Perjadin' }
export const dynamic = 'force-dynamic'

const PERAN_PENGAWAS = ['ppk', 'staf_ppk', 'pengelola_kegiatan', 'auditor_perjadin', 'pemberi_tugas', 'ppspm', 'bendahara']
const KODE_AF = ['AF-1', 'AF-2', 'AF-3', 'AF-4', 'AF-5', 'AF-6', 'AF-7', 'AF-8', 'AF-9', 'AF-10']
const WARNA: Record<string, string> = {
  blocking: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  informational: 'bg-slate-100 text-slate-600 border-slate-200',
}
const KI = 'h-8 rounded-md border border-input bg-transparent px-2 text-xs'

type SP = { kode?: string; status?: string; dari?: string; sampai?: string; satker?: string; peserta?: string }

export default async function AnomaliPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId) redirect('/login')
  if (!akses.isAdmin && !akses.peran.some((p) => PERAN_PENGAWAS.includes(p))) redirect('/dashboard/e-perjadin')

  let q = supabase.from('perjadin_temuan')
    .select('id, kode, keparahan, ringkasan, status, keputusan, created_at, penugasan:penugasan_id(id, nomor, maksud, unit_tujuan_id, jenis_alur), peserta:peserta_id(nama)')
    .order('created_at', { ascending: false })
  if (sp.kode) q = q.eq('kode', sp.kode)
  if (sp.status && sp.status !== 'all') q = q.eq('status', sp.status)
  else if (!sp.status) q = q.eq('status', 'terbuka')
  if (sp.dari) q = q.gte('created_at', sp.dari)
  if (sp.sampai) q = q.lte('created_at', `${sp.sampai}T23:59:59`)
  const { data } = await q

  type Row = {
    id: string; kode: string; keparahan: string; ringkasan: string; status: string; keputusan: string | null; created_at: string
    penugasan: { id: string; nomor: string | null; maksud: string; unit_tujuan_id: string | null; jenis_alur: string } | null
    peserta: { nama: string } | null
  }
  let rows = (data ?? []) as unknown as Row[]
  if (sp.satker) rows = rows.filter((r) => r.penugasan?.unit_tujuan_id === sp.satker)
  if (sp.peserta) rows = rows.filter((r) => r.peserta?.nama?.toLowerCase().includes(sp.peserta!.toLowerCase()))

  // Opsi satker dari penugasan yang punya temuan.
  const { data: unitOpsi } = await supabase.from('perjadin_penugasan')
    .select('unit_tujuan_id, unit:unit_tujuan_id(nama_unit)').not('unit_tujuan_id', 'is', null)
  const satkerMap = new Map<string, string>()
  for (const u of unitOpsi ?? []) {
    if (u.unit_tujuan_id) satkerMap.set(u.unit_tujuan_id as string, (u.unit as { nama_unit?: string } | null)?.nama_unit ?? '—')
  }

  // Anti-metrik (§6) — sinyal kontrol dilonggarkan diam-diam.
  const [{ count: nFallback }, { count: nAtasSbm }, { count: nRampung }] = await Promise.all([
    supabase.from('perjadin_presensi').select('id', { count: 'exact', head: true }).eq('sumber', 'fallback'),
    supabase.from('perjadin_biaya').select('id', { count: 'exact', head: true }).eq('disetujui_ppk', true),
    supabase.from('perjadin_penugasan').select('id', { count: 'exact', head: true }).eq('jenis_alur', 'Rampung'),
  ])

  const perKode = new Map<string, Row[]>()
  for (const r of rows) {
    if (!perKode.has(r.kode)) perKode.set(r.kode, [])
    perKode.get(r.kode)!.push(r)
  }
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString()

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dasbor Anti-Fraud</h2>
          <p className="text-muted-foreground">Temuan AF-1…AF-10 lintas penugasan, dapat disaring dan ditelusuri.</p>
        </div>
        <a href={`/dashboard/e-perjadin/anomali/rekap.xlsx${qs ? `?${qs}` : ''}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold">
          <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel
        </a>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Metrik label="Presensi jalur fallback" nilai={nFallback ?? 0} />
        <Metrik label="Klaim di atas SBM disetujui" nilai={nAtasSbm ?? 0} />
        <Metrik label="Penugasan alur Rampung" nilai={nRampung ?? 0} />
      </div>

      <form className="flex flex-wrap items-end gap-2 rounded-xl border border-slate-200 bg-white p-3">
        <label className="text-xs text-slate-500 flex flex-col gap-1">Aturan
          <select name="kode" defaultValue={sp.kode ?? ''} className={KI}>
            <option value="">semua</option>{KODE_AF.map((k) => <option key={k} value={k}>{k}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">Status
          <select name="status" defaultValue={sp.status ?? 'terbuka'} className={KI}>
            <option value="terbuka">terbuka</option><option value="diputus">diputus</option><option value="all">semua</option>
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">Satker
          <select name="satker" defaultValue={sp.satker ?? ''} className={KI}>
            <option value="">semua</option>
            {[...satkerMap.entries()].map(([idv, nm]) => <option key={idv} value={idv}>{nm}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">Dari
          <input type="date" name="dari" defaultValue={sp.dari ?? ''} className={KI} />
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">Sampai
          <input type="date" name="sampai" defaultValue={sp.sampai ?? ''} className={KI} />
        </label>
        <label className="text-xs text-slate-500 flex flex-col gap-1">Peserta
          <input name="peserta" defaultValue={sp.peserta ?? ''} placeholder="nama…" className={KI} />
        </label>
        <button className="h-8 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white">Saring</button>
        <Link href="/dashboard/e-perjadin/anomali" className="h-8 leading-8 px-2 text-xs text-slate-500">reset</Link>
      </form>

      {rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-slate-500">Tidak ada temuan untuk filter ini.</CardContent></Card>
      ) : (
        [...perKode.entries()].map(([kode, isi]) => (
          <Card key={kode}>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> {kode} · {isi.length} temuan
              </CardTitle>
              <CardDescription>{isi[0]?.ringkasan.split('—')[0]?.trim() || kode}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {isi.map((t) => (
                <div key={t.id} className="flex items-start gap-3 text-sm border-b last:border-0 pb-2 last:pb-0">
                  <Badge variant="outline" className={`shrink-0 ${WARNA[t.keparahan] ?? ''}`}>{t.keparahan}</Badge>
                  <Badge variant="outline" className={`shrink-0 ${t.status === 'diputus' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{t.status}</Badge>
                  <div className="min-w-0">
                    <div className="text-slate-700">{t.ringkasan}{t.keputusan ? ` · keputusan: ${t.keputusan}` : ''}</div>
                    <div className="text-xs text-slate-400">
                      {t.penugasan ? (
                        <Link href={`/dashboard/e-perjadin/penugasan/${t.penugasan.id}`} className="hover:underline">
                          {t.penugasan.nomor ?? 'Draf'} — {t.penugasan.maksud}
                        </Link>
                      ) : '—'}
                      {t.peserta ? ` · ${t.peserta.nama}` : ''}{' · '}{new Date(t.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function Metrik({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="text-2xl font-bold tabular-nums">{nilai}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  )
}
