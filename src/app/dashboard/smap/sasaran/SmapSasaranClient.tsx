'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Trash2, FileDown } from 'lucide-react'

type Risiko = {
  id: string
  no_urut: number
  uraian_risiko_final: string
  jenis_korupsi: string
}

type Evaluasi = {
  risiko_id: string
  uraian_penanganan: string | null
  pic: string | null
  batas_waktu: string | null
}

type Sasaran = {
  risiko_id: string
  indikator_kinerja: string
  sasaran_pencapaian: string
  evaluasi_pelaporan: string
  sanksi_hukuman: string
}

type Props = {
  konteksId: string
  namaUnit: string
  tahun: number
  namaPemilik: string
  jabatanPemilik: string
  risikoList: Risiko[]
  evaluasiList: Evaluasi[]
  sasaranList: Sasaran[]
}

function formatDate(d: string | null) {
  if (!d) return null
  try {
    return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch {
    return d
  }
}

function SasaranRow({
  risiko,
  evaluasi,
  initial,
}: {
  risiko: Risiko
  evaluasi: Evaluasi | null
  initial: Sasaran | null
}) {
  const defaultIndikator = `Tidak terjadi ${risiko.uraian_risiko_final}`

  const [indikator,    setIndikator]    = useState(initial?.indikator_kinerja  ?? defaultIndikator)
  const [sasaran,      setSasaran]      = useState(initial?.sasaran_pencapaian ?? '100%')
  const [evalLaporan,  setEvalLaporan]  = useState(initial?.evaluasi_pelaporan ?? '')
  const [sanksi,       setSanksi]       = useState(initial?.sanksi_hukuman     ?? '')

  const [pending,  setPending]  = useState(false)
  const [savedOk,  setSavedOk]  = useState(false)
  const [saveErr,  setSaveErr]  = useState<string | null>(null)

  const router = useRouter()

  async function handleSave() {
    setPending(true); setSaveErr(null)
    const supabase = createClient()
    const { error } = await supabase.from('smap_sasaran').upsert([{
      risiko_id:          risiko.id,
      indikator_kinerja:  indikator,
      sasaran_pencapaian: sasaran,
      evaluasi_pelaporan: evalLaporan,
      sanksi_hukuman:     sanksi,
      updated_at:         new Date().toISOString(),
    }], { onConflict: 'risiko_id' })

    if (error) { setSaveErr(error.message); setPending(false); return }
    setPending(false); setSavedOk(true)
    setTimeout(() => setSavedOk(false), 2500)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Reset sasaran risiko ini?')) return
    const supabase = createClient()
    await supabase.from('smap_sasaran').delete().eq('risiko_id', risiko.id)
    setIndikator(defaultIndikator)
    setSasaran('100%')
    setEvalLaporan('')
    setSanksi('')
    router.refresh()
  }

  const editTd = 'border border-slate-100 px-1.5 py-2 bg-orange-50/30'
  const readTd = 'border border-slate-100 px-2 py-2.5 bg-slate-50/70'
  const ta  = (b: string) => `w-full rounded border ${b} bg-white px-2 py-1 text-[10px] focus:outline-none focus:ring-1 focus:ring-orange-400 resize-none leading-relaxed`
  const inp = (b: string) => `w-full h-7 rounded border ${b} bg-white px-2 text-[10px] text-center focus:outline-none focus:ring-1 focus:ring-orange-400`

  return (
    <tr className="border-b border-slate-100 hover:bg-orange-50/10 transition-colors align-top">
      {/* No */}
      <td className="border border-slate-100 px-2 py-2.5 text-center">
        <span className="text-[10px] font-bold text-orange-600">{risiko.no_urut}</span>
      </td>

      {/* Sasaran Antipenyuapan — free text */}
      <td className={`${editTd} min-w-[160px]`}>
        <textarea
          value={indikator}
          onChange={e => setIndikator(e.target.value)}
          rows={3}
          className={ta('border-orange-200')}
        />
        <span className="mt-0.5 inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-medium">
          {risiko.jenis_korupsi}
        </span>
      </td>

      {/* Indikator Kinerja — persentase */}
      <td className={`${editTd} min-w-[200px]`}>
        <input
          type="text"
          value={sasaran}
          onChange={e => setSasaran(e.target.value)}
          placeholder="100%"
          className={inp('border-orange-200')}
        />
      </td>

      {/* Rencana Kerja — read-only from evaluasi */}
      <td className={`${readTd} min-w-[180px]`}>
        {evaluasi?.uraian_penanganan
          ? <p className="text-[10px] text-slate-700 leading-relaxed whitespace-pre-wrap">{evaluasi.uraian_penanganan}</p>
          : <span className="text-[10px] text-slate-300">— (isi di Form 3)</span>
        }
      </td>

      {/* Sumber Daya / PIC — read-only from evaluasi */}
      <td className={`${readTd} min-w-[100px]`}>
        {evaluasi?.pic
          ? <p className="text-[10px] text-slate-700">{evaluasi.pic}</p>
          : <span className="text-[10px] text-slate-300">—</span>
        }
      </td>

      {/* Periode — read-only from evaluasi */}
      <td className={`${readTd} w-24 text-center`}>
        <span className="text-[10px] text-slate-700">
          {formatDate(evaluasi?.batas_waktu ?? null) ?? <span className="text-slate-300">—</span>}
        </span>
      </td>

      {/* Evaluasi & Pelaporan — editable */}
      <td className={`${editTd} min-w-[150px]`}>
        <textarea
          value={evalLaporan}
          onChange={e => setEvalLaporan(e.target.value)}
          rows={3}
          placeholder="Media evaluasi dan pelaporan..."
          className={ta('border-orange-200')}
        />
      </td>

      {/* Sanksi/Hukuman — editable */}
      <td className={`${editTd} min-w-[130px]`}>
        <textarea
          value={sanksi}
          onChange={e => setSanksi(e.target.value)}
          rows={3}
          placeholder="Sanksi sesuai peraturan..."
          className={ta('border-orange-200')}
        />
      </td>

      {/* Aksi */}
      <td className="border border-slate-100 px-1.5 py-2.5 text-center print:hidden">
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={handleSave}
            disabled={pending}
            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
              saveErr  ? 'bg-red-500 text-white'
              : savedOk ? 'bg-green-600 text-white'
              : pending ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-orange-600 hover:bg-orange-700 text-white'
            }`}
            title={saveErr ?? undefined}
          >
            {pending ? '...' : saveErr ? '✗' : savedOk ? '✓' : 'Simpan'}
          </button>
          {initial && (
            <button onClick={handleDelete} className="text-slate-300 hover:text-red-500 transition-colors p-0.5" title="Reset">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
          {saveErr && <p className="text-[9px] text-red-600 max-w-[56px] break-words">{saveErr}</p>}
        </div>
      </td>
    </tr>
  )
}

export default function SmapSasaranClient({
  namaUnit, tahun, namaPemilik, jabatanPemilik,
  risikoList, evaluasiList, sasaranList,
}: Props) {
  const evaluasiMap = Object.fromEntries(evaluasiList.map(e => [e.risiko_id, e]))
  const sasaranMap  = Object.fromEntries(sasaranList.map(s => [s.risiko_id, s]))

  return (
    <div className="space-y-6">
      {/* Export */}
      <div className="flex justify-end print:hidden">
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-semibold transition-colors"
        >
          <FileDown className="w-4 h-4" />
          Ekspor PDF
        </button>
      </div>

      {/* Print header */}
      <div className="hidden print:block mb-4 text-center border-b border-slate-300 pb-4">
        <p className="text-xs font-bold uppercase tracking-wide">Sasaran dan Rencana Kerja</p>
        <p className="text-xs font-bold uppercase tracking-wide">Sistem Manajemen Anti Penyuapan</p>
        <p className="text-xs mt-1">{namaUnit} — Tahun {tahun}</p>
        {namaPemilik && <p className="text-xs">{namaPemilik}{jabatanPemilik ? ` / ${jabatanPemilik}` : ''}</p>}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-slate-500 flex-wrap print:hidden">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-orange-50 border border-orange-200 inline-block" />
          Dapat diisi / diubah
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-slate-100 border border-slate-200 inline-block" />
          Otomatis dari Form 3
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden print:shadow-none print:border-none">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[1250px]">
            <thead>
              {/* Unit header row matching template */}
              <tr>
                <td
                  colSpan={9}
                  className="border border-slate-200 px-4 py-2.5 bg-orange-900/5"
                >
                  <span className="text-[11px] font-bold text-orange-900">
                    Unit Kerja / Bidang : {namaUnit}
                  </span>
                </td>
              </tr>
              {/* Column headers */}
              <tr className="bg-slate-50 text-slate-600 border-b text-center text-[11px]">
                <th className="border border-slate-100 px-2 py-2.5 w-8">No</th>
                <th className="border border-slate-100 px-2 py-2.5 bg-orange-50/60 min-w-[160px] text-left">
                  Sasaran Antipenyuapan
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-orange-50/60 min-w-[200px] text-left">
                  Indikator Kinerja
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-slate-100/70 min-w-[180px] text-left">
                  Rencana Kerja<br /><span className="font-normal text-slate-400">dari Form 3</span>
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-slate-100/70 min-w-[100px]">
                  Sumber Daya<br /><span className="font-normal text-slate-400">PIC</span>
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-slate-100/70 w-24">
                  Periode<br /><span className="font-normal text-slate-400">Batas Waktu</span>
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-orange-50/60 min-w-[150px] text-left">
                  Evaluasi &amp;<br />Pelaporan
                </th>
                <th className="border border-slate-100 px-2 py-2.5 bg-orange-50/60 min-w-[130px] text-left">
                  Sanksi /<br />Hukuman
                </th>
                <th className="border border-slate-100 px-2 py-2.5 w-16 print:hidden">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {risikoList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">
                    Belum ada risiko. Selesaikan Form 1 (Identifikasi) terlebih dahulu.
                  </td>
                </tr>
              ) : (
                risikoList.map(r => (
                  <SasaranRow
                    key={r.id}
                    risiko={r}
                    evaluasi={evaluasiMap[r.id] ?? null}
                    initial={sasaranMap[r.id] ?? null}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
