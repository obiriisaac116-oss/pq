import Link from 'next/link'

export default function PaperNotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Paper Not Found</h1>
      <p className="max-w-md text-sm text-gray-600">
        This paper may have been removed or is not yet published.
      </p>
      <Link
        href="/"
        className="rounded-md bg-brand-primary px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2"
      >
        Browse all papers
      </Link>
    </main>
  )
}
