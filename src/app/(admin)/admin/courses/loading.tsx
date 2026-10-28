import { AdminNav } from '@/components/AdminNav'

export default function CoursesLoading() {
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="h-8 w-32 animate-pulse rounded-md bg-gray-200" />
          <div className="h-9 w-28 animate-pulse rounded-md bg-gray-200" />
        </div>
        <div className="overflow-hidden rounded-lg border border-gray-200">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-gray-100 px-4 py-3">
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-5 flex-1 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </main>
    </>
  )
}
