import { Spinner } from '@/components/ui/Spinner'

export default function PaperLoading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Spinner size="lg" aria-label="Loading paper…" />
    </div>
  )
}
