'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ThemeToggle } from '@/components/ThemeToggle'

const NAV_LINKS = [
  { href: '/admin/papers', label: 'Papers' },
  { href: '/admin/upload', label: 'Upload' },
  { href: '/admin/messages', label: 'Messages' },
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
      className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm"
    >
      <div className="flex items-center gap-4">
        {/* Logo mark */}
        <Link href="/admin" className="flex items-center gap-2 text-brand-primary font-bold">
          <span
            aria-hidden="true"
            className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand-primary text-white text-xs font-black"
          >
            PQ
          </span>
          <span className="text-sm">Admin</span>
        </Link>

        {/* Divider */}
        <span aria-hidden="true" className="h-5 w-px bg-gray-200" />

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const isActive = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100',
                ].join(' ')}
              >
                {label}
              </Link>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="text-xs text-gray-400 hover:text-gray-600"
          target="_blank"
          rel="noopener noreferrer"
        >
          View site ↗
        </Link>
        <ThemeToggle />
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
