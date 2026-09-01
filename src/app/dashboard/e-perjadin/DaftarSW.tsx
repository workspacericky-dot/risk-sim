'use client'

import { useEffect } from 'react'

/**
 * Daftarkan service worker minimal untuk modul E-Perjadin (PRD K-3).
 * Hanya di produksi: di dev, SW meng-cache aset build lama sehingga tiap
 * rebuild memicu hydration mismatch. Di dev, SW/cache lama justru dibersihkan.
 */
export default function DaftarSW() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    if (process.env.NODE_ENV !== 'production') {
      navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()))
      if ('caches' in window) caches.keys().then((ks) => ks.forEach((k) => k.startsWith('e-perjadin') && caches.delete(k)))
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => { /* abaikan */ })
  }, [])
  return null
}
