'use client'

// src/components/AdminNav.tsx
//
// Persistent navigation bar shown on every admin page.
// Uses the browser Supabase client for sign-out (client component).

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard' },
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
      <div className="flex items-center gap-1">
        <span className="mr-4 text-sm font-bold text-brand-primary">
          PQ Admin
        </span>
        {NAV_LINKS.map(({ href, label }) => {
          const isActive =
            href === '/admin'
              ? pathname === '/admin'
              : pathname.startsWith(href)

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

      <button
        onClick={handleSignOut}
        className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
      >
        Sign out
      </button>
    </nav>
  )
}
