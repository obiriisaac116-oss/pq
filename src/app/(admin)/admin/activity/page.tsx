// src/app/(admin)/admin/activity/page.tsx
//
// Admin activity log — shows the last 50 logged admin actions.

import { createAdminClient } from '@/lib/supabase/admin'
import { AdminNav } from '@/components/AdminNav'

export const dynamic = 'force-dynamic'

export default async function ActivityPage() {
  const admin = createAdminClient()
  const { data: logs } = await admin
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="mb-6 text-xl font-bold text-gray-900">Activity Log</h1>

        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!logs || logs.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                    No activity logged yet.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const date = new Date(log.created_at)
                  const detailStr = log.details
                    ? JSON.stringify(log.details).slice(0, 100)
                    : '—'
                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {date.toLocaleDateString()} {date.toLocaleTimeString()}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {log.action}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs truncate max-w-xs">
                        {detailStr}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
