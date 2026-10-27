import type { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://pq-questions26.onrender.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
    { url: `${siteUrl}/contact`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
  ]

  try {
    const supabase = createAdminClient()
    const { data: papers } = await supabase
      .from('papers')
      .select('id, created_at')
      .eq('status', 'published')

    if (!papers) return staticRoutes

    const paperRoutes: MetadataRoute.Sitemap = papers.map((paper) => ({
      url: `${siteUrl}/papers/${paper.id}`,
      lastModified: paper.created_at ? new Date(paper.created_at) : new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    }))

    return [...staticRoutes, ...paperRoutes]
  } catch {
    return staticRoutes
  }
}
