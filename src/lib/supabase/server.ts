import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import type { Database } from '@/types/database'

/**
 * Server-side Supabase client for Server Components and Route Handlers.
 *
 * Reads the session from request cookies and creates a fresh client per
 * request (never share a client across requests). `setAll` is wrapped in a
 * try/catch because cookies cannot be mutated from a Server Component render —
 * the middleware is responsible for refreshing the session in that case.
 *
 * Env vars are read inside the function so the build does not require real
 * credentials to be present.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Called from a Server Component where cookies are read-only.
            // The middleware refreshes the session; safe to ignore here.
          }
        },
      },
    },
  )
}
