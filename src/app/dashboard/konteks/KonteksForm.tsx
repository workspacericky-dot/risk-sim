'use client'

import { useState } from 'react'
import { Plus, X, Loader2, CheckCircle2, Save, ArrowRight } from 'lucide-react'
import { SearchableUnitSelect } from '@/components/SearchableUnitSelect'
import { upsertKonteksDraft } from './actions'

// ── Types ─────────────────────────────────────────────────────────────────────
type Unit = { id: string; nama_unit: string; tingkat?: number; kode_unit?: string }
type SasaranItem  = { sasaran: string; indikator: string[] }
type PemangkuItem = { nama: string; keterangan: string }

// ── Full MA Process Hierarchy (Ref_Proses Bisnis.md) ──────────────────────────
const PROSES_HIERARCHY = [
  {
    kode: 'MA-01',
    nama: 'Peningkatan Pengelolaan Proses Peradilan yang Pasti, Transparan, dan Akuntabel',
    sub: [
      { kode: 'MA-01.01', nama: 'Peningkatan Penyelesaian Perkara Tepat Waktu' },
      { kode: 'MA-01.02', nama: 'Peningkatan putusan yang menggunakan pendekatan keadilan restoratif di Mahkamah Agung' },
      { kode: 'MA-01.03', nama: 'Peningkatan perkara yang tidak mengajukan upaya hukum' },
      { kode: 'MA-01.04', nama: 'Peningkatan penyelesaian perkara pidana anak dengan diversi' },
    ],
  },
  {
    kode: 'MA-02',
    nama: 'Peningkatan Efektivitas dan Efisiensi Pengelolaan Penyelesaian Perkara',
    sub: [
      { kode: 'MA-02.01', nama: 'Peningkatan pengiriman salinan putusan ke pengadilan pengaju secara tepat waktu' },
      { kode: 'MA-02.02', nama: 'Peningkatan penyelesaian perkara melalui mediasi' },
    ],
  },
  {
    kode: 'MA-03',
    nama: 'Peningkatan Akses Peradilan Bagi Masyarakat Miskin dan Terpinggirkan',
    sub: [
      { kode: 'MA-03.01', nama: 'Peningkatan Penyelesaian Perkara dengan pembebasan biaya perkara (Prodeo)' },
      { kode: 'MA-03.02', nama: 'Peningkatan penyelesaian perkara di luar gedung pengadilan' },
      { kode: 'MA-03.03', nama: 'Peningkatan perkara permohonan (voluntair) identitas hukum' },
      { kode: 'MA-03.04', nama: 'Peningkatan pemberian layanan bantuan hukum (Posbankum) kepada pencari keadilan golongan tertentu' },
    ],
  },
  {
    kode: 'MA-04',
    nama: 'Peningkatan Kepatuhan Terhadap Putusan Pengadilan',
    sub: [
      { kode: 'MA-04.01', nama: 'Peningkatan putusan perkara perdata yang ditindaklanjuti (dieksekusi)' },
      { kode: 'MA-04.02', nama: 'Peningkatan putusan perkara Tata Usaha Negara yang ditindaklanjuti (dieksekusi)' },
    ],
  },
  {
    kode: 'MA-05',
    nama: 'Peningkatan Pembinaan dan Profesionalitas Tenaga Teknis dan Non Teknis',
    sub: [
      { kode: 'MA-05.01', nama: 'Pengadaan dan Rekrutmen Tenaga Teknis dan Non Teknis' },
      { kode: 'MA-05.02', nama: 'Pembinaan, Pendidikan, dan Pelatihan Tenaga Teknis' },
      { kode: 'MA-05.03', nama: 'Pembinaan, Pendidikan, dan Pelatihan Tenaga Non Teknis' },
      { kode: 'MA-05.04', nama: 'Pelaksanaan Promosi dan Mutasi Tenaga Teknis dan Non Teknis' },
    ],
  },
  {
    kode: 'MA-06',
    nama: 'Pengembangan dan Pembaruan Kebijakan Hukum dan Peradilan',
    sub: [
      { kode: 'MA-06.01', nama: 'Pengembangan dan Pembaruan Peraturan Perundang-Undangan' },
      { kode: 'MA-06.02', nama: 'Pengembangan dan Pembaruan Peraturan Keputusan Ketua Mahkamah Agung' },
      { kode: 'MA-06.03', nama: 'Pengembangan dan Pembaruan Keputusan Pejabat Eselon I' },
    ],
  },
  {
    kode: 'MA-07',
    nama: 'Penguatan Pengawasan Kinerja Tenaga Teknis dan Non Teknis',
    sub: [
      { kode: 'MA-07.01', nama: 'Pengembangan Sistem Pengawasan Berbasis Teknologi Informasi' },
      { kode: 'MA-07.02', nama: 'Implementasi Pengawasan Internal' },
      { kode: 'MA-07.03', nama: 'Implementasi Pengawasan Eksternal' },
    ],
  },
  {
    kode: 'MA-08',
    nama: 'Peningkatan Administrasi Peradilan dan Administrasi Umum',
    sub: [
      { kode: 'MA-08.01', nama: 'Pelaksanaan Rencana Program, Penganggaran, dan Pelaksanaan Anggaran' },
      { kode: 'MA-08.02', nama: 'Pengelolaan Organisasi dan Tata Laksana' },
      { kode: 'MA-08.03', nama: 'Pengelolaan Sarana dan Prasarana' },
      { kode: 'MA-08.04', nama: 'Pengelolaan Layanan Kehumasan dan Informasi Publik' },
    ],
  },
  {
    kode: 'MA-09',
    nama: 'Pengembangan dan Penerapan Teknologi Informasi',
    sub: [
      { kode: 'MA-09.01', nama: 'Perencanaan Pembangunan dan Pengembangan Teknologi Informasi' },
      { kode: 'MA-09.02', nama: 'Pembangunan dan Pengembangan Teknologi Informasi' },
      { kode: 'MA-09.03', nama: 'Pengelolaan dan Pemeliharaan Teknologi Informasi' },
    ],
  },
  {
    kode: 'MA-10',
    nama: 'Peningkatan Koordinasi Antara Kementerian/Lembaga Terkait',
    sub: [
      { kode: 'MA-10.01', nama: 'Pelaksanaan Rencana Program Sinergitas Antara Instansi Penegak Hukum' },
      { kode: 'MA-10.02', nama: 'Penerapan Pertukaran Data dalam rangka Peningkatan Layanan Peradilan' },
    ],
  },
] as const

