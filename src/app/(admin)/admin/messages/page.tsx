// src/app/(admin)/admin/messages/page.tsx
//
// Admin contact messages viewer. Lists all messages ordered newest-first with
// unread count badge. Mark-as-read / mark-as-unread handled by MessagesTable.
//
// Why admin (service-role) client for the fetch?
//   RLS policy "Admins can read contact_messages" checks is_admin(), which
//   reads from profiles using auth.uid(). In a Server Component the session
//   cookie is available, so the anon-key server client would also work.
//   We use the admin client anyway so the query is consistent with deletes or
//   updates that would otherwise fail RLS checks during ISR / CDN edge
//   revalidation when the session cookie may be absent.
//
// force-dynamic: reads session cookies and calls Supabase at request time.
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'
import { MessagesTable } from '@/components/MessagesTable'

export default async function MessagesPage() {
  // Belt-and-suspenders admin check.
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.role !== 'admin') redirect('/login?error=not-admin')

  const db = createAdminClient()
  const { data: messages } = await db
    .from('contact_messages')
    .select('*')
    .order('created_at', { ascending: false })

  const unreadCount = (messages ?? []).filter((m) => !m.read).length

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          {unreadCount > 0 && (
            <span className="rounded-full bg-brand-accent px-2.5 py-0.5 text-xs font-semibold text-white">
              {unreadCount} unread
            </span>
          )}
        </div>
        <MessagesTable initialMessages={messages ?? []} />
      </main>
    </>
  )
}
