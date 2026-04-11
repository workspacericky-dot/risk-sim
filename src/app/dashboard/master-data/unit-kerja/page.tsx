import { createClient } from '@/utils/supabase/server'
import { addUnitKerja } from './actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

type Props = {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function UnitKerjaPage(props: Props) {
  const searchParams = await props.searchParams;
  const page = searchParams?.page ? parseInt(searchParams.page as string) : 1;
  const perPage = 100;
  const from = (page - 1) * perPage;
  const to = from + perPage - 1;

  const supabase = await createClient()
  
  // Fetch existing units (paginated)
  const { data: units, count } = await supabase
    .from('unit_kerja')
    .select(`*, parent:parent_unit_id(nama_unit)`, { count: 'exact' })
    .order('tingkat', { ascending: false })
    .order('nama_unit', { ascending: true })
    .range(from, to)

  const totalPages = count ? Math.ceil(count / perPage) : 0;

  // Fetch all units only for dropdown
  const { data: dropdownUnits } = await supabase
    .from('unit_kerja')
    .select('id, nama_unit, tingkat')
    .order('tingkat', { ascending: false })
    .order('nama_unit', { ascending: true })

  const mapTingkat = (t: number) => {
    switch(t) {
      case 0: return 'Tingkat Pertama (Level 0)'
      case 1: return 'Tingkat Banding (Level 1)'
      case 2: return 'Eselon I (Level 2)'
      case 3: return 'Mahkamah Agung (Level 3)'
      default: return 'Unknown'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Master Unit Kerja</h2>
          <p className="text-muted-foreground">Kelola struktur hierarki satuan kerja / pengadilan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Form Add Unit Kerja */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-4">
              <CardTitle className="text-lg">Tambah Unit Baru</CardTitle>
              <CardDescription>Masukkan rincian satker/lembaga</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={async (formData) => { 'use server'; await addUnitKerja(formData); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="kode_unit">Kode Unit</Label>
                  <Input id="kode_unit" name="kode_unit" placeholder="PST-01" required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="nama_unit">Nama Unit Kerja</Label>
                  <Input id="nama_unit" name="nama_unit" placeholder="Pengadilan Negeri Contoh" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tingkat">Tingkat Struktur</Label>
                  <Select name="tingkat" required defaultValue="">
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih tingkat level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">Level 3: Mahkamah Agung Pusat</SelectItem>
                      <SelectItem value="2">Level 2: Eselon I / Ditjen</SelectItem>
                      <SelectItem value="1">Level 1: Tingkat Banding</SelectItem>
                      <SelectItem value="0">Level 0: Tingkat Pertama</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_unit_id">Unit Induk (Bawahan Dari)</Label>
                  <select 
                    name="parent_unit_id"
                    id="parent_unit_id" 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="none">Tidak ada (Top Level)</option>
                    {dropdownUnits?.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nama_unit} (Lv {u.tingkat})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lokasi">Lokasi / Kota</Label>
                  <Input id="lokasi" name="lokasi" placeholder="Jakarta Pusat" />
                </div>

                <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 mt-2">
                  Simpan Unit Kerja
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Data Table */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader className="bg-slate-50/50 border-b pb-4 mb-0">
              <CardTitle className="text-lg">Daftar Unit Kerja Terdaftar</CardTitle>
            </CardHeader>
            <div className="p-0 border-0 shadow-none rounded-none">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[100px]">Kode</TableHead>
                    <TableHead>Nama Unit</TableHead>
                    <TableHead>Tingkat</TableHead>
                    <TableHead>Unit Induk (Parent)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {units && units.length > 0 ? (
                    units.map((unit) => (
                      <TableRow key={unit.id}>
                        <TableCell className="font-mono text-sm">{unit.kode_unit}</TableCell>
                        <TableCell className="font-medium">{unit.nama_unit}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            unit.tingkat === 3 ? 'bg-purple-100 text-purple-800' :
                            unit.tingkat === 2 ? 'bg-blue-100 text-blue-800' :
                            unit.tingkat === 1 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            Level {unit.tingkat}
                          </span>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                           {/* @ts-ignore - Supabase join syntax typing can be tricky */}
                          {unit.parent?.nama_unit || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                        Belum ada data unit kerja. Tambahkan baru!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-4 py-4">
                <div className="text-sm text-muted-foreground">
                  Menampilkan {count === 0 ? 0 : from + 1}-{Math.min(to + 1, count || 0)} dari {count} unit
                </div>
                <div className="flex items-center space-x-2">
                  {page > 1 ? (
                    <Link href={`?page=1`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <ChevronsLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <ChevronsLeft className="h-4 w-4" />
                    </Button>
                  )}

                  {page > 1 ? (
                    <Link href={`?page=${page - 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <ChevronLeft className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  )}

                  <div className="text-sm font-medium">
                    Halaman {page} dari {totalPages || 1}
                  </div>

                  {page < totalPages ? (
                    <Link href={`?page=${page + 1}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}

                  {page < totalPages ? (
                    <Link href={`?page=${totalPages}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                      <ChevronsRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      <ChevronsRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
