'use client'

import * as React from 'react'
import { SearchBar } from '@/components/SearchBar'

export default function StickySearchWrapper() {
  const sentinelRef = React.useRef<HTMLDivElement>(null)
  const [showSticky, setShowSticky] = React.useState(false)

  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        // When sentinel is NOT visible (hero has scrolled past), show sticky bar.
        setShowSticky(!entry.isIntersecting)
      },
      { threshold: 0 },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* Sentinel placed right after the hero section */}
      <div ref={sentinelRef} aria-hidden />

      {/* Sticky search bar */}
      <div
        className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200 bg-white/95 px-4 py-2 shadow-sm backdrop-blur-sm transition-transform duration-200"
        style={{ transform: showSticky ? 'translateY(0)' : 'translateY(-100%)' }}
        aria-hidden={!showSticky}
      >
        <div className="mx-auto max-w-2xl">
          <SearchBar />
        </div>
      </div>
    </>
  )
}
