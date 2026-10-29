export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-100" />
        ))}
      </div>
    </main>
  )
}
