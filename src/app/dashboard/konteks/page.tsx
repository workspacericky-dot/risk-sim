import { createClient } from '@/utils/supabase/server'
import { addKonteks } from './actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { SearchableUnitSelect } from '@/components/SearchableUnitSelect'
import { Target } from 'lucide-react'

export default async function KonteksPage() {
  const supabase = await createClient()
  
  // Fetch master data for dropdowns
  const { data: units } = await supabase.from('unit_kerja').select('*').order('tingkat', { ascending: false })
  
  // Fetch context data
  const { data: konteksList } = await supabase
    .from('penetapan_konteks')
    .select(`*, unit:unit_kerja_id(nama_unit)`)
    .order('tahun_penerapan', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight font-serif">Penetapan Konteks</h2>
          <p className="text-muted-foreground">Langkah 1: Tetapkan sasaran dan parameter risiko tahunan satuan kerja.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Form Container */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4 mb-4">
              <CardTitle className="text-lg font-serif">Form Konteks Baru</CardTitle>
              <CardDescription>Isi sasaran strategis & proses bisnis utama</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => { 'use server'; await addKonteks(formData) }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="unit_kerja_id">Unit Kerja</Label>
                  {units && units.length > 0 ? (
                    <SearchableUnitSelect units={units} name="unit_kerja_id" required />
                  ) : (
                    <div className="p-3 bg-red-50 text-red-800 text-sm rounded-md border border-red-200">
                      Belum ada Master Data Unit Kerja. <a href="/dashboard/master-data/unit-kerja" className="underline font-bold">Tambahkan di sini.</a>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tahun_penerapan">Tahun Penerapan</Label>
                  <Input type="number" id="tahun_penerapan" name="tahun_penerapan" defaultValue={new Date().getFullYear()} required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sasaran_strategis">Sasaran Strategis</Label>
                  <Textarea id="sasaran_strategis" name="sasaran_strategis" rows={3} placeholder="Meningkatkan penyelesaian perkara secara tepat waktu..." required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="proses_bisnis">Proses Bisnis Utama</Label>
                  <Textarea id="proses_bisnis" name="proses_bisnis" rows={3} placeholder="Pendaftaran, Persidangan, Minutasi..." required />
                </div>

                <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 mt-4">
                  Simpan Draft Konteks
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Data List Container */}
        <div className="lg:col-span-2">
          <Card className="h-full">
            <CardHeader className="bg-slate-50 border-b pb-4 mb-0">
              <CardTitle className="text-lg font-serif">Daftar Dokumen Konteks</CardTitle>
            </CardHeader>
            <div className="p-0 border-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Tahun</TableHead>
                    <TableHead>Sakter</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead colSpan={2}></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {konteksList && konteksList.length > 0 ? (
                    konteksList.map((k) => (
                      <TableRow key={k.id}>
                        <TableCell className="font-medium">{k.tahun_penerapan}</TableCell>
                        <TableCell>
                           {/* @ts-ignore */}
                           {k.unit?.nama_unit}
                        </TableCell>
                        <TableCell>
                          <Badge variant={k.status === 'Disetujui' ? 'default' : 'secondary'}>
                            {k.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <a
                            href={`/dashboard/selera-risiko?konteks=${k.id}`}
                            className={buttonVariants({ variant: "outline", size: "sm" })}
                            title="Tetapkan ambang batas nilai risiko per kategori"
                          >
                            <Target className="w-3.5 h-3.5 mr-1.5" />
                            Selera Risiko
                          </a>
                        </TableCell>
                        <TableCell>
                          <a href={`/dashboard/identifikasi?konteks=${k.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Identifikasi Risiko →</a>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Belum ada dokumen penetapan konteks.
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
