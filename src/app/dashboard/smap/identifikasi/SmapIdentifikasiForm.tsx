'use client'

import { useState } from 'react'
import { addSmapRisiko, updateSmapRisiko, deleteSmapRisiko } from './actions'
import {
  getL1ForUnit, getL2ForL1, SMAP_URAIAN_RISIKO, JENIS_KORUPSI_LIST,
  type ProsesBisnisItem,
} from '@/lib/smap-data'
import { Pencil, Trash2, PlusCircle } from 'lucide-react'
import SmapFraudHexagon from '../SmapFraudHexagon'

type Risiko = {
  id: string
  no_urut: number
  kegiatan_utama_kode: string
  kegiatan_utama_nama: string
  jenis_kegiatan_kode: string
  jenis_kegiatan_nama: string
  proses_kegiatan: string
  jenis_korupsi: string
  uraian_risiko_ref_id: string
  uraian_risiko_final: string
  why1: string
  why2: string
  why3: string
  why4: string
  why5: string
  penyebab: string
  dampak: string
  risk_owner: string
}

type FormState = {
  l1Kode: string
  l1Nama: string
  l2Kode: string
  l2Nama: string
  prosesKegiatan: string
  jenisKorupsi: string
  uraianRefId: string
  uraianFinal: string
  why1: string
  why2: string
  why3: string
  why4: string
  why5: string
  dampak: string
  riskOwner: string
}

const emptyForm = (): FormState => ({
  l1Kode: '', l1Nama: '', l2Kode: '', l2Nama: '',
  prosesKegiatan: '', jenisKorupsi: '', uraianRefId: '',
  uraianFinal: '',
  why1: '', why2: '', why3: '', why4: '', why5: '',
  dampak: '', riskOwner: '',
})

// ── Pure module-level helpers ─────────────────────────────────────────────

function buildUraianFinal(namaUnit: string, uraianTeks: string): string {
  return `Aparatur peradilan pada ${namaUnit} melakukan ${uraianTeks}`
}

function deriveAkar(f: FormState): string {
  return f.why5 || f.why4 || f.why3 || f.why2 || f.why1
}

function onL1Change(f: FormState, kode: string, l1Options: ProsesBisnisItem[], setF: (f: FormState) => void) {
  const l2s = getL2ForL1(kode)
  const l1 = l1Options.find(x => x.kode === kode)
  setF({ ...f, l1Kode: kode, l1Nama: l1?.nama ?? '', l2Kode: l2s[0]?.kode ?? '', l2Nama: l2s[0]?.nama ?? '' })
}

function onL2Change(f: FormState, kode: string, setF: (f: FormState) => void) {
  const l2 = getL2ForL1(f.l1Kode).find(x => x.kode === kode)
  setF({ ...f, l2Kode: kode, l2Nama: l2?.nama ?? '' })
}

function onJenisKorupsiChange(f: FormState, val: string, setF: (f: FormState) => void) {
  setF({ ...f, jenisKorupsi: val, uraianRefId: '', uraianFinal: '' })
}

function onUraianRefChange(f: FormState, refId: string, namaUnit: string, setF: (f: FormState) => void) {
  const uraian = SMAP_URAIAN_RISIKO.find(u => u.id === refId)
  setF({ ...f, uraianRefId: refId, uraianFinal: uraian ? buildUraianFinal(namaUnit, uraian.uraian) : '' })
}

// ── 5 Whys sub-component — module-level (must NOT be defined inside another component) ──

type WhysProps = {
  f: FormState
  setF: (f: FormState) => void
}

