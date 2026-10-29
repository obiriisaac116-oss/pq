// src/app/view/[id]/page.tsx
//
// Full-screen paper viewer. Lives outside the (public) route group so it
// only gets the root layout (no public header/footer).

import { notFound } from 'next/navigation'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface ViewPageProps {
  params: { id: string }
}

export default async function ViewPage({ params }: ViewPageProps) {
  const supabase = await createClient()

  const { data: paper } = await supabase
    .from('papers')
    .select('id, title, file_path, file_type')
    .eq('id', params.id)
    .eq('status', 'published')
    .maybeSingle()

  if (!paper) {
    notFound()
  }

  const adminDb = createAdminClient()
  const { data: signedUrlData } = await adminDb.storage
    .from('papers')
    .createSignedUrl(paper.file_path, 3600)

  const previewUrl = signedUrlData?.signedUrl ?? null

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div className="flex items-center gap-3 bg-black/80 px-4 py-2 z-10">
        <Link
          href={`/papers/${params.id}`}
          className="text-white text-sm hover:underline"
        >
          ← Back
        </Link>
        <span className="text-white/60 text-xs truncate">{paper.title}</span>
      </div>
      {previewUrl ? (
        paper.file_type === 'pdf' ? (
          <iframe
            src={previewUrl}
            className="flex-1 w-full border-0"
            title={paper.title}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewUrl}
            alt={paper.title}
            className="flex-1 w-full object-contain"
          />
        )
      ) : (
        <div className="flex flex-1 items-center justify-center text-white/60 text-sm">
          Preview unavailable
        </div>
      )}
    </div>
  )
}
