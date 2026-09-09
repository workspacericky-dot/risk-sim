'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { promoteMitigationToControl } from '../control-actions'

type EmergingRow = {
  risk_library_id: string
  risk_kode: string
  risk_peristiwa: string
  tindakan: string
  count: number
}

export function EmergingControlsPanel({ data }: { data: EmergingRow[] }) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null)

  async function handlePromote(row: EmergingRow) {
    if (!window.confirm('Angkat tindakan ini menjadi Kontrol Generik untuk Risiko ' + row.risk_kode + '?')) return
    const key = row.risk_library_id + row.tindakan
    setLoadingKey(key)
    const res = await promoteMitigationToControl(row.risk_library_id, row.tindakan, 'preventif')
    if (res.status === 'error') alert(res.message)
    setLoadingKey(null)
  }

  return (
    <Card className="mt-6 border-dashed">
      <CardHeader>
        <CardTitle className="text-lg">Kandidat Kontrol Baru (Mitigasi Populer)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Risiko Terkait</TableHead>
                <TableHead>Tindakan Mitigasi</TableHead>
                <TableHead className="text-right">Satker</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(row => {
                const key = row.risk_library_id + row.tindakan
                return (
                  <TableRow key={key}>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground block">{row.risk_kode}</span>
                      {row.risk_peristiwa}
                    </TableCell>
                    <TableCell>{row.tindakan}</TableCell>
                    <TableCell className="text-right">{row.count}</TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => handlePromote(row)}
                        disabled={loadingKey === key}
                      >
                        {loadingKey === key ? 'Memproses...' : 'Promote'}
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
              {data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Belum ada kandidat mitigasi populer.
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
