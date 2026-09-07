import Link from 'next/link'
import { AlertTriangle, Banknote, ClipboardList, ListChecks } from 'lucide-react'
import { getPpgOverview } from '@/lib/ppg/data'
import { EmptyState, SectionHeading, StatCard } from './_components'

export default async function PpgPage() {
  const data = await getPpgOverview()
  const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(data.nilaiTotal)
  return <div className="space-y-6">
    {!data.migrationReady && <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><strong>Database PPG belum disiapkan.</strong> Jalankan <code>supabase/migration_ppg.sql</code>, kemudian gunakan Referensi & Impor.</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Risiko terdaftar" value={data.risikoTotal} icon={ClipboardList} note="Dalam seluruh konteks PPG" /><StatCard label="Risiko prioritas" value={data.risikoPrioritas} icon={AlertTriangle} tone="rose" note="Level tinggi dan sangat tinggi" /><StatCard label="Program aktif" value={data.programReady ? data.programTerbuka : data.mitigasiTerbuka} icon={ListChecks} tone="amber" note={`${data.programReady ? data.programTerlambat : data.mitigasiTerlambat} melewati jadwal`} /><StatCard label="Nilai penetapan" value={rupiah} icon={Banknote} tone="cyan" note={`${data.laporanTotal} item laporan anonim`} /></div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><SectionHeading eyebrow="Alur kerja" title="Dari data menjadi Program PPG" description="Validasi data historis, nilai risiko, catat kejadian kerugian, temukan titik rawan, susun program rekomendasi, lalu monitor pelaksanaannya." /><div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-6">{[['1','Impor & validasi','/dashboard/ppg/referensi'],['2','Risk and Control Library','/dashboard/ppg/pustaka'],['3','Penilaian Risiko','/dashboard/ppg/penilaian'],['4','Loss Event Database','/dashboard/ppg/loss-event'],['5','Analisis Titik Rawan','/dashboard/ppg/analitik'],['6','Program & monitoring','/dashboard/ppg/tindak-lanjut']].map(([n,label,href]) => <Link key={n} href={href} className="rounded-xl border border-slate-200 p-4 transition hover:border-indigo-300 hover:bg-indigo-50"><span className="text-xs font-bold text-indigo-600">LANGKAH {n}</span><p className="mt-1 font-semibold text-slate-800">{label}</p></Link>)}</div></section>
    {data.risikoTotal === 0 && <EmptyState title="Belum ada register PPG" description="Mulai dari Referensi & Impor atau tambahkan pustaka dan penilaian secara manual." />}
  </div>
}
