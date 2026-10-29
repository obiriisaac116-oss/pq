import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
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

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action, details } = body as {
    action?: unknown
    details?: Record<string, unknown>
  }

  if (!action || typeof action !== 'string' || action.trim() === '') {
    return Response.json({ error: 'action must be a non-empty string' }, { status: 400 })
  }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('activity_log').insert({
      action: action.trim(),
      details: details ?? null,
    })
    if (error) throw error
    return Response.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
