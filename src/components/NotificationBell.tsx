'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

export function NotificationBell() {
  const pathname = usePathname()
  const [count, setCount] = useState(0)
  const [showBadge, setShowBadge] = useState(false)

  useEffect(() => {
    // If on /admin/messages, update lastVisited timestamp
    if (pathname === '/admin/messages') {
      localStorage.setItem('pq:messagesLastVisited', Date.now().toString())
      setShowBadge(false)
      return
    }

    // Fetch unread count
    fetch('/api/admin/unread-count')
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => {
        const unread = data.count ?? 0
        setCount(unread)

        if (unread > 0) {
          const lastVisited = localStorage.getItem('pq:messagesLastVisited')
          const lastVisitedMs = lastVisited ? Number(lastVisited) : null
          const shouldShow =
            lastVisitedMs === null || Date.now() - lastVisitedMs > 5 * 60 * 1000
          setShowBadge(shouldShow)
        } else {
          setShowBadge(false)
        }
      })
      .catch(() => {})
  }, [pathname])

  return (
    <Link
      href="/admin/messages"
      className="relative shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 whitespace-nowrap"
    >
      Messages
      {showBadge && count > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
          {count > 9 ? '9+' : count}
        </span>
      )}
    </Link>
  )
}
