'use client'

// src/components/ProgressBar.tsx
//
// Thin top progress bar powered by NProgress.
// Completes the bar on route changes detected via pathname + searchParams.
// Must be wrapped in <Suspense> by the caller (useSearchParams requirement).

import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'

NProgress.configure({ showSpinner: false, minimum: 0.15 })

export function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    NProgress.done()
  }, [pathname, searchParams])

  return null
}
