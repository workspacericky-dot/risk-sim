import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import { DashboardHeader } from '@/components/DashboardHeader'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch full user profile with role
  const { data: profile } = await supabase
    .from('users')
    .select('nama_lengkap, role')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen text-slate-900 font-sans" style={{ background: 'linear-gradient(160deg, #e4edf3 0%, #d6e8f5 45%, #cbe2f4 100%)' }}>
      <Sidebar userEmail={user.email || ''} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col" id="print-main">
        <DashboardHeader
          userEmail={user.email || ''}
          userName={profile?.nama_lengkap ?? null}
          userRole={profile?.role ?? null}
          initialYear={new Date().getFullYear()}
        />

        {/* Print-only document header — hidden via inline style on screen; @media print overrides to block */}
        <div className="print-doc-header" style={{ display: 'none' }}>
          {/* Letterhead: two-column layout — text left, logo right */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '8pt', borderBottom: '3pt double #000', marginBottom: '12pt' }}>
            {/* Left: institution name & address */}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', margin: 0, lineHeight: 1.2, letterSpacing: '0.04em' }}>
                Mahkamah Agung Republik Indonesia
              </p>
              <p style={{ fontSize: '13pt', fontWeight: 700, textTransform: 'uppercase', margin: '1pt 0 4pt', lineHeight: 1.2, letterSpacing: '0.04em' }}>
                Badan Pengawasan
              </p>
              <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.5 }}>
                Jalan Jenderal Ahmad Yani Nomor 58–60, Jakarta Pusat 10510
              </p>
              <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.5 }}>
                Telepon: (021) 3843348, 3810350, 3457661&nbsp;&nbsp;Faksimile: (021) 3810350
              </p>
              <p style={{ fontSize: '8pt', margin: 0, lineHeight: 1.5 }}>
                Laman:{' '}
                <a href="https://www.mahkamahagung.go.id" style={{ color: '#1a56e8', textDecoration: 'underline' }}>
                  www.mahkamahagung.go.id
                </a>
                {' '}Surel:{' '}
                <a href="mailto:bawas@mahkamahagung.go.id" style={{ color: '#1a56e8', textDecoration: 'underline' }}>
                  bawas@mahkamahagung.go.id
                </a>
              </p>
            </div>

            {/* Right: MA logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-ma-bw.png"
              alt="Logo Mahkamah Agung"
              style={{ width: '64pt', height: 'auto', marginLeft: '16pt', flexShrink: 0 }}
            />
          </div>

          {/* Sub-header: context line */}
          <p style={{ fontSize: '8pt', color: '#444', margin: '0 0 8pt', textAlign: 'right' }}>
            Sistem Manajemen Risiko — dicetak pada {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div className="p-8 pb-6 max-w-7xl mx-auto w-full">
          {children}
        </div>

        {/* Copyright footer */}
        <div className="max-w-7xl mx-auto w-full px-8 pb-6">
          <p className="text-[10px] text-slate-400 text-center border-t border-slate-200 pt-3">
            © 2026 Ricky Pramoedya Hermawan. All rights reserved.
          </p>
        </div>
      </main>
    </div>
  )
}
