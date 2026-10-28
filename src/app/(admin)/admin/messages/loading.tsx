import { AdminNav } from '@/components/AdminNav'

export default function MessagesLoading() {
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 h-8 w-36 animate-pulse rounded-md bg-gray-200" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="mt-1 h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
