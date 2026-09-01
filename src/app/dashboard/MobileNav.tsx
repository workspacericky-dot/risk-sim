'use client'

import { createContext, useContext, useState } from 'react'

type MobileNav = { open: boolean; setOpen: (v: boolean) => void }

const Ctx = createContext<MobileNav>({ open: false, setOpen: () => {} })

export const useMobileNav = () => useContext(Ctx)

/** Menyimpan status buka/tutup drawer navigasi mobile, dipakai bersama oleh Sidebar & Header. */
export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>
}
