import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Edge-runtime middleware: refreshes the Supabase auth session and guards the
 * admin area.
 *
 * Role check uses the service-role client (bypasses RLS) to avoid any
 * chicken-and-egg issue where the anon client can't read profiles before
 * the session is fully established.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request })

  // Session client — anon key + cookies, refreshes the access token.
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
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
          if (headers) {
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
      const role = await getProfileRole(user.id)
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

  const role = await getProfileRole(user.id)
  if (role !== 'admin') {
    return redirectTo(request, '/login', { error: 'not-admin' })
  }

  return response
}

/**
 * Reads profiles.role using the service-role client which bypasses RLS.
 * This avoids the race condition where the anon client can't read the
 * profile row before the session cookie is fully established in the middleware.
 */
async function getProfileRole(userId: string): Promise<string | null> {
  const admin = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data } = await admin
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
  matcher: ['/admin/:path*', '/login'],
}