// ── UI helpers ─────────────────────────────────────────────────────────────────
function SectionHeader({ num, title }: { num: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-slate-200 bg-slate-50/80">
      <span
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}
      >
        {num}
      </span>
      <h3 className="text-sm font-semibold text-slate-700 tracking-tight">{title}</h3>
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-1">{children}</p>
}

const inputCls = 'w-full rounded-lg border border-slate-200 bg-white/90 px-2.5 py-2 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all'

// ── Section save button ────────────────────────────────────────────────────────
function SectionSaveBtn({
  onClick,
  saving,
  saved,
}: {
  onClick: () => void
  saving: boolean
  saved: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saving}
      className={[
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
        saved
          ? 'bg-green-100 text-green-700 border border-green-200'
          : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border border-indigo-200',
      ].join(' ')}
    >
      {saving ? (
        <><Loader2 className="w-3 h-3 animate-spin" /> Menyimpan...</>
      ) : saved ? (
        <><CheckCircle2 className="w-3 h-3" /> Tersimpan</>
      ) : (
        <><Save className="w-3 h-3" /> Simpan Bagian Ini</>
      )}
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function KonteksForm({ units }: { units: Unit[] }) {
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null)
  const [tahun,          setTahun]         = useState(String(new Date().getFullYear()))
  const [periodeMulai,   setPeriodeMulai]  = useState('')
  const [periodeSelesai, setPeriodeSelesai]= useState('')
  const [sasaranList,    setSasaranList]   = useState<SasaranItem[]>([{ sasaran: '', indikator: [''] }])
  // prosesIndikator: subKode → indikator kinerja text
  const [prosesIndikator, setProsesIndikator] = useState<Record<string, string>>({})
  const [pemangkuList,   setPemangkuList]  = useState<PemangkuItem[]>([{ nama: '', keterangan: '' }])

  // Save state
  const [savedKonteksId, setSavedKonteksId] = useState<string | null>(null)
  const [savingSection,  setSavingSection]  = useState<string | null>(null) // section key being saved
  const [savedSection,   setSavedSection]   = useState<string | null>(null)
  const [submitting,     setSubmitting]     = useState(false)
  const [submitted,      setSubmitted]      = useState(false)
  const [error,          setError]          = useState<string | null>(null)

  // ── Helpers ─────────────────────────────────────────────────────────────
  function buildFormData() {
    const fd = new FormData()
    if (savedKonteksId) fd.set('konteks_id', savedKonteksId)
    fd.set('unit_kerja_id',  selectedUnit?.id ?? '')
    fd.set('tahun_penerapan', tahun)
    fd.set('periode_mulai',  periodeMulai)
    fd.set('periode_selesai', periodeSelesai)
    fd.set('sasaran_json',  JSON.stringify(sasaranList.filter(s => s.sasaran.trim())))
    // Build flat proses array from all sub-processes
    const prosesFlat = PROSES_HIERARCHY.flatMap(g =>
      g.sub.map(s => ({ kode: s.kode, nama: s.nama, indikator: prosesIndikator[s.kode] ?? '' }))
    )
    fd.set('proses_json', JSON.stringify(prosesFlat))
    fd.set('pemangku_json', JSON.stringify(pemangkuList.filter(p => p.nama.trim())))
    return fd
  }

  async function handleSectionSave(sectionKey: string) {
    if (!selectedUnit) { setError('Pilih unit kerja terlebih dahulu'); return }
    setSavingSection(sectionKey)
    setSavedSection(null)
    setError(null)
    const result = await upsertKonteksDraft(buildFormData())
    setSavingSection(null)
    if (result.error) {
      setError(result.error)
    } else if (result.konteks_id) {
      setSavedKonteksId(result.konteks_id)
      setSavedSection(sectionKey)
      setTimeout(() => setSavedSection(null), 2500)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedUnit) { setError('Pilih unit kerja terlebih dahulu'); return }
    if (!sasaranList.some(s => s.sasaran.trim())) {
      setError('Minimal satu sasaran strategis wajib diisi sebelum menyimpan penetapan konteks.')
      return
    }
    setSubmitting(true)
    setError(null)
    const result = await upsertKonteksDraft(buildFormData())
    setSubmitting(false)
    if (result.error) {
      setError(result.error)
    } else {
      if (result.konteks_id) setSavedKonteksId(result.konteks_id)
      setSubmitted(true)
      setTimeout(() => { window.location.reload() }, 1200)
    }
  }

  // ── Sasaran handlers ────────────────────────────────────────────────────
  function addSasaran() {
    setSasaranList(prev => [...prev, { sasaran: '', indikator: [''] }])
  }
  function removeSasaran(idx: number) {
    setSasaranList(prev => prev.filter((_, i) => i !== idx))
  }
  function updateSasaran(idx: number, val: string) {
    setSasaranList(prev => { const n = [...prev]; n[idx] = { ...n[idx], sasaran: val }; return n })
  }
  function addIndikator(sIdx: number) {
    setSasaranList(prev => {
      const n = [...prev]; n[sIdx] = { ...n[sIdx], indikator: [...n[sIdx].indikator, ''] }; return n
    })
  }
  function removeIndikator(sIdx: number, iIdx: number) {
    setSasaranList(prev => {
      const n = [...prev]; n[sIdx] = { ...n[sIdx], indikator: n[sIdx].indikator.filter((_, i) => i !== iIdx) }; return n
    })
  }
  function updateIndikator(sIdx: number, iIdx: number, val: string) {
    setSasaranList(prev => {
      const n = [...prev]; const ind = [...n[sIdx].indikator]; ind[iIdx] = val
      n[sIdx] = { ...n[sIdx], indikator: ind }; return n
    })
  }

  // ── Pemangku handlers ───────────────────────────────────────────────────
  function addPemangku() { setPemangkuList(prev => [...prev, { nama: '', keterangan: '' }]) }
  function removePemangku(idx: number) { setPemangkuList(prev => prev.filter((_, i) => i !== idx)) }
  function updatePemangku(idx: number, field: 'nama' | 'keterangan', val: string) {
    setPemangkuList(prev => { const n = [...prev]; n[idx] = { ...n[idx], [field]: val }; return n })
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200 shadow-sm overflow-hidden bg-white"
    >
      {/* Form header */}
      <div className="px-5 py-4 border-b bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-slate-400 mb-0.5">Lampiran Formulir</p>
          <h2 className="font-serif font-bold text-slate-800 text-base leading-tight">
            Penetapan Konteks Manajemen Risiko
          </h2>
        </div>
        {savedKonteksId && (
          <a
            href={`/dashboard/identifikasi?konteks=${savedKonteksId}`}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-700 hover:bg-green-800 text-white text-xs font-semibold transition-colors shadow-sm"
          >
            Identifikasi Risiko <ArrowRight className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      <div className="p-5 space-y-5">

        {/* ── Row 1: Unit Kerja + Tahun ─────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1">
            <FieldLabel>Unit Kerja (Pemilik Risiko)</FieldLabel>
            {units.length > 0 ? (
              <SearchableUnitSelect
                units={units}
                name="unit_kerja_id_hidden"
                required
                onSelect={setSelectedUnit}
              />
            ) : (
              <div className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-200">
                Belum ada unit kerja.{' '}
                <a href="/dashboard/master-data/unit-kerja" className="underline font-bold">Tambahkan</a>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <FieldLabel>Tahun Penerapan</FieldLabel>
            <input
              type="number" value={tahun} onChange={e => setTahun(e.target.value)}
              className={inputCls} min={2020} max={2099} required
            />
          </div>
        </div>

        {/* ── Row 2: Periode ───────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <FieldLabel>Periode Mulai</FieldLabel>
            <input type="date" value={periodeMulai} onChange={e => setPeriodeMulai(e.target.value)} className={inputCls} />
          </div>
          <div className="space-y-1">
            <FieldLabel>Periode Selesai</FieldLabel>
            <input type="date" value={periodeSelesai} onChange={e => setPeriodeSelesai(e.target.value)} className={inputCls} />
          </div>
        </div>

        {/* ── Section 1: Sasaran Strategis ─────────────────────────────── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <SectionHeader num={1} title="Sasaran Strategis / Program Unit Pemilik Risiko" />

          <div className="grid grid-cols-[auto_1fr_1fr] text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-200">
            <div className="px-3 py-2 w-8 text-center border-r border-slate-200">No</div>
            <div className="px-3 py-2 border-r border-slate-200">Nama Konteks (Sasaran/Program/Kegiatan)</div>
            <div className="px-3 py-2">Indikator Kinerja</div>
          </div>

          {sasaranList.map((item, sIdx) => (
            <div key={sIdx} className="grid grid-cols-[auto_1fr_1fr] border-b border-slate-100 last:border-b-0 hover:bg-indigo-50/10 transition-colors">
              <div className="px-3 py-2.5 w-8 text-center text-xs text-slate-400 font-mono border-r border-slate-100 flex items-start pt-3">
                {sIdx + 1}
              </div>
              <div className="px-2 py-2 border-r border-slate-100 flex items-start gap-1.5">
                <textarea
                  rows={2}
                  value={item.sasaran}
                  onChange={e => updateSasaran(sIdx, e.target.value)}
                  placeholder={sIdx === 0 ? 'Terwujudnya peradilan yang efektif dan akuntabel...' : `Sasaran ${sIdx + 1}...`}
                  className="flex-1 resize-none rounded-lg border border-slate-200 bg-white/90 px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                  required={sIdx === 0}
                />
                {sasaranList.length > 1 && (
                  <button type="button" onClick={() => removeSasaran(sIdx)}
                    className="mt-1 text-slate-300 hover:text-red-400 transition-colors shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="px-2 py-2 space-y-1">
                {item.indikator.map((ind, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-400 shrink-0 w-4 text-right">{iIdx + 1}.</span>
                    <input
                      type="text" value={ind}
                      onChange={e => updateIndikator(sIdx, iIdx, e.target.value)}
                      placeholder={`Indikator ${iIdx + 1}...`}
                      className="flex-1 rounded border border-slate-200 bg-white/90 px-2 py-1 text-[11px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                    />
                    {item.indikator.length > 1 && (
                      <button type="button" onClick={() => removeIndikator(sIdx, iIdx)}
                        className="text-slate-300 hover:text-red-400 transition-colors shrink-0">
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addIndikator(sIdx)}
                  className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold transition-colors mt-0.5">
                  <Plus className="w-3 h-3" /> Indikator
                </button>
              </div>
            </div>
          ))}

          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <button type="button" onClick={addSasaran}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah Sasaran
            </button>
            <SectionSaveBtn
              onClick={() => handleSectionSave('sasaran')}
              saving={savingSection === 'sasaran'}
              saved={savedSection === 'sasaran'}
            />
          </div>
        </div>

        {/* ── Section 2: Proses Bisnis (full MA hierarchy) ─────────────── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <SectionHeader num={2} title="Proses Bisnis Unit Pemilik Risiko" />

          <div className="grid grid-cols-[auto_1fr_1fr] text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-200">
            <div className="px-3 py-2 w-28 text-center border-r border-slate-200">Kode</div>
            <div className="px-3 py-2 border-r border-slate-200">Nama Proses Bisnis</div>
            <div className="px-3 py-2">Indikator Kinerja Kegiatan</div>
          </div>

          {PROSES_HIERARCHY.map(group => (
            <div key={group.kode}>
              {/* Parent header row */}
              <div className="grid grid-cols-[auto_1fr_1fr] bg-indigo-50/60 border-b border-indigo-100">
                <div className="px-3 py-2 w-28 text-center border-r border-indigo-100">
                  <span className="font-mono font-bold text-[11px] text-indigo-700">{group.kode}</span>
                </div>
                <div className="px-3 py-2 col-span-2 text-[11px] font-semibold text-indigo-800">
                  {group.nama}
                </div>
              </div>
              {/* Sub-process rows */}
              {group.sub.map(sub => (
                <div key={sub.kode} className="grid grid-cols-[auto_1fr_1fr] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/40 transition-colors">
                  <div className="px-3 py-2 w-28 text-center border-r border-slate-100 flex items-center justify-center">
                    <span className="font-mono text-[10px] text-slate-500">{sub.kode}</span>
                  </div>
                  <div className="px-3 py-2 border-r border-slate-100 flex items-center">
                    <span className="text-xs text-slate-600">{sub.nama}</span>
                  </div>
                  <div className="px-2 py-1.5 flex items-center">
                    <input
                      type="text"
                      value={prosesIndikator[sub.kode] ?? ''}
                      onChange={e => setProsesIndikator(prev => ({ ...prev, [sub.kode]: e.target.value }))}
                      placeholder="Indikator kinerja kegiatan..."
                      className="w-full rounded border border-slate-200 bg-white/90 px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                    />
                  </div>
                </div>
              ))}
            </div>
          ))}

          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <p className="text-[10px] text-slate-400 italic">
              Isi indikator kinerja pada sub-proses yang relevan dengan unit kerja
            </p>
            <SectionSaveBtn
              onClick={() => handleSectionSave('proses')}
              saving={savingSection === 'proses'}
              saved={savedSection === 'proses'}
            />
          </div>
        </div>

        {/* ── Section 3: Pemangku Kepentingan ─────────────────────────── */}
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <SectionHeader num={3} title="Daftar Pemangku Kepentingan" />

          <div className="grid grid-cols-[auto_1fr_1fr_auto] text-[10px] font-semibold uppercase tracking-widest text-slate-500 bg-slate-50 border-b border-slate-200">
            <div className="px-3 py-2 w-8 text-center border-r border-slate-200">No</div>
            <div className="px-3 py-2 border-r border-slate-200">Daftar Pemangku Kepentingan</div>
            <div className="px-3 py-2">Keterangan</div>
            <div className="px-3 py-2 w-8" />
          </div>

          {pemangkuList.map((p, idx) => (
            <div key={idx} className="grid grid-cols-[auto_1fr_1fr_auto] border-b border-slate-100 last:border-b-0 hover:bg-slate-50/30">
              <div className="px-3 py-2.5 w-8 text-center text-xs text-slate-400 font-mono border-r border-slate-100 flex items-center justify-center">
                {idx + 1}
              </div>
              <div className="px-2 py-2 border-r border-slate-100">
                <input type="text" value={p.nama}
                  onChange={e => updatePemangku(idx, 'nama', e.target.value)}
                  placeholder="Pihak internal / eksternal..."
                  className="w-full rounded border border-slate-200 bg-white/90 px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                />
              </div>
              <div className="px-2 py-2">
                <input type="text" value={p.keterangan}
                  onChange={e => updatePemangku(idx, 'keterangan', e.target.value)}
                  placeholder="Deskripsi hubungan dengan pencapaian sasaran..."
                  className="w-full rounded border border-slate-200 bg-white/90 px-2 py-1.5 text-xs text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-200 transition-all"
                />
              </div>
              <div className="px-2 py-2 flex items-center justify-center">
                {pemangkuList.length > 1 && (
                  <button type="button" onClick={() => removePemangku(idx)}
                    className="text-slate-300 hover:text-red-400 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <button type="button" onClick={addPemangku}
              className="flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
              <Plus className="w-3.5 h-3.5" /> Tambah Pemangku Kepentingan
            </button>
            <SectionSaveBtn
              onClick={() => handleSectionSave('pemangku')}
              saving={savingSection === 'pemangku'}
              saved={savedSection === 'pemangku'}
            />
          </div>
        </div>

        {/* ── Error ────────────────────────────────────────────────────── */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {error}
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────────────────── */}
        <button
          type="submit"
          disabled={submitting || submitted}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-70"
          style={{ background: submitted ? '#22c55e' : 'linear-gradient(135deg,#1a5c38,#1e7a50)' }}
        >
          {submitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan...</>
          ) : submitted ? (
            <><CheckCircle2 className="w-4 h-4" /> Tersimpan — memuat ulang...</>
          ) : (
            'Simpan Penetapan Konteks'
          )}
        </button>
      </div>
    </form>
  )
}
