'use client'

import { useState } from 'react'
import { addSmapKonteks, updateSmapKonteks, deleteSmapKonteks } from './actions'
import { Pencil, Trash2, X, Check } from 'lucide-react'

type Unit = { id: string; nama_unit: string }
type KonteksRow = {
  id: string
  tahun: number
  nama_pemilik_risiko: string
  jabatan_pemilik_risiko: string
  unit: { nama_unit: string } | null
}

type Props = { units: Unit[]; konteksList: KonteksRow[] }

export default function SmapKonteksClient({ units, konteksList }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ tahun: string; nama: string; jabatan: string }>({ tahun: '', nama: '', jabatan: '' })
  const [addError, setAddError] = useState<string | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  function startEdit(k: KonteksRow) {
    setEditId(k.id)
    setEditData({ tahun: String(k.tahun), nama: k.nama_pemilik_risiko, jabatan: k.jabatan_pemilik_risiko })
    setEditError(null)
  }

  async function submitAdd(fd: FormData) {
    setPending(true)
    setAddError(null)
    const res = await addSmapKonteks(fd)
    if (res?.error) setAddError(res.error)
    setPending(false)
  }

  async function submitEdit() {
    if (!editId) return
    setPending(true)
    setEditError(null)
    const fd = new FormData()
    fd.append('id', editId)
    fd.append('tahun', editData.tahun)
    fd.append('nama_pemilik_risiko', editData.nama)
    fd.append('jabatan_pemilik_risiko', editData.jabatan)
    const res = await updateSmapKonteks(fd)
    if (res?.error) setEditError(res.error)
    else setEditId(null)
    setPending(false)
  }

  async function submitDelete(id: string) {
    if (!confirm('Hapus konteks SMAP ini beserta semua data risiko di dalamnya?')) return
    await deleteSmapKonteks(id)
  }

  const currentYear = new Date().getFullYear()

  return (
    <div className="space-y-6">

      {/* ── Existing list ─────────────────────────────────────────────── */}
      {konteksList.length > 0 && (
        <div className="rounded-2xl border border-white/60 shadow-sm overflow-hidden" style={{ background: 'rgba(255,255,255,0.9)' }}>
          <div className="flex items-center gap-2 px-5 py-3 border-b bg-orange-50/80">
            <span className="text-sm font-semibold text-orange-800">Daftar Penilaian Risiko Penyuapan</span>
            <span className="ml-auto text-[11px] text-slate-400">{konteksList.length} dokumen</span>
          </div>
          <div className="divide-y divide-slate-100">
            {konteksList.map(k => (
              <div key={k.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">

                {editId === k.id ? (
                  // ── Edit row ─────────────────────────────────────────
                  <>
                    <input
                      type="number"
                      value={editData.tahun}
                      onChange={e => setEditData(d => ({ ...d, tahun: e.target.value }))}
                      className="w-20 border rounded-lg px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={editData.nama}
                      onChange={e => setEditData(d => ({ ...d, nama: e.target.value }))}
                      placeholder="Nama Pemilik Risiko"
                      className="flex-1 border rounded-lg px-2 py-1 text-xs"
                    />
                    <input
                      type="text"
                      value={editData.jabatan}
                      onChange={e => setEditData(d => ({ ...d, jabatan: e.target.value }))}
                      placeholder="Jabatan"
                      className="flex-1 border rounded-lg px-2 py-1 text-xs"
                    />
                    {editError && <span className="text-[10px] text-red-600">{editError}</span>}
                    <button onClick={submitEdit} disabled={pending} className="p-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg border hover:bg-slate-50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </>
                ) : (
                  // ── Display row ──────────────────────────────────────
                  <>
                    <span className="shrink-0 w-12 text-center text-xs font-bold text-orange-700 bg-orange-50 border border-orange-100 rounded-lg py-0.5">
                      {k.tahun}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{k.unit?.nama_unit ?? '–'}</p>
                      {(k.nama_pemilik_risiko || k.jabatan_pemilik_risiko) && (
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {k.nama_pemilik_risiko} {k.jabatan_pemilik_risiko ? `· ${k.jabatan_pemilik_risiko}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <a
                        href={`/dashboard/smap/identifikasi?konteks=${k.id}`}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-orange-200 text-[11px] font-semibold text-orange-700 hover:bg-orange-50 hover:border-orange-300 transition-all"
                      >
                        Identifikasi Risiko →
                      </a>
                      <button
                        onClick={() => startEdit(k)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => submitDelete(k.id)}
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-300 hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Add form ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Tambah Penilaian Baru</h3>
        </div>
        <form action={submitAdd} className="px-5 py-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Unit Kerja <span className="text-red-500">*</span></label>
              <select name="unit_kerja_id" required className="w-full h-9 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="">Pilih unit kerja...</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.nama_unit}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Tahun <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="tahun"
                required
                defaultValue={currentYear}
                min={2020}
                max={2040}
                className="w-full h-9 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Nama Pemilik Risiko</label>
              <input
                type="text"
                name="nama_pemilik_risiko"
                placeholder="Nama lengkap..."
                className="w-full h-9 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">Jabatan Pemilik Risiko</label>
              <input
                type="text"
                name="jabatan_pemilik_risiko"
                placeholder="Jabatan..."
                className="w-full h-9 border rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>
          {addError && <p className="text-xs text-red-600">{addError}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full sm:w-auto px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            + Buat Penilaian SMAP
          </button>
        </form>
      </div>

    </div>
  )
}
