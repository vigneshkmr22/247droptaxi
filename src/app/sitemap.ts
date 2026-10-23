import type { MetadataRoute } from 'next';
import { activeCities, indexableRoutes } from '@/lib/catalog';
import { STATIC_PAGES } from '@/lib/content';
import { siteUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Static pages, every active city and the indexable routes. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, routes] = await Promise.all([activeCities(), indexableRoutes()]);
  return [...STATIC_PAGES, ...cities.map((c) => `city/${c.slug}`), ...routes.map((r) => r.slug)].map((slug) => ({ url: `${siteUrl}/${slug}` }));
}
