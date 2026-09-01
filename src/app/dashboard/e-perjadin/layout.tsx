import DaftarSW from './DaftarSW'

export default function EPerjadinLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DaftarSW />
      {children}
    </>
  )
}
