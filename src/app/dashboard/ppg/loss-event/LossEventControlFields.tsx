'use client'

import { useMemo, useState } from 'react'
import { PpgCombobox } from '../PpgCombobox'
import { PpgMultiCombobox } from '../PpgMultiCombobox'

type Row = Record<string, unknown>

export function LossEventControlFields({ registers, inputClass }: { registers: Row[]; inputClass: string }) {
  const [registerId, setRegisterId] = useState('')
  const [controlIds, setControlIds] = useState<string[]>([])
  const selectedRegister = registers.find((row) => String(row.id) === registerId)
  const controlOptions = useMemo(() => {
    const controls = Array.isArray(selectedRegister?.controls) ? selectedRegister.controls : []
    return controls.flatMap((raw) => {
      const relation = record(raw)
      const controlRaw = relation.control
      const control = record(Array.isArray(controlRaw) ? controlRaw[0] : controlRaw)
      if (!control.id) return []
      return [{
        value: String(control.id),
        label: `${String(control.kode)} · ${String(control.nama)}`,
        description: `${String(control.jenis || 'Jenis belum diisi')} · ${String(control.status || 'status tidak tersedia')}`,
      }]
    })
  }, [selectedRegister])

  return <>
    <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Risk Register Satker <span className="font-normal text-slate-400">(pilih untuk mereferensikan kontrol gagal)</span></span><PpgCombobox name="register_id" searchable value={registerId} onValueChange={(value) => { setRegisterId(value); setControlIds([]) }} placeholder="Pilih bila risiko sudah diadopsi Satker" options={registers.map((row) => ({ value: String(row.id), label: `${String(row.kode)} · ${String(row.unit_nama)}`, description: String(row.peristiwa) }))} /></div>
    <div className="xl:col-span-2"><span className="mb-1 block text-xs font-semibold text-slate-600">Kontrol yang gagal <span className="font-normal text-slate-400">(dari kontrol aktual pada register)</span></span><PpgMultiCombobox name="failed_control_ids" values={controlIds} onValuesChange={setControlIds} disabled={!registerId || !controlOptions.length} placeholder={!registerId ? 'Pilih Risk Register terlebih dahulu' : controlOptions.length ? 'Pilih satu atau beberapa kontrol' : 'Register belum memiliki kontrol'} options={controlOptions} /></div>
    <label className="grid gap-1 text-xs font-semibold text-slate-600 md:col-span-2 xl:col-span-4">Keterangan tambahan kegagalan kontrol <span className="font-normal text-slate-400">(opsional)</span><textarea name="kegagalan_kontrol" placeholder="Jelaskan bagaimana kontrol gagal, tidak dijalankan, atau tidak memadai di Satker" className={`${inputClass} min-h-20`} /></label>
  </>
}

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}
}
