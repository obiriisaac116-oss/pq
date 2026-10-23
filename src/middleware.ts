import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Edge-runtime middleware: refreshes the Supabase auth session and guards the
 * admin area.
 *
 * - The session is refreshed on every matched request and the rotated
 *   cookies (plus the no-cache response headers) are written back onto the
 *   outgoing response.
 * - `/admin/*`: unauthenticated users → `/login?error=auth-required`;
 *   authenticated non-admins → `/login?error=not-admin`.
 * - `/login`: authenticated admins → `/admin`.
 *
 * Edge-safe: this uses ONLY the public anon key and the cookie helpers from
 * `@supabase/ssr` — never the service-role key and no Node-only APIs. The
 * admin role is read from `profiles` through the anon client, which RLS
 * permits because every user can read their own profile row
 * (`auth.uid() = id`), so there is no chicken-and-egg with RLS during session
 * refresh.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value, options }) => {
            // Keep the request cookie jar in sync so downstream handlers see
            // the refreshed token, and persist it on the response.
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
          if (headers) {
            // Auth cookies must never be cached by CDNs / reverse proxies.
            for (const [key, value] of Object.entries(headers)) {
              response.headers.set(key, value)
            }
          }
        },
      },
    },
  )

  // Validates the access token server-side and rotates it (via setAll above).
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  // Authenticated admins visiting /login are sent straight to /admin.
  if (pathname === '/login') {
    if (user) {
      const role = await getProfileRole(supabase, user.id)
      if (role === 'admin') {
        return redirectTo(request, '/admin')
      }
    }
    return response
  }

  // Anything else matched by the matcher is an /admin route.
  if (!user) {
    return redirectTo(request, '/login', { error: 'auth-required' })
  }

  const role = await getProfileRole(supabase, user.id)
  if (role !== 'admin') {
    return redirectTo(request, '/login', { error: 'not-admin' })
  }

  return response
}

/** Reads the caller's own `profiles.role` row (RLS permits auth.uid() = id). */
async function getProfileRole(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<string | null> {
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle()
  return data?.role ?? null
}

function redirectTo(
  request: NextRequest,
  pathname: string,
  params?: Record<string, string>,
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value)
    }
  }
  return NextResponse.redirect(url)
}

export const config = {
  // Only the admin area and the login page run through this middleware.
  // Static assets, /api, and public routes are not matched and bypass it
  // entirely — API routes self-protect by reading the session in-handler.
  matcher: ['/admin/:path*', '/login'],
}
