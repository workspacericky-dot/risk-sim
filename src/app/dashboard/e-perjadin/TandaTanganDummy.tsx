'use client'

import { useState } from 'react'

/**
 * Blok tanda tangan dummy (PRD Q-1). Diklik → muncul "TTE" simulasi. BUKAN
 * tanda tangan elektronik tersertifikasi — hanya placeholder visual sampai
 * integrasi BSrE (di luar lingkup, K-2).
 */
export default function TandaTanganDummy({
  jabatan, nama, nip,
}: {
  jabatan: string
  nama?: string | null
  nip?: string | null
}) {
  const [tte, setTte] = useState(false)
  return (
    <div className="text-center text-[10pt] leading-tight">
      <p>{jabatan},</p>
      {tte ? (
        <div className="my-1 inline-block rounded border border-sky-400 bg-sky-50 px-3 py-2 text-left text-[7pt] leading-snug text-sky-900 print:bg-sky-50">
          <div className="font-semibold">✓ Ditandatangani secara elektronik</div>
          <div>oleh: {nama || '(nama pejabat)'}</div>
          {nip && <div>NIP: {nip}</div>}
          <div>pada: {new Date().toLocaleString('id-ID')}</div>
          <div className="mt-0.5 font-mono text-[6pt] text-sky-500">TTE-SIMULASI · verifikasi via QR</div>
        </div>
      ) : (
        <button type="button" onClick={() => setTte(true)}
          className="my-1 block h-16 min-w-[190px] cursor-pointer rounded border border-dashed border-slate-300 text-[8pt] text-slate-400 hover:border-slate-500 hover:text-slate-600 print:border-transparent print:text-transparent">
          klik untuk tanda tangan
        </button>
      )}
      <p className="border-t border-slate-400 pt-1 min-w-[190px] font-semibold">{nama || '………………………………'}</p>
      {nip && <p className="text-[8pt]">NIP. {nip}</p>}
    </div>
  )
}
