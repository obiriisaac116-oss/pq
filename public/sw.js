// public/sw.js — PastQuestions GH service worker (PWA)
// Cache name: pq-v1
// Strategy:
//   - Static assets (.js, .css, .png, .jpg, .ico, .woff2): cache-first
//   - API routes and Supabase: network-only (never cache)
//   - Pages: network-first with cache fallback

const CACHE_NAME = 'pq-v1'
const SHELL_URLS = ['/', '/courses', '/bookmarks']

// Install: cache shell URLs and skip waiting
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(SHELL_URLS)
    }).then(() => self.skipWaiting())
  )
})

// Activate: delete old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  )
})

// Fetch: routing strategies
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // 1. Skip non-GET requests
  if (event.request.method !== 'GET') return

  // 2. Skip API routes — let them fall through to network
  if (url.pathname.startsWith('/api/')) return

  // 3. Skip Supabase hostnames
  if (
    url.hostname.endsWith('.supabase.co') ||
    url.hostname.endsWith('.supabase.in')
  ) return

  // 4. Cache-first for static assets
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|ico|woff2|svg|webp)$/.test(url.pathname)
  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
          }
          return response
        })
      })
    )
    return
  }

  // 5. Network-first for pages
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})
