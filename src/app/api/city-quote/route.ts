import { api, ApiError, clientIp, rateLimit, readJson } from '@/lib/http';
import { resolveCities } from '@/lib/trips';
import type { TripSpec } from '@/lib/types';

interface Body extends TripSpec {
  fromSlug?: string;
  toSlug?: string | null;
}

/** Dropdown mode: prices a trip between two cities (or a package from one). */
export const POST = api(async (req) => {
  const b = await readJson<Body>(req);
  if (!b.fromSlug || b.fromSlug.length > 100) throw new ApiError(400, 'fromSlug is required');
  rateLimit(`cityquote:${clientIp(req)}`, 60, 60_000);
  const { quote } = await resolveCities(b.fromSlug, b.toSlug, b);
  return quote;
});
