import type { MetadataRoute } from 'next';
import { activeCities, storedRouteSlugs } from '@/lib/catalog';
import { STATIC_PAGES } from '@/lib/content';
import { siteUrl } from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Static pages, every active city and every stored route. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cities, routes] = await Promise.all([activeCities(), storedRouteSlugs()]);
  return [...STATIC_PAGES, ...cities.map((c) => `city/${c.slug}`), ...routes.map((r) => r.slug)].map((slug) => ({ url: `${siteUrl}/${slug}` }));
}
