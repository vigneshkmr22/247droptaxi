import { api, requireAdmin } from '@/lib/http';
import { searchBookings } from '@/lib/bookings';

export const GET = api(async (req) => {
  requireAdmin(req);
  return searchBookings(req.nextUrl.searchParams.get('q') ?? '', req.nextUrl.searchParams.get('status') ?? '');
});
