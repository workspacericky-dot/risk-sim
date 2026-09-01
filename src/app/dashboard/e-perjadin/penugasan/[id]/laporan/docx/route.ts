import { createClient } from '@/utils/supabase/server'
import { muatAksesEPerjadin } from '@/lib/e-perjadin/akses'
import { SEGMEN, JUDUL_SEGMEN } from '@/lib/e-perjadin/laporan'

// ponytail: HTML ber-ekstensi .doc — dibuka & disunting penuh di Word tanpa
// dependensi. Bukan OOXML sejati; ganti ke lib `docx` bila .docx asli diwajibkan.
export const dynamic = 'force-dynamic'

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]!))
const paragraf = (teks: string) =>
  (teks.trim() ? teks.trim().split(/\n{2,}/) : ['—'])
    .map((blok) => `<p style="text-align:justify">${esc(blok).replace(/\n/g, '<br/>')}</p>`).join('')

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const akses = await muatAksesEPerjadin(supabase)
  if (!akses.userId || !akses.bisaAkses) return new Response('Akses ditolak.', { status: 403 })

  const { data: pn } = await supabase.from('perjadin_penugasan')
    .select('maksud, provinsi, tanggal_berangkat, tanggal_kembali, unit:unit_tujuan_id(nama_unit)')
    .eq('id', id).single()
  if (!pn) return new Response('Tidak ditemukan.', { status: 404 })

  const { data: lap } = await supabase.from('perjadin_laporan')
    .select('id, status').eq('penugasan_id', id).maybeSingle()
  if (!lap || lap.status !== 'final') return new Response('Laporan belum final.', { status: 409 })

  const [{ data: segmen }, { data: dok }] = await Promise.all([
    supabase.from('perjadin_laporan_segmen').select('kunci, isi').eq('laporan_id', lap.id),
    supabase.from('perjadin_dokumen').select('nomor').eq('penugasan_id', id).eq('jenis', 'Laporan').maybeSingle(),
  ])
  const isi = new Map((segmen ?? []).map((s) => [s.kunci, s.isi as string]))
  const unit = (pn.unit as { nama_unit?: string } | null)?.nama_unit ?? '—'

  const badan = SEGMEN.map((s, i) =>
    `<h2>${String.fromCharCode(65 + i)}. ${JUDUL_SEGMEN[s.kunci]}</h2>${paragraf(isi.get(s.kunci) ?? '')}`,
  ).join('')

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<style>body{font-family:'Times New Roman',serif;font-size:12pt}h1{font-size:14pt;text-align:center}h2{font-size:12pt}</style>
</head><body>
<p style="text-align:center;font-weight:bold">MAHKAMAH AGUNG REPUBLIK INDONESIA<br/>BADAN PENGAWASAN</p>
<h1>LAPORAN HASIL PERJALANAN DINAS</h1>
${dok ? `<p style="text-align:center">Nomor: ${esc(dok.nomor)}</p>` : ''}
<p style="text-align:center">${esc(pn.maksud)} — ${esc(unit)} (${esc(pn.provinsi)}) · ${pn.tanggal_berangkat} s.d. ${pn.tanggal_kembali}</p>
${badan}
<br/><br/><p style="text-align:right">Ketua Tim Pemeriksa,<br/><br/><br/>………………………………</p>
</body></html>`

  const nama = `Laporan-${(dok?.nomor ?? id).replace(/[\\/]/g, '-')}.doc`
  return new Response(html, {
    headers: {
      'Content-Type': 'application/msword; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nama}"`,
    },
  })
}
