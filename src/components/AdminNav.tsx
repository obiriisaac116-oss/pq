'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NotificationBell } from '@/components/NotificationBell'

const NAV_LINKS = [
  { href: '/admin/papers', label: 'Papers' },
  { href: '/admin/upload', label: 'Upload' },
  { href: '/admin/courses', label: 'Courses' },
  { href: '/admin/activity', label: 'Activity' },
  { href: '/admin/import', label: 'Import' },
] as const

export function AdminNav() {
  const pathname = usePathname()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <nav
      aria-label="Admin navigation"
      className="sticky top-0 z-30 border-b border-gray-200 bg-white shadow-sm"
    >
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        {/* Logo */}
        <Link href="/admin" className="flex items-center gap-1.5 text-brand-primary font-bold shrink-0">
          <span aria-hidden="true" className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-white text-xs font-black">PQ</span>
          <span className="hidden sm:inline text-sm">Admin</span>
        </Link>

        {/* Nav links — scrollable on mobile */}
        <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-none flex-1 mx-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'shrink-0 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                  isActive ? 'bg-brand-primary text-white' : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
          <NotificationBell />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Link href="/" className="hidden sm:inline-flex text-xs text-gray-400 hover:text-gray-600 px-2 py-1.5" target="_blank" rel="noopener noreferrer">
            View site ↗
          </Link>
          <button
            onClick={handleSignOut}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
          >
            Sign out
          </button>
        </div>
      </div>
    </nav>
  )
}
