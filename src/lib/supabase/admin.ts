import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * Service-role Supabase client — bypasses Row-Level Security.
 *
 * SERVER-ONLY. The `import 'server-only'` guarantees this module can never be
 * pulled into a client bundle (it throws at build time if a Client Component
 * imports it). Never use the service-role key in middleware or client code.
 *
 * Env vars are read inside the function so the build does not require real
 * credentials to be present.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  )
}
