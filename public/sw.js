/* E-Perjadin Bawas — service worker minimal (PRD K-3).
 * Tujuan: shell modul tetap terbuka saat sinyal buruk. Perekaman luring
 * sesungguhnya ditangani IndexedDB (antrean-luring.ts), bukan di sini. */
const CACHE = 'e-perjadin-v2'

self.addEventListener('install', (e) => {
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  const { request } = e
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Aset build (immutable) → cache-first.
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/fonts/')) {
    e.respondWith(
      caches.open(CACHE).then((c) =>
        c.match(request).then((hit) => hit || fetch(request).then((res) => {
          if (res.ok) c.put(request, res.clone())
          return res
        })),
      ),
    )
    return
  }

  // Navigasi halaman e-perjadin → network-first, fallback ke cache.
  if (request.mode === 'navigate' && url.pathname.startsWith('/dashboard/e-perjadin')) {
    e.respondWith(
      fetch(request).then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(request, copy))
        return res
      }).catch(() => caches.match(request).then((hit) => hit || caches.match('/dashboard/e-perjadin'))),
    )
  }
})
