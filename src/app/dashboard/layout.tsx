import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from './Sidebar'
import { DashboardHeader } from '@/components/DashboardHeader'
import PrintKop from './PrintKop'

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
      <Sidebar userEmail={user.email || ''} userRole={profile?.role ?? null} />

      {/* Main Content */}
      <main className="flex-1 min-w-0 flex flex-col" id="print-main">
        <DashboardHeader
          userEmail={user.email || ''}
          userName={profile?.nama_lengkap ?? null}
          userRole={profile?.role ?? null}
          initialYear={new Date().getFullYear()}
        />

        <PrintKop />

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
