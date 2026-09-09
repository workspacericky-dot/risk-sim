'use client'

import { useState } from 'react'
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
  totalFailures: number
  cei: number
  baseScore: number
}

export function ControlEffectivenessPanel({ data }: { data: CEIRow[] }) {
  const [loadingId, setLoadingId] = useState<string | null>(null)

  async function handleDeactivate(id: string) {
    if (!window.confirm('Yakin ingin menonaktifkan kontrol ini? Kontrol tidak akan bisa dipilih lagi oleh satker.')) return
    setLoadingId(id)
    const res = await deactivateControlLibrary(id, 'Dinonaktifkan karena efektivitas rendah')
    if (res.status === 'error') alert(res.message)
    setLoadingId(null)
  }

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Evaluasi Efektivitas Kontrol (CEI)</CardTitle>
      </CardHeader>
      <CardContent>
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
                    <Badge variant={row.cei < 50 ? 'destructive' : row.cei < 80 ? 'secondary' : 'default'}>
                      {row.cei}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600 font-bold">{row.totalFailures}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleDeactivate(row.id)}
                      disabled={loadingId === row.id}
                      className={row.cei < 50 && row.pengguna > 0 ? 'border-red-500 text-red-600' : ''}
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
    </Card>
  )
}
