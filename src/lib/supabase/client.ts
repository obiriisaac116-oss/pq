import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database'

/**
 * Browser-side Supabase client for Client Components and hooks.
 *
 * Uses only the public anon key + URL; Row-Level Security enforces every
 * query. The client is created inside the function so environment variables
 * are read at runtime (in the browser), never at module top-level — this
 * keeps the production build green when no real credentials are present.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
