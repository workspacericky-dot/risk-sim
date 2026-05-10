import { createClient } from '@/utils/supabase/server'
import { addRisiko, deleteRisiko } from './actions'
import PejabatCells from './PejabatCells'
import ProsesBisnisSelect, { type ProsesOption } from './ProsesBisnisSelect'
import { getParentKode, getParentNama } from '@/lib/proses-bisnis'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, Trash2, ArrowRight, BookOpen, Network } from 'lucide-react'

export default async function IdentifikasiPage({
  searchParams,
}: {
  searchParams: Promise<{ konteks?: string }>
}) {
  const supabase = await createClient()
  const p = await searchParams
  const konteksId = p?.konteks

  const { data: konteksData } = konteksId
    ? await supabase
        .from('penetapan_konteks')
        .select('*, unit:unit_kerja_id(nama_unit)')
        .eq('id', konteksId)
        .single()
    : { data: null }

  // Parse sasaran strategis — handles both formats:
  //   old: string[]                         → ["Sasaran A", "Sasaran B"]
  //   new: {sasaran, indikator}[]            → [{sasaran:"A", indikator:["Ind1"]}, ...]
  let sasaranList: string[] = []
  if (konteksData?.sasaran_strategis) {
    try {
      const parsed = JSON.parse(konteksData.sasaran_strategis)
      if (Array.isArray(parsed)) {
        sasaranList = parsed
          .map((item: any) => (typeof item === 'string' ? item : item?.sasaran ?? ''))
          .filter(Boolean)
      }
    } catch {
      sasaranList = [konteksData.sasaran_strategis]
    }
  }

  const { data: risikoList } = konteksId
    ? await supabase
        .from('risiko')
        .select('*')
        .eq('konteks_id', konteksId)
        .order('created_at', { ascending: true })
    : { data: [] }

  if (!konteksId || !konteksData) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border shadow-sm space-y-4">
        <h3 className="text-xl font-semibold font-serif text-slate-700">
          Pilih Konteks Risiko Terlebih Dahulu
        </h3>
        <p className="text-muted-foreground">
          Anda harus memilih Tahun / Sasaran Konteks sebelum melakukan identifikasi risiko.
        </p>
        <a
          href="/dashboard/konteks"
          className={buttonVariants({ className: 'mt-2 bg-green-800 hover:bg-green-900' })}
        >
          ← Kembali ke Penetapan Konteks
        </a>
      </div>
    )
  }

  // @ts-ignore
  const unitNama = konteksData.unit?.nama_unit || '–'
  const risikoCount = risikoList?.length || 0

  // Build proses options enriched with parent group info for auto-filling Sasaran Strategis
  let prosesOptions: ProsesOption[] = []
  try {
    const raw = (konteksData as any)?.proses_bisnis_json
    if (Array.isArray(raw) && raw.length > 0) {
      prosesOptions = raw
        .filter((p: any) => p?.kode && p?.nama)
        .map((p: any) => ({
          kode:       p.kode,
          nama:       p.nama,
          indikator:  p.indikator ?? '',
          parentKode: getParentKode(p.kode),
          parentNama: getParentNama(p.kode),
        }))
    }
  } catch {}

  return (
    <div className="space-y-6">

      {/* ── Header ──────────────────────────────────── */}
      <div className="flex items-start gap-4">
        <a
          href="/dashboard/konteks"
          className="mt-1 flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 transition-colors shadow-sm shrink-0"
          title="Kembali ke Penetapan Konteks"
        >
          <ChevronLeft className="w-5 h-5" />
        </a>
        <div className="flex-1">
          <h2 className="text-2xl font-bold tracking-tight font-serif">Identifikasi Risiko</h2>
          <p className="text-muted-foreground text-sm mt-0.5">
            Lampiran Pedoman No. 5 · Konteks Tahun{' '}
            <strong>{konteksData.tahun_penerapan}</strong> —{' '}
            <strong>{unitNama}</strong>
          </p>
        </div>

        {/* Navigation Buttons — next steps */}
        <div className="flex items-center gap-2">
          {risikoCount >= 1 && (
            <a
              href={`/dashboard/analisis?konteks=${konteksId}`}
              className={buttonVariants({ variant: 'default', className: 'bg-blue-700 hover:bg-blue-800 gap-2' })}
            >
              <BookOpen className="w-4 h-4" />
              Analisis Risiko
              <ArrowRight className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Input Form ─────────────────────────────── */}
        <div className="lg:col-span-2">
          <Card className="sticky top-20">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-serif">Tambah Risiko Baru</CardTitle>
              <CardDescription className="text-xs">Sesuai format Lampiran Pedoman No. 5</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form
                action={async (fd) => {
                  'use server'
                  await addRisiko(fd)
                }}
                className="space-y-4"
              >
                <input type="hidden" name="konteks_id" value={konteksId} />

                <div className="rounded-lg bg-slate-50 border px-4 py-3 space-y-3">
                  <h4 className="text-xs font-mono font-semibold uppercase tracking-widest text-slate-500">
                    A. Identifikasi
                  </h4>

                  <ProsesBisnisSelect options={prosesOptions} sasaranList={sasaranList} />

                  <div className="space-y-1.5">
                    <Label htmlFor="pernyataan_risiko" className="text-xs font-semibold">
                      Pernyataan Risiko <span className="text-red-500">*</span>{' '}
                      <span className="text-slate-400 font-normal">(Kol. 5)</span>
                    </Label>
                    <Textarea
                      id="pernyataan_risiko"
                      name="pernyataan_risiko"
                      placeholder="Uraian peristiwa risiko yang telah diidentifikasi..."
                      rows={3}
                      required
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="kategori_risiko" className="text-xs">
                      Kategori Risiko <span className="text-slate-400">(Kol. 6)</span>
                    </Label>
                    <Select name="kategori_risiko">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Pilih kategori..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Risiko Strategis">Risiko Strategis</SelectItem>
                        <SelectItem value="Risiko Kebijakan">Risiko Kebijakan</SelectItem>
                        <SelectItem value="Risiko Kecurangan">Risiko Kecurangan</SelectItem>
                        <SelectItem value="Risiko Bencana">Risiko Bencana</SelectItem>
                        <SelectItem value="Risiko Kepatuhan">Risiko Kepatuhan</SelectItem>
                        <SelectItem value="Risiko Operasional">Risiko Operasional</SelectItem>
                        <SelectItem value="Risiko Kemitraan">Risiko Kemitraan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="dampak_potensial" className="text-xs">
                      Uraian Dampak <span className="text-slate-400">(Kol. 7)</span>
                    </Label>
                    <Textarea
                      id="dampak_potensial"
                      name="dampak_potensial"
                      rows={2}
                      placeholder="Akibat/potensi kerugian..."
                      className="text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="metode_pencapaian_spip" className="text-xs">
                      Metode Pencapaian Tujuan SPIP <span className="text-slate-400">(Kol. 8)</span>
                    </Label>
                    <Select name="metode_pencapaian_spip">
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Pilih tujuan SPIP..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Efektivitas dan Efisiensi Operasi">
                          Efektivitas dan Efisiensi Operasi
                        </SelectItem>
                        <SelectItem value="Keandalan Pelaporan Keuangan">
                          Keandalan Pelaporan Keuangan
                        </SelectItem>
                        <SelectItem value="Pengamanan Aset Negara">Pengamanan Aset Negara</SelectItem>
                        <SelectItem value="Ketaatan terhadap Peraturan">
                          Ketaatan terhadap Peraturan
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="sumber_risiko" className="text-xs">Sumber Risiko</Label>
                    <Input
                      id="sumber_risiko"
                      name="sumber_risiko"
                      placeholder="Internal / Eksternal"
                      className="text-sm h-8"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Penyebab Risiko</Label>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Identifikasi penyebab risiko (Analisis Akar Masalah) dilakukan setelah risiko disimpan.
                      Klik tombol <span className="font-semibold text-indigo-600">Identifikasi Penyebab</span> pada baris risiko di tabel.
                    </p>
                  </div>
                </div>

                <Button type="submit" className="w-full bg-green-700 hover:bg-green-800">
                  + Simpan ke Register Risiko
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Register Table ──────────────────────────── */}
        <div className="lg:col-span-3">
          <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-serif font-semibold text-slate-800">Register Identifikasi Risiko</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Format: Lampiran Pedoman No. 5</p>
              </div>
              <Badge variant="outline" className="text-xs">
                {risikoCount} risiko
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-100 border-b text-slate-600">
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-8">No</th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold min-w-[120px]">
                      Nama Konteks<br />
                      <span className="font-normal text-slate-400">(Kol. 2)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Indikator<br />
                      <span className="font-normal text-slate-400">(Kol. 3)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Kode Risiko<br />
                      <span className="font-normal text-slate-400">(Kol. 4 — otomatis)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold min-w-[180px]">
                      Pernyataan Risiko<br />
                      <span className="font-normal text-slate-400">(Kol. 5)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Kategori<br />
                      <span className="font-normal text-slate-400">(Kol. 6)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold min-w-[110px]">
                      Uraian Dampak<br />
                      <span className="font-normal text-slate-400">(Kol. 7)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold min-w-[110px]">
                      Metode SPIP<br />
                      <span className="font-normal text-slate-400">(Kol. 8)</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-28">
                      Penyebab Risiko
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Nama Pemilik<br />
                      <span className="font-normal text-slate-400">Risiko</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Jabatan Pemilik<br />
                      <span className="font-normal text-slate-400">Risiko</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Nama Pengelola<br />
                      <span className="font-normal text-slate-400">Risiko</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center font-semibold w-24">
                      Jabatan Pengelola<br />
                      <span className="font-normal text-slate-400">Risiko</span>
                    </th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center w-8"></th>
                    <th className="border border-slate-200 px-2 py-2.5 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {risikoList && risikoList.length > 0 ? (
                    risikoList.map((r, rowIdx) => (
                      <tr
                        key={r.id}
                        className="hover:bg-slate-50 transition-colors border-b border-slate-100"
                      >
                        <td className="border border-slate-100 px-2 py-2 text-center text-slate-400 font-medium">
                          {rowIdx + 1}
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-slate-700">
                          <span
                            className="line-clamp-2"
                            // @ts-ignore
                            title={r.sasaran_strategis_item || ''}
                          >
                            {/* @ts-ignore */}
                            {r.sasaran_strategis_item || (
                              <span className="text-slate-300">–</span>
                            )}
                          </span>
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-slate-600">
                          {/* @ts-ignore */}
                          {r.indikator_konteks || <span className="text-slate-300">–</span>}
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-center">
                          <span className="font-mono text-xs text-slate-600">
                            {r.kode_risiko || <span className="text-slate-300">–</span>}
                          </span>
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-slate-800 font-medium">
                          <span className="line-clamp-3" title={r.pernyataan_risiko}>
                            {r.pernyataan_risiko}
                          </span>
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-center">
                          {r.kategori_risiko ? (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium">
                              {r.kategori_risiko}
                            </span>
                          ) : (
                            <span className="text-slate-300">–</span>
                          )}
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-slate-600">
                          <span
                            className="line-clamp-2"
                            title={r.dampak_potensial || ''}
                          >
                            {r.dampak_potensial || <span className="text-slate-300">–</span>}
                          </span>
                        </td>
                        <td className="border border-slate-100 px-2 py-2 text-slate-600">
                          {/* @ts-ignore */}
                          <span className="line-clamp-2">
                            {/* @ts-ignore */}
                            {r.metode_pencapaian_spip || <span className="text-slate-300">–</span>}
                          </span>
                        </td>
                        {/* Identifikasi Penyebab button */}
                        <td className="border border-slate-100 px-2 py-2 text-center">
                          <a
                            href={`/dashboard/identifikasi-penyebab?risiko=${r.id}&konteks=${konteksId}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-semibold transition-colors"
                            title="Identifikasi Penyebab Risiko (Analisis Akar Masalah)"
                          >
                            <Network className="w-3 h-3" />
                            Penyebab
                          </a>
                        </td>

                        {/* Pejabat — per-risiko, editable inline */}
                        <PejabatCells
                          risikoId={r.id}
                          namaPemilik={(r as any).nama_pemilik_risiko ?? ''}
                          jabatanPemilik={(r as any).jabatan_pemilik_risiko ?? ''}
                          namaPengelola={(r as any).nama_pengelola_risiko ?? ''}
                          jabatanPengelola={(r as any).jabatan_pengelola_risiko ?? ''}
                        />

                        <td className="border border-slate-100 px-2 py-2 text-center">
                          <form
                            action={async () => {
                              'use server'
                              await deleteRisiko(r.id, konteksId)
                            }}
                          >
                            <button
                              type="submit"
                              title="Hapus risiko ini"
                              className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={15}
                        className="border border-slate-100 px-4 py-10 text-center text-muted-foreground"
                      >
                        Belum ada risiko yang teridentifikasi. Gunakan form di sebelah kiri untuk menambahkan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Keterangan footer */}
            <div className="px-5 py-4 border-t bg-slate-50 text-[10px] text-slate-500 space-y-1 leading-relaxed">
              <p className="font-semibold text-slate-600 mb-2">Keterangan:</p>
              <div className="grid grid-cols-2 gap-x-8 gap-y-0.5">
                <p>Butir (a) : Diisi nama unit pemilik risiko</p>
                <p>Kolom 5 : Uraian peristiwa risiko yang telah diidentifikasi</p>
                <p>Butir (b) : Diisi tahun berjalan</p>
                <p>Kolom 6 : Diisi kategori risiko (merujuk Lampiran 4)</p>
                <p>Kolom 1 : Diisi nomor urut risiko</p>
                <p>Kolom 7 : Uraian akibat/potensi kerugian jika risiko terjadi</p>
                <p>Kolom 2 : Diisi nama konteks (Sasaran Strategis / Proses Bisnis)</p>
                <p>Kolom 8 : Dipilih dari empat tujuan SPIP (PP No. 60/2008)</p>
                <p>Kolom 3 : Indikator atas nama konteks sesuai Lampiran 1</p>
                <p></p>
                <p>Kolom 4 : Kode risiko sesuai Lampiran 4 huruf A</p>
                <p></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
