import Link from 'next/link'
import { ArrowLeft, Network } from 'lucide-react'
import { getPohonSetting, hasPohonUnlock } from '@/lib/pohon-access'
import PublicMenuPinGate from '@/components/PublicMenuPinGate'
import PublicMenuLockButton from '@/components/PublicMenuLockButton'
import PohonKinerjaExplorer from './PohonKinerjaExplorer'
import { getPohonDocument } from '@/lib/pohon-document'
import { getSiwasUser } from '@/lib/siwas-access'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Pohon Kinerja Bawas MA 2025 - Risk-Sim',
  description: 'Penelusuran pohon kinerja Badan Pengawasan Mahkamah Agung tahun 2025.',
}

export default async function PohonKinerjaPage() {
  const setting = await getPohonSetting()
  const unlocked = await hasPohonUnlock(setting)
  const admin = await getSiwasUser()
  const canEdit = admin?.role === 'admin_sistem'
  const allowed = unlocked || canEdit
  const document = allowed ? await getPohonDocument() : null

  return (
    <main className="min-h-screen bg-[linear-gradient(145deg,#e7f0f4_0%,#d7e9ee_48%,#c8e2e3_100%)] px-3 py-4 text-slate-900 sm:px-6 sm:py-6">
      <header className="mx-auto mb-5 flex max-w-[1800px] items-center justify-between gap-3">
        <Link href="/menu-lainnya" className="inline-flex items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-white"><ArrowLeft className="h-4 w-4" /> Menu Lainnya</Link>
        <div className="flex items-center gap-2">
          {unlocked && <PublicMenuLockButton kind="pohon" />}
          <span className="hidden items-center gap-2 rounded-xl border border-white/80 bg-white/75 px-3 py-2 text-sm font-semibold text-emerald-800 shadow-sm sm:inline-flex"><Network className="h-5 w-5" /> Bawas MA - 2025</span>
        </div>
      </header>
      {document ? <PohonKinerjaExplorer source={document.source} revision={document.revision} canEdit={canEdit} /> : <PublicMenuPinGate kind="pohon" configured={Boolean(setting)} />}
    </main>
  )
}
