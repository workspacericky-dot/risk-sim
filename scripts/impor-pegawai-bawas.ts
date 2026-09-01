/**
 * Impor master pegawai Bawas dari ref/E-Perjadin/pegawai_bawas_per_1_sept.xlsx
 * ke tabel perjadin_pegawai, sekaligus mengisi users.nip lewat pencocokan nama.
 *
 * Prasyarat: migration_e_perjadin_m8.sql + SUPABASE_SERVICE_ROLE_KEY di .env.local.
 * Jalankan:  npx tsx scripts/impor-pegawai-bawas.ts [path-xlsx]
 */
import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

const BERKAS = process.argv[2] ?? 'ref/E-Perjadin/pegawai_bawas_per_1_sept.xlsx'

// GOL diawali "IV" atau jabatan eselon II/III → Kategori 1; selebihnya Kategori 2.
const KATA_KAT1 = ['kepala badan', 'sekretaris badan', 'inspektur wilayah', 'hakim tinggi', 'kepala bagian']
function kategoriDari(golongan: string, jabatan: string): '1' | '2' {
  const g = golongan.trim().toUpperCase()
  const j = jabatan.trim().toLowerCase()
  if (g.startsWith('IV')) return '1'
  if (KATA_KAT1.some((k) => j.includes(k))) return '1'
  return '2'
}
const bersih = (v: unknown) => String(v ?? '').replace(/\s+/g, ' ').trim()
const normNama = (v: string) => bersih(v).toLowerCase().replace(/[.,]/g, '')

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) { console.error('SUPABASE_SERVICE_ROLE_KEY / NEXT_PUBLIC_SUPABASE_URL belum diisi.'); process.exit(1) }
  if (!fs.existsSync(BERKAS)) { console.error(`Berkas tidak ada: ${path.resolve(BERKAS)}`); process.exit(1) }

  const wb = XLSX.readFile(BERKAS)
  const ws = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' })
  // Kolom: 0 NO, 1 NAMA, 2 NIP, 3 NIK, 8 JABATAN, 10 GOL, 12 SATKER, 14 WILAYAH
  const pegawai = rows
    .filter((r) => typeof r[0] === 'number' && bersih(r[2]))
    .map((r) => {
      const jabatan = bersih(r[8])
      const golongan = bersih(r[10])
      return {
        nip: bersih(r[2]), nama: bersih(r[1]), nik: bersih(r[3]) || null,
        jabatan: jabatan || null, golongan: golongan || null,
        kategori: kategoriDari(golongan, jabatan),
        satker: bersih(r[12]) || null, wilayah: bersih(r[14]) || null, aktif: true,
        updated_at: new Date().toISOString(),
      }
    })
  console.log(`Terbaca ${pegawai.length} pegawai (Kat.1: ${pegawai.filter((p) => p.kategori === '1').length}).`)

  const supabase = createClient(url, key, { auth: { persistSession: false } })
  const { error } = await supabase.from('perjadin_pegawai').upsert(pegawai, { onConflict: 'nip' })
  if (error) { console.error('Upsert perjadin_pegawai gagal:', error.message); process.exit(1) }
  console.log('perjadin_pegawai tersimpan.')

  // Backfill users.nip lewat pencocokan nama persis (setelah normalisasi).
  const { data: users } = await supabase.from('users').select('id, nama_lengkap, nip')
  const petaNama = new Map(pegawai.map((p) => [normNama(p.nama), p.nip]))
  let cocok = 0
  for (const u of users ?? []) {
    if (u.nip) continue
    const nip = petaNama.get(normNama(u.nama_lengkap ?? ''))
    if (nip) {
      await supabase.from('users').update({ nip }).eq('id', u.id)
      cocok++
    }
  }
  console.log(`users.nip terisi untuk ${cocok} akun (dari ${(users ?? []).length}).`)
  console.log('Selesai.')
}

main()
