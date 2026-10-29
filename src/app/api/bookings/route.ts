import { api, clientIp, rateLimit, readJson } from '@/lib/http';
import { createBooking, usesPlaces } from '@/lib/bookings';
import type { BookingRequest } from '@/lib/types';

export const POST = api(async (req) => {
  const body = await readJson<BookingRequest>(req);
  if (usesPlaces(body)) rateLimit(`booking:${clientIp(req)}`, 20, 60_000);
  return createBooking(body, clientIp(req));
}, 201);
