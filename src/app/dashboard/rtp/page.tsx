import { createClient } from '@/utils/supabase/server'
import { addRTP } from './actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

export default async function RTPPage({ searchParams }: { searchParams: { analisis?: string } }) {
  const supabase = await createClient()
  const p = await searchParams;
  const analisisId = p?.analisis

  // Fetch analysis context
  const { data: analysisData } = analisisId 
    ? await supabase.from('analisis_risiko').select(`
        *,
        risiko!inner(
          pernyataan_risiko,
          dampak_potensial,
          konteks:penetapan_konteks(tahun_penerapan, selera_risiko, unit:unit_kerja_id(nama_unit))
        )
      `).eq('id', analisisId).single()
    : { data: null }

  // Fetch existing RTPs for this analysis
  const { data: rtpList } = analisisId
    ? await supabase.from('rtp').select('*').eq('analisis_id', analisisId)
    : { data: [] }

  if (!analisisId || !analysisData) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border shadow-sm">
        <h3 className="text-xl font-semibold text-slate-700">Manajemen RTP</h3>
        <p className="text-muted-foreground mt-2">Masuk melalui menu Identifikasi Risiko untuk membuat Rencana Tindak Pengendalian pada risiko prioritas.</p>
        <a href="/dashboard/konteks" className={buttonVariants({ className: "mt-4 bg-green-800" })}>Lihat Daftar Konteks</a>
      </div>
    )
  }

  // @ts-ignore
  const risiko = analysisData.risiko
  // @ts-ignore
  const konteks = risiko?.konteks

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Rencana Tindak Pengendalian (RTP)</h2>
          <p className="text-muted-foreground">Mitigasi risiko yang berada di atas level toleransi.</p>
        </div>
      </div>

      {/* Info Risiko Terpilih */}
      <Card className="bg-red-50/50 border-red-100">
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="col-span-1 border-r border-red-200">
             <Label className="text-xs uppercase tracking-wider text-muted-foreground">Unit Kerja</Label>
             {/* @ts-ignore */}
             <div className="font-semibold text-sm mt-1">{konteks?.unit?.nama_unit} ({konteks?.tahun_penerapan})</div>
             {/* @ts-ignore */}
             <div className="mt-2 text-xs text-red-800 font-bold bg-red-100 w-max px-2 py-1 rounded">Prioritas (Level {analysisData.status_risiko}) &gt; Selera (Level {konteks?.selera_risiko})</div>
          </div>
          <div className="col-span-3">
             <Label className="text-xs uppercase tracking-wider text-muted-foreground">Pernyataan Risiko</Label>
             <div className="font-medium text-slate-800">{risiko.pernyataan_risiko}</div>
             <p className="text-sm mt-2 text-muted-foreground">Dampak Potensial: {risiko.dampak_potensial}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Registration Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Buat Aksi RTP</CardTitle>
              <CardDescription>Rencanakan pengendalian baru</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => { 'use server'; await addRTP(formData) }} className="space-y-4">
                <input type="hidden" name="analisis_id" value={analisisId} />
                
                <div className="space-y-2">
                  <Label htmlFor="kegiatan_pengendalian">Kegiatan Pengendalian</Label>
                  <Textarea id="kegiatan_pengendalian" name="kegiatan_pengendalian" placeholder="Misalnya: Pengadaan server backup off-site..." required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="indikator_keluaran">Indikator Keluaran</Label>
                  <Input id="indikator_keluaran" name="indikator_keluaran" placeholder="Tersedianya 1 unit server backup" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="target_waktu">Target Waktu Pelaksanaan</Label>
                  <Input type="date" id="target_waktu" name="target_waktu" required />
                </div>

                <h4 className="font-semibold pt-4 text-sm border-b pb-1">Proyeksi Penurunan Risiko (Treated Risk)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="level_kemungkinan_treated">Kemungkinan (1-5)</Label>
                    <Select name="level_kemungkinan_treated" required>
                      <SelectTrigger><SelectValue placeholder="Target Level..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Sangat Jarang</SelectItem>
                        <SelectItem value="2">2 - Jarang</SelectItem>
                        <SelectItem value="3">3 - Mungkin</SelectItem>
                        <SelectItem value="4">4 - Sering</SelectItem>
                        <SelectItem value="5">5 - Sangat Sering</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level_dampak_treated">Dampak (1-5)</Label>
                    <Select name="level_dampak_treated" required>
                      <SelectTrigger><SelectValue placeholder="Target Level..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 - Sangat Ringan</SelectItem>
                        <SelectItem value="2">2 - Ringan</SelectItem>
                        <SelectItem value="3">3 - Sedang</SelectItem>
                        <SelectItem value="4">4 - Berat</SelectItem>
                        <SelectItem value="5">5 - Sangat Berat</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 mt-6">
                  Simpan RTP
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* List RTP */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="bg-slate-50 border-b pb-4 mb-0">
              <CardTitle className="text-lg">Daftar Rencana Tindak Lanjut</CardTitle>
            </CardHeader>
            <div className="p-0 border-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Kegiatan</TableHead>
                    <TableHead>Indikator</TableHead>
                    <TableHead>Tenggat Waktu</TableHead>
                    <TableHead>Skor Proyeksi</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rtpList && rtpList.length > 0 ? (
                    rtpList.map((rtp) => (
                      <TableRow key={rtp.id}>
                        <TableCell className="font-medium max-w-[200px]">
                          {rtp.kegiatan_pengendalian}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{rtp.indikator_keluaran}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{rtp.target_waktu}</Badge>
                        </TableCell>
                        <TableCell className="text-center font-bold">
                          <span className={`px-2 py-1 rounded inline-block ${
                            rtp.status_risiko_treated >= 15 ? 'bg-red-200 text-red-900' :
                            rtp.status_risiko_treated >= 8 ? 'bg-yellow-200 text-yellow-900' :
                            'bg-green-200 text-green-900'
                          }`}>{rtp.status_risiko_treated}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-100 text-blue-800">{rtp.status_rtp}</Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                        Belum ada Rencana Tindak Pengendalian (RTP) untuk risiko ini.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
        
      </div>
    </div>
  )
}
