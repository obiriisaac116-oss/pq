import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  // Check admin session and role
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const adminCheck = createAdminClient()
  const { data: profile } = await adminCheck
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (profile?.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from('contact_messages')
      .select('id', { count: 'exact', head: true })
      .eq('read', false)

    if (error) throw error

    return Response.json({ count: count ?? 0 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
