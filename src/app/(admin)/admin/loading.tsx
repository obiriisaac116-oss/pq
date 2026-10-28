import { AdminNav } from '@/components/AdminNav'

export default function AdminLoading() {
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="mb-6 h-8 w-40 animate-pulse rounded-md bg-gray-200" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-gray-200" />
          ))}
        </div>
        <div className="mt-8 h-48 animate-pulse rounded-lg bg-gray-200" />
      </main>
    </>
  )
}
