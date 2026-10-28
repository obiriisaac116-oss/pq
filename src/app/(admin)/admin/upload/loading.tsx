import { AdminNav } from '@/components/AdminNav'

export default function UploadLoading() {
  return (
    <>
      <AdminNav />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 h-8 w-36 animate-pulse rounded-md bg-gray-200" />
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm space-y-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1 h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-10 w-full animate-pulse rounded-md bg-gray-200" />
            </div>
          ))}
          <div className="h-10 w-full animate-pulse rounded-md bg-gray-300" />
        </div>
      </main>
    </>
  )
}
