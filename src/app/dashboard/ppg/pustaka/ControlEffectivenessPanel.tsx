'use client'

import { useState } from 'react'
import { CircleHelp, X } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { deactivateControlLibrary } from '../control-actions'

type CEIRow = {
  id: string
  kode: string
  nama: string
  jenis: string
  status: string
  pengguna: number
  efektif: number
  sebagian: number
  tidakEfektif: number
  belumDinilai: number
  totalRated: number
  totalFailures: number
  cei: number | null
  baseScore: number | null
}

export function ControlEffectivenessPanel({ data }: { data: CEIRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [showCriteria, setShowCriteria] = useState(false)

  async function handleDeactivate(id: string) {
    if (!window.confirm('Yakin ingin menonaktifkan kontrol ini? Kontrol tidak akan bisa dipilih lagi oleh satker.')) return
    setLoadingId(id)
    setMessage(null)
    try {
      const res = await deactivateControlLibrary(id, 'Dinonaktifkan setelah reviu Control Effectiveness Index (CEI)')
      setMessage(res.message)
    } catch {
      setMessage('Kontrol gagal dinonaktifkan. Muat ulang halaman lalu coba lagi.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2"><CardTitle className="text-lg">Evaluasi Efektivitas Kontrol (CEI)</CardTitle><Button type="button" variant="outline" size="sm" onClick={() => setShowCriteria(true)}><CircleHelp className="mr-1 size-4" />Kriteria skor CEI</Button></div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-xs text-muted-foreground">CEI = rerata penilaian efektivitas dikurangi 5 poin per Loss Event tervalidasi/ditindaklanjuti/ditutup pada register terkait. Entri tanpa penilaian tidak diberi skor.</p>
        {message && <p role="status" className="mb-4 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Kontrol</TableHead>
                <TableHead className="text-right">Pengguna</TableHead>
                <TableHead className="text-right">Skor CEI</TableHead>
                <TableHead className="text-right">Jebol (LED)</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(row => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono text-xs">{row.kode}</TableCell>
                  <TableCell>{row.nama}</TableCell>
                  <TableCell className="text-right">{row.pengguna}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={row.cei === null ? 'border-slate-300 bg-slate-50 text-slate-600' : row.cei < 50 ? 'border-red-300 bg-red-50 text-red-700' : row.cei < 80 ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-emerald-300 bg-emerald-50 text-emerald-700'}>
                      {row.cei === null ? 'Belum dinilai' : row.cei}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-bold">{row.totalFailures}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeactivate(row.id)}
                      disabled={loadingId === row.id}
                      className={row.cei !== null && row.cei < 50 && row.pengguna > 0 ? 'border-red-500 text-red-600' : ''}
                    >
                      {loadingId === row.id ? 'Memproses...' : 'Nonaktifkan'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                    Belum ada data evaluasi kontrol.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      {showCriteria && <div role="dialog" aria-modal="true" aria-labelledby="cei-criteria-title" className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/50 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCriteria(false) }}><div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl"><div className="flex items-start justify-between gap-3"><div><h3 id="cei-criteria-title" className="font-bold text-slate-900">Interpretasi Skor CEI</h3><p className="mt-1 text-xs text-slate-500">Kriteria sementara untuk membantu reviu manusia; sistem tidak menonaktifkan kontrol secara otomatis.</p></div><button type="button" aria-label="Tutup" onClick={() => setShowCriteria(false)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X className="size-5" /></button></div><div className="mt-4 space-y-3 text-sm"><Criteria tone="red" range="0–49 · Rendah" text="Kontrol terindikasi tidak efektif/usang. Reviu desain, implementasi, bukti, dan Loss Event; rekomendasikan penonaktifan bila kelemahan bersifat persisten." /><Criteria tone="amber" range="50–79 · Kurang efektif" text="Kontrol masih memberi manfaat tetapi perlu perbaikan, penguatan evidence, atau monitoring lebih ketat sebelum dipertahankan." /><Criteria tone="green" range="80–100 · Tinggi" text="Kontrol masih efektif. Pertahankan dalam library dan lanjutkan monitoring berkala." /><Criteria tone="slate" range="Belum dinilai" text="Belum ada penilaian efektivitas yang dapat dihitung; jangan menyimpulkan kontrol usang hanya karena data belum tersedia." /></div><p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs text-slate-600">Rumus: rerata Efektif = 100, Sebagian = 50, Tidak Efektif = 0; kemudian dikurangi 5 poin per Loss Event terkait kontrol tersebut.</p></div></div>}
    </Card>
  )
}

function Criteria({ tone, range, text }: { tone: 'red' | 'amber' | 'green' | 'slate'; range: string; text: string }) {
  const colors = { red: 'border-red-200 bg-red-50 text-red-900', amber: 'border-amber-200 bg-amber-50 text-amber-900', green: 'border-emerald-200 bg-emerald-50 text-emerald-900', slate: 'border-slate-200 bg-slate-50 text-slate-800' }
  return <div className={`rounded-xl border p-3 ${colors[tone]}`}><b>{range}</b><p className="mt-1 text-xs leading-relaxed">{text}</p></div>
}
