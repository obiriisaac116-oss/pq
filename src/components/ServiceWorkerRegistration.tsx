'use client'

// src/components/ServiceWorkerRegistration.tsx
//
// Registers the PWA service worker on mount. Returns null — no UI rendered.

import { useEffect } from 'react'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])

  return null
}