function FiveWhys({ f, setF }: WhysProps) {
  const akar = deriveAkar(f)
  const whys: (keyof FormState)[] = ['why1', 'why2', 'why3', 'why4', 'why5']
  const labels = [
    'Mengapa risiko ini bisa terjadi? (Why 1)',
    'Mengapa hal tersebut terjadi? (Why 2)',
    'Mengapa? (Why 3)',
    'Mengapa? (Why 4)',
    'Mengapa? (Why 5 — Akar Masalah)',
  ]

  return (
    <div className="space-y-2">
      {whys.map((key, idx) => {
        const prevKey = idx > 0 ? whys[idx - 1] : null
        const disabled = prevKey ? !(f[prevKey] as string) : false
        const isLast = idx === 4
        const isAkar = akar && f[key] === akar && f[key] !== ''

        return (
          <div key={key} className="flex items-start gap-2">
            <div className="flex flex-col items-center shrink-0 mt-2">
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border ${
                f[key] ? 'bg-orange-500 border-orange-500 text-white' : 'bg-white border-slate-300 text-slate-400'
              }`}>
                {idx + 1}
              </span>
              {idx < 4 && <div className="w-px h-3 bg-slate-200 mt-0.5" />}
            </div>
            <div className="flex-1 space-y-0.5">
              <label className={`text-[10px] font-semibold ${isLast ? 'text-orange-700' : 'text-slate-500'}`}>
                {labels[idx]}
                {isAkar && <span className="ml-1.5 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">Akar Masalah</span>}
              </label>
              <textarea
                value={f[key] as string}
                onChange={e => {
                  const val = e.target.value
                  const patch: Partial<FormState> = { [key]: val }
                  // cascade clear downstream whys
                  if (!val) {
                    for (let i = idx + 1; i < whys.length; i++) patch[whys[i]] = ''
                  }
                  setF({ ...f, ...patch })
                }}
                disabled={disabled}
                placeholder={disabled ? '← Isi Why sebelumnya terlebih dahulu' : `Tuliskan penyebabnya...`}
                rows={2}
                className={`w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 resize-none transition-colors ${
                  disabled
                    ? 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
                    : isAkar
                    ? 'border-orange-300 bg-orange-50/40 focus:ring-orange-300'
                    : 'border-slate-200 focus:ring-orange-400'
                }`}
              />
            </div>
          </div>
        )
      })}

      {akar && (
        <div className="mt-1 px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg">
          <p className="text-[10px] text-orange-600 font-semibold">Akar Masalah Teridentifikasi:</p>
          <p className="text-xs text-orange-800 mt-0.5 leading-relaxed">{akar}</p>
        </div>
      )}
    </div>
  )
}

// ── RisikoFormFields — module-level (CRITICAL: must NOT be defined inside another component) ──

type FieldsProps = {
  f: FormState
  setF: (f: FormState) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  submitLabel: string
  pending: boolean
  error: string | null
  namaUnit: string
  l1Options: ProsesBisnisItem[]
}

function RisikoFormFields({ f, setF, onSubmit, onCancel, submitLabel, pending, error, namaUnit, l1Options }: FieldsProps) {
  const l2Opts     = getL2ForL1(f.l1Kode)
  const uraianOpts = SMAP_URAIAN_RISIKO.filter(u => u.jenisKorupsi === f.jenisKorupsi)

  return (
    <form onSubmit={onSubmit} className="space-y-4 p-5 bg-white rounded-2xl border shadow-sm">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* L1 Kegiatan Utama */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Kegiatan Utama (L1) <span className="text-red-500">*</span></label>
          <select
            value={f.l1Kode}
            onChange={e => onL1Change(f, e.target.value, l1Options, setF)}
            required
            className="w-full h-9 border rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Pilih kegiatan utama...</option>
            {l1Options.map(o => (
              <option key={o.kode} value={o.kode}>[{o.kode}] {o.nama}</option>
            ))}
          </select>
        </div>

        {/* L2 Jenis Kegiatan */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Jenis Kegiatan (L2)</label>
          <select
            value={f.l2Kode}
            onChange={e => onL2Change(f, e.target.value, setF)}
            disabled={!f.l1Kode}
            className="w-full h-9 border rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Pilih jenis kegiatan...</option>
            {l2Opts.map(o => (
              <option key={o.kode} value={o.kode}>[{o.kode}] {o.nama}</option>
            ))}
          </select>
        </div>

        {/* Proses Kegiatan */}
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-slate-600">Proses Dalam Pelaksanaan Kegiatan</label>
          <textarea
            value={f.prosesKegiatan}
            onChange={e => setF({ ...f, prosesKegiatan: e.target.value })}
            placeholder={'Contoh:\n- Penerimaan permohonan\n- Penelaahan berkas\n- Pembuatan penetapan'}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* Jenis Korupsi */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Jenis Korupsi <span className="text-red-500">*</span></label>
          <select
            value={f.jenisKorupsi}
            onChange={e => onJenisKorupsiChange(f, e.target.value, setF)}
            required
            className="w-full h-9 border rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            <option value="">Pilih jenis korupsi...</option>
            {JENIS_KORUPSI_LIST.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>

        {/* Uraian Risiko Ref */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Referensi Uraian Risiko <span className="text-red-500">*</span></label>
          <select
            value={f.uraianRefId}
            onChange={e => onUraianRefChange(f, e.target.value, namaUnit, setF)}
            required
            disabled={!f.jenisKorupsi}
            className="w-full h-9 border rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Pilih uraian risiko...</option>
            {uraianOpts.map(u => (
              <option key={u.id} value={u.id}>{u.pasal}</option>
            ))}
          </select>
        </div>

        {/* Uraian Risiko Final */}
        <div className="sm:col-span-2 space-y-1">
          <label className="text-xs font-semibold text-slate-600">
            Uraian Risiko Penyuapan <span className="text-red-500">*</span>
            <span className="ml-1 font-normal text-slate-400">(otomatis dari referensi, dapat diedit)</span>
          </label>
          <textarea
            value={f.uraianFinal}
            onChange={e => setF({ ...f, uraianFinal: e.target.value })}
            required
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* 5 Whys — Penyebab */}
        <div className="sm:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-600">
              Analisis Penyebab Risiko
              <span className="ml-1.5 font-normal text-slate-400">(5 Whys — opsional)</span>
            </label>
            <SmapFraudHexagon />
          </div>
          <FiveWhys f={f} setF={setF} />
        </div>

        {/* Dampak */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Dampak</label>
          <textarea
            value={f.dampak}
            onChange={e => setF({ ...f, dampak: e.target.value })}
            placeholder="Keadaan yang akan terjadi jika risiko terjadi..."
            rows={2}
            className="w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          />
        </div>

        {/* Risk Owner */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-600">Risk Owner (Jabatan)</label>
          <input
            type="text"
            value={f.riskOwner}
            onChange={e => setF({ ...f, riskOwner: e.target.value })}
            placeholder="Nama jabatan pemilik risiko..."
            className="w-full h-9 border rounded-lg px-3 text-xs focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="px-5 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-xl text-xs font-semibold transition-colors"
        >
          {pending ? 'Menyimpan...' : submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border rounded-xl text-xs text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Batal
        </button>
      </div>
    </form>
  )
}

// ── Main component ────────────────────────────────────────────────────────

type Props = {
  konteksId: string
  namaUnit: string
  risikoList: Risiko[]
}

export default function SmapIdentifikasiForm({ konteksId, namaUnit, risikoList }: Props) {
  const [showAdd, setShowAdd]   = useState(false)
  const [form, setForm]         = useState<FormState>(emptyForm())
  const [editId, setEditId]     = useState<string | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [pending, setPending]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const l1Options = getL1ForUnit(namaUnit)

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setPending(true); setError(null)
    const fd = new FormData()
    fd.append('konteks_id', konteksId)
    fd.append('kegiatan_utama_kode', form.l1Kode)
    fd.append('kegiatan_utama_nama', form.l1Nama)
    fd.append('jenis_kegiatan_kode', form.l2Kode)
    fd.append('jenis_kegiatan_nama', form.l2Nama)
    fd.append('proses_kegiatan', form.prosesKegiatan)
    fd.append('jenis_korupsi', form.jenisKorupsi)
    fd.append('uraian_risiko_ref_id', form.uraianRefId)
    fd.append('uraian_risiko_final', form.uraianFinal)
    fd.append('why1', form.why1)
    fd.append('why2', form.why2)
    fd.append('why3', form.why3)
    fd.append('why4', form.why4)
    fd.append('why5', form.why5)
    fd.append('penyebab', deriveAkar(form))
    fd.append('dampak', form.dampak)
    fd.append('risk_owner', form.riskOwner)
    const res = await addSmapRisiko(fd)
    if (res?.error) setError(res.error)
    else { setForm(emptyForm()); setShowAdd(false) }
    setPending(false)
  }

  function startEdit(r: Risiko) {
    setEditId(r.id)
    setEditForm({
      l1Kode: r.kegiatan_utama_kode, l1Nama: r.kegiatan_utama_nama,
      l2Kode: r.jenis_kegiatan_kode, l2Nama: r.jenis_kegiatan_nama,
      prosesKegiatan: r.proses_kegiatan, jenisKorupsi: r.jenis_korupsi,
      uraianRefId: r.uraian_risiko_ref_id, uraianFinal: r.uraian_risiko_final,
      why1: r.why1 ?? '', why2: r.why2 ?? '', why3: r.why3 ?? '',
      why4: r.why4 ?? '', why5: r.why5 ?? '',
      dampak: r.dampak, riskOwner: r.risk_owner,
    })
    setError(null)
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    if (!editId) return
    setPending(true); setError(null)
    const fd = new FormData()
    fd.append('id', editId)
    fd.append('konteks_id', konteksId)
    fd.append('kegiatan_utama_kode', editForm.l1Kode)
    fd.append('kegiatan_utama_nama', editForm.l1Nama)
    fd.append('jenis_kegiatan_kode', editForm.l2Kode)
    fd.append('jenis_kegiatan_nama', editForm.l2Nama)
    fd.append('proses_kegiatan', editForm.prosesKegiatan)
    fd.append('jenis_korupsi', editForm.jenisKorupsi)
    fd.append('uraian_risiko_ref_id', editForm.uraianRefId)
    fd.append('uraian_risiko_final', editForm.uraianFinal)
    fd.append('why1', editForm.why1)
    fd.append('why2', editForm.why2)
    fd.append('why3', editForm.why3)
    fd.append('why4', editForm.why4)
    fd.append('why5', editForm.why5)
    fd.append('penyebab', deriveAkar(editForm))
    fd.append('dampak', editForm.dampak)
    fd.append('risk_owner', editForm.riskOwner)
    const res = await updateSmapRisiko(fd)
    if (res?.error) setError(res.error)
    else setEditId(null)
    setPending(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus risiko ini? Data analisis dan evaluasi terkait juga akan terhapus.')) return
    await deleteSmapRisiko(id, konteksId)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-orange-50/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-orange-900">Form 1 — Register Risiko Penyuapan</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Identifikasi seluruh risiko penyuapan sesuai proses bisnis satuan kerja</p>
          </div>
          <span className="text-[11px] text-slate-400 bg-white border rounded-full px-2.5 py-0.5">{risikoList.length} risiko</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-orange-50/40 text-slate-600 border-b">
                <th className="border border-slate-100 px-2 py-2 text-center w-8">No</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[120px]">Kegiatan Utama</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[130px]">Jenis Kegiatan</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[140px]">Proses Pelaksanaan</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[200px]">Uraian Risiko Penyuapan</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[140px]">Penyebab (Akar Masalah)</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[100px]">Dampak</th>
                <th className="border border-slate-100 px-2 py-2 text-left min-w-[100px]">Risk Owner</th>
                <th className="border border-slate-100 px-2 py-2 text-center w-16">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {risikoList.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-400 text-xs">
                    Belum ada risiko. Klik &quot;+ Tambah Risiko&quot; untuk menambahkan.
                  </td>
                </tr>
              )}
              {risikoList.map(r => (
                editId === r.id ? (
                  <tr key={r.id}>
                    <td colSpan={9} className="p-4 bg-orange-50/40">
                      <RisikoFormFields
                        f={editForm} setF={setEditForm}
                        onSubmit={handleUpdate}
                        onCancel={() => { setEditId(null); setError(null) }}
                        submitLabel="Simpan Perubahan"
                        pending={pending} error={error}
                        namaUnit={namaUnit} l1Options={l1Options}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={r.id} className="hover:bg-slate-50/60 transition-colors border-b border-slate-50">
                    <td className="border border-slate-100 px-2 py-2 text-center text-slate-400">{r.no_urut}</td>
                    <td className="border border-slate-100 px-2 py-2">
                      <span className="font-mono text-[10px] text-orange-600 bg-orange-50 rounded px-1 mr-1">{r.kegiatan_utama_kode}</span>
                      {r.kegiatan_utama_nama}
                    </td>
                    <td className="border border-slate-100 px-2 py-2">
                      <span className="font-mono text-[10px] text-orange-600 bg-orange-50 rounded px-1 mr-1">{r.jenis_kegiatan_kode}</span>
                      {r.jenis_kegiatan_nama || <span className="text-slate-300">–</span>}
                    </td>
                    <td className="border border-slate-100 px-2 py-2 text-slate-600">
                      <span className="line-clamp-2 whitespace-pre-line">{r.proses_kegiatan || <span className="text-slate-300">–</span>}</span>
                    </td>
                    <td className="border border-slate-100 px-2 py-2">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-medium mb-0.5">{r.jenis_korupsi}</span>
                      <p className="text-slate-700 line-clamp-2 leading-relaxed">{r.uraian_risiko_final}</p>
                    </td>
                    <td className="border border-slate-100 px-2 py-2 text-slate-600">
                      {r.penyebab ? (
                        <div>
                          <p className="line-clamp-2 text-[11px]">{r.penyebab}</p>
                          {(r.why1 || r.why2) && (
                            <span className="text-[9px] text-orange-500 font-medium">5 Whys ✓</span>
                          )}
                        </div>
                      ) : <span className="text-slate-300">–</span>}
                    </td>
                    <td className="border border-slate-100 px-2 py-2 text-slate-600">
                      <span className="line-clamp-2">{r.dampak || <span className="text-slate-300">–</span>}</span>
                    </td>
                    <td className="border border-slate-100 px-2 py-2 text-slate-600">{r.risk_owner || <span className="text-slate-300">–</span>}</td>
                    <td className="border border-slate-100 px-2 py-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => startEdit(r)} className="p-1 rounded text-slate-300 hover:text-blue-500 transition-colors" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(r.id)} className="p-1 rounded text-slate-300 hover:text-red-500 transition-colors" title="Hapus">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t bg-slate-50/60">
          {showAdd ? (
            <RisikoFormFields
              f={form} setF={setForm}
              onSubmit={handleAdd}
              onCancel={() => { setShowAdd(false); setForm(emptyForm()); setError(null) }}
              submitLabel="+ Simpan ke Register"
              pending={pending} error={error}
              namaUnit={namaUnit} l1Options={l1Options}
            />
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Tambah Risiko
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
