'use client'

import { useState } from 'react'
import { Save, Check, Loader2 } from 'lucide-react'
import { updateRisikoPejabat } from './actions'

type Props = {
  risikoId: string
  namaPemilik: string
  jabatanPemilik: string
  namaPengelola: string
  jabatanPengelola: string
}

const cellCls  = 'border border-slate-100 px-1.5 py-1.5 align-top'
const inputCls = 'w-full rounded border border-slate-200 bg-white px-1.5 py-1 text-[10px] text-slate-700 placeholder:text-slate-300 focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-100 transition-all'

export default function PejabatCells({
  risikoId,
  namaPemilik,
  jabatanPemilik,
  namaPengelola,
  jabatanPengelola,
}: Props) {
  const [nama1,  setNama1]  = useState(namaPemilik)
  const [jab1,   setJab1]   = useState(jabatanPemilik)
  const [nama2,  setNama2]  = useState(namaPengelola)
  const [jab2,   setJab2]   = useState(jabatanPengelola)
  const [dirty,  setDirty]  = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  function mark(setter: (v: string) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setter(e.target.value)
      setDirty(true)
      setSaved(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    const fd = new FormData()
    fd.set('risiko_id',              risikoId)
    fd.set('nama_pemilik_risiko',     nama1)
    fd.set('jabatan_pemilik_risiko',  jab1)
    fd.set('nama_pengelola_risiko',   nama2)
    fd.set('jabatan_pengelola_risiko',jab2)
    await updateRisikoPejabat(fd)
    setSaving(false)
    setSaved(true)
    setDirty(false)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <>
      <td className={cellCls}>
        <input value={nama1}  onChange={mark(setNama1)}  placeholder="Nama pemilik..."   className={inputCls} />
      </td>
      <td className={cellCls}>
        <input value={jab1}   onChange={mark(setJab1)}   placeholder="Jabatan..."        className={inputCls} />
      </td>
      <td className={cellCls}>
        <input value={nama2}  onChange={mark(setNama2)}  placeholder="Nama pengelola..."  className={inputCls} />
      </td>
      <td className={cellCls}>
        <input value={jab2}   onChange={mark(setJab2)}   placeholder="Jabatan..."        className={inputCls} />
      </td>
      <td className="border border-slate-100 px-1.5 py-1.5 text-center align-top">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || (!dirty && !saved)}
          title="Simpan pejabat risiko ini"
          className={[
            'inline-flex items-center justify-center w-6 h-6 rounded transition-colors',
            saved
              ? 'bg-green-100 text-green-600'
              : dirty
              ? 'bg-indigo-100 hover:bg-indigo-200 text-indigo-600'
              : 'bg-slate-100 text-slate-300 cursor-default',
          ].join(' ')}
        >
          {saving ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : saved ? (
            <Check className="w-3 h-3" />
          ) : (
            <Save className="w-3 h-3" />
          )}
        </button>
      </td>
    </>
  )
}
