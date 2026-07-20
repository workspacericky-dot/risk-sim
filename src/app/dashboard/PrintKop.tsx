'use client'

import { usePathname } from 'next/navigation'

// Kop surat cetak global untuk seluruh halaman dashboard. Halaman ekspor
// RALS (organisasi) sengaja tidak boleh memuat kop sama sekali — jadi
// komponen ini tidak dirender sama sekali di sana (bukan cuma disembunyikan),
// karena CSS print (.print-doc-header) memakai display:block !important.
export default function PrintKop() {
  const pathname = usePathname()
  if (pathname === '/dashboard/rals/print') return null

  return (
    <div className="print-doc-header" style={{ display: 'none' }}>
      {/* Letterhead: logo left, institution name + address centered right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16pt', paddingBottom: '8pt', borderBottom: '3pt double #000', marginBottom: '10pt' }}>
        {/* Left: MA logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-ma-bw.png"
          alt="Logo Mahkamah Agung"
          style={{ width: '72pt', height: 'auto', flexShrink: 0 }}
        />
        {/* Right: institution name & address — centered */}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <p style={{ fontSize: '14pt', fontWeight: 700, textTransform: 'uppercase', margin: 0, lineHeight: 1.25, letterSpacing: '0.05em' }}>
            Mahkamah Agung Republik Indonesia
          </p>
          <p style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', margin: '1pt 0 5pt', lineHeight: 1.25, letterSpacing: '0.05em' }}>
            Badan Pengawasan
          </p>
          <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.6 }}>
            Jalan Jenderal Ahmad Yani Nomor 58–60, Jakarta Pusat 10510
          </p>
          <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.6 }}>
            Telepon: (021) 3843348, 3810350, 3457661&nbsp;&nbsp;Faksimile: (021) 3810350
          </p>
          <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.6 }}>
            Laman: www.mahkamahagung.go.id&nbsp;&nbsp;Surel: bawas@mahkamahagung.go.id
          </p>
        </div>
      </div>
      {/* Sub-header: context line */}
      <p style={{ fontSize: '7.5pt', color: '#555', margin: '0 0 8pt', textAlign: 'right' }}>
        Sistem Manajemen Risiko — dicetak pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  )
}
