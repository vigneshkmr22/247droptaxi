import { api, ApiError, clientIp, rateLimit, readJson } from '@/lib/http';
import { resolvePlaces } from '@/lib/trips';
import type { TripSpec } from '@/lib/types';

interface Body extends TripSpec {
  fromPlaceId?: string;
  toPlaceId?: string | null;
  sessionToken?: string;
}

export const POST = api(async (req) => {
  const b = await readJson<Body>(req);
  if (!b.fromPlaceId || b.fromPlaceId.length > 200) throw new ApiError(400, 'fromPlaceId is required');
  rateLimit(`quote:${clientIp(req)}`, 30, 60_000);
  const { quote } = await resolvePlaces(b.fromPlaceId, b.toPlaceId, b.sessionToken, b);
  return quote;
});
