import { createClient } from '@/utils/supabase/server'
import { Card, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LaporanExportButton } from './LaporanExportButton'

export default async function LaporanPage() {
  const supabase = await createClient()

  // Master Query to join Unit, Konteks, Risiko, Analisis, RTP
  const { data: extraction } = await supabase
    .from('risiko')
    .select(`
      pernyataan_risiko,
      sumber_risiko,
      dampak_potensial,
      konteks:penetapan_konteks!inner(
        tahun_penerapan, 
        selera_risiko, 
        unit:unit_kerja_id(nama_unit, tingkat)
      ),
      analisis:analisis_risiko(
        level_kemungkinan, level_dampak, status_risiko, di_atas_selera_risiko, existing_control,
        rtp(kegiatan_pengendalian, target_waktu, status_risiko_treated)
      )
    `)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pelaporan & Ekstraksi Eksekutif</h2>
          <p className="text-muted-foreground">Tabel Laporan Matriks lengkap seluruh Satuan Kerja.</p>
        </div>
        <LaporanExportButton />
      </div>

      <Card>
        <CardHeader className="bg-slate-50 border-b pb-4 mb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Database Risiko Terpadu</CardTitle>
          <Badge variant="outline" className="bg-white">Bulan: {new Date().toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</Badge>
        </CardHeader>
        <div className="p-0 border-0 rounded-none overflow-x-auto">
          <Table className="min-w-max">
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Tahun</TableHead>
                <TableHead>Satker (Level)</TableHead>
                <TableHead>Pernyataan Risiko</TableHead>
                <TableHead className="text-center">Skor Awal</TableHead>
                <TableHead>Prioritas?</TableHead>
                <TableHead>Mitigasi (RTP)</TableHead>
                <TableHead className="text-center">Skor Target</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {extraction && extraction.length > 0 ? (
                extraction.map((row, idx) => {
                  const konteks = Array.isArray(row.konteks) ? row.konteks[0] : row.konteks
                  const analisis = row.analisis && row.analisis.length > 0 ? row.analisis[0] : null
                  const rtp = analisis?.rtp && analisis.rtp.length > 0 ? analisis.rtp[0] : null

                  return (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{konteks?.tahun_penerapan}</TableCell>
                      {/* @ts-ignore */}
                      <TableCell>{konteks?.unit?.nama_unit} <span className="text-xs text-muted-foreground ml-1">(Lv {konteks?.unit?.tingkat})</span></TableCell>
                      <TableCell className="max-w-xs truncate" title={row.pernyataan_risiko}>{row.pernyataan_risiko}</TableCell>
                      <TableCell className="text-center font-bold">
                        {analisis ? (
                          <span className={`px-2 py-1 rounded ${
                            analisis.status_risiko >= 15 ? 'bg-red-200 text-red-900' :
                            analisis.status_risiko >= 8 ? 'bg-yellow-200 text-yellow-900' :
                            'bg-green-200 text-green-900'
                          }`}>{analisis.status_risiko}</span>
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {analisis?.di_atas_selera_risiko ? <Badge variant="destructive">Prioritas</Badge> : <Badge variant="secondary">Toleransi</Badge>}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" title={rtp?.kegiatan_pengendalian || '-'}>
                        {rtp?.kegiatan_pengendalian || <span className="text-slate-400 italic">Belum ada RTP</span>}
                      </TableCell>
                      <TableCell className="text-center font-bold text-blue-700">
                        {rtp?.status_risiko_treated || '-'}
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada database pelaporan yang terekstraksi.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  )
}
